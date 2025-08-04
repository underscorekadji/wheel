/**
 * Redis Key Expiration Cleanup Job
 *
 * Implements automatic cleanup of expired Redis keys and associated memory caches
 * to prevent memory leaks and maintain application performance.
 *
 * Features:
 * - Proactive cleanup of expired Redis keys
 * - Memory cache cleanup for expired rooms
 * - Socket namespace cleanup for expired rooms
 * - Configurable cleanup intervals
 * - Performance monitoring and metrics
 */

import { getRedisClient, ROOM_KEY_PREFIX } from './redis'
import { clearRoomStateCache, clearRoomDebounce } from './room-state-broadcaster'
import { getSocketServer } from './socket-server'

/**
 * Configuration for Redis cleanup job
 */
export const CLEANUP_CONFIG = {
  // Run cleanup every 2 hours (ensures cleanup runs multiple times during 8-hour TTL)
  CLEANUP_INTERVAL_MS: 2 * 60 * 60 * 1000, // 2 hours

  // Consider keys that expire within next hour as "soon to expire"
  EXPIRY_THRESHOLD_SECONDS: 60 * 60, // 1 hour

  // Maximum number of keys to scan in one cleanup cycle
  MAX_SCAN_COUNT: 1000,

  // Maximum time to spend on cleanup in one cycle
  MAX_CLEANUP_TIME_MS: 30 * 1000, // 30 seconds

  // Pattern for scanning room keys
  SCAN_PATTERN: `${ROOM_KEY_PREFIX}*`,
} as const

/**
 * Cleanup metrics for monitoring
 */
export interface CleanupMetrics {
  startTime: Date
  endTime: Date
  durationMs: number
  keysScanned: number
  expiredKeysFound: number
  expiredKeysDeleted: number
  cacheEntriesCleared: number
  namespacesCleared: number
  errors: string[]
}

/**
 * Global cleanup interval reference
 */
let cleanupInterval: NodeJS.Timeout | null = null

/**
 * Flag to prevent multiple cleanup operations running simultaneously
 */
let cleanupInProgress = false

/**
 * Scan for expired or soon-to-expire Redis keys
 *
 * @param client - Redis client instance
 * @returns Promise<string[]> Array of expired room IDs
 */
async function scanForExpiredKeys(
  client: Awaited<ReturnType<typeof getRedisClient>>
): Promise<string[]> {
  const expiredRoomIds: string[] = []
  let cursor = '0'
  let scannedCount = 0

  do {
    // Scan for room keys with pattern matching
    const [nextCursor, keys] = await client.scan(
      cursor,
      'MATCH',
      CLEANUP_CONFIG.SCAN_PATTERN,
      'COUNT',
      '100' // Scan 100 keys at a time for efficiency
    )

    cursor = nextCursor
    scannedCount += keys.length

    // Check TTL for each key
    for (const key of keys) {
      try {
        const ttl = await client.ttl(key)

        // TTL values:
        // -2: key does not exist
        // -1: key exists but has no associated expire
        // >0: key exists and will expire in TTL seconds

        if (ttl === -2) {
          // Key already expired/deleted
          const roomId = key.replace(ROOM_KEY_PREFIX, '')
          expiredRoomIds.push(roomId)
        } else if (ttl >= 0 && ttl <= CLEANUP_CONFIG.EXPIRY_THRESHOLD_SECONDS) {
          // Key will expire soon or has already expired
          const roomId = key.replace(ROOM_KEY_PREFIX, '')
          expiredRoomIds.push(roomId)
        }
      } catch (error) {
        console.warn(`Error checking TTL for key ${key}:`, error)
      }
    }

    // Safety check to prevent infinite scanning
    if (scannedCount >= CLEANUP_CONFIG.MAX_SCAN_COUNT) {
      console.warn(`Reached maximum scan count (${CLEANUP_CONFIG.MAX_SCAN_COUNT}), stopping scan`)
      break
    }
  } while (cursor !== '0')

  return expiredRoomIds
}

/**
 * Delete expired Redis keys
 *
 * @param client - Redis client instance
 * @param roomIds - Array of room IDs to delete
 * @returns Promise<number> Number of keys actually deleted
 */
async function deleteExpiredKeys(
  client: Awaited<ReturnType<typeof getRedisClient>>,
  roomIds: string[]
): Promise<number> {
  if (roomIds.length === 0) {
    return 0
  }

  // Build array of keys to delete
  const keys = roomIds.map(roomId => `${ROOM_KEY_PREFIX}${roomId}`)

  try {
    // Use DEL command to delete multiple keys atomically
    const deletedCount = await client.del(...keys)
    return deletedCount
  } catch (error) {
    console.error('Error deleting expired keys:', error)
    // Try deleting one by one as fallback
    let deletedCount = 0
    for (const key of keys) {
      try {
        const result = await client.del(key)
        deletedCount += result
      } catch (individualError) {
        console.warn(`Failed to delete key ${key}:`, individualError)
      }
    }
    return deletedCount
  }
}

/**
 * Clean up memory caches for expired rooms
 *
 * @param roomIds - Array of room IDs to clean from cache
 * @returns number Number of cache entries cleared
 */
function cleanupMemoryCaches(roomIds: string[]): number {
  let clearedCount = 0

  for (const roomId of roomIds) {
    try {
      // Clear room state cache
      clearRoomStateCache(roomId)

      // Clear debounce entries
      clearRoomDebounce(roomId)

      clearedCount++
    } catch (error) {
      console.warn(`Failed to clear cache for room ${roomId}:`, error)
    }
  }

  return clearedCount
}

/**
 * Clean up Socket.IO namespaces for expired rooms
 *
 * @param roomIds - Array of room IDs to clean up namespaces for
 * @returns number Number of namespaces cleared
 */
async function cleanupSocketNamespaces(roomIds: string[]): Promise<number> {
  const io = getSocketServer()
  if (!io) {
    return 0 // Socket server not initialized
  }

  let clearedCount = 0

  for (const roomId of roomIds) {
    try {
      const namespaceName = `/room:${roomId}`

      // Check if namespace exists
      const namespace = io._nsps.get(namespaceName)
      if (namespace) {
        // Disconnect all sockets in the namespace
        const sockets = await namespace.fetchSockets()
        for (const socket of sockets) {
          socket.disconnect(true)
        }

        // Remove the namespace
        io._nsps.delete(namespaceName)
        clearedCount++

        console.debug(
          `Cleaned up namespace ${namespaceName} (${sockets.length} sockets disconnected)`
        )
      }
    } catch (error) {
      console.warn(`Failed to cleanup namespace for room ${roomId}:`, error)
    }
  }

  return clearedCount
}

/**
 * Perform comprehensive cleanup of expired Redis keys and associated resources
 *
 * @returns Promise<CleanupMetrics> Metrics about the cleanup operation
 */
export async function performRedisCleanup(): Promise<CleanupMetrics> {
  const startTime = new Date()
  const metrics: CleanupMetrics = {
    startTime,
    endTime: startTime,
    durationMs: 0,
    keysScanned: 0,
    expiredKeysFound: 0,
    expiredKeysDeleted: 0,
    cacheEntriesCleared: 0,
    namespacesCleared: 0,
    errors: [],
  }

  // Prevent multiple cleanup operations running simultaneously
  if (cleanupInProgress) {
    metrics.errors.push('Cleanup already in progress, skipping')
    return metrics
  }

  cleanupInProgress = true

  try {
    // Set timeout for cleanup operation
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Cleanup operation timed out')),
        CLEANUP_CONFIG.MAX_CLEANUP_TIME_MS
      )
    })

    const cleanupPromise = async () => {
      // Get Redis client
      const client = await getRedisClient()

      // Scan for expired keys
      console.info('Starting Redis cleanup: scanning for expired keys...')
      const expiredRoomIds = await scanForExpiredKeys(client)
      metrics.expiredKeysFound = expiredRoomIds.length

      if (expiredRoomIds.length === 0) {
        console.info('Redis cleanup: no expired keys found')
        return
      }

      console.info(
        `Redis cleanup: found ${expiredRoomIds.length} expired room(s): ${expiredRoomIds.slice(0, 5).join(', ')}${expiredRoomIds.length > 5 ? '...' : ''}`
      )

      // Delete expired Redis keys
      metrics.expiredKeysDeleted = await deleteExpiredKeys(client, expiredRoomIds)

      // Clean up memory caches
      metrics.cacheEntriesCleared = cleanupMemoryCaches(expiredRoomIds)

      // Clean up Socket.IO namespaces
      metrics.namespacesCleared = await cleanupSocketNamespaces(expiredRoomIds)

      console.info(
        `Redis cleanup completed: deleted ${metrics.expiredKeysDeleted} keys, ` +
          `cleared ${metrics.cacheEntriesCleared} cache entries, ` +
          `cleaned ${metrics.namespacesCleared} namespaces`
      )
    }

    // Run cleanup with timeout
    await Promise.race([cleanupPromise(), timeoutPromise])
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    metrics.errors.push(errorMessage)
    console.error('Redis cleanup failed:', error)
  } finally {
    cleanupInProgress = false
    metrics.endTime = new Date()
    metrics.durationMs = metrics.endTime.getTime() - metrics.startTime.getTime()
  }

  return metrics
}

/**
 * Start automatic Redis cleanup job
 *
 * Runs cleanup at configured intervals to prevent memory leaks and maintain performance.
 *
 * @returns boolean True if cleanup job was started, false if already running
 */
export function startRedisCleanupJob(): boolean {
  if (cleanupInterval) {
    console.warn('Redis cleanup job is already running')
    return false
  }

  // Run initial cleanup
  performRedisCleanup()
    .then(metrics => {
      console.info(
        `Initial Redis cleanup completed in ${metrics.durationMs}ms: ` +
          `${metrics.expiredKeysDeleted} keys deleted, ${metrics.errors.length} errors`
      )
    })
    .catch(error => {
      console.error('Initial Redis cleanup failed:', error)
    })

  // Start periodic cleanup
  cleanupInterval = setInterval(async () => {
    try {
      const metrics = await performRedisCleanup()

      // Log summary only if there was work to do or errors occurred
      if (metrics.expiredKeysFound > 0 || metrics.errors.length > 0) {
        console.info(
          `Scheduled Redis cleanup completed in ${metrics.durationMs}ms: ` +
            `${metrics.expiredKeysFound} expired found, ${metrics.expiredKeysDeleted} deleted, ` +
            `${metrics.errors.length} errors`
        )
      }
    } catch (error) {
      console.error('Scheduled Redis cleanup failed:', error)
    }
  }, CLEANUP_CONFIG.CLEANUP_INTERVAL_MS)

  console.info(
    `Started Redis cleanup job (interval: ${CLEANUP_CONFIG.CLEANUP_INTERVAL_MS / (60 * 1000)} minutes)`
  )
  return true
}

/**
 * Stop automatic Redis cleanup job
 *
 * @returns boolean True if cleanup job was stopped, false if not running
 */
export function stopRedisCleanupJob(): boolean {
  if (!cleanupInterval) {
    return false
  }

  clearInterval(cleanupInterval)
  cleanupInterval = null

  console.info('Stopped Redis cleanup job')
  return true
}

/**
 * Check if Redis cleanup job is running
 *
 * @returns boolean True if cleanup job is active
 */
export function isRedisCleanupJobRunning(): boolean {
  return cleanupInterval !== null
}

/**
 * Get current cleanup configuration
 *
 * @returns Readonly cleanup configuration
 */
export function getCleanupConfig(): typeof CLEANUP_CONFIG {
  return CLEANUP_CONFIG
}

/**
 * Manual cleanup trigger for testing or administrative purposes
 *
 * @returns Promise<CleanupMetrics> Cleanup operation metrics
 */
export async function triggerManualCleanup(): Promise<CleanupMetrics> {
  console.info('Manual Redis cleanup triggered')
  return performRedisCleanup()
}

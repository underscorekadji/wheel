/**
 * Redis Key Expiration Cleanup Job
 *
 * Implements automatic cleanup of memory caches and Socket.IO namespaces
 * for expired Redis rooms to prevent memory leaks.
 *
 * Note: Redis keys are automatically cleaned up by TTL - this only handles
 * application-level cleanup (memory caches and Socket namespaces).
 */

import { getRedisClient, ROOM_KEY_PREFIX } from './redis-client'
import { clearRoomStateCache, clearRoomDebounce } from '../communication/room-state-broadcaster'
import { getSocketServer } from '../communication/socket-server'

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

  // Pattern for scanning room keys
  SCAN_PATTERN: `${ROOM_KEY_PREFIX}*`,
} as const

/**
 * Global cleanup interval reference
 */
let cleanupInterval: NodeJS.Timeout | null = null

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
        // -2: key does not exist (expired and removed by Redis)
        // -1: key exists but has no associated expire
        // >0: key exists and will expire in TTL seconds

        if (ttl === -2 || (ttl >= 0 && ttl <= CLEANUP_CONFIG.EXPIRY_THRESHOLD_SECONDS)) {
          // Key is expired or will expire soon
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
 * Clean up memory caches for expired rooms
 *
 * @param roomIds - Array of room IDs to clean up caches for
 * @returns number Number of cache entries cleared
 */
async function cleanupMemoryCaches(roomIds: string[]): Promise<number> {
  let clearedCount = 0

  for (const roomId of roomIds) {
    try {
      // Clear room state cache from broadcaster
      clearRoomStateCache(roomId)

      // Clear debounce entries for the room
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

      // Check if namespace exists using private API (no public alternative available)
      const namespace = io._nsps.get(namespaceName)
      if (namespace) {
        // Disconnect all sockets in the namespace
        const sockets = await namespace.fetchSockets()
        for (const socket of sockets) {
          socket.disconnect(true)
        }

        // Remove all event listeners to prevent memory leaks
        namespace.removeAllListeners()

        // Remove the namespace from internal map
        // WARNING: This uses Socket.IO private API (_nsps) and may break in future versions
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
 * Perform cleanup of expired room data from memory caches and Socket namespaces
 *
 * Note: Redis keys are automatically cleaned up by TTL, this only handles
 * application-level cleanup to prevent memory leaks.
 *
 * @returns Promise<void>
 */
async function performCleanup(): Promise<void> {
  try {
    console.info('Starting Redis cleanup job...')
    const startTime = Date.now()

    const client = await getRedisClient()

    // Find expired or soon-to-expire rooms
    const expiredRoomIds = await scanForExpiredKeys(client)

    if (expiredRoomIds.length === 0) {
      console.info('No expired rooms found during cleanup')
      return
    }

    console.info(`Found ${expiredRoomIds.length} expired rooms to clean up`)

    // Clean up memory caches
    const cacheEntriesCleared = await cleanupMemoryCaches(expiredRoomIds)

    // Clean up Socket.IO namespaces
    const namespacesCleared = await cleanupSocketNamespaces(expiredRoomIds)

    const durationMs = Date.now() - startTime

    console.info(
      `Cleanup completed in ${durationMs}ms: ` +
        `${cacheEntriesCleared} cache entries cleared, ` +
        `${namespacesCleared} namespaces cleared`
    )
  } catch (error) {
    console.error('Error during Redis cleanup:', error)
  }
}

/**
 * Start the automatic Redis cleanup job
 *
 * Runs cleanup every 2 hours to clean up memory caches and Socket namespaces
 * for expired rooms. Redis keys are automatically cleaned by TTL.
 *
 * @returns void
 */
export function startRedisCleanupJob(): void {
  if (cleanupInterval) {
    console.warn('Redis cleanup job is already running')
    return
  }

  console.info('Starting Redis cleanup job...')

  // Run initial cleanup immediately with error handling
  performCleanup().catch(error => {
    console.error('Error during initial Redis cleanup:', error)
  })

  // Schedule periodic cleanup
  cleanupInterval = setInterval(performCleanup, CLEANUP_CONFIG.CLEANUP_INTERVAL_MS)

  console.info(
    `Redis cleanup job started - will run every ${CLEANUP_CONFIG.CLEANUP_INTERVAL_MS / 1000 / 60} minutes`
  )
}

/**
 * Stop the automatic Redis cleanup job
 *
 * @returns void
 */
export function stopRedisCleanupJob(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.info('Redis cleanup job stopped')
  } else {
    console.warn('Redis cleanup job is not running')
  }
}

/**
 * Check if the Redis cleanup job is currently running
 *
 * @returns boolean True if cleanup job is running
 */
export function isRedisCleanupJobRunning(): boolean {
  return cleanupInterval !== null
}

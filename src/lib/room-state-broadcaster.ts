/**
 * Room State Broadcaster
 *
 * Manages automatic broadcasting of room state changes to namespace clients.
 * Ensures updates are broadcast within 500ms of state changes.
 */

import type { Room, RoomStatus } from '@/types/room'
import type { Participant } from '@/types/participant'
import type { RoomStateUpdateEvent } from '@/types/socket'
import { getSocketServer } from './socket-server'
import {
  calculateRoomStateDiff,
  diffToSocketEvent,
  validateDiffPerformance,
} from './room-state-diff'

/**
 * Validation error class for broadcast operations
 */
class BroadcastValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BroadcastValidationError'
  }
}

/**
 * Validate room object before broadcasting
 */
function validateRoomForBroadcast(room: Room): void {
  const errors: string[] = []

  // Basic structure validation
  if (!room.id || typeof room.id !== 'string') {
    errors.push('Room ID is required and must be a string')
  }

  if (!room.name || typeof room.name !== 'string') {
    errors.push('Room name is required and must be a string')
  }

  if (!room.organizerId || typeof room.organizerId !== 'string') {
    errors.push('Room organizer ID is required and must be a string')
  }

  // Status validation
  const validStatuses: RoomStatus[] = ['waiting', 'active', 'paused', 'completed', 'expired']
  if (!validStatuses.includes(room.status)) {
    errors.push(`Invalid room status: ${room.status}`)
  }

  // Date validation
  if (!(room.createdAt instanceof Date) || isNaN(room.createdAt.getTime())) {
    errors.push('Room createdAt must be a valid Date')
  }

  if (!(room.lastUpdatedAt instanceof Date) || isNaN(room.lastUpdatedAt.getTime())) {
    errors.push('Room lastUpdatedAt must be a valid Date')
  }

  if (!(room.expiresAt instanceof Date) || isNaN(room.expiresAt.getTime())) {
    errors.push('Room expiresAt must be a valid Date')
  }

  // Participants validation
  if (!Array.isArray(room.participants)) {
    errors.push('Room participants must be an array')
  } else {
    room.participants.forEach((participant, index) => {
      if (!participant.id || typeof participant.id !== 'string') {
        errors.push(`Participant ${index} ID is required and must be a string`)
      }
      if (!participant.name || typeof participant.name !== 'string') {
        errors.push(`Participant ${index} name is required and must be a string`)
      }
    })
  }

  // Wheel config validation
  if (!room.wheelConfig || typeof room.wheelConfig !== 'object') {
    errors.push('Room wheelConfig is required and must be an object')
  } else {
    const { minSpinDuration, maxSpinDuration, excludeFinished, allowRepeatSelections } =
      room.wheelConfig

    if (typeof minSpinDuration !== 'number' || minSpinDuration < 0) {
      errors.push('wheelConfig.minSpinDuration must be a non-negative number')
    }

    if (typeof maxSpinDuration !== 'number' || maxSpinDuration < 0) {
      errors.push('wheelConfig.maxSpinDuration must be a non-negative number')
    }

    if (minSpinDuration >= maxSpinDuration) {
      errors.push('wheelConfig.minSpinDuration must be less than maxSpinDuration')
    }

    if (typeof excludeFinished !== 'boolean') {
      errors.push('wheelConfig.excludeFinished must be a boolean')
    }

    if (typeof allowRepeatSelections !== 'boolean') {
      errors.push('wheelConfig.allowRepeatSelections must be a boolean')
    }
  }

  // Selection history validation
  if (!Array.isArray(room.selectionHistory)) {
    errors.push('Room selectionHistory must be an array')
  }

  if (errors.length > 0) {
    throw new BroadcastValidationError(`Room validation failed: ${errors.join(', ')}`)
  }
}

/**
 * Validate participant object before broadcasting
 */
function validateParticipantForBroadcast(participant: Participant): void {
  const errors: string[] = []

  if (!participant.id || typeof participant.id !== 'string') {
    errors.push('Participant ID is required and must be a string')
  }

  if (!participant.name || typeof participant.name !== 'string') {
    errors.push('Participant name is required and must be a string')
  }

  const validStatuses = ['queued', 'active', 'finished', 'disabled']
  if (!validStatuses.includes(participant.status)) {
    errors.push(`Invalid participant status: ${participant.status}`)
  }

  const validRoles = ['organizer', 'guest']
  if (!validRoles.includes(participant.role)) {
    errors.push(`Invalid participant role: ${participant.role}`)
  }

  if (!(participant.joinedAt instanceof Date) || isNaN(participant.joinedAt.getTime())) {
    errors.push('Participant joinedAt must be a valid Date')
  }

  if (!(participant.lastUpdatedAt instanceof Date) || isNaN(participant.lastUpdatedAt.getTime())) {
    errors.push('Participant lastUpdatedAt must be a valid Date')
  }

  if (errors.length > 0) {
    throw new BroadcastValidationError(`Participant validation failed: ${errors.join(', ')}`)
  }
}

/**
 * Efficiently clone a room object for caching
 * Uses selective cloning to avoid unnecessary deep copies
 */
function cloneRoomForCache(room: Room): Room {
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    organizerId: room.organizerId,
    currentPresenterId: room.currentPresenterId,
    createdAt: room.createdAt,
    lastUpdatedAt: room.lastUpdatedAt,
    expiresAt: room.expiresAt,
    // Deep clone participants array as it's most likely to change
    participants: room.participants.map(p => ({ ...p })),
    // Shallow clone wheel config as it rarely changes
    wheelConfig: { ...room.wheelConfig },
    // Selection history can be expensive to clone, but changes frequently
    selectionHistory: [...room.selectionHistory],
  }
}

/**
 * Cache entry with TTL for room state
 */
interface CacheEntry {
  room: Room
  expiresAt: number
}

/**
 * Cache for storing previous room states to enable diff calculation
 * Includes TTL-based cleanup to prevent memory leaks
 */
const roomStateCache = new Map<string, CacheEntry>()

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  MAX_SIZE: 1000, // Maximum number of cached rooms
  TTL_MS: 8 * 60 * 60 * 1000, // 8 hours (match Redis TTL)
  CLEANUP_INTERVAL_MS: 30 * 60 * 1000, // 30 minutes cleanup interval
} as const

/**
 * Retry configuration for broadcast operations
 */
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY_MS: 100,
  MAX_DELAY_MS: 1000,
  EXPONENTIAL_BACKOFF: true,
} as const

/**
 * Debounce configuration for rapid updates
 */
const DEBOUNCE_CONFIG = {
  DELAY_MS: 50, // Debounce delay in milliseconds
  MAX_WAIT_MS: 500, // Maximum time to wait before forcing broadcast
} as const

/**
 * Cleanup interval for expired cache entries
 */
let cleanupInterval: NodeJS.Timeout | null = null

/**
 * Debounce map for room broadcast operations
 */
interface DebounceEntry {
  timeoutId: NodeJS.Timeout
  firstRequestTime: number
  latestRoom: Room
  force: boolean
}

const debounceMap = new Map<string, DebounceEntry>()

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, context: string, attempt = 1): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (attempt >= RETRY_CONFIG.MAX_ATTEMPTS) {
      console.error(`${context} failed after ${attempt} attempts:`, error)
      throw error
    }

    const delay = RETRY_CONFIG.EXPONENTIAL_BACKOFF
      ? Math.min(RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt - 1), RETRY_CONFIG.MAX_DELAY_MS)
      : RETRY_CONFIG.BASE_DELAY_MS

    console.warn(
      `${context} failed (attempt ${attempt}/${RETRY_CONFIG.MAX_ATTEMPTS}), retrying in ${delay}ms:`,
      error
    )
    await sleep(delay)
    return retryWithBackoff(fn, context, attempt + 1)
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredCacheEntries(): void {
  const now = Date.now()
  let removedCount = 0

  for (const [roomId, entry] of roomStateCache.entries()) {
    if (entry.expiresAt < now) {
      roomStateCache.delete(roomId)
      removedCount++
    }
  }

  if (removedCount > 0) {
    console.debug(`Cleaned up ${removedCount} expired room state cache entries`)
  }
}

/**
 * Enforce cache size limit by removing oldest entries
 */
function enforceCacheSizeLimit(): void {
  if (roomStateCache.size <= CACHE_CONFIG.MAX_SIZE) {
    return
  }

  // Convert to array and sort by expiration time (oldest first)
  const entries = Array.from(roomStateCache.entries()).sort(
    ([, a], [, b]) => a.expiresAt - b.expiresAt
  )

  const entriesToRemove = roomStateCache.size - CACHE_CONFIG.MAX_SIZE
  for (let i = 0; i < entriesToRemove; i++) {
    const [roomId] = entries[i]
    roomStateCache.delete(roomId)
  }

  console.debug(`Enforced cache size limit: removed ${entriesToRemove} oldest entries`)
}

/**
 * Start automatic cache cleanup
 */
function startCacheCleanup(): void {
  if (cleanupInterval) {
    return // Already started
  }

  cleanupInterval = setInterval(() => {
    cleanupExpiredCacheEntries()
    enforceCacheSizeLimit()
  }, CACHE_CONFIG.CLEANUP_INTERVAL_MS)

  console.debug('Started room state cache cleanup interval')
}

/**
 * Stop automatic cache cleanup
 */
function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    console.debug('Stopped room state cache cleanup interval')
  }
}

/**
 * Performance tracking for broadcast operations
 */
interface BroadcastMetrics {
  diffCalculationTime: number
  broadcastTime: number
  totalTime: number
  clientCount: number
}

/**
 * Internal broadcast function without debouncing
 * Used by both debounced and immediate broadcast functions
 */
async function _broadcastRoomStateUpdateInternal(
  room: Room,
  force = false
): Promise<BroadcastMetrics> {
  const startTime = performance.now()

  try {
    // Validate room object before proceeding
    validateRoomForBroadcast(room)

    // Get Socket.IO server instance
    const io = getSocketServer()
    if (!io) {
      throw new Error('Socket.IO server not initialized')
    }

    // Calculate diff from previous state
    const diffStartTime = performance.now()
    const cacheEntry = roomStateCache.get(room.id)
    const previousRoom = cacheEntry?.room || null
    const diff = calculateRoomStateDiff(previousRoom, room)
    const diffEndTime = performance.now()

    const diffCalculationTime = diffEndTime - diffStartTime
    validateDiffPerformance(diffStartTime, diffEndTime, room.id)

    // Check if broadcast is needed
    if (!force && !diff.hasChanges) {
      console.debug(`No changes detected for room ${room.id}, skipping broadcast`)
      return {
        diffCalculationTime,
        broadcastTime: 0,
        totalTime: performance.now() - startTime,
        clientCount: 0,
      }
    }

    // Get namespace for the room
    const namespace = `/room:${room.id}`
    const roomNamespace = io.of(namespace)

    // Perform broadcast with retry logic
    const broadcastStartTime = performance.now()
    let clientCount = 0

    const { clientCount: finalClientCount } = await retryWithBackoff(async () => {
      // Count connected clients for metrics
      const sockets = await roomNamespace.fetchSockets()
      clientCount = sockets.length

      if (clientCount === 0) {
        console.debug(`No clients connected to room ${room.id}, skipping broadcast`)
        return { clientCount: 0 }
      }

      // Convert diff to Socket.IO event data
      const eventData = diffToSocketEvent(room)

      // Broadcast the update
      roomNamespace.emit('room_state_update', {
        ...eventData,
        roomId: room.id,
        timestamp: new Date().toISOString(),
      } as RoomStateUpdateEvent)

      return { clientCount }
    }, `Room state broadcast for ${room.id}`)

    const broadcastEndTime = performance.now()
    const broadcastTime = broadcastEndTime - broadcastStartTime
    clientCount = finalClientCount

    if (clientCount === 0) {
      return {
        diffCalculationTime,
        broadcastTime: 0,
        totalTime: performance.now() - startTime,
        clientCount: 0,
      }
    }

    // Update cache with current state and TTL
    const expiresAt = Date.now() + CACHE_CONFIG.TTL_MS
    roomStateCache.set(room.id, { room: cloneRoomForCache(room), expiresAt })

    // Start cleanup if not already started
    startCacheCleanup()

    const totalTime = performance.now() - startTime

    // Log performance metrics
    console.info(
      `Room state broadcast completed for ${room.id}: ` +
        `${totalTime}ms total (${diffCalculationTime}ms diff, ${broadcastTime}ms broadcast), ` +
        `${clientCount} clients notified`
    )

    // Warn if broadcast took too long
    if (totalTime > 500) {
      console.warn(
        `Room state broadcast for ${room.id} took ${totalTime}ms, ` +
          'exceeding 500ms performance requirement'
      )
    }

    return {
      diffCalculationTime,
      broadcastTime,
      totalTime,
      clientCount,
    }
  } catch (error) {
    const totalTime = performance.now() - startTime
    console.error(
      `Failed to broadcast room state update for ${room.id} after ${totalTime}ms:`,
      error
    )
    throw new Error(
      `Room state broadcast failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Broadcast room state changes to all clients in the room namespace with debouncing
 *
 * Debounces rapid successive updates to prevent broadcast spam while ensuring
 * updates complete within performance requirements.
 *
 * @param room - Current room state
 * @param force - Force broadcast even if no changes detected
 * @param immediate - Skip debouncing and broadcast immediately
 * @returns Promise<BroadcastMetrics> Performance metrics for monitoring
 */
export async function broadcastRoomStateUpdate(
  room: Room,
  force = false,
  immediate = false
): Promise<BroadcastMetrics> {
  // Skip debouncing for immediate broadcasts or forced updates
  if (immediate || force) {
    return _broadcastRoomStateUpdateInternal(room, force)
  }

  return new Promise((resolve, reject) => {
    const roomId = room.id
    const now = Date.now()

    // Check if there's an existing debounce entry
    const existingEntry = debounceMap.get(roomId)

    if (existingEntry) {
      // Cancel the existing timeout
      clearTimeout(existingEntry.timeoutId)

      // Check if we've waited long enough and should force broadcast
      const waitTime = now - existingEntry.firstRequestTime
      const shouldForce = waitTime >= DEBOUNCE_CONFIG.MAX_WAIT_MS

      if (shouldForce) {
        // Force broadcast now
        debounceMap.delete(roomId)
        _broadcastRoomStateUpdateInternal(room, true).then(resolve).catch(reject)
        return
      }

      // Update the entry with latest room state
      existingEntry.latestRoom = room
      existingEntry.force = existingEntry.force || force
    }

    // Create or update debounce entry
    const timeoutId = setTimeout(async () => {
      const entry = debounceMap.get(roomId)
      if (entry) {
        debounceMap.delete(roomId)
        try {
          const metrics = await _broadcastRoomStateUpdateInternal(entry.latestRoom, entry.force)
          resolve(metrics)
        } catch (error) {
          reject(error)
        }
      }
    }, DEBOUNCE_CONFIG.DELAY_MS)

    debounceMap.set(roomId, {
      timeoutId,
      firstRequestTime: existingEntry?.firstRequestTime ?? now,
      latestRoom: room,
      force: (existingEntry?.force ?? false) || force,
    })
  })
}

/**
 * Broadcast specific participant changes to room namespace
 *
 * More granular broadcasting for participant-specific updates.
 *
 * @param roomId - Room identifier
 * @param participant - Updated participant
 * @param action - Type of participant change
 * @returns Promise<boolean> Success status
 */
export async function broadcastParticipantUpdate(
  roomId: string,
  participant: Participant,
  action: 'added' | 'updated' | 'removed' | 'disabled' | 'enabled'
): Promise<boolean> {
  const startTime = performance.now()

  try {
    // Validate participant object before proceeding
    validateParticipantForBroadcast(participant)

    const io = getSocketServer()
    if (!io) {
      throw new Error('Socket.IO server not initialized')
    }

    const namespace = `/room:${roomId}`
    const roomNamespace = io.of(namespace)

    // Perform broadcast with retry logic
    const success = await retryWithBackoff(async () => {
      // Count connected clients
      const sockets = await roomNamespace.fetchSockets()
      if (sockets.length === 0) {
        console.debug(`No clients connected to room ${roomId}, skipping participant update`)
        return false
      }

      // Broadcast participant update
      roomNamespace.emit('participant_update', {
        participant,
        action,
        roomId,
        timestamp: new Date().toISOString(),
      })

      const totalTime = performance.now() - startTime
      console.debug(
        `Participant ${action} broadcast for ${roomId} completed in ${totalTime}ms, ` +
          `${sockets.length} clients notified`
      )

      return true
    }, `Participant ${action} broadcast for ${roomId}`)

    return success
  } catch (error) {
    console.error(`Failed to broadcast participant update for ${roomId}:`, error)
    return false
  }
}

/**
 * Clear cached room state
 *
 * Should be called when a room is deleted or expired.
 *
 * @param roomId - Room identifier
 */
export function clearRoomStateCache(roomId: string): void {
  const wasPresent = roomStateCache.delete(roomId)
  if (wasPresent) {
    console.debug(`Cleared cached state for room ${roomId}`)
  }
}

/**
 * Get cached room state
 *
 * Useful for debugging and testing.
 *
 * @param roomId - Room identifier
 * @returns Cached room state or undefined
 */
export function getCachedRoomState(roomId: string): Room | undefined {
  const entry = roomStateCache.get(roomId)
  if (!entry) {
    return undefined
  }

  // Check if entry has expired
  if (entry.expiresAt < Date.now()) {
    roomStateCache.delete(roomId)
    return undefined
  }

  return entry.room
}

/**
 * Get cache statistics
 *
 * @returns Object with cache size, room IDs, and expired count
 */
export function getCacheStats(): {
  size: number
  roomIds: string[]
  expiredCount: number
  oldestExpiry?: Date
  newestExpiry?: Date
} {
  const now = Date.now()
  let expiredCount = 0
  let oldestExpiry: number | undefined
  let newestExpiry: number | undefined

  for (const [, entry] of roomStateCache.entries()) {
    if (entry.expiresAt < now) {
      expiredCount++
    }

    if (!oldestExpiry || entry.expiresAt < oldestExpiry) {
      oldestExpiry = entry.expiresAt
    }
    if (!newestExpiry || entry.expiresAt > newestExpiry) {
      newestExpiry = entry.expiresAt
    }
  }

  return {
    size: roomStateCache.size,
    roomIds: Array.from(roomStateCache.keys()),
    expiredCount,
    oldestExpiry: oldestExpiry ? new Date(oldestExpiry) : undefined,
    newestExpiry: newestExpiry ? new Date(newestExpiry) : undefined,
  }
}

/**
 * Clear all cached room states
 *
 * Useful for testing and cleanup.
 */
export function clearAllRoomStateCache(): void {
  const size = roomStateCache.size
  roomStateCache.clear()
  stopCacheCleanup()
  console.debug(`Cleared all cached room states (${size} rooms)`)
}

/**
 * Clear debounce entry for a specific room
 *
 * @param roomId - Room identifier
 */
export function clearRoomDebounce(roomId: string): void {
  const entry = debounceMap.get(roomId)
  if (entry) {
    clearTimeout(entry.timeoutId)
    debounceMap.delete(roomId)
    console.debug(`Cleared debounce entry for room ${roomId}`)
  }
}

/**
 * Clear all debounce entries
 *
 * Useful for testing and cleanup.
 */
export function clearAllDebounce(): void {
  const size = debounceMap.size
  for (const [, entry] of debounceMap.entries()) {
    clearTimeout(entry.timeoutId)
  }
  debounceMap.clear()
  console.debug(`Cleared all debounce entries (${size} rooms)`)
}

/**
 * Get debounce statistics
 *
 * @returns Object with debounce stats
 */
export function getDebounceStats(): {
  activeCount: number
  roomIds: string[]
  averageWaitTime: number
} {
  const now = Date.now()
  let totalWaitTime = 0
  const roomIds = Array.from(debounceMap.keys())

  for (const [, entry] of debounceMap.entries()) {
    totalWaitTime += now - entry.firstRequestTime
  }

  return {
    activeCount: debounceMap.size,
    roomIds,
    averageWaitTime: debounceMap.size > 0 ? totalWaitTime / debounceMap.size : 0,
  }
}

/**
 * Preload room state into cache
 *
 * Useful when a room is first created or retrieved from Redis.
 *
 * @param room - Room state to cache
 */
export function preloadRoomStateCache(room: Room): void {
  const expiresAt = Date.now() + CACHE_CONFIG.TTL_MS
  roomStateCache.set(room.id, { room: cloneRoomForCache(room), expiresAt })
  startCacheCleanup()
  console.debug(`Preloaded room state cache for ${room.id}`)
}

/**
 * Start cache cleanup (exported for initialization)
 */
export function startRoomStateCacheCleanup(): void {
  startCacheCleanup()
}

/**
 * Stop cache cleanup (exported for graceful shutdown)
 */
export function stopRoomStateCacheCleanup(): void {
  stopCacheCleanup()
}

/**
 * Manually trigger cache cleanup (exported for testing/debugging)
 */
export function cleanupRoomStateCache(): void {
  cleanupExpiredCacheEntries()
  enforceCacheSizeLimit()
}

/**
 * Performance monitoring configuration
 */
export const BROADCAST_PERFORMANCE_CONFIG = {
  MAX_TOTAL_TIME_MS: 500, // Maximum total broadcast time
  MAX_DIFF_TIME_MS: 100, // Maximum diff calculation time
  MAX_BROADCAST_TIME_MS: 200, // Maximum actual broadcast time
  WARN_CLIENT_COUNT: 50, // Warn if broadcasting to too many clients
} as const

/**
 * Validate broadcast performance against requirements
 *
 * @param metrics - Broadcast performance metrics
 * @param roomId - Room identifier for logging
 */
export function validateBroadcastPerformance(metrics: BroadcastMetrics, roomId: string): void {
  const { diffCalculationTime, broadcastTime, totalTime, clientCount } = metrics

  if (totalTime > BROADCAST_PERFORMANCE_CONFIG.MAX_TOTAL_TIME_MS) {
    console.warn(
      `Broadcast for room ${roomId} exceeded total time limit: ` +
        `${totalTime}ms > ${BROADCAST_PERFORMANCE_CONFIG.MAX_TOTAL_TIME_MS}ms`
    )
  }

  if (diffCalculationTime > BROADCAST_PERFORMANCE_CONFIG.MAX_DIFF_TIME_MS) {
    console.warn(
      `Diff calculation for room ${roomId} exceeded time limit: ` +
        `${diffCalculationTime}ms > ${BROADCAST_PERFORMANCE_CONFIG.MAX_DIFF_TIME_MS}ms`
    )
  }

  if (broadcastTime > BROADCAST_PERFORMANCE_CONFIG.MAX_BROADCAST_TIME_MS) {
    console.warn(
      `Broadcast operation for room ${roomId} exceeded time limit: ` +
        `${broadcastTime}ms > ${BROADCAST_PERFORMANCE_CONFIG.MAX_BROADCAST_TIME_MS}ms`
    )
  }

  if (clientCount > BROADCAST_PERFORMANCE_CONFIG.WARN_CLIENT_COUNT) {
    console.warn(
      `Large number of clients in room ${roomId}: ${clientCount} > ` +
        `${BROADCAST_PERFORMANCE_CONFIG.WARN_CLIENT_COUNT}`
    )
  }
}

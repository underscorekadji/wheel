/**
 * Room State Broadcaster
 *
 * Manages automatic broadcasting of room state changes to namespace clients.
 * Ensures updates are broadcast within 500ms of state changes.
 */

import type { Room } from '@/types/room'
import type { Participant } from '@/types/participant'
import type { RoomStateUpdateEvent } from '@/types/socket'
import { getSocketServer } from './socket-server'
import {
  calculateRoomStateDiff,
  diffToSocketEvent,
  validateDiffPerformance,
} from './room-state-diff'

/**
 * Cache for storing previous room states to enable diff calculation
 */
const roomStateCache = new Map<string, Room>()

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
 * Broadcast room state changes to all clients in the room namespace
 *
 * Calculates diff from previous state and broadcasts only changes to improve performance.
 * Ensures broadcast completes within 500ms to meet performance requirement.
 *
 * @param room - Current room state
 * @param force - Force broadcast even if no changes detected
 * @returns Promise<BroadcastMetrics> Performance metrics for monitoring
 */
export async function broadcastRoomStateUpdate(
  room: Room,
  force = false
): Promise<BroadcastMetrics> {
  const startTime = performance.now()

  try {
    // Get Socket.IO server instance
    const io = getSocketServer()
    if (!io) {
      throw new Error('Socket.IO server not initialized')
    }

    // Calculate diff from previous state
    const diffStartTime = performance.now()
    const previousRoom = roomStateCache.get(room.id) || null
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

    // Count connected clients for metrics
    const sockets = await roomNamespace.fetchSockets()
    const clientCount = sockets.length

    if (clientCount === 0) {
      console.debug(`No clients connected to room ${room.id}, skipping broadcast`)
      return {
        diffCalculationTime,
        broadcastTime: 0,
        totalTime: performance.now() - startTime,
        clientCount: 0,
      }
    }

    // Convert diff to Socket.IO event data
    const eventData = diffToSocketEvent(room)

    // Broadcast the update
    const broadcastStartTime = performance.now()
    roomNamespace.emit('room_state_update', {
      ...eventData,
      roomId: room.id,
      timestamp: new Date().toISOString(),
    } as RoomStateUpdateEvent)

    const broadcastEndTime = performance.now()
    const broadcastTime = broadcastEndTime - broadcastStartTime

    // Update cache with current state
    roomStateCache.set(room.id, { ...room })

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
    const io = getSocketServer()
    if (!io) {
      throw new Error('Socket.IO server not initialized')
    }

    const namespace = `/room:${roomId}`
    const roomNamespace = io.of(namespace)

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
  return roomStateCache.get(roomId)
}

/**
 * Get cache statistics
 *
 * @returns Object with cache size and room IDs
 */
export function getCacheStats(): { size: number; roomIds: string[] } {
  return {
    size: roomStateCache.size,
    roomIds: Array.from(roomStateCache.keys()),
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
  console.debug(`Cleared all cached room states (${size} rooms)`)
}

/**
 * Preload room state into cache
 *
 * Useful when a room is first created or retrieved from Redis.
 *
 * @param room - Room state to cache
 */
export function preloadRoomStateCache(room: Room): void {
  roomStateCache.set(room.id, { ...room })
  console.debug(`Preloaded room state cache for ${room.id}`)
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

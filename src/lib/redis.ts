/**
 * Redis helper layer for room state persistence
 *
 * Provides helper functions for storing and retrieving room data in Redis
 * with automatic TTL (Time To Live) management for 8-hour room expiration.
 */

import Redis from 'ioredis'
import type { Room } from '@/types/room'

/**
 * Redis TTL in seconds (8 hours = 8 * 60 * 60 = 28800 seconds)
 * As specified in FR-2: Persist room state in Redis (TTL 8 h)
 */
export const ROOM_TTL_SECONDS = 8 * 60 * 60 // 28800 seconds

/**
 * Redis key prefix for room data
 * Using format: room:{id} for clear namespacing
 */
export const ROOM_KEY_PREFIX = 'room:'

/**
 * Redis client instance
 * Singleton pattern to ensure single connection throughout the application
 */
let redisClient: Redis | null = null

/**
 * Configuration for Redis connection
 */
interface RedisConfig {
  url?: string
  host?: string
  port?: number
  password?: string
  retryDelayOnFailover?: number
  maxRetriesPerRequest?: number
}

/**
 * Get Redis configuration from environment variables
 *
 * @returns Redis configuration object
 */
function getRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL

  if (redisUrl) {
    return { url: redisUrl }
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  }
}

/**
 * Initialize Redis client with proper error handling and configuration
 *
 * @returns Promise<Redis> Configured Redis client instance
 * @throws Error if Redis connection fails
 */
export async function getRedisClient(): Promise<Redis> {
  if (redisClient && redisClient.status === 'ready') {
    return redisClient
  }

  try {
    const config = getRedisConfig()

    redisClient = new Redis(config)

    // Setup error handlers
    redisClient.on('error', (error: unknown) => {
      if (error instanceof Error) {
        const { code, message, name } = error as Error & { code?: string }
        const connectionErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH']
        const errorType = code ?? name
        const prefix = connectionErrors.includes(code ?? '') ? 'connection' : 'operation'
        console.error(`Redis ${prefix} error [${errorType}]:`, message)
      } else {
        console.error('Unknown Redis error:', error)
      }
    })

    redisClient.on('connect', () => {
      console.log('Redis connected successfully')
    })

    redisClient.on('ready', () => {
      console.log('Redis ready for operations')
    })

    redisClient.on('close', () => {
      console.log('Redis connection closed')
    })

    // Test the connection
    await redisClient.ping()

    return redisClient
  } catch (error) {
    console.error('Failed to initialize Redis client:', error)
    throw new Error(
      `Redis initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generate Redis key for a room
 *
 * @param roomId - Unique room identifier
 * @returns Redis key in format "room:{id}"
 */
export function getRoomKey(roomId: string): string {
  return `${ROOM_KEY_PREFIX}${roomId}`
}

/**
 * Store room data in Redis with TTL
 *
 * Sets the room data in Redis with an 8-hour TTL for automatic cleanup.
 * The TTL is refreshed each time the room is updated.
 *
 * @param roomId - Unique room identifier
 * @param roomData - Room object to store
 * @returns Promise<boolean> True if successful, false otherwise
 * @throws Error if Redis operation fails
 */
export async function setRoom(roomId: string, roomData: Room): Promise<boolean> {
  try {
    const client = await getRedisClient()
    const key = getRoomKey(roomId)
    const serializedData = JSON.stringify(roomData)

    // Use SETEX to set value with TTL atomically
    const result = await client.setex(key, ROOM_TTL_SECONDS, serializedData)

    if (result !== 'OK') {
      console.error(`Failed to set room ${roomId}: Redis returned ${result}`)
      return false
    }

    console.log(`Room ${roomId} stored successfully with TTL ${ROOM_TTL_SECONDS}s`)
    return true
  } catch (error) {
    console.error(`Error storing room ${roomId}:`, error)
    throw new Error(
      `Failed to store room data: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Retrieve room data from Redis
 *
 * Gets room data from Redis and parses it back to Room object.
 * Returns null if room doesn't exist or has expired.
 *
 * @param roomId - Unique room identifier
 * @returns Promise<Room | null> Room object if found, null if not found or expired
 * @throws Error if Redis operation fails or data parsing fails
 */
export async function getRoom(roomId: string): Promise<Room | null> {
  try {
    const client = await getRedisClient()
    const key = getRoomKey(roomId)

    const serializedData = await client.get(key)

    if (!serializedData) {
      console.log(`Room ${roomId} not found or expired`)
      return null
    }

    try {
      const roomData = JSON.parse(serializedData) as Room

      // Parse Date objects from strings
      roomData.createdAt = new Date(roomData.createdAt)
      roomData.lastUpdatedAt = new Date(roomData.lastUpdatedAt)
      roomData.expiresAt = new Date(roomData.expiresAt)

      // Parse dates in selection history
      roomData.selectionHistory =
        roomData.selectionHistory?.map(entry => ({
          ...entry,
          selectedAt: new Date(entry.selectedAt),
        })) || []

      console.log(`Room ${roomId} retrieved successfully`)
      return roomData
    } catch (parseError) {
      console.error(`Error parsing room data for ${roomId}:`, parseError)
      throw new Error(
        `Failed to parse room data: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`
      )
    }
  } catch (error) {
    console.error(`Error retrieving room ${roomId}:`, error)
    throw new Error(
      `Failed to retrieve room data: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Check if a room exists in Redis
 *
 * @param roomId - Unique room identifier
 * @returns Promise<boolean> True if room exists, false otherwise
 * @throws Error if Redis operation fails
 */
export async function roomExists(roomId: string): Promise<boolean> {
  try {
    const client = await getRedisClient()
    const key = getRoomKey(roomId)

    const exists = await client.exists(key)
    return exists === 1
  } catch (error) {
    console.error(`Error checking room existence ${roomId}:`, error)
    throw new Error(
      `Failed to check room existence: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Delete a room from Redis
 *
 * @param roomId - Unique room identifier
 * @returns Promise<boolean> True if room was deleted, false if room didn't exist
 * @throws Error if Redis operation fails
 */
export async function deleteRoom(roomId: string): Promise<boolean> {
  try {
    const client = await getRedisClient()
    const key = getRoomKey(roomId)

    const deleted = await client.del(key)

    if (deleted === 1) {
      console.log(`Room ${roomId} deleted successfully`)
      return true
    } else {
      console.log(`Room ${roomId} was not found for deletion`)
      return false
    }
  } catch (error) {
    console.error(`Error deleting room ${roomId}:`, error)
    throw new Error(
      `Failed to delete room: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get remaining TTL for a room in seconds
 *
 * @param roomId - Unique room identifier
 * @returns Promise<number> TTL in seconds, -1 if no TTL, -2 if key doesn't exist
 * @throws Error if Redis operation fails
 */
export async function getRoomTTL(roomId: string): Promise<number> {
  try {
    const client = await getRedisClient()
    const key = getRoomKey(roomId)

    const ttl = await client.ttl(key)
    return ttl
  } catch (error) {
    console.error(`Error getting TTL for room ${roomId}:`, error)
    throw new Error(
      `Failed to get room TTL: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Close Redis connection
 * Should be called during application shutdown
 *
 * @returns Promise<void>
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit()
      redisClient = null
      console.log('Redis connection closed successfully')
    } catch (error) {
      console.error('Error closing Redis connection:', error)
      throw new Error(
        `Failed to close Redis connection: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

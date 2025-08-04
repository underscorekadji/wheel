/**
 * Enhanced Room Service with Automatic Broadcasting
 *
 * Extends the Redis room operations with automatic room state broadcasting
 * to ensure all clients receive updates within 500ms of state changes.
 */

import type { Room } from '@/types/room'
import type { Participant } from '@/types/participant'
import { getRoom, setRoom, roomExists, deleteRoom, getRoomTTL } from './redis'
import {
  broadcastRoomStateUpdate,
  clearRoomStateCache,
  preloadRoomStateCache,
} from './room-state-broadcaster'

/**
 * Enhanced room service that automatically broadcasts state changes
 */
export class RoomService {
  /**
   * Store room data and broadcast changes to connected clients
   *
   * @param roomId - Unique room identifier
   * @param roomData - Room object to store
   * @param forceUpdate - Force broadcast even if no changes detected
   * @returns Promise<boolean> True if successful
   * @throws Error if Redis operation or broadcasting fails
   */
  async setRoomWithBroadcast(
    roomId: string,
    roomData: Room,
    forceUpdate = false
  ): Promise<boolean> {
    const startTime = performance.now()

    try {
      // Store in Redis first
      const success = await setRoom(roomId, roomData)

      if (!success) {
        throw new Error('Failed to store room data in Redis')
      }

      // Broadcast the changes to connected clients
      try {
        const metrics = await broadcastRoomStateUpdate(roomData, forceUpdate)

        const totalTime = performance.now() - startTime
        console.info(
          `Room ${roomId} updated and broadcast completed in ${totalTime}ms ` +
            `(${metrics.clientCount} clients notified)`
        )

        return true
      } catch (broadcastError) {
        // Log broadcast error but don't fail the operation
        // The room data was successfully stored in Redis
        console.error(`Failed to broadcast room update for ${roomId}:`, broadcastError)
        return true // Still return success since Redis operation succeeded
      }
    } catch (error) {
      const totalTime = performance.now() - startTime
      console.error(`Failed to update room ${roomId} after ${totalTime}ms:`, error)
      throw error
    }
  }

  /**
   * Retrieve room data and optionally preload cache
   *
   * @param roomId - Unique room identifier
   * @param preloadCache - Whether to preload the room state cache
   * @returns Promise<Room | null> Room object if found
   */
  async getRoom(roomId: string, preloadCache = true): Promise<Room | null> {
    try {
      const room = await getRoom(roomId)

      if (room && preloadCache) {
        // Preload cache for future diff calculations
        preloadRoomStateCache(room)
      }

      return room
    } catch (error) {
      console.error(`Failed to retrieve room ${roomId}:`, error)
      throw error
    }
  }

  /**
   * Check if room exists
   *
   * @param roomId - Unique room identifier
   * @returns Promise<boolean> True if room exists
   */
  async roomExists(roomId: string): Promise<boolean> {
    return roomExists(roomId)
  }

  /**
   * Delete room and clean up cache
   *
   * @param roomId - Unique room identifier
   * @returns Promise<boolean> True if room was deleted
   */
  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      const success = await deleteRoom(roomId)

      if (success) {
        // Clear cached state
        clearRoomStateCache(roomId)
        console.info(`Room ${roomId} deleted and cache cleared`)
      }

      return success
    } catch (error) {
      console.error(`Failed to delete room ${roomId}:`, error)
      throw error
    }
  }

  /**
   * Get room TTL
   *
   * @param roomId - Unique room identifier
   * @returns Promise<number> TTL in seconds
   */
  async getRoomTTL(roomId: string): Promise<number> {
    return getRoomTTL(roomId)
  }

  /**
   * Update specific room properties and broadcast changes
   *
   * This is a convenience method for updating individual room properties
   * without needing to construct the full room object.
   *
   * @param roomId - Room identifier
   * @param updates - Partial room updates
   * @returns Promise<Room | null> Updated room object
   */
  async updateRoomProperties(
    roomId: string,
    updates: Partial<Pick<Room, 'status' | 'currentPresenterId' | 'lastUpdatedAt'>>
  ): Promise<Room | null> {
    try {
      // Get current room state
      const currentRoom = await this.getRoom(roomId, false)
      if (!currentRoom) {
        throw new Error(`Room ${roomId} not found`)
      }

      // Apply updates
      const updatedRoom: Room = {
        ...currentRoom,
        ...updates,
        lastUpdatedAt: new Date(),
      }

      // Store and broadcast changes
      const success = await this.setRoomWithBroadcast(roomId, updatedRoom)
      if (!success) {
        throw new Error('Failed to update room')
      }

      return updatedRoom
    } catch (error) {
      console.error(`Failed to update room properties for ${roomId}:`, error)
      throw error
    }
  }

  /**
   * Add participant to room and broadcast changes
   *
   * @param roomId - Room identifier
   * @param participant - Participant to add
   * @returns Promise<Room | null> Updated room object
   */
  async addParticipant(roomId: string, participant: Participant): Promise<Room | null> {
    try {
      const currentRoom = await this.getRoom(roomId, false)
      if (!currentRoom) {
        throw new Error(`Room ${roomId} not found`)
      }

      // Check if participant already exists
      const existingParticipant = currentRoom.participants.find(p => p.id === participant.id)
      if (existingParticipant) {
        throw new Error(`Participant ${participant.id} already exists in room ${roomId}`)
      }

      // Add participant
      const updatedRoom: Room = {
        ...currentRoom,
        participants: [...currentRoom.participants, participant],
        lastUpdatedAt: new Date(),
      }

      // Store and broadcast changes
      const success = await this.setRoomWithBroadcast(roomId, updatedRoom)
      if (!success) {
        throw new Error('Failed to add participant')
      }

      return updatedRoom
    } catch (error) {
      console.error(`Failed to add participant to room ${roomId}:`, error)
      throw error
    }
  }

  /**
   * Update participant in room and broadcast changes
   *
   * @param roomId - Room identifier
   * @param participantId - Participant ID to update
   * @param updates - Participant property updates
   * @returns Promise<Room | null> Updated room object
   */
  async updateParticipant(
    roomId: string,
    participantId: string,
    updates: Partial<Participant>
  ): Promise<Room | null> {
    try {
      const currentRoom = await this.getRoom(roomId, false)
      if (!currentRoom) {
        throw new Error(`Room ${roomId} not found`)
      }

      // Find and update participant
      const participantIndex = currentRoom.participants.findIndex(p => p.id === participantId)
      if (participantIndex === -1) {
        throw new Error(`Participant ${participantId} not found in room ${roomId}`)
      }

      const updatedParticipants = [...currentRoom.participants]
      updatedParticipants[participantIndex] = {
        ...updatedParticipants[participantIndex],
        ...updates,
        lastUpdatedAt: new Date(),
      }

      const updatedRoom: Room = {
        ...currentRoom,
        participants: updatedParticipants,
        lastUpdatedAt: new Date(),
      }

      // Store and broadcast changes
      const success = await this.setRoomWithBroadcast(roomId, updatedRoom)
      if (!success) {
        throw new Error('Failed to update participant')
      }

      return updatedRoom
    } catch (error) {
      console.error(`Failed to update participant ${participantId} in room ${roomId}:`, error)
      throw error
    }
  }

  /**
   * Remove participant from room and broadcast changes
   *
   * @param roomId - Room identifier
   * @param participantId - Participant ID to remove
   * @returns Promise<Room | null> Updated room object
   */
  async removeParticipant(roomId: string, participantId: string): Promise<Room | null> {
    try {
      const currentRoom = await this.getRoom(roomId, false)
      if (!currentRoom) {
        throw new Error(`Room ${roomId} not found`)
      }

      // Remove participant
      const updatedParticipants = currentRoom.participants.filter(p => p.id !== participantId)

      if (updatedParticipants.length === currentRoom.participants.length) {
        throw new Error(`Participant ${participantId} not found in room ${roomId}`)
      }

      const updatedRoom: Room = {
        ...currentRoom,
        participants: updatedParticipants,
        // Clear current presenter if it was the removed participant
        currentPresenterId:
          currentRoom.currentPresenterId === participantId ? null : currentRoom.currentPresenterId,
        lastUpdatedAt: new Date(),
      }

      // Store and broadcast changes
      const success = await this.setRoomWithBroadcast(roomId, updatedRoom)
      if (!success) {
        throw new Error('Failed to remove participant')
      }

      return updatedRoom
    } catch (error) {
      console.error(`Failed to remove participant ${participantId} from room ${roomId}:`, error)
      throw error
    }
  }

  /**
   * Set current presenter and broadcast changes
   *
   * @param roomId - Room identifier
   * @param presenterId - Participant ID to set as current presenter
   * @returns Promise<Room | null> Updated room object
   */
  async setCurrentPresenter(roomId: string, presenterId: string | null): Promise<Room | null> {
    try {
      const currentRoom = await this.getRoom(roomId, false)
      if (!currentRoom) {
        throw new Error(`Room ${roomId} not found`)
      }

      // Validate presenter exists if not null
      if (presenterId && !currentRoom.participants.find(p => p.id === presenterId)) {
        throw new Error(`Participant ${presenterId} not found in room ${roomId}`)
      }

      const updatedRoom: Room = {
        ...currentRoom,
        currentPresenterId: presenterId,
        lastUpdatedAt: new Date(),
      }

      // Store and broadcast changes
      const success = await this.setRoomWithBroadcast(roomId, updatedRoom)
      if (!success) {
        throw new Error('Failed to set current presenter')
      }

      return updatedRoom
    } catch (error) {
      console.error(`Failed to set current presenter in room ${roomId}:`, error)
      throw error
    }
  }
}

/**
 * Singleton instance of the room service
 */
export const roomService = new RoomService()

/**
 * Helper function to create room service instance
 * Useful for dependency injection or testing
 */
export function createRoomService(): RoomService {
  return new RoomService()
}

/**
 * Test suite for room state broadcaster
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  broadcastRoomStateUpdate,
  broadcastParticipantUpdate,
  clearRoomStateCache,
  getCachedRoomState,
  getCacheStats,
  clearAllRoomStateCache,
  preloadRoomStateCache,
  validateBroadcastPerformance,
} from '../room-state-broadcaster'
import { setSocketServer } from '../socket-server'
import type { Room, Participant } from '@/domain/compatibility-types'

// Mock Socket.IO
const mockEmit = vi.fn()
const mockFetchSockets = vi.fn()
const mockNamespace = {
  emit: mockEmit,
  fetchSockets: mockFetchSockets,
}
const mockSocketServer = {
  of: vi.fn(() => mockNamespace),
}

describe('Room State Broadcaster', () => {
  let testRoom: Room
  let testParticipant: Participant

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()

    // Setup mock Socket.IO server
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSocketServer(mockSocketServer as any)

    // Clear cache
    clearAllRoomStateCache()

    const now = new Date()

    testParticipant = {
      id: 'participant-1',
      name: 'Alice',
      status: 'queued',
      role: 'guest',
      joinedAt: now,
      lastUpdatedAt: now,
      lastSelectedAt: null,
    }

    testRoom = {
      id: 'room-123',
      name: 'Test Room',
      status: 'waiting',
      participants: [testParticipant],
      organizerId: 'organizer-1',
      createdAt: now,
      lastUpdatedAt: now,
      expiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000),
      currentPresenterId: null,
      wheelConfig: {
        minSpinDuration: 2000,
        maxSpinDuration: 5000,
        excludeFinished: true,
        allowRepeatSelections: false,
      },
      selectionHistory: [],
    }

    // Mock successful socket operations
    mockFetchSockets.mockResolvedValue([{ id: 'socket-1' }, { id: 'socket-2' }])
  })

  afterEach(() => {
    clearAllRoomStateCache()
  })

  describe('Room State Broadcasting', () => {
    it('should broadcast room state update successfully', async () => {
      const metrics = await broadcastRoomStateUpdate(testRoom)

      expect(metrics.clientCount).toBe(2)
      expect(metrics.totalTime).toBeGreaterThan(0)
      expect(metrics.diffCalculationTime).toBeGreaterThan(0)
      expect(metrics.broadcastTime).toBeGreaterThan(0)

      // Verify Socket.IO calls
      expect(mockSocketServer.of).toHaveBeenCalledWith('/room:room-123')
      expect(mockFetchSockets).toHaveBeenCalled()
      expect(mockEmit).toHaveBeenCalledWith(
        'room_state_update',
        expect.objectContaining({
          roomId: 'room-123',
          participants: testRoom.participants,
          sessionActive: false,
          timestamp: expect.any(String),
        })
      )
    })

    it('should handle no connected clients gracefully', async () => {
      mockFetchSockets.mockResolvedValue([])

      const metrics = await broadcastRoomStateUpdate(testRoom)

      expect(metrics.clientCount).toBe(0)
      expect(metrics.broadcastTime).toBe(0)
      expect(mockEmit).not.toHaveBeenCalled()
    })

    it('should skip broadcast when no changes and not forced', async () => {
      // First broadcast to establish cache
      await broadcastRoomStateUpdate(testRoom)
      mockEmit.mockClear()

      // Second broadcast with same state
      const metrics = await broadcastRoomStateUpdate(testRoom)

      expect(metrics.clientCount).toBe(0) // No broadcast means no clients counted
      expect(mockEmit).not.toHaveBeenCalled()
    })

    it('should force broadcast even when no changes', async () => {
      // First broadcast to establish cache
      await broadcastRoomStateUpdate(testRoom)
      mockEmit.mockClear()

      // Force broadcast with same state
      const metrics = await broadcastRoomStateUpdate(testRoom, true)

      expect(metrics.clientCount).toBe(2)
      expect(mockEmit).toHaveBeenCalled()
    })

    it('should handle Socket.IO server not initialized', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSocketServer(undefined as any)

      await expect(broadcastRoomStateUpdate(testRoom)).rejects.toThrow(
        'Socket.IO server not initialized'
      )
    })

    it('should complete broadcast within 500ms performance requirement', async () => {
      const metrics = await broadcastRoomStateUpdate(testRoom)

      expect(metrics.totalTime).toBeLessThan(500)
    })

    it('should warn when broadcast exceeds performance threshold', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Mock slow fetchSockets to simulate performance issue
      mockFetchSockets.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([{ id: 'socket-1' }]), 600))
      )

      await broadcastRoomStateUpdate(testRoom)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeding 500ms performance requirement')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Participant Broadcasting', () => {
    it('should broadcast participant update successfully', async () => {
      const success = await broadcastParticipantUpdate('room-123', testParticipant, 'added')

      expect(success).toBe(true)
      expect(mockSocketServer.of).toHaveBeenCalledWith('/room:room-123')
      expect(mockEmit).toHaveBeenCalledWith(
        'participant_update',
        expect.objectContaining({
          participant: testParticipant,
          action: 'added',
          roomId: 'room-123',
          timestamp: expect.any(String),
        })
      )
    })

    it('should handle no connected clients for participant update', async () => {
      mockFetchSockets.mockResolvedValue([])

      const success = await broadcastParticipantUpdate('room-123', testParticipant, 'updated')

      expect(success).toBe(false)
      expect(mockEmit).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSocketServer(undefined as any)

      const success = await broadcastParticipantUpdate('room-123', testParticipant, 'removed')

      expect(success).toBe(false)
    })
  })

  describe('Cache Management', () => {
    it('should cache room state after broadcast', async () => {
      await broadcastRoomStateUpdate(testRoom)

      const cachedRoom = getCachedRoomState('room-123')
      expect(cachedRoom).toEqual(testRoom)
    })

    it('should preload room state into cache', () => {
      preloadRoomStateCache(testRoom)

      const cachedRoom = getCachedRoomState('room-123')
      expect(cachedRoom).toEqual(testRoom)
    })

    it('should clear specific room from cache', () => {
      preloadRoomStateCache(testRoom)
      expect(getCachedRoomState('room-123')).toBeDefined()

      clearRoomStateCache('room-123')
      expect(getCachedRoomState('room-123')).toBeUndefined()
    })

    it('should provide cache statistics', () => {
      preloadRoomStateCache(testRoom)

      const stats = getCacheStats()
      expect(stats.size).toBe(1)
      expect(stats.roomIds).toContain('room-123')
    })

    it('should clear all cached room states', () => {
      preloadRoomStateCache(testRoom)
      preloadRoomStateCache({ ...testRoom, id: 'room-456' })

      expect(getCacheStats().size).toBe(2)

      clearAllRoomStateCache()
      expect(getCacheStats().size).toBe(0)
    })
  })

  describe('Performance Validation', () => {
    it('should validate performance within limits', () => {
      const metrics = {
        diffCalculationTime: 50,
        broadcastTime: 100,
        totalTime: 200,
        clientCount: 10,
      }

      expect(() => {
        validateBroadcastPerformance(metrics, 'test-room')
      }).not.toThrow()
    })

    it('should warn when total time exceeds limit', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const metrics = {
        diffCalculationTime: 50,
        broadcastTime: 100,
        totalTime: 600, // Exceeds 500ms limit
        clientCount: 10,
      }

      validateBroadcastPerformance(metrics, 'test-room')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeded total time limit: 600ms > 500ms')
      )

      consoleSpy.mockRestore()
    })

    it('should warn when diff calculation exceeds limit', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const metrics = {
        diffCalculationTime: 150, // Exceeds 100ms limit
        broadcastTime: 50,
        totalTime: 200,
        clientCount: 10,
      }

      validateBroadcastPerformance(metrics, 'test-room')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeded time limit: 150ms > 100ms')
      )

      consoleSpy.mockRestore()
    })

    it('should warn when broadcast operation exceeds limit', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const metrics = {
        diffCalculationTime: 50,
        broadcastTime: 250, // Exceeds 200ms limit
        totalTime: 300,
        clientCount: 10,
      }

      validateBroadcastPerformance(metrics, 'test-room')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeded time limit: 250ms > 200ms')
      )

      consoleSpy.mockRestore()
    })

    it('should warn when client count is high', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const metrics = {
        diffCalculationTime: 50,
        broadcastTime: 100,
        totalTime: 200,
        clientCount: 60, // Exceeds 50 client warning threshold
      }

      validateBroadcastPerformance(metrics, 'test-room')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Large number of clients in room test-room: 60 > 50')
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle Socket.IO emit errors', async () => {
      mockEmit.mockImplementation(() => {
        throw new Error('Emit failed')
      })

      await expect(broadcastRoomStateUpdate(testRoom)).rejects.toThrow(
        'Room state broadcast failed'
      )
    })

    it('should handle fetchSockets errors', async () => {
      mockFetchSockets.mockRejectedValue(new Error('Fetch sockets failed'))

      await expect(broadcastRoomStateUpdate(testRoom)).rejects.toThrow(
        'Room state broadcast failed'
      )
    })
  })
})

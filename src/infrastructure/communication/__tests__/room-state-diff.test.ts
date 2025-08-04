/**
 * Test suite for room state diff calculation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateRoomStateDiff,
  diffToSocketEvent,
  validateDiffPerformance,
  DIFF_PERFORMANCE_THRESHOLD_MS,
} from '../room-state-diff'
import type { Room, Participant } from '@/domain/compatibility-types'

describe('Room State Diff Calculation', () => {
  let baseRoom: Room
  let baseParticipant: Participant

  beforeEach(() => {
    const now = new Date()

    baseParticipant = {
      id: 'participant-1',
      name: 'Alice',
      status: 'queued',
      role: 'guest',
      joinedAt: now,
      lastUpdatedAt: now,
      lastSelectedAt: null,
    }

    baseRoom = {
      id: 'room-123',
      name: 'Test Room',
      status: 'waiting',
      participants: [baseParticipant],
      organizerId: 'organizer-1',
      createdAt: now,
      lastUpdatedAt: now,
      expiresAt: new Date(now.getTime() + 8 * 60 * 60 * 1000), // 8 hours
      currentPresenterId: null,
      wheelConfig: {
        minSpinDuration: 2000,
        maxSpinDuration: 5000,
        excludeFinished: true,
        allowRepeatSelections: false,
      },
      selectionHistory: [],
    }
  })

  describe('Initial State Diff', () => {
    it('should detect all changes when no previous state exists', () => {
      const diff = calculateRoomStateDiff(null, baseRoom)

      expect(diff.hasChanges).toBe(true)
      expect(diff.participantChanges).toHaveLength(1)
      expect(diff.participantChanges[0].type).toBe('added')
      expect(diff.participantChanges[0].participant).toEqual(baseParticipant)
      expect(diff.sessionActiveChange).toBe(false)
      expect(diff.currentPresenterChange).toBe(null)
    })

    it('should complete initial diff calculation within performance threshold', () => {
      const startTime = performance.now()
      calculateRoomStateDiff(null, baseRoom)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(DIFF_PERFORMANCE_THRESHOLD_MS)
    })
  })

  describe('Participant Changes', () => {
    it('should detect added participants', () => {
      const newParticipant: Participant = {
        id: 'participant-2',
        name: 'Bob',
        status: 'queued',
        role: 'guest',
        joinedAt: new Date(),
        lastUpdatedAt: new Date(),
        lastSelectedAt: null,
      }

      const updatedRoom: Room = {
        ...baseRoom,
        participants: [...baseRoom.participants, newParticipant],
      }

      const diff = calculateRoomStateDiff(baseRoom, updatedRoom)

      expect(diff.hasChanges).toBe(true)
      expect(diff.participantChanges).toHaveLength(1)
      expect(diff.participantChanges[0].type).toBe('added')
      expect(diff.participantChanges[0].participant).toEqual(newParticipant)
    })

    it('should detect updated participants', () => {
      const updatedParticipant: Participant = {
        ...baseParticipant,
        status: 'active',
        lastUpdatedAt: new Date(),
      }

      const updatedRoom: Room = {
        ...baseRoom,
        participants: [updatedParticipant],
      }

      const diff = calculateRoomStateDiff(baseRoom, updatedRoom)

      expect(diff.hasChanges).toBe(true)
      expect(diff.participantChanges).toHaveLength(1)
      expect(diff.participantChanges[0].type).toBe('updated')
      expect(diff.participantChanges[0].participant).toEqual(updatedParticipant)
      expect(diff.participantChanges[0].previousParticipant).toEqual(baseParticipant)
    })

    it('should detect removed participants', () => {
      const updatedRoom: Room = {
        ...baseRoom,
        participants: [],
      }

      const diff = calculateRoomStateDiff(baseRoom, updatedRoom)

      expect(diff.hasChanges).toBe(true)
      expect(diff.participantChanges).toHaveLength(1)
      expect(diff.participantChanges[0].type).toBe('removed')
      expect(diff.participantChanges[0].participant).toEqual(baseParticipant)
    })

    it('should handle multiple participant changes', () => {
      const newParticipant: Participant = {
        id: 'participant-2',
        name: 'Bob',
        status: 'queued',
        role: 'guest',
        joinedAt: new Date(),
        lastUpdatedAt: new Date(),
        lastSelectedAt: null,
      }

      const updatedParticipant: Participant = {
        ...baseParticipant,
        status: 'active',
        lastUpdatedAt: new Date(),
      }

      const updatedRoom: Room = {
        ...baseRoom,
        participants: [updatedParticipant, newParticipant],
      }

      const diff = calculateRoomStateDiff(baseRoom, updatedRoom)

      expect(diff.hasChanges).toBe(true)
      expect(diff.participantChanges).toHaveLength(2)

      const updatedChange = diff.participantChanges.find(c => c.type === 'updated')
      const addedChange = diff.participantChanges.find(c => c.type === 'added')

      expect(updatedChange).toBeDefined()
      expect(updatedChange?.participant.id).toBe('participant-1')
      expect(addedChange).toBeDefined()
      expect(addedChange?.participant.id).toBe('participant-2')
    })
  })

  describe('Room State Changes', () => {
    it('should detect session active change', () => {
      const updatedRoom: Room = {
        ...baseRoom,
        status: 'active',
      }

      const diff = calculateRoomStateDiff(baseRoom, updatedRoom)

      expect(diff.hasChanges).toBe(true)
      expect(diff.sessionActiveChange).toBe(true)
    })

    it('should detect current presenter change', () => {
      const updatedRoom: Room = {
        ...baseRoom,
        currentPresenterId: baseParticipant.id,
      }

      const diff = calculateRoomStateDiff(baseRoom, updatedRoom)

      expect(diff.hasChanges).toBe(true)
      expect(diff.currentPresenterChange).toBe(baseParticipant.id)
      expect(diff.wheelStateChanges).toBeDefined()
      expect(diff.wheelStateChanges?.selectedParticipantChanged).toBe(baseParticipant.id)
    })

    it('should detect no changes when room state is identical', () => {
      const identicalRoom: Room = { ...baseRoom }

      const diff = calculateRoomStateDiff(baseRoom, identicalRoom)

      expect(diff.hasChanges).toBe(false)
      expect(diff.participantChanges).toHaveLength(0)
      expect(diff.sessionActiveChange).toBe(null)
      expect(diff.currentPresenterChange).toBe(null)
      expect(diff.wheelStateChanges).toBe(null)
      expect(diff.timerStateChanges).toBe(null)
    })
  })

  describe('Performance Requirements', () => {
    it('should complete diff calculation within 100ms for small rooms', () => {
      const startTime = performance.now()
      calculateRoomStateDiff(null, baseRoom)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should complete diff calculation within 100ms for large rooms', () => {
      // Create a room with many participants
      const participants: Participant[] = []
      for (let i = 0; i < 50; i++) {
        participants.push({
          id: `participant-${i}`,
          name: `Participant ${i}`,
          status: 'queued',
          role: 'guest',
          joinedAt: new Date(),
          lastUpdatedAt: new Date(),
          lastSelectedAt: null,
        })
      }

      const largeRoom: Room = {
        ...baseRoom,
        participants,
      }

      const startTime = performance.now()
      calculateRoomStateDiff(null, largeRoom)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Socket Event Conversion', () => {
    it('should convert room state diff to socket event data', () => {
      calculateRoomStateDiff(null, baseRoom) // For test coverage
      const eventData = diffToSocketEvent(baseRoom)

      expect(eventData.participants).toEqual(baseRoom.participants)
      expect(eventData.currentPresenter).toBeUndefined()
      expect(eventData.wheelState.isSpinning).toBe(false)
      expect(eventData.timerState.isActive).toBe(false)
      expect(eventData.sessionActive).toBe(false)
    })

    it('should convert active room state to socket event data', () => {
      const activeRoom: Room = {
        ...baseRoom,
        status: 'active',
        currentPresenterId: baseParticipant.id,
      }

      calculateRoomStateDiff(baseRoom, activeRoom) // For test coverage
      const eventData = diffToSocketEvent(activeRoom)

      expect(eventData.currentPresenter).toBe(baseParticipant.id)
      expect(eventData.wheelState.selectedParticipant).toBe(baseParticipant.id)
      expect(eventData.timerState.isActive).toBe(true)
      expect(eventData.timerState.participantId).toBe(baseParticipant.id)
      expect(eventData.sessionActive).toBe(true)
    })
  })

  describe('Performance Validation', () => {
    it('should validate performance within threshold', () => {
      const startTime = performance.now()
      const endTime = startTime + 50 // 50ms

      expect(() => {
        validateDiffPerformance(startTime, endTime, 'test-room')
      }).not.toThrow()
    })

    it('should warn when performance exceeds threshold', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const startTime = performance.now()
      const endTime = startTime + 150 // 150ms (exceeds 100ms threshold)

      validateDiffPerformance(startTime, endTime, 'test-room')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Room state diff calculation took')
      )
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test-room'))
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeding threshold of 100ms')
      )

      consoleSpy.mockRestore()
    })
  })
})

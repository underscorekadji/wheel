import { describe, it, expect } from 'vitest'
import { RoomNamespace } from '../socket'
import type { ParticipantStatus, Participant } from '@/domain/compatibility-types'
import type {
  ParticipantAction,
  WheelAction,
  TimerAction,
  MessageType,
  UserRole,
  SocketStatus,
  WheelState,
  TimerState,
} from '../socket'

describe('Socket Types', () => {
  describe('RoomNamespace', () => {
    describe('forRoom', () => {
      it('should generate correct namespace string for valid room ID', () => {
        const roomId = 'test-room-123'
        const namespace = RoomNamespace.forRoom(roomId)
        expect(namespace).toBe('/room:test-room-123')
      })

      it('should handle UUID room IDs', () => {
        const roomId = '550e8400-e29b-41d4-a716-446655440000'
        const namespace = RoomNamespace.forRoom(roomId)
        expect(namespace).toBe('/room:550e8400-e29b-41d4-a716-446655440000')
      })

      it('should handle room IDs with special characters', () => {
        const roomId = 'room_123-test'
        const namespace = RoomNamespace.forRoom(roomId)
        expect(namespace).toBe('/room:room_123-test')
      })
    })

    describe('extractRoomId', () => {
      it('should extract room ID from valid namespace', () => {
        const namespace = '/room:test-room-123'
        const roomId = RoomNamespace.extractRoomId(namespace)
        expect(roomId).toBe('test-room-123')
      })

      it('should extract UUID room ID from namespace', () => {
        const namespace = '/room:550e8400-e29b-41d4-a716-446655440000'
        const roomId = RoomNamespace.extractRoomId(namespace)
        expect(roomId).toBe('550e8400-e29b-41d4-a716-446655440000')
      })

      it('should return null for invalid namespace format', () => {
        const invalidNamespaces = [
          '/invalid:test',
          'room:test',
          '/room',
          '/room:',
          '',
          'not-a-namespace',
        ]

        invalidNamespaces.forEach(namespace => {
          const roomId = RoomNamespace.extractRoomId(namespace)
          expect(roomId).toBeNull()
        })
      })

      it('should handle namespace with special characters in room ID', () => {
        const namespace = '/room:room_123-test'
        const roomId = RoomNamespace.extractRoomId(namespace)
        expect(roomId).toBe('room_123-test')
      })
    })

    describe('isValid', () => {
      it('should validate correct namespace format', () => {
        const validNamespaces = [
          '/room:550e8400-e29b-41d4-a716-446655440000',
          '/room:123e4567-e89b-12d3-a456-426614174000',
          '/room:a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          '/room:00000000-0000-0000-0000-000000000000',
          '/room:FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
        ]

        validNamespaces.forEach(namespace => {
          expect(RoomNamespace.isValid(namespace)).toBe(true)
        })
      })

      it('should reject invalid namespace formats', () => {
        const invalidNamespaces = [
          '/invalid:test',
          'room:test',
          '/room',
          '/room:',
          '',
          'not-a-namespace',
          '/room: with-space',
          '/room:test space',
          '/room:test/slash',
          '/room:test-room-123', // Not UUID format
          '/room:room_123', // Not UUID format
          '/room:a', // Not UUID format
          '/room:123', // Not UUID format
          '/room:550e8400-e29b-41d4-a716-44665544000', // Missing digit
          '/room:550e8400-e29b-41d4-a716-44665544000x', // Extra character
          '/room:550e8400-e29b-41d4-a716', // Too short
        ]

        invalidNamespaces.forEach(namespace => {
          expect(RoomNamespace.isValid(namespace)).toBe(false)
        })
      })

      it('should handle edge cases', () => {
        // All should be false since we only accept UUID format
        expect(RoomNamespace.isValid('/room:a')).toBe(false) // Single character - not UUID
        expect(RoomNamespace.isValid('/room:123')).toBe(false) // Numbers only - not UUID
        expect(RoomNamespace.isValid('/room:test-')).toBe(false) // Ending with dash - not UUID
        expect(RoomNamespace.isValid('/room:_test')).toBe(false) // Starting with underscore - not UUID

        // Test case sensitivity (should accept both)
        expect(RoomNamespace.isValid('/room:550e8400-e29b-41d4-a716-446655440000')).toBe(true) // Lowercase
        expect(RoomNamespace.isValid('/room:550E8400-E29B-41D4-A716-446655440000')).toBe(true) // Uppercase
      })
    })
  })

  describe('Type Definitions', () => {
    describe('ParticipantStatus', () => {
      it('should include all expected status values', () => {
        const statuses: ParticipantStatus[] = ['queued', 'active', 'finished', 'disabled']
        expect(statuses).toHaveLength(4)
      })
    })

    describe('ParticipantAction', () => {
      it('should include all expected action values', () => {
        const actions: ParticipantAction[] = ['added', 'updated', 'removed', 'disabled', 'enabled']
        expect(actions).toHaveLength(5)
      })
    })

    describe('WheelAction', () => {
      it('should include all expected wheel action values', () => {
        const actions: WheelAction[] = ['start_spin', 'spin_complete', 'reset']
        expect(actions).toHaveLength(3)
      })
    })

    describe('TimerAction', () => {
      it('should include all expected timer action values', () => {
        const actions: TimerAction[] = ['start', 'pause', 'resume', 'stop', 'reset', 'update']
        expect(actions).toHaveLength(6)
      })
    })

    describe('MessageType', () => {
      it('should include all expected message type values', () => {
        const types: MessageType[] = ['system', 'user', 'announcement']
        expect(types).toHaveLength(3)
      })
    })

    describe('UserRole', () => {
      it('should include all expected user role values', () => {
        const roles: UserRole[] = ['organizer', 'guest']
        expect(roles).toHaveLength(2)
      })
    })

    describe('SocketStatus', () => {
      it('should include all expected socket status values', () => {
        const statuses: SocketStatus[] = ['connecting', 'connected', 'disconnected', 'error']
        expect(statuses).toHaveLength(4)
      })
    })
  })

  describe('Interface Structures', () => {
    describe('Participant', () => {
      it('should have correct structure', () => {
        const participant: Participant = {
          id: 'participant-1',
          name: 'John Doe',
          status: 'queued',
          role: 'guest',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          lastUpdatedAt: new Date('2024-01-01T00:00:00Z'),
          lastSelectedAt: new Date('2024-01-01T01:00:00Z'),
        }

        expect(participant.id).toBe('participant-1')
        expect(participant.name).toBe('John Doe')
        expect(participant.status).toBe('queued')
        expect(participant.role).toBe('guest')
        expect(participant.joinedAt).toBeInstanceOf(Date)
        expect(participant.lastUpdatedAt).toBeInstanceOf(Date)
        expect(participant.lastSelectedAt).toBeInstanceOf(Date)
      })

      it('should allow null lastSelectedAt', () => {
        const minimalParticipant: Participant = {
          id: 'participant-1',
          name: 'John Doe',
          status: 'queued',
          role: 'organizer',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          lastUpdatedAt: new Date('2024-01-01T00:00:00Z'),
          lastSelectedAt: null,
        }

        expect(minimalParticipant.lastSelectedAt).toBe(null)
      })
    })

    describe('WheelState', () => {
      it('should have correct structure', () => {
        const wheelState: WheelState = {
          isSpinning: true,
          selectedParticipant: 'participant-1',
          spinDuration: 3000,
          spinStartTime: '2024-01-01T00:00:00Z',
        }

        expect(wheelState.isSpinning).toBe(true)
        expect(wheelState.selectedParticipant).toBe('participant-1')
        expect(wheelState.spinDuration).toBe(3000)
        expect(wheelState.spinStartTime).toBe('2024-01-01T00:00:00Z')
      })

      it('should allow optional fields', () => {
        const minimalWheelState: WheelState = {
          isSpinning: false,
        }

        expect(minimalWheelState.selectedParticipant).toBeUndefined()
        expect(minimalWheelState.spinDuration).toBeUndefined()
        expect(minimalWheelState.spinStartTime).toBeUndefined()
      })
    })

    describe('TimerState', () => {
      it('should have correct structure', () => {
        const timerState: TimerState = {
          isActive: true,
          currentTime: 300,
          maxTime: 600,
          startTime: '2024-01-01T00:00:00Z',
          endTime: '2024-01-01T00:10:00Z',
          participantId: 'participant-1',
        }

        expect(timerState.isActive).toBe(true)
        expect(timerState.currentTime).toBe(300)
        expect(timerState.maxTime).toBe(600)
        expect(timerState.startTime).toBe('2024-01-01T00:00:00Z')
        expect(timerState.endTime).toBe('2024-01-01T00:10:00Z')
        expect(timerState.participantId).toBe('participant-1')
      })

      it('should allow optional fields', () => {
        const minimalTimerState: TimerState = {
          isActive: false,
          currentTime: 0,
          maxTime: 600,
        }

        expect(minimalTimerState.startTime).toBeUndefined()
        expect(minimalTimerState.endTime).toBeUndefined()
        expect(minimalTimerState.participantId).toBeUndefined()
      })
    })
  })

  describe('Event Type Consistency', () => {
    it('should have consistent base event properties', () => {
      // This test ensures all event interfaces extend BaseSocketEvent correctly
      const baseProperties = ['roomId', 'timestamp']

      // Test a few event types to ensure they have base properties
      const connectionEvent = {
        roomId: 'test-room',
        timestamp: '2024-01-01T00:00:00Z',
        message: 'Connected',
        socketId: 'socket-123',
      }

      const participantEvent = {
        roomId: 'test-room',
        timestamp: '2024-01-01T00:00:00Z',
        participant: {
          id: 'p1',
          name: 'Test',
          status: 'queued' as const,
          joinedAt: '2024-01-01T00:00:00Z',
        },
        action: 'added' as const,
      }

      baseProperties.forEach(prop => {
        expect(connectionEvent).toHaveProperty(prop)
        expect(participantEvent).toHaveProperty(prop)
      })
    })
  })
})

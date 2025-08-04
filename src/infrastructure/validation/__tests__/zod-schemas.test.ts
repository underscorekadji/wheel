/**
 * Tests for runtime validation schemas
 */

import { describe, it, expect } from 'vitest'
import { validateRoom, safeValidateRoom, isValidRoom } from '../zod-schemas'
import type { Room } from '@/domain/compatibility-types'
import { RoomStatusEnum, ParticipantStatusEnum, ParticipantRoleEnum } from '@/domain'

describe('Validation Functions', () => {
  const validRoomData: Room = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Room',
    status: RoomStatusEnum.WAITING,
    participants: [
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'John Doe',
        status: ParticipantStatusEnum.QUEUED,
        role: ParticipantRoleEnum.ORGANIZER,
        joinedAt: new Date('2024-01-01T10:00:00Z'),
        lastUpdatedAt: new Date('2024-01-01T10:00:00Z'),
        lastSelectedAt: null,
      },
    ],
    organizerId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    lastUpdatedAt: new Date('2024-01-01T10:00:00Z'),
    expiresAt: new Date('2024-01-01T18:00:00Z'),
    currentPresenterId: null,
    wheelConfig: {
      minSpinDuration: 2000,
      maxSpinDuration: 5000,
      excludeFinished: true,
      allowRepeatSelections: false,
    },
    selectionHistory: [
      {
        id: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        participantId: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
        participantName: 'John Doe',
        initiatedBy: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        selectedAt: new Date('2024-01-01T11:00:00Z'),
        spinDuration: 3000,
      },
    ],
  }

  const validSerializedData = JSON.stringify(validRoomData)

  describe('validateRoom', () => {
    it('should validate and parse valid room data', () => {
      const parsedData = JSON.parse(validSerializedData)
      const result = validateRoom(parsedData)

      expect(result).toEqual(
        expect.objectContaining({
          id: validRoomData.id,
          name: validRoomData.name,
          status: validRoomData.status,
        })
      )

      // Check that dates are properly converted
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.lastUpdatedAt).toBeInstanceOf(Date)
      expect(result.expiresAt).toBeInstanceOf(Date)
      expect(result.participants[0].joinedAt).toBeInstanceOf(Date)
      expect(result.selectionHistory[0].selectedAt).toBeInstanceOf(Date)
    })

    it('should throw error for invalid room data', () => {
      const invalidData = {
        id: 'invalid-uuid',
        name: '',
        status: 'invalid-status',
      }

      expect(() => validateRoom(invalidData)).toThrow()
    })
  })

  describe('safeValidateRoom', () => {
    it('should return success for valid room data', () => {
      const parsedData = JSON.parse(validSerializedData)
      const result = safeValidateRoom(parsedData)

      expect(result.success).toBe(true)
      expect(result.error).toBe(null)
      expect(result.data).toEqual(
        expect.objectContaining({
          id: validRoomData.id,
          name: validRoomData.name,
          status: validRoomData.status,
        })
      )
    })

    it('should return error for invalid room data', () => {
      const invalidData = {
        id: 'invalid-uuid',
        name: '',
        status: 'invalid-status',
      }

      const result = safeValidateRoom(invalidData)

      expect(result.success).toBe(false)
      expect(result.data).toBe(null)
      expect(result.error).toBeDefined()
      expect(result.error?.issues).toBeDefined()
    })
  })

  describe('isValidRoom', () => {
    it('should return true for valid room data', () => {
      const parsedData = JSON.parse(validSerializedData)
      const result = isValidRoom(parsedData)

      expect(result).toBe(true)
    })

    it('should return false for invalid room data', () => {
      const invalidData = {
        id: 'invalid-uuid',
        name: '',
        status: 'invalid-status',
      }

      const result = isValidRoom(invalidData)

      expect(result).toBe(false)
    })
  })
})

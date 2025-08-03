/**
 * Runtime validation schemas for application data types
 *
 * Provides Zod schemas for validating data at runtime, particularly
 * when deserializing data from external sources like Redis.
 */

import { z } from 'zod'
import type { Room } from '@/types/room'

/**
 * Schema for RoomStatus enum validation
 */
const RoomStatusSchema = z.enum(['waiting', 'active', 'paused', 'completed', 'expired'])

/**
 * Schema for Participant validation
 */
const ParticipantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  status: z.enum(['queued', 'active', 'finished', 'disabled']),
  role: z.enum(['organizer', 'guest']),
  joinedAt: z.string().transform(str => new Date(str)),
  lastUpdatedAt: z.string().transform(str => new Date(str)),
  lastSelectedAt: z
    .string()
    .transform(str => new Date(str))
    .nullable(),
  isConnected: z.boolean(),
})

/**
 * Schema for WheelConfig validation
 */
const WheelConfigSchema = z
  .object({
    minSpinDuration: z.number().int().min(1000).max(10000),
    maxSpinDuration: z.number().int().min(2000).max(15000),
    excludeFinished: z.boolean(),
    allowRepeatSelections: z.boolean(),
  })
  .refine(data => data.minSpinDuration <= data.maxSpinDuration, {
    message: 'minSpinDuration must be less than or equal to maxSpinDuration',
    path: ['minSpinDuration'],
  })

/**
 * Schema for SelectionHistoryEntry validation
 */
const SelectionHistoryEntrySchema = z.object({
  id: z.uuid(),
  participantId: z.uuid(),
  participantName: z.string().min(1),
  initiatedBy: z.uuid(),
  selectedAt: z.string().transform(str => new Date(str)),
  spinDuration: z.number().int().min(0),
})

/**
 * Schema for Room validation
 */
const RoomSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  status: RoomStatusSchema,
  participants: z.array(ParticipantSchema),
  organizerId: z.uuid(),
  createdAt: z.string().transform(str => new Date(str)),
  lastUpdatedAt: z.string().transform(str => new Date(str)),
  expiresAt: z.string().transform(str => new Date(str)),
  currentPresenterId: z.uuid().nullable(),
  wheelConfig: WheelConfigSchema,
  selectionHistory: z.array(SelectionHistoryEntrySchema),
})

/**
 * Validates and parses room data from serialized JSON
 *
 * @param data - Serialized room data from Redis or other storage
 * @returns Validated Room object with proper Date objects
 * @throws ZodError if validation fails
 */
export function validateRoom(data: unknown): Room {
  return RoomSchema.parse(data)
}

/**
 * Safely validates room data and returns result with error handling
 *
 * @param data - Serialized room data to validate
 * @returns Object with success flag and either data or error
 */
export function safeValidateRoom(
  data: unknown
): { success: true; data: Room; error: null } | { success: false; data: null; error: z.ZodError } {
  const result = RoomSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data, error: null }
  } else {
    return { success: false, data: null, error: result.error }
  }
}

/**
 * Type guard function to check if data is a valid Room
 *
 * @param data - Data to check
 * @returns True if data is a valid Room, false otherwise
 */
export function isValidRoom(data: unknown): data is Room {
  return RoomSchema.safeParse(data).success
}

/**
 * Safe validation function for Participant data with error handling
 *
 * @param data - Participant data to validate
 * @returns Object with success flag and either data or error
 */
export function safeValidateParticipant(
  data: unknown
):
  | { success: true; data: z.infer<typeof ParticipantSchema>; error: null }
  | { success: false; data: null; error: z.ZodError } {
  const result = ParticipantSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data, error: null }
  } else {
    return { success: false, data: null, error: result.error }
  }
}

export { RoomSchema, ParticipantSchema, WheelConfigSchema, SelectionHistoryEntrySchema }

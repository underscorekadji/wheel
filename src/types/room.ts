/**
 * Room type definitions for the Wheel application
 */

import type { Participant } from './participant'

/**
 * Possible states for a presentation room
 *
 * - `waiting`: Room created, waiting for participants or organizer action
 * - `active`: Room is actively being used (wheel can be spun)
 * - `paused`: Room is temporarily paused (no wheel spins allowed)
 * - `completed`: Session completed, no longer accepting new participants
 * - `expired`: Room has exceeded TTL and will be cleaned up
 */
export type RoomStatus = 'waiting' | 'active' | 'paused' | 'completed' | 'expired'

/**
 * Room entity representing a presentation session
 *
 * A room contains participants and manages the spinning wheel functionality
 * for presenter selection. Rooms have an 8-hour TTL and auto-cleanup.
 */
export interface Room {
  /**
   * Unique room identifier (UUID v4 for 128-bit security)
   * Used in URLs and Redis keys
   */
  id: string

  /**
   * Display name/title for the room
   */
  name: string

  /**
   * Current status of the room
   * @see RoomStatus
   */
  status: RoomStatus

  /**
   * Array of participants in the room
   * Includes both organizers and guests
   */
  participants: Participant[]

  /**
   * ID of the participant who created and owns the room
   * This participant has organizer privileges
   */
  organizerId: string

  /**
   * Timestamp when the room was created
   */
  createdAt: Date

  /**
   * Timestamp when the room was last updated
   * Updated on participant changes, status changes, etc.
   */
  lastUpdatedAt: Date

  /**
   * Timestamp when the room will expire (TTL)
   * Rooms have an 8-hour TTL with auto-cleanup
   */
  expiresAt: Date

  /**
   * ID of the currently selected/active participant
   * Null if no one is currently selected
   */
  currentPresenterId: string | null

  /**
   * Configuration for the wheel behavior
   */
  wheelConfig: WheelConfig

  /**
   * History of wheel spins and selections
   */
  selectionHistory: SelectionHistoryEntry[]
}

/**
 * Configuration options for the spinning wheel
 */
export interface WheelConfig {
  /**
   * Minimum spin duration in milliseconds
   * @default 2000
   */
  minSpinDuration: number

  /**
   * Maximum spin duration in milliseconds
   * @default 5000
   */
  maxSpinDuration: number

  /**
   * Whether to automatically exclude finished participants from future spins
   * @default true
   */
  excludeFinished: boolean

  /**
   * Whether to allow the same participant to be selected multiple times
   * @default false
   */
  allowRepeatSelections: boolean
}

/**
 * Entry in the selection history tracking wheel spins
 */
export interface SelectionHistoryEntry {
  /**
   * Unique identifier for this selection event
   */
  id: string

  /**
   * ID of the participant who was selected
   */
  participantId: string

  /**
   * Name of the participant at time of selection
   * Stored for historical reference
   */
  participantName: string

  /**
   * ID of the participant who initiated the wheel spin
   */
  initiatedBy: string

  /**
   * Timestamp when the wheel spin occurred
   */
  selectedAt: Date

  /**
   * Duration of the wheel spin in milliseconds
   */
  spinDuration: number
}

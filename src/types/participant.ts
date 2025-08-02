/**
 * Participant type definitions for the Wheel application
 */

/**
 * Possible states for a participant in the presenter selection lifecycle
 *
 * - `queued`: Participant is waiting to be selected
 * - `active`: Participant is currently presenting/selected
 * - `finished`: Participant has completed their presentation
 * - `disabled`: Participant is temporarily disabled from selection
 */
export type ParticipantStatus = 'queued' | 'active' | 'finished' | 'disabled'

/**
 * Role types for participants in a room
 *
 * - `organizer`: Has full control over the room (can add/remove participants, spin wheel)
 * - `guest`: Read-only access to the room (can only view the wheel and participants)
 */
export type ParticipantRole = 'organizer' | 'guest'

/**
 * Participant entity representing an individual in a presentation room
 *
 * Tracks a participant's identity, current status in the selection lifecycle,
 * and their role-based permissions within the room.
 */
export interface Participant {
  /**
   * Unique identifier for the participant
   */
  id: string

  /**
   * Display name of the participant
   */
  name: string

  /**
   * Current status in the presentation lifecycle
   * @see ParticipantStatus
   */
  status: ParticipantStatus

  /**
   * Role determining permissions within the room
   * @see ParticipantRole
   */
  role: ParticipantRole

  /**
   * Timestamp when the participant joined the room
   */
  joinedAt: Date

  /**
   * Timestamp when the participant's status was last updated
   * Used for tracking status transitions and activity
   */
  lastUpdatedAt: Date

  /**
   * Optional timestamp when the participant was last selected/activated
   * Null if never selected
   */
  lastSelectedAt: Date | null
}

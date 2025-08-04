/**
 * Socket.IO TypeScript definitions for the wheel application
 *
 * This file defines the types for Socket.IO events and data structures
 * used in the room-based namespace communication system.
 */

import type { Participant } from './participant'

/**
 * Socket.IO event names used in room communication
 */
export interface SocketEventMap {
  // Connection events
  connected: (data: ConnectionEvent) => void
  user_connected: (data: UserConnectionEvent) => void
  user_disconnected: (data: UserDisconnectionEvent) => void
  connection_error: (data: ConnectionErrorEvent) => void

  // Room state events
  room_state_update: (data: RoomStateUpdateEvent) => void

  // Participant management events
  participant_update: (data: ParticipantUpdateEvent) => void

  // Wheel events
  wheel_spin: (data: WheelSpinEvent) => void

  // Timer events
  timer_update: (data: TimerUpdateEvent) => void

  // Messaging events
  room_message: (data: RoomMessageEvent) => void

  // Generic error event
  error: (data: ErrorEvent) => void
}

/**
 * Base event interface with common properties
 */
export interface BaseSocketEvent {
  roomId: string
  timestamp: string
}

/**
 * Connection event when a client connects to a room
 */
export interface ConnectionEvent extends BaseSocketEvent {
  message: string
  socketId: string
}

/**
 * Event when a user connects to the room
 */
export interface UserConnectionEvent extends BaseSocketEvent {
  socketId: string
}

/**
 * Event when a user disconnects from the room
 */
export interface UserDisconnectionEvent extends BaseSocketEvent {
  socketId: string
  reason: string
}

/**
 * Connection error event
 */
export interface ConnectionErrorEvent extends BaseSocketEvent {
  error: string
}

/**
 * Room state update event for broadcasting complete room state
 */
export interface RoomStateUpdateEvent extends BaseSocketEvent {
  participants: Participant[]
  currentPresenter?: string
  wheelState: WheelState
  timerState: TimerState
  sessionActive: boolean
}

/**
 * Participant update event for individual participant changes
 */
export interface ParticipantUpdateEvent extends BaseSocketEvent {
  participant: Participant
  action: ParticipantAction
}

/**
 * Actions that can be performed on participants
 */
export type ParticipantAction = 'added' | 'updated' | 'removed' | 'disabled' | 'enabled'

/**
 * Wheel state information
 */
export interface WheelState {
  isSpinning: boolean
  selectedParticipant?: string
  spinDuration?: number
  spinStartTime?: string
}

/**
 * Wheel spin event
 */
export interface WheelSpinEvent extends BaseSocketEvent {
  wheelState: WheelState
  selectedParticipant?: string
  spinDuration: number
  action: WheelAction
}

/**
 * Wheel actions
 */
export type WheelAction = 'start_spin' | 'spin_complete' | 'reset'

/**
 * Timer state information
 */
export interface TimerState {
  isActive: boolean
  currentTime: number // in seconds
  maxTime: number // in seconds
  startTime?: string
  endTime?: string
  participantId?: string
}

/**
 * Timer update event
 */
export interface TimerUpdateEvent extends BaseSocketEvent {
  timerState: TimerState
  action: TimerAction
}

/**
 * Timer actions
 */
export type TimerAction = 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'update'

/**
 * Room message event for communication
 */
export interface RoomMessageEvent extends BaseSocketEvent {
  message: string
  senderId: string
  senderName?: string
  messageType: MessageType
}

/**
 * Message types
 */
export type MessageType = 'system' | 'user' | 'announcement'

/**
 * Generic error event
 */
export interface ErrorEvent extends BaseSocketEvent {
  event: string
  error: string
}

/**
 * Socket connection configuration
 */
export interface SocketConfig {
  url: string
  roomId: string
  userId?: string
  userName?: string
  role: UserRole
}

/**
 * User roles in the room
 */
export type UserRole = 'organizer' | 'guest'

/**
 * Socket connection status
 */
export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Room namespace helper to generate namespace strings
 */
export class RoomNamespace {
  /**
   * Generate namespace string for a room
   * @param roomId - Room identifier
   * @returns Namespace string in format /room:{id}
   */
  static forRoom(roomId: string): string {
    return `/room:${roomId}`
  }

  /**
   * Extract room ID from namespace string
   * @param namespace - Namespace string
   * @returns Room ID or null if invalid format
   */
  static extractRoomId(namespace: string): string | null {
    const match = namespace.match(/^\/room:(.+)$/)
    return match ? match[1] : null
  }

  /**
   * Validate namespace format
   * @param namespace - Namespace string to validate
   * @returns True if valid namespace format (expects UUID room ID)
   */
  static isValid(namespace: string): boolean {
    return /^\/room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(namespace)
  }
}

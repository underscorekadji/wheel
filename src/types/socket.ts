/**
 * Socket.IO type definitions for the Wheel application
 *
 * Defines the structure for real-time communication between
 * organizers and guests in room-based namespaces.
 */

import type { Participant } from './participant'
import type { Room } from './room'

/**
 * Socket event names for room communication
 */
export interface SocketEvents {
  // Client to Server events
  'join-room': (data: JoinRoomData) => void
  'leave-room': (data: LeaveRoomData) => void
  'participant-add': (data: AddParticipantData) => void
  'participant-update': (data: UpdateParticipantData) => void
  'participant-remove': (data: RemoveParticipantData) => void
  'wheel-spin': (data: WheelSpinData) => void
  'timer-start': (data: TimerStartData) => void
  'timer-stop': () => void
  'room-status-update': (data: RoomStatusUpdateData) => void

  // Server to Client events
  'room-state': (data: RoomStateData) => void
  'participant-joined': (data: ParticipantJoinedData) => void
  'participant-left': (data: ParticipantLeftData) => void
  'participant-updated': (data: ParticipantUpdatedData) => void
  'participant-added': (data: ParticipantAddedData) => void
  'participant-removed': (data: ParticipantRemovedData) => void
  'wheel-spinning': (data: WheelSpinningData) => void
  'wheel-result': (data: WheelResultData) => void
  'timer-started': (data: TimerStartedData) => void
  'timer-stopped': (data: TimerStoppedData) => void
  'timer-tick': (data: TimerTickData) => void
  'room-updated': (data: RoomUpdatedData) => void
  error: (data: SocketErrorData) => void

  // Socket.IO built-in events
  disconnect: (reason: string) => void
  connect: () => void
  connect_error: (error: Error) => void
}

/**
 * Data structures for socket events
 */

// Join/Leave room events
export interface JoinRoomData {
  roomId: string
  participantName: string
  role: 'organizer' | 'guest'
}

export interface LeaveRoomData {
  roomId: string
  participantId: string
}

// Participant management events
export interface AddParticipantData {
  roomId: string
  participantName: string
  addedBy: string
}

export interface UpdateParticipantData {
  roomId: string
  participantId: string
  updates: Partial<Participant>
  updatedBy: string
}

export interface RemoveParticipantData {
  roomId: string
  participantId: string
  removedBy: string
}

// Wheel events
export interface WheelSpinData {
  roomId: string
  initiatedBy: string
  speakingTimeMinutes: number
}

export interface WheelSpinningData {
  roomId: string
  spinId: string
  duration: number
  initiatedBy: string
}

export interface WheelResultData {
  roomId: string
  spinId: string
  selectedParticipant: Participant
  speakingTimeMinutes: number
  initiatedBy: string
}

// Timer events
export interface TimerStartData {
  roomId: string
  participantId: string
  durationMinutes: number
  startedBy: string
}

export interface TimerStartedData {
  roomId: string
  participantId: string
  durationSeconds: number
  startTime: Date
  startedBy: string
}

export interface TimerStoppedData {
  roomId: string
  participantId: string
  remainingSeconds: number
  stoppedBy: string
}

export interface TimerTickData {
  roomId: string
  participantId: string
  remainingSeconds: number
}

// Room state events
export interface RoomStateData {
  room: Room
  participants: Participant[]
  currentTimer?: {
    participantId: string
    remainingSeconds: number
    isRunning: boolean
  }
}

export interface RoomStatusUpdateData {
  roomId: string
  status: Room['status']
  updatedBy: string
}

export interface RoomUpdatedData {
  roomId: string
  updates: Partial<Room>
  updatedBy: string
}

// Participant notification events
export interface ParticipantJoinedData {
  roomId: string
  participant: Participant
}

export interface ParticipantLeftData {
  roomId: string
  participantId: string
  participantName: string
}

export interface ParticipantUpdatedData {
  roomId: string
  participant: Participant
  updatedBy: string
}

export interface ParticipantAddedData {
  roomId: string
  participant: Participant
  addedBy: string
}

export interface ParticipantRemovedData {
  roomId: string
  participantId: string
  participantName: string
  removedBy: string
}

// Error handling
export interface SocketErrorData {
  code: string
  message: string
  details?: unknown
}

/**
 * Socket connection data
 */
export interface SocketConnectionData {
  roomId: string
  participantId: string
  role: 'organizer' | 'guest'
  connectedAt: Date
}

/**
 * Socket namespace pattern: room:{id}
 */
export type SocketNamespace = `room:${string}`

/**
 * Enhanced socket instance with typed events
 */
export interface TypedSocket {
  id: string
  data: SocketConnectionData
  emit: <K extends keyof SocketEvents>(event: K, data: Parameters<SocketEvents[K]>[0]) => void
  on: <K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) => void
  join: (room: string) => void
  leave: (room: string) => void
  disconnect: () => void
  broadcast: {
    emit: <K extends keyof SocketEvents>(event: K, data: Parameters<SocketEvents[K]>[0]) => void
  }
}

/**
 * Socket.IO namespace instance with typed events
 */
export interface TypedNamespace {
  to: (room: string) => {
    emit: <K extends keyof SocketEvents>(event: K, data: Parameters<SocketEvents[K]>[0]) => void
  }
  emit: <K extends keyof SocketEvents>(event: K, data: Parameters<SocketEvents[K]>[0]) => void
  sockets: Map<string, TypedSocket>
}

/**
 * Domain layer exports
 *
 * Provides centralized access to all domain entities, value objects, and services.
 */

// Entities
export { Room, SelectionHistoryEntry } from './room/entities/room'
export { Participant } from './room/entities/participant'

// Value Objects - IDs
export { RoomId, ParticipantId } from './shared/value-objects/id'

// Value Objects - Names
export { RoomName, ParticipantName } from './room/value-objects/names'

// Value Objects - Room Attributes
export { RoomStatus, RoomStatusEnum, WheelConfig } from './room/value-objects/room-attributes'

// Value Objects - Participant Attributes
export {
  ParticipantStatus,
  ParticipantStatusEnum,
  ParticipantRole,
  ParticipantRoleEnum,
} from './room/value-objects/participant-attributes'

// Repository Interface
export type { RoomRepository } from './room/repository/room-repository'

// Domain Services
export { WheelSpinService } from './room/services/wheel-spin-service'
export { ParticipantManagementService } from './room/services/participant-management-service'

// Domain Events
export type { DomainEvent, DomainEventPublisher } from './shared/events/domain-events'
export {
  RoomCreatedEvent,
  ParticipantJoinedEvent,
  ParticipantLeftEvent,
} from './room/events/room-events'

// Type aliases for compatibility
export type { Room as RoomEntity } from './room/entities/room'
export type { Participant as ParticipantEntity } from './room/entities/participant'

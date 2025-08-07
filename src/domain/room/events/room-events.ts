import { BaseDomainEvent } from '../../shared/events/domain-events'

/**
 * Event fired when a room is created
 */
export class RoomCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly roomName: string,
    public readonly organizerId: string,
    public readonly organizerName: string
  ) {
    super(aggregateId, 'RoomCreated')
  }
}

/**
 * Event fired when a participant joins a room
 */
export class ParticipantJoinedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly participantId: string,
    public readonly participantName: string,
    public readonly role: string
  ) {
    super(aggregateId, 'ParticipantJoined')
  }
}

/**
 * Event fired when a participant leaves a room
 */
export class ParticipantLeftEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly participantId: string,
    public readonly participantName: string
  ) {
    super(aggregateId, 'ParticipantLeft')
  }
}

/**
 * Event fired when the wheel is spun
 */
export class WheelSpunEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly selectedParticipantId: string,
    public readonly selectedParticipantName: string,
    public readonly spinInitiatedBy: string,
    public readonly spinDuration: number
  ) {
    super(aggregateId, 'WheelSpun')
  }
}

/**
 * Event fired when a participant's status changes
 */
export class ParticipantStatusChangedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly participantId: string,
    public readonly participantName: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {
    super(aggregateId, 'ParticipantStatusChanged')
  }
}

/**
 * Event fired when a presentation session is completed
 */
export class SessionCompletedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly participantCount: number,
    public readonly selectionCount: number
  ) {
    super(aggregateId, 'SessionCompleted')
  }
}

/**
 * Event fired when a room's status changes
 */
export class RoomStatusChangedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string
  ) {
    super(aggregateId, 'RoomStatusChanged')
  }
}

/**
 * Event fired when wheel configuration is updated
 */
export class WheelConfigurationUpdatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly updatedBy: string,
    public readonly configChanges: {
      minSpinDuration?: number
      maxSpinDuration?: number
      excludeFinished?: boolean
      allowRepeatSelections?: boolean
    }
  ) {
    super(aggregateId, 'WheelConfigurationUpdated')
  }
}

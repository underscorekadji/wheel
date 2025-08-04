/**
 * Participant Status value object
 */
export enum ParticipantStatusEnum {
  QUEUED = 'queued',
  ACTIVE = 'active',
  FINISHED = 'finished',
  DISABLED = 'disabled',
}

export class ParticipantStatus {
  constructor(private readonly _value: ParticipantStatusEnum) {}

  get value(): ParticipantStatusEnum {
    return this._value
  }

  isQueued(): boolean {
    return this._value === ParticipantStatusEnum.QUEUED
  }

  isActive(): boolean {
    return this._value === ParticipantStatusEnum.ACTIVE
  }

  isFinished(): boolean {
    return this._value === ParticipantStatusEnum.FINISHED
  }

  isDisabled(): boolean {
    return this._value === ParticipantStatusEnum.DISABLED
  }

  canBeSelected(): boolean {
    return this.isQueued()
  }

  canPresent(): boolean {
    return this.isQueued() || this.isActive()
  }

  equals(other: ParticipantStatus): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }

  static queued(): ParticipantStatus {
    return new ParticipantStatus(ParticipantStatusEnum.QUEUED)
  }

  static active(): ParticipantStatus {
    return new ParticipantStatus(ParticipantStatusEnum.ACTIVE)
  }

  static finished(): ParticipantStatus {
    return new ParticipantStatus(ParticipantStatusEnum.FINISHED)
  }

  static disabled(): ParticipantStatus {
    return new ParticipantStatus(ParticipantStatusEnum.DISABLED)
  }
}

/**
 * Participant Role value object
 */
export enum ParticipantRoleEnum {
  ORGANIZER = 'organizer',
  GUEST = 'guest',
}

export class ParticipantRole {
  constructor(private readonly _value: ParticipantRoleEnum) {}

  get value(): ParticipantRoleEnum {
    return this._value
  }

  isOrganizer(): boolean {
    return this._value === ParticipantRoleEnum.ORGANIZER
  }

  isGuest(): boolean {
    return this._value === ParticipantRoleEnum.GUEST
  }

  canManageRoom(): boolean {
    return this.isOrganizer()
  }

  canSpinWheel(): boolean {
    return this.isOrganizer()
  }

  equals(other: ParticipantRole): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }

  static organizer(): ParticipantRole {
    return new ParticipantRole(ParticipantRoleEnum.ORGANIZER)
  }

  static guest(): ParticipantRole {
    return new ParticipantRole(ParticipantRoleEnum.GUEST)
  }
}

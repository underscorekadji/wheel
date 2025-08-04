import { ParticipantId } from '../../shared/value-objects/id'
import { ParticipantName } from '../value-objects/names'
import {
  ParticipantStatus,
  ParticipantRole,
  ParticipantStatusEnum,
  ParticipantRoleEnum,
} from '../value-objects/participant-attributes'

/**
 * Participant Domain Entity
 *
 * Represents an individual participant in a presentation room.
 * Contains behavior for managing participant lifecycle and status transitions.
 */
export class Participant {
  private _lastSelectedAt: Date | null

  constructor(
    private readonly _id: ParticipantId,
    private _name: ParticipantName,
    private _status: ParticipantStatus,
    private readonly _role: ParticipantRole,
    private readonly _joinedAt: Date,
    private _lastUpdatedAt: Date,
    lastSelectedAt: Date | null = null
  ) {
    this._lastSelectedAt = lastSelectedAt
  }

  // Getters
  get id(): ParticipantId {
    return this._id
  }

  get name(): ParticipantName {
    return this._name
  }

  get status(): ParticipantStatus {
    return this._status
  }

  get role(): ParticipantRole {
    return this._role
  }

  get joinedAt(): Date {
    return this._joinedAt
  }

  get lastUpdatedAt(): Date {
    return this._lastUpdatedAt
  }

  get lastSelectedAt(): Date | null {
    return this._lastSelectedAt
  }

  // Business Methods
  isEligibleForSelection(allowRepeatSelections: boolean): boolean {
    if (!this._status.canBeSelected()) {
      return false
    }

    if (!allowRepeatSelections && this._lastSelectedAt !== null) {
      return false
    }

    return true
  }

  canBeManaged(): boolean {
    return !this._status.isFinished()
  }

  select(): void {
    if (!this._status.canBeSelected()) {
      throw new Error(`Cannot select participant with status: ${this._status.value}`)
    }

    this._status = ParticipantStatus.active()
    this._lastSelectedAt = new Date()
    this._lastUpdatedAt = new Date()
  }

  markAsFinished(): void {
    if (!this._status.isActive()) {
      throw new Error('Only active participants can be marked as finished')
    }

    this._status = ParticipantStatus.finished()
    this._lastUpdatedAt = new Date()
  }

  disable(): void {
    if (this._status.isFinished()) {
      throw new Error('Cannot disable participant who has already finished')
    }

    this._status = ParticipantStatus.disabled()
    this._lastUpdatedAt = new Date()
  }

  enable(): void {
    if (!this._status.isDisabled()) {
      throw new Error('Can only enable disabled participants')
    }

    this._status = ParticipantStatus.queued()
    this._lastUpdatedAt = new Date()
  }

  updateName(newName: ParticipantName): void {
    if (!this._name.equals(newName)) {
      this._name = newName
      this._lastUpdatedAt = new Date()
    }
  }

  equals(other: Participant): boolean {
    return this._id.equals(other._id)
  }

  // Factory Methods
  static createOrganizer(id: ParticipantId, name: ParticipantName): Participant {
    const now = new Date()
    return new Participant(
      id,
      name,
      ParticipantStatus.queued(),
      ParticipantRole.organizer(),
      now,
      now
    )
  }

  static createGuest(id: ParticipantId, name: ParticipantName): Participant {
    const now = new Date()
    return new Participant(id, name, ParticipantStatus.queued(), ParticipantRole.guest(), now, now)
  }

  // Conversion Methods (for compatibility with existing system)
  toPlainObject(): {
    id: string
    name: string
    status: string
    role: string
    joinedAt: Date
    lastUpdatedAt: Date
    lastSelectedAt: Date | null
  } {
    return {
      id: this._id.value,
      name: this._name.value,
      status: this._status.value,
      role: this._role.value,
      joinedAt: this._joinedAt,
      lastUpdatedAt: this._lastUpdatedAt,
      lastSelectedAt: this._lastSelectedAt,
    }
  }

  static fromPlainObject(data: {
    id: string
    name: string
    status: string
    role: string
    joinedAt: Date
    lastUpdatedAt: Date
    lastSelectedAt: Date | null
  }): Participant {
    return new Participant(
      new ParticipantId(data.id),
      new ParticipantName(data.name),
      new ParticipantStatus(data.status as ParticipantStatusEnum),
      new ParticipantRole(data.role as ParticipantRoleEnum),
      data.joinedAt,
      data.lastUpdatedAt,
      data.lastSelectedAt
    )
  }
}

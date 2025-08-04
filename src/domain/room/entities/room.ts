import { RoomId, ParticipantId } from '../../shared/value-objects/id'
import { RoomName, ParticipantName } from '../value-objects/names'
import { RoomStatus, WheelConfig } from '../value-objects/room-attributes'
import { Participant } from './participant'

/**
 * Selection History Entry value object
 */
export class SelectionHistoryEntry {
  constructor(
    public readonly id: string,
    public readonly participantId: ParticipantId,
    public readonly participantName: string,
    public readonly initiatedBy: ParticipantId,
    public readonly selectedAt: Date,
    public readonly spinDuration: number
  ) {}

  equals(other: SelectionHistoryEntry): boolean {
    return this.id === other.id
  }
}

/**
 * Room Domain Entity (Aggregate Root)
 *
 * The Room is the main aggregate root that manages the presentation session.
 * It contains participants and manages the spinning wheel functionality.
 */
export class Room {
  private static readonly TTL_HOURS = 8

  constructor(
    private readonly _id: RoomId,
    private _name: RoomName,
    private _status: RoomStatus,
    private _participants: Participant[],
    private readonly _organizerId: ParticipantId,
    private readonly _createdAt: Date,
    private _lastUpdatedAt: Date,
    private readonly _expiresAt: Date,
    private _currentPresenterId: ParticipantId | null,
    private _wheelConfig: WheelConfig,
    private _selectionHistory: SelectionHistoryEntry[]
  ) {
    this.validateInvariants()
  }

  // Getters
  get id(): RoomId {
    return this._id
  }

  get name(): RoomName {
    return this._name
  }

  get status(): RoomStatus {
    return this._status
  }

  get participants(): readonly Participant[] {
    return [...this._participants]
  }

  get organizerId(): ParticipantId {
    return this._organizerId
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get lastUpdatedAt(): Date {
    return this._lastUpdatedAt
  }

  get expiresAt(): Date {
    return this._expiresAt
  }

  get currentPresenterId(): ParticipantId | null {
    return this._currentPresenterId
  }

  get wheelConfig(): WheelConfig {
    return this._wheelConfig
  }

  get selectionHistory(): readonly SelectionHistoryEntry[] {
    return [...this._selectionHistory]
  }

  // Business Logic Methods
  addParticipant(participant: Participant): void {
    if (!this._status.canAcceptParticipants()) {
      throw new Error(`Cannot add participants to room with status: ${this._status.value}`)
    }

    if (this.hasParticipant(participant.id)) {
      throw new Error(`Participant ${participant.id.value} already exists in room`)
    }

    this._participants.push(participant)
    this._lastUpdatedAt = new Date()

    // Activate room if it was waiting and now has participants
    if (this._status.isWaiting() && this._participants.length > 0) {
      this._status = RoomStatus.active()
    }
  }

  removeParticipant(participantId: ParticipantId): void {
    if (!this._status.allowsModification()) {
      throw new Error(`Cannot modify room with status: ${this._status.value}`)
    }

    const index = this._participants.findIndex(p => p.id.equals(participantId))
    if (index === -1) {
      throw new Error(`Participant ${participantId.value} not found in room`)
    }

    // Cannot remove the organizer
    if (participantId.equals(this._organizerId)) {
      throw new Error('Cannot remove the room organizer')
    }

    this._participants.splice(index, 1)
    this._lastUpdatedAt = new Date()

    // Clear current presenter if it was the removed participant
    if (this._currentPresenterId?.equals(participantId)) {
      this._currentPresenterId = null
    }
  }

  updateParticipant(
    participantId: ParticipantId,
    updateFn: (participant: Participant) => void
  ): void {
    if (!this._status.allowsModification()) {
      throw new Error(`Cannot modify room with status: ${this._status.value}`)
    }

    const participant = this.getParticipant(participantId)
    if (!participant) {
      throw new Error(`Participant ${participantId.value} not found in room`)
    }

    updateFn(participant)
    this._lastUpdatedAt = new Date()
  }

  spinWheel(initiatedBy: ParticipantId): SelectionHistoryEntry {
    this.validateWheelSpin(initiatedBy)

    const eligibleParticipants = this.getEligibleParticipants()
    if (eligibleParticipants.length === 0) {
      throw new Error('No eligible participants available for selection')
    }

    // Randomly select a participant
    const selectedParticipant = this.selectRandomParticipant(eligibleParticipants)

    // Update participant status
    selectedParticipant.select()
    this._currentPresenterId = selectedParticipant.id

    // Generate spin duration
    const spinDuration = this._wheelConfig.generateSpinDuration()

    // Create history entry
    const historyEntry = new SelectionHistoryEntry(
      crypto.randomUUID(),
      selectedParticipant.id,
      selectedParticipant.name.value,
      initiatedBy,
      new Date(),
      spinDuration
    )

    this._selectionHistory.push(historyEntry)
    this._lastUpdatedAt = new Date()

    return historyEntry
  }

  markCurrentPresenterAsFinished(): void {
    if (!this._currentPresenterId) {
      throw new Error('No current presenter to mark as finished')
    }

    const presenter = this.getParticipant(this._currentPresenterId)
    if (!presenter) {
      throw new Error('Current presenter not found')
    }

    presenter.markAsFinished()
    this._currentPresenterId = null
    this._lastUpdatedAt = new Date()

    // Check if session is complete
    if (this.areAllParticipantsFinished()) {
      this._status = RoomStatus.completed()
    }
  }

  resetSession(): void {
    if (!this.canResetSession()) {
      throw new Error('Session can only be reset when completed')
    }

    // Reset all participants to queued status
    this._participants.forEach(participant => {
      if (participant.status.isFinished()) {
        participant.updateName(participant.name) // This will trigger the lastUpdatedAt update
        // We need a proper reset method on participant
      }
    })

    this._currentPresenterId = null
    this._selectionHistory = []
    this._status = RoomStatus.active()
    this._lastUpdatedAt = new Date()
  }

  updateWheelConfig(newConfig: WheelConfig): void {
    if (!this._status.allowsModification()) {
      throw new Error(`Cannot modify room with status: ${this._status.value}`)
    }

    this._wheelConfig = newConfig
    this._lastUpdatedAt = new Date()
  }

  pause(): void {
    if (!this._status.isActive()) {
      throw new Error('Can only pause active rooms')
    }

    this._status = RoomStatus.paused()
    this._lastUpdatedAt = new Date()
  }

  resume(): void {
    if (!this._status.isPaused()) {
      throw new Error('Can only resume paused rooms')
    }

    this._status = RoomStatus.active()
    this._lastUpdatedAt = new Date()
  }

  // Query Methods
  hasParticipant(participantId: ParticipantId): boolean {
    return this._participants.some(p => p.id.equals(participantId))
  }

  getParticipant(participantId: ParticipantId): Participant | undefined {
    return this._participants.find(p => p.id.equals(participantId))
  }

  getOrganizer(): Participant | undefined {
    return this.getParticipant(this._organizerId)
  }

  getCurrentPresenter(): Participant | undefined {
    return this._currentPresenterId ? this.getParticipant(this._currentPresenterId) : undefined
  }

  getEligibleParticipants(): Participant[] {
    return this._participants.filter(
      p =>
        p.isEligibleForSelection(this._wheelConfig.allowRepeatSelections) &&
        (!this._wheelConfig.excludeFinished || !p.status.isFinished())
    )
  }

  areAllParticipantsFinished(): boolean {
    const nonOrganizerParticipants = this._participants.filter(p => !p.id.equals(this._organizerId))
    return (
      nonOrganizerParticipants.length > 0 &&
      nonOrganizerParticipants.every(p => p.status.isFinished() || p.status.isDisabled())
    )
  }

  canResetSession(): boolean {
    return this._status.isCompleted()
  }

  isExpired(): boolean {
    return new Date() > this._expiresAt || this._status.isExpired()
  }

  // Private Methods
  private validateInvariants(): void {
    // Ensure organizer exists in participants
    const organizer = this.getParticipant(this._organizerId)
    if (!organizer) {
      throw new Error('Room organizer must be a participant in the room')
    }

    if (!organizer.role.isOrganizer()) {
      throw new Error('Room organizer must have organizer role')
    }

    // Ensure current presenter exists in participants if set
    if (this._currentPresenterId && !this.hasParticipant(this._currentPresenterId)) {
      throw new Error('Current presenter must be a participant in the room')
    }
  }

  private validateWheelSpin(initiatedBy: ParticipantId): void {
    if (!this._status.canSpinWheel()) {
      throw new Error(`Cannot spin wheel in room with status: ${this._status.value}`)
    }

    const initiator = this.getParticipant(initiatedBy)
    if (!initiator) {
      throw new Error('Wheel spin initiator must be a participant in the room')
    }

    if (!initiator.role.canSpinWheel()) {
      throw new Error('Only organizers can spin the wheel')
    }

    if (this._currentPresenterId) {
      throw new Error('Cannot spin wheel while someone is currently presenting')
    }
  }

  private selectRandomParticipant(eligibleParticipants: Participant[]): Participant {
    const randomIndex = Math.floor(Math.random() * eligibleParticipants.length)
    return eligibleParticipants[randomIndex]
  }

  // Factory Methods
  static create(
    id: RoomId,
    name: RoomName,
    organizerId: ParticipantId,
    organizerName: string
  ): Room {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + Room.TTL_HOURS * 60 * 60 * 1000)

    // Create organizer participant
    const organizer = Participant.createOrganizer(organizerId, new ParticipantName(organizerName))

    return new Room(
      id,
      name,
      RoomStatus.waiting(),
      [organizer],
      organizerId,
      now,
      now,
      expiresAt,
      null,
      WheelConfig.createDefault(),
      []
    )
  }

  // Conversion Methods (for compatibility with existing system)
  toPlainObject(): Record<string, unknown> {
    return {
      id: this._id.value,
      name: this._name.value,
      status: this._status.value,
      participants: this._participants.map(p => p.toPlainObject()),
      organizerId: this._organizerId.value,
      createdAt: this._createdAt,
      lastUpdatedAt: this._lastUpdatedAt,
      expiresAt: this._expiresAt,
      currentPresenterId: this._currentPresenterId?.value || null,
      wheelConfig: {
        minSpinDuration: this._wheelConfig.minSpinDuration,
        maxSpinDuration: this._wheelConfig.maxSpinDuration,
        excludeFinished: this._wheelConfig.excludeFinished,
        allowRepeatSelections: this._wheelConfig.allowRepeatSelections,
      },
      selectionHistory: this._selectionHistory.map(entry => ({
        id: entry.id,
        participantId: entry.participantId.value,
        participantName: entry.participantName,
        initiatedBy: entry.initiatedBy.value,
        selectedAt: entry.selectedAt,
        spinDuration: entry.spinDuration,
      })),
    }
  }
}

/**
 * Room Status value object
 */
export enum RoomStatusEnum {
  WAITING = 'waiting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export class RoomStatus {
  constructor(private readonly _value: RoomStatusEnum) {}

  get value(): RoomStatusEnum {
    return this._value
  }

  isWaiting(): boolean {
    return this._value === RoomStatusEnum.WAITING
  }

  isActive(): boolean {
    return this._value === RoomStatusEnum.ACTIVE
  }

  isPaused(): boolean {
    return this._value === RoomStatusEnum.PAUSED
  }

  isCompleted(): boolean {
    return this._value === RoomStatusEnum.COMPLETED
  }

  isExpired(): boolean {
    return this._value === RoomStatusEnum.EXPIRED
  }

  canAcceptParticipants(): boolean {
    return this.isWaiting() || this.isActive() || this.isPaused()
  }

  canSpinWheel(): boolean {
    return this.isActive()
  }

  allowsModification(): boolean {
    return !this.isCompleted() && !this.isExpired()
  }

  equals(other: RoomStatus): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }

  static waiting(): RoomStatus {
    return new RoomStatus(RoomStatusEnum.WAITING)
  }

  static active(): RoomStatus {
    return new RoomStatus(RoomStatusEnum.ACTIVE)
  }

  static paused(): RoomStatus {
    return new RoomStatus(RoomStatusEnum.PAUSED)
  }

  static completed(): RoomStatus {
    return new RoomStatus(RoomStatusEnum.COMPLETED)
  }

  static expired(): RoomStatus {
    return new RoomStatus(RoomStatusEnum.EXPIRED)
  }
}

/**
 * Wheel Configuration value object
 */
export class WheelConfig {
  private static readonly MIN_SPIN_DURATION = 1000 // 1 second
  private static readonly MAX_SPIN_DURATION = 15000 // 15 seconds
  private static readonly DEFAULT_MIN_SPIN = 2000 // 2 seconds
  private static readonly DEFAULT_MAX_SPIN = 5000 // 5 seconds

  constructor(
    private readonly _minSpinDuration: number,
    private readonly _maxSpinDuration: number,
    private readonly _excludeFinished: boolean,
    private readonly _allowRepeatSelections: boolean
  ) {
    this.validate()
  }

  get minSpinDuration(): number {
    return this._minSpinDuration
  }

  get maxSpinDuration(): number {
    return this._maxSpinDuration
  }

  get excludeFinished(): boolean {
    return this._excludeFinished
  }

  get allowRepeatSelections(): boolean {
    return this._allowRepeatSelections
  }

  private validate(): void {
    if (this._minSpinDuration < WheelConfig.MIN_SPIN_DURATION) {
      throw new Error(
        `Minimum spin duration cannot be less than ${WheelConfig.MIN_SPIN_DURATION}ms`
      )
    }

    if (this._maxSpinDuration > WheelConfig.MAX_SPIN_DURATION) {
      throw new Error(`Maximum spin duration cannot exceed ${WheelConfig.MAX_SPIN_DURATION}ms`)
    }

    if (this._minSpinDuration >= this._maxSpinDuration) {
      throw new Error('Minimum spin duration must be less than maximum spin duration')
    }
  }

  generateSpinDuration(): number {
    return (
      Math.floor(Math.random() * (this._maxSpinDuration - this._minSpinDuration + 1)) +
      this._minSpinDuration
    )
  }

  equals(other: WheelConfig): boolean {
    return (
      this._minSpinDuration === other._minSpinDuration &&
      this._maxSpinDuration === other._maxSpinDuration &&
      this._excludeFinished === other._excludeFinished &&
      this._allowRepeatSelections === other._allowRepeatSelections
    )
  }

  static createDefault(): WheelConfig {
    return new WheelConfig(
      WheelConfig.DEFAULT_MIN_SPIN,
      WheelConfig.DEFAULT_MAX_SPIN,
      true, // exclude finished by default
      false // don't allow repeat selections by default
    )
  }
}

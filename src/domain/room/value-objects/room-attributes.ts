import { configurationService } from '@/core/services/configuration'

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
  // Configuration limits and defaults are now sourced from centralized configuration
  private static get wheelConfigLimits() {
    return configurationService.getWheelConfig()
  }

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
    const limits = WheelConfig.wheelConfigLimits

    if (this._minSpinDuration < limits.minSpinDuration) {
      throw new Error(`Minimum spin duration cannot be less than ${limits.minSpinDuration}ms`)
    }

    if (this._maxSpinDuration > limits.maxSpinDuration) {
      throw new Error(`Maximum spin duration cannot exceed ${limits.maxSpinDuration}ms`)
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
    const limits = WheelConfig.wheelConfigLimits
    return new WheelConfig(
      limits.defaultMinSpin,
      limits.defaultMaxSpin,
      true, // exclude finished by default
      false // don't allow repeat selections by default
    )
  }
}

/**
 * Participant Name value object
 */
export class ParticipantName {
  private static readonly MIN_LENGTH = 1
  private static readonly MAX_LENGTH = 50

  constructor(private readonly _value: string) {
    this.validate(_value)
  }

  get value(): string {
    return this._value
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Participant name cannot be empty')
    }

    const trimmed = value.trim()
    if (trimmed.length < ParticipantName.MIN_LENGTH) {
      throw new Error(
        `Participant name must be at least ${ParticipantName.MIN_LENGTH} character long`
      )
    }

    if (trimmed.length > ParticipantName.MAX_LENGTH) {
      throw new Error(`Participant name cannot exceed ${ParticipantName.MAX_LENGTH} characters`)
    }

    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmed)) {
      throw new Error('Participant name contains invalid characters')
    }
  }

  equals(other: ParticipantName): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}

/**
 * Room Name value object
 */
export class RoomName {
  private static readonly MIN_LENGTH = 1
  private static readonly MAX_LENGTH = 100
  private static readonly DEFAULT_NAME = 'Presentation Room'

  constructor(private readonly _value: string) {
    this.validate(_value)
  }

  get value(): string {
    return this._value
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Room name cannot be empty')
    }

    const trimmed = value.trim()
    if (trimmed.length < RoomName.MIN_LENGTH) {
      throw new Error(`Room name must be at least ${RoomName.MIN_LENGTH} character long`)
    }

    if (trimmed.length > RoomName.MAX_LENGTH) {
      throw new Error(`Room name cannot exceed ${RoomName.MAX_LENGTH} characters`)
    }
  }

  static createDefault(): RoomName {
    return new RoomName(RoomName.DEFAULT_NAME)
  }

  equals(other: RoomName): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}

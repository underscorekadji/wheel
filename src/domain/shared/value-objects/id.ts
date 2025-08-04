/**
 * Base ID value object for domain identifiers
 */
export abstract class Id {
  protected constructor(protected readonly _value: string) {
    if (!_value || _value.trim().length === 0) {
      throw new Error('ID cannot be empty')
    }
  }

  get value(): string {
    return this._value
  }

  equals(other: Id): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}

/**
 * Room ID value object
 */
export class RoomId extends Id {
  constructor(value: string) {
    super(value)
    this.validateUuid(value)
  }

  private validateUuid(value: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(value)) {
      throw new Error('RoomId must be a valid UUID v4')
    }
  }

  static generate(): RoomId {
    return new RoomId(crypto.randomUUID())
  }
}

/**
 * Participant ID value object
 */
export class ParticipantId extends Id {
  constructor(value: string) {
    super(value)
    this.validateUuid(value)
  }

  private validateUuid(value: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(value)) {
      throw new Error('ParticipantId must be a valid UUID v4')
    }
  }

  static generate(): ParticipantId {
    return new ParticipantId(crypto.randomUUID())
  }
}

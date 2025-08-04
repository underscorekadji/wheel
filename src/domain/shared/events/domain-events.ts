/**
 * Base domain event interface
 */
export interface DomainEvent {
  readonly eventId: string
  readonly aggregateId: string
  readonly occurredAt: Date
  readonly eventType: string
}

/**
 * Abstract base class for domain events
 */
export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string
  public readonly occurredAt: Date

  constructor(
    public readonly aggregateId: string,
    public readonly eventType: string
  ) {
    this.eventId = crypto.randomUUID()
    this.occurredAt = new Date()
  }
}

/**
 * Event handler interface
 */
export interface DomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void> | void
}

/**
 * Domain event publisher interface
 */
export interface DomainEventPublisher {
  publish<T extends DomainEvent>(event: T): Promise<void>
  subscribe<T extends DomainEvent>(eventType: string, handler: DomainEventHandler<T>): void
}

/**
 * In-memory domain event publisher implementation
 */
export class InMemoryDomainEventPublisher implements DomainEventPublisher {
  private handlers = new Map<string, DomainEventHandler<DomainEvent>[]>()

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const eventHandlers = this.handlers.get(event.eventType) || []

    // Execute all handlers for this event type
    await Promise.all(
      eventHandlers.map(handler =>
        Promise.resolve(handler.handle(event)).catch(error => {
          console.error(`Error handling event ${event.eventType}:`, error)
        })
      )
    )
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: DomainEventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, [])
    }
    this.handlers.get(eventType)!.push(handler)
  }
}

// Singleton instance
export const domainEventPublisher = new InMemoryDomainEventPublisher()

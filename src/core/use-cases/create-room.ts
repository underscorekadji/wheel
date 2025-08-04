import { RoomId, ParticipantId } from '../../domain/shared/value-objects/id'
import { RoomName } from '../../domain/room/value-objects/names'
import { Room } from '../../domain/room/entities/room'
import { RoomRepository } from '../../domain/room/repository/room-repository'
import { RoomCreatedEvent } from '../../domain/room/events/room-events'
import { domainEventPublisher } from '../../domain/shared/events/domain-events'

/**
 * Use case for creating a new room
 */
export class CreateRoomUseCase {
  constructor(private readonly roomRepository: RoomRepository) {}

  async execute(input: CreateRoomInput): Promise<CreateRoomOutput> {
    // Generate room ID
    const roomId = RoomId.generate()

    // Generate organizer ID
    const organizerId = ParticipantId.generate()

    // Create room name
    const roomName = input.roomName ? new RoomName(input.roomName) : RoomName.createDefault()

    // Create room aggregate
    const room = Room.create(roomId, roomName, organizerId, input.organizerName)

    // Save room
    await this.roomRepository.save(room)

    // Publish domain event
    await domainEventPublisher.publish(
      new RoomCreatedEvent(room.id.value, room.name.value, organizerId.value, input.organizerName)
    )

    return {
      roomId: room.id.value,
      organizerId: organizerId.value,
      roomName: room.name.value,
      status: room.status.value,
    }
  }
}

export interface CreateRoomInput {
  organizerName: string
  roomName?: string
}

export interface CreateRoomOutput {
  roomId: string
  organizerId: string
  roomName: string
  status: string
}

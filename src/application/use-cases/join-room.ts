import { RoomId, ParticipantId } from '../../domain/shared/value-objects/id'
import { ParticipantName } from '../../domain/room/value-objects/names'
import { RoomRepository } from '../../domain/room/repository/room-repository'
import { ParticipantManagementService } from '../../domain/room/services/participant-management-service'

/**
 * Use case for joining a room as a guest
 */
export class JoinRoomUseCase {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly participantManagementService: ParticipantManagementService
  ) {}

  async execute(input: JoinRoomInput): Promise<JoinRoomOutput> {
    // Find room
    const roomId = new RoomId(input.roomId)
    const room = await this.roomRepository.findById(roomId)

    if (!room) {
      throw new Error(`Room ${input.roomId} not found`)
    }

    if (room.isExpired()) {
      throw new Error('Room has expired')
    }

    if (!room.status.canAcceptParticipants()) {
      throw new Error(`Room is not accepting participants (status: ${room.status.value})`)
    }

    // Generate participant ID
    const participantId = ParticipantId.generate()
    const participantName = new ParticipantName(input.participantName)

    // Add participant to room
    const participant = await this.participantManagementService.addGuestParticipant(
      room,
      participantId,
      participantName
    )

    // Save updated room
    await this.roomRepository.save(room)

    return {
      participantId: participant.id.value,
      participantName: participant.name.value,
      participantRole: participant.role.value,
      participantStatus: participant.status.value,
      roomStatus: room.status.value,
      totalParticipants: room.participants.length,
    }
  }
}

export interface JoinRoomInput {
  roomId: string
  participantName: string
}

export interface JoinRoomOutput {
  participantId: string
  participantName: string
  participantRole: string
  participantStatus: string
  roomStatus: string
  totalParticipants: number
}

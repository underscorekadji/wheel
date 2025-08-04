import { RoomId, ParticipantId } from '../../domain/shared/value-objects/id'
import { RoomRepository } from '../../domain/room/repository/room-repository'
import { WheelSpinService } from '../../domain/room/services/wheel-spin-service'

/**
 * Use case for spinning the wheel to select a presenter
 */
export class SpinWheelUseCase {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly wheelSpinService: WheelSpinService
  ) {}

  async execute(input: SpinWheelInput): Promise<SpinWheelOutput> {
    // Find room
    const roomId = new RoomId(input.roomId)
    const room = await this.roomRepository.findById(roomId)

    if (!room) {
      throw new Error(`Room ${input.roomId} not found`)
    }

    if (room.isExpired()) {
      throw new Error('Room has expired')
    }

    const initiatedBy = new ParticipantId(input.initiatedBy)

    // Check if wheel can be spun
    if (!this.wheelSpinService.canSpinWheel(room, initiatedBy)) {
      throw new Error('Wheel cannot be spun at this time')
    }

    // Spin the wheel
    const result = await this.wheelSpinService.spinWheel(room, initiatedBy)

    // Save updated room
    await this.roomRepository.save(room)

    return {
      selectedParticipantId: result.selectedParticipant.id.value,
      selectedParticipantName: result.selectedParticipant.name.value,
      spinDuration: result.spinDuration,
      historyEntryId: result.historyEntry.id,
      roomStatus: room.status.value,
      currentPresenterId: room.currentPresenterId?.value || null,
    }
  }
}

export interface SpinWheelInput {
  roomId: string
  initiatedBy: string
}

export interface SpinWheelOutput {
  selectedParticipantId: string
  selectedParticipantName: string
  spinDuration: number
  historyEntryId: string
  roomStatus: string
  currentPresenterId: string | null
}

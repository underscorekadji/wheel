import { RoomId } from '../../domain/shared/value-objects/id'
import { RoomRepository } from '../../domain/room/repository/room-repository'
import { WheelSpinService } from '../../domain/room/services/wheel-spin-service'

/**
 * Use case for finishing the current presentation
 */
export class FinishPresentationUseCase {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly wheelSpinService: WheelSpinService
  ) {}

  async execute(input: FinishPresentationInput): Promise<FinishPresentationOutput> {
    // Find room
    const roomId = new RoomId(input.roomId)
    const room = await this.roomRepository.findById(roomId)

    if (!room) {
      throw new Error(`Room ${input.roomId} not found`)
    }

    if (room.isExpired()) {
      throw new Error('Room has expired')
    }

    const currentPresenter = room.getCurrentPresenter()
    if (!currentPresenter) {
      throw new Error('No current presenter to finish')
    }

    const presenterId = currentPresenter.id.value
    const presenterName = currentPresenter.name.value

    // Finish the presentation
    await this.wheelSpinService.finishPresentation(room)

    // Save updated room
    await this.roomRepository.save(room)

    return {
      finishedParticipantId: presenterId,
      finishedParticipantName: presenterName,
      roomStatus: room.status.value,
      currentPresenterId: room.currentPresenterId?.value || null,
      sessionCompleted: room.areAllParticipantsFinished(),
      eligibleParticipantsCount: this.wheelSpinService.getEligibleParticipants(room).length,
    }
  }
}

export interface FinishPresentationInput {
  roomId: string
}

export interface FinishPresentationOutput {
  finishedParticipantId: string
  finishedParticipantName: string
  roomStatus: string
  currentPresenterId: string | null
  sessionCompleted: boolean
  eligibleParticipantsCount: number
}

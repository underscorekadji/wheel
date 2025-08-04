import { CreateRoomUseCase, CreateRoomInput, CreateRoomOutput } from '../use-cases/create-room'
import { JoinRoomUseCase, JoinRoomInput, JoinRoomOutput } from '../use-cases/join-room'
import { SpinWheelUseCase, SpinWheelInput, SpinWheelOutput } from '../use-cases/spin-wheel'
import {
  FinishPresentationUseCase,
  FinishPresentationInput,
  FinishPresentationOutput,
} from '../use-cases/finish-presentation'
import { RoomRepository } from '../../domain/room/repository/room-repository'
import { WheelSpinService } from '../../domain/room/services/wheel-spin-service'
import { ParticipantManagementService } from '../../domain/room/services/participant-management-service'
import { RoomId, ParticipantId } from '../../domain/shared/value-objects/id'

/**
 * Application service that coordinates room operations
 *
 * Acts as a facade for the various use cases and provides
 * additional convenience methods for the presentation layer.
 */
export class RoomApplicationService {
  private readonly createRoomUseCase: CreateRoomUseCase
  private readonly joinRoomUseCase: JoinRoomUseCase
  private readonly spinWheelUseCase: SpinWheelUseCase
  private readonly finishPresentationUseCase: FinishPresentationUseCase

  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly wheelSpinService: WheelSpinService,
    private readonly participantManagementService: ParticipantManagementService
  ) {
    this.createRoomUseCase = new CreateRoomUseCase(roomRepository)
    this.joinRoomUseCase = new JoinRoomUseCase(roomRepository, participantManagementService)
    this.spinWheelUseCase = new SpinWheelUseCase(roomRepository, wheelSpinService)
    this.finishPresentationUseCase = new FinishPresentationUseCase(roomRepository, wheelSpinService)
  }

  /**
   * Create a new room
   */
  async createRoom(input: CreateRoomInput): Promise<CreateRoomOutput> {
    return await this.createRoomUseCase.execute(input)
  }

  /**
   * Join a room as a guest
   */
  async joinRoom(input: JoinRoomInput): Promise<JoinRoomOutput> {
    return await this.joinRoomUseCase.execute(input)
  }

  /**
   * Spin the wheel to select a presenter
   */
  async spinWheel(input: SpinWheelInput): Promise<SpinWheelOutput> {
    return await this.spinWheelUseCase.execute(input)
  }

  /**
   * Mark current presentation as finished
   */
  async finishPresentation(input: FinishPresentationInput): Promise<FinishPresentationOutput> {
    return await this.finishPresentationUseCase.execute(input)
  }

  /**
   * Get room details
   */
  async getRoomDetails(roomId: string): Promise<RoomDetailsOutput | null> {
    const room = await this.roomRepository.findById(new RoomId(roomId))
    if (!room) {
      return null
    }

    return {
      id: room.id.value,
      name: room.name.value,
      status: room.status.value,
      organizerId: room.organizerId.value,
      currentPresenterId: room.currentPresenterId?.value || null,
      createdAt: room.createdAt,
      lastUpdatedAt: room.lastUpdatedAt,
      expiresAt: room.expiresAt,
      participants: room.participants.map(p => ({
        id: p.id.value,
        name: p.name.value,
        status: p.status.value,
        role: p.role.value,
        joinedAt: p.joinedAt,
        lastUpdatedAt: p.lastUpdatedAt,
        lastSelectedAt: p.lastSelectedAt,
      })),
      wheelConfig: {
        minSpinDuration: room.wheelConfig.minSpinDuration,
        maxSpinDuration: room.wheelConfig.maxSpinDuration,
        excludeFinished: room.wheelConfig.excludeFinished,
        allowRepeatSelections: room.wheelConfig.allowRepeatSelections,
      },
      selectionHistory: room.selectionHistory.map(entry => ({
        id: entry.id,
        participantId: entry.participantId.value,
        participantName: entry.participantName,
        initiatedBy: entry.initiatedBy.value,
        selectedAt: entry.selectedAt,
        spinDuration: entry.spinDuration,
      })),
    }
  }

  /**
   * Disable a participant
   */
  async disableParticipant(
    roomId: string,
    participantId: string,
    managerId: string
  ): Promise<void> {
    const room = await this.roomRepository.findById(new RoomId(roomId))
    if (!room) {
      throw new Error(`Room ${roomId} not found`)
    }

    const managerParticipantId = new ParticipantId(managerId)
    const targetParticipantId = new ParticipantId(participantId)

    if (
      !this.participantManagementService.canManageParticipant(
        room,
        managerParticipantId,
        targetParticipantId
      )
    ) {
      throw new Error('Insufficient permissions to manage participant')
    }

    await this.participantManagementService.disableParticipant(room, targetParticipantId)
    await this.roomRepository.save(room)
  }

  /**
   * Enable a participant
   */
  async enableParticipant(roomId: string, participantId: string, managerId: string): Promise<void> {
    const room = await this.roomRepository.findById(new RoomId(roomId))
    if (!room) {
      throw new Error(`Room ${roomId} not found`)
    }

    const managerParticipantId = new ParticipantId(managerId)
    const targetParticipantId = new ParticipantId(participantId)

    if (
      !this.participantManagementService.canManageParticipant(
        room,
        managerParticipantId,
        targetParticipantId
      )
    ) {
      throw new Error('Insufficient permissions to manage participant')
    }

    await this.participantManagementService.enableParticipant(room, targetParticipantId)
    await this.roomRepository.save(room)
  }

  /**
   * Remove a participant
   */
  async removeParticipant(roomId: string, participantId: string, managerId: string): Promise<void> {
    const room = await this.roomRepository.findById(new RoomId(roomId))
    if (!room) {
      throw new Error(`Room ${roomId} not found`)
    }

    const managerParticipantId = new ParticipantId(managerId)
    const targetParticipantId = new ParticipantId(participantId)

    if (
      !this.participantManagementService.canManageParticipant(
        room,
        managerParticipantId,
        targetParticipantId
      )
    ) {
      throw new Error('Insufficient permissions to manage participant')
    }

    await this.participantManagementService.removeParticipant(room, targetParticipantId)
    await this.roomRepository.save(room)
  }

  /**
   * Check if room exists
   */
  async roomExists(roomId: string): Promise<boolean> {
    return await this.roomRepository.exists(new RoomId(roomId))
  }
}

export interface RoomDetailsOutput {
  id: string
  name: string
  status: string
  organizerId: string
  currentPresenterId: string | null
  createdAt: Date
  lastUpdatedAt: Date
  expiresAt: Date
  participants: Array<{
    id: string
    name: string
    status: string
    role: string
    joinedAt: Date
    lastUpdatedAt: Date
    lastSelectedAt: Date | null
  }>
  wheelConfig: {
    minSpinDuration: number
    maxSpinDuration: number
    excludeFinished: boolean
    allowRepeatSelections: boolean
  }
  selectionHistory: Array<{
    id: string
    participantId: string
    participantName: string
    initiatedBy: string
    selectedAt: Date
    spinDuration: number
  }>
}

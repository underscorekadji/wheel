import { Room } from '../entities/room'
import { Participant } from '../entities/participant'
import { ParticipantId } from '../../shared/value-objects/id'
import { ParticipantName } from '../value-objects/names'
import {
  ParticipantJoinedEvent,
  ParticipantLeftEvent,
  ParticipantStatusChangedEvent,
} from '../events/room-events'
import { domainEventPublisher } from '../../shared/events/domain-events'

/**
 * Domain service for participant management
 *
 * Encapsulates business logic for managing participants in a room.
 */
export class ParticipantManagementService {
  /**
   * Add a new guest participant to the room
   *
   * @param room - Room to add participant to
   * @param participantId - ID for the new participant
   * @param participantName - Name for the new participant
   * @returns Promise that resolves to the new participant
   */
  async addGuestParticipant(
    room: Room,
    participantId: ParticipantId,
    participantName: ParticipantName
  ): Promise<Participant> {
    // Create new guest participant
    const participant = Participant.createGuest(participantId, participantName)

    // Add to room
    room.addParticipant(participant)

    // Publish domain event
    await domainEventPublisher.publish(
      new ParticipantJoinedEvent(
        room.id.value,
        participant.id.value,
        participant.name.value,
        participant.role.value
      )
    )

    return participant
  }

  /**
   * Remove a participant from the room
   *
   * @param room - Room to remove participant from
   * @param participantId - ID of participant to remove
   * @returns Promise that resolves when participant is removed
   */
  async removeParticipant(room: Room, participantId: ParticipantId): Promise<void> {
    // Get participant before removal for event
    const participant = room.getParticipant(participantId)
    if (!participant) {
      throw new Error(`Participant ${participantId.value} not found in room`)
    }

    // Remove from room
    room.removeParticipant(participantId)

    // Publish domain event
    await domainEventPublisher.publish(
      new ParticipantLeftEvent(room.id.value, participant.id.value, participant.name.value)
    )
  }

  /**
   * Disable a participant
   *
   * @param room - Room containing the participant
   * @param participantId - ID of participant to disable
   * @returns Promise that resolves when participant is disabled
   */
  async disableParticipant(room: Room, participantId: ParticipantId): Promise<void> {
    await this.updateParticipantStatus(room, participantId, participant => {
      participant.disable()
    })
  }

  /**
   * Enable a disabled participant
   *
   * @param room - Room containing the participant
   * @param participantId - ID of participant to enable
   * @returns Promise that resolves when participant is enabled
   */
  async enableParticipant(room: Room, participantId: ParticipantId): Promise<void> {
    await this.updateParticipantStatus(room, participantId, participant => {
      participant.enable()
    })
  }

  /**
   * Update participant name
   *
   * @param room - Room containing the participant
   * @param participantId - ID of participant to update
   * @param newName - New name for the participant
   * @returns Promise that resolves when name is updated
   */
  async updateParticipantName(
    room: Room,
    participantId: ParticipantId,
    newName: ParticipantName
  ): Promise<void> {
    room.updateParticipant(participantId, participant => {
      participant.updateName(newName)
    })
  }

  /**
   * Check if a participant can be managed by another participant
   *
   * @param room - Room containing both participants
   * @param managerId - ID of participant trying to manage
   * @param targetId - ID of participant being managed
   * @returns True if management is allowed
   */
  canManageParticipant(room: Room, managerId: ParticipantId, targetId: ParticipantId): boolean {
    const manager = room.getParticipant(managerId)
    const target = room.getParticipant(targetId)

    if (!manager || !target) {
      return false
    }

    // Only organizers can manage participants
    if (!manager.role.canManageRoom()) {
      return false
    }

    // Cannot manage the organizer (themselves)
    if (target.id.equals(room.organizerId)) {
      return false
    }

    // Target must be manageable
    return target.canBeManaged()
  }

  /**
   * Get participants by status
   *
   * @param room - Room to query
   * @param status - Status to filter by
   * @returns Array of participants with the specified status
   */
  getParticipantsByStatus(room: Room, status: string): Participant[] {
    return room.participants.filter(p => p.status.value === status)
  }

  /**
   * Get queued participants count
   *
   * @param room - Room to query
   * @returns Number of queued participants
   */
  getQueuedParticipantsCount(room: Room): number {
    return this.getParticipantsByStatus(room, 'queued').length
  }

  /**
   * Private helper method to update participant status and publish events
   */
  private async updateParticipantStatus(
    room: Room,
    participantId: ParticipantId,
    updateFn: (participant: Participant) => void
  ): Promise<void> {
    const participant = room.getParticipant(participantId)
    if (!participant) {
      throw new Error(`Participant ${participantId.value} not found in room`)
    }

    const oldStatus = participant.status.value

    room.updateParticipant(participantId, updateFn)

    const newStatus = participant.status.value

    // Publish status changed event if status actually changed
    if (oldStatus !== newStatus) {
      await domainEventPublisher.publish(
        new ParticipantStatusChangedEvent(
          room.id.value,
          participant.id.value,
          participant.name.value,
          oldStatus,
          newStatus
        )
      )
    }
  }
}

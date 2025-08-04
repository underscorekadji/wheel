import { Room } from '../entities/room'
import { Participant } from '../entities/participant'
import { ParticipantId } from '../../shared/value-objects/id'
import { SelectionHistoryEntry } from '../entities/room'
import {
  WheelSpunEvent,
  ParticipantStatusChangedEvent,
  SessionCompletedEvent,
} from '../events/room-events'
import { domainEventPublisher } from '../../shared/events/domain-events'

/**
 * Domain service for wheel spinning logic
 *
 * Encapsulates complex business logic for presenter selection via wheel spinning.
 */
export class WheelSpinService {
  /**
   * Spin the wheel and select a presenter
   *
   * @param room - Room where wheel is being spun
   * @param initiatedBy - Participant who initiated the spin
   * @returns Promise that resolves to the selection result
   */
  async spinWheel(
    room: Room,
    initiatedBy: ParticipantId
  ): Promise<{
    selectedParticipant: Participant
    spinDuration: number
    historyEntry: SelectionHistoryEntry
  }> {
    // Perform the wheel spin
    const historyEntry = room.spinWheel(initiatedBy)

    // Get the selected participant
    const selectedParticipant = room.getParticipant(historyEntry.participantId)
    if (!selectedParticipant) {
      throw new Error('Selected participant not found')
    }

    // Publish domain event
    await domainEventPublisher.publish(
      new WheelSpunEvent(
        room.id.value,
        selectedParticipant.id.value,
        selectedParticipant.name.value,
        initiatedBy.value,
        historyEntry.spinDuration
      )
    )

    // Publish status changed event
    await domainEventPublisher.publish(
      new ParticipantStatusChangedEvent(
        room.id.value,
        selectedParticipant.id.value,
        selectedParticipant.name.value,
        'queued',
        selectedParticipant.status.value
      )
    )

    return {
      selectedParticipant,
      spinDuration: historyEntry.spinDuration,
      historyEntry,
    }
  }

  /**
   * Mark current presenter as finished
   *
   * @param room - Room where presentation is finishing
   * @returns Promise that resolves when presenter is marked as finished
   */
  async finishPresentation(room: Room): Promise<void> {
    const currentPresenter = room.getCurrentPresenter()
    if (!currentPresenter) {
      throw new Error('No current presenter to finish')
    }

    const oldStatus = currentPresenter.status.value

    // Mark as finished in the room
    room.markCurrentPresenterAsFinished()

    // Publish status changed event
    await domainEventPublisher.publish(
      new ParticipantStatusChangedEvent(
        room.id.value,
        currentPresenter.id.value,
        currentPresenter.name.value,
        oldStatus,
        'finished'
      )
    )

    // Check if session is complete and publish event if so
    if (room.areAllParticipantsFinished()) {
      await domainEventPublisher.publish(
        new SessionCompletedEvent(
          room.id.value,
          room.participants.length,
          room.selectionHistory.length
        )
      )
    }
  }

  /**
   * Get eligible participants for wheel spin
   *
   * @param room - Room to check for eligible participants
   * @returns Array of eligible participants
   */
  getEligibleParticipants(room: Room): Participant[] {
    return room.getEligibleParticipants()
  }

  /**
   * Check if wheel can be spun
   *
   * @param room - Room to check
   * @param initiatedBy - Participant who wants to spin
   * @returns True if wheel can be spun
   */
  canSpinWheel(room: Room, initiatedBy: ParticipantId): boolean {
    try {
      // Check room status
      if (!room.status.canSpinWheel()) {
        return false
      }

      // Check if there's a current presenter
      if (room.currentPresenterId) {
        return false
      }

      // Check if initiator can spin wheel
      const initiator = room.getParticipant(initiatedBy)
      if (!initiator?.role.canSpinWheel()) {
        return false
      }

      // Check if there are eligible participants
      const eligible = this.getEligibleParticipants(room)
      return eligible.length > 0
    } catch {
      return false
    }
  }
}

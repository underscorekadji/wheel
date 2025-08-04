/**
 * Room State Diff Calculation
 *
 * Provides efficient diff calculation for room state changes to enable
 * broadcasting only the changes to namespace clients within 500ms.
 */

import type { Room } from '@/types/room'
import type { Participant } from '@/types/participant'
import type { RoomStateUpdateEvent } from '@/types/socket'

/**
 * Default presentation timer duration in milliseconds (10 minutes)
 */
const DEFAULT_PRESENTATION_DURATION_MS = 10 * 60 * 1000

/**
 * Diff result for room state changes
 */
export interface RoomStateDiff {
  hasChanges: boolean
  participantChanges: ParticipantDiff[]
  wheelStateChanges: WheelStateDiff | null
  timerStateChanges: TimerStateDiff | null
  sessionActiveChange: boolean | null
  currentPresenterChange: string | null
}

/**
 * Diff result for participant changes
 */
export interface ParticipantDiff {
  type: 'added' | 'removed' | 'updated'
  participant: Participant
  previousParticipant?: Participant
}

/**
 * Diff result for wheel state changes
 */
export interface WheelStateDiff {
  isSpinningChanged?: boolean
  selectedParticipantChanged?: string
  spinDurationChanged?: number
  spinStartTimeChanged?: string
}

/**
 * Diff result for timer state changes
 */
export interface TimerStateDiff {
  isActiveChanged?: boolean
  currentTimeChanged?: number
  maxTimeChanged?: number
  startTimeChanged?: string
  endTimeChanged?: string
  participantIdChanged?: string
}

/**
 * Calculate diff between two room states
 *
 * Performs efficient comparison of room states to identify changes.
 * Optimized for performance to meet ≤500ms broadcast requirement.
 *
 * @param previousRoom - Previous room state (null if first state)
 * @param currentRoom - Current room state
 * @returns RoomStateDiff object containing all changes
 */
export function calculateRoomStateDiff(
  previousRoom: Room | null,
  currentRoom: Room
): RoomStateDiff {
  const startTime = performance.now()

  // If no previous room, everything is new (initial state)
  if (!previousRoom) {
    const diff: RoomStateDiff = {
      hasChanges: true,
      participantChanges: currentRoom.participants.map(participant => ({
        type: 'added' as const,
        participant,
      })),
      wheelStateChanges:
        currentRoom.currentPresenterId !== null
          ? {
              selectedParticipantChanged: currentRoom.currentPresenterId,
            }
          : null,
      timerStateChanges:
        currentRoom.status === 'active' && currentRoom.currentPresenterId !== null
          ? {
              isActiveChanged: true,
              participantIdChanged: currentRoom.currentPresenterId,
            }
          : null,
      sessionActiveChange: currentRoom.status === 'active',
      currentPresenterChange: currentRoom.currentPresenterId,
    }

    const endTime = performance.now()
    console.debug(`Room state diff calculated in ${endTime - startTime}ms (initial state)`)

    return diff
  }

  // Calculate participant changes
  const participantChanges = calculateParticipantDiff(
    previousRoom.participants,
    currentRoom.participants
  )

  // Calculate wheel state changes (simplified for now)
  const wheelStateChanges = calculateWheelStateDiff(previousRoom, currentRoom)

  // Calculate timer state changes (simplified for now)
  const timerStateChanges = calculateTimerStateDiff(previousRoom, currentRoom)

  // Check session active change
  const sessionActiveChange =
    previousRoom.status !== currentRoom.status ? currentRoom.status === 'active' : null

  // Check current presenter change
  const currentPresenterChange =
    previousRoom.currentPresenterId !== currentRoom.currentPresenterId
      ? currentRoom.currentPresenterId
      : null

  const hasChanges =
    participantChanges.length > 0 ||
    wheelStateChanges !== null ||
    timerStateChanges !== null ||
    sessionActiveChange !== null ||
    currentPresenterChange !== null

  const diff: RoomStateDiff = {
    hasChanges,
    participantChanges,
    wheelStateChanges,
    timerStateChanges,
    sessionActiveChange,
    currentPresenterChange,
  }

  const endTime = performance.now()
  console.debug(`Room state diff calculated in ${endTime - startTime}ms`)

  return diff
}

/**
 * Calculate participant differences between two participant arrays
 *
 * @param previousParticipants - Previous participant list
 * @param currentParticipants - Current participant list
 * @returns Array of participant changes
 */
function calculateParticipantDiff(
  previousParticipants: Participant[],
  currentParticipants: Participant[]
): ParticipantDiff[] {
  const changes: ParticipantDiff[] = []

  // Create maps for efficient lookups
  const previousMap = new Map(previousParticipants.map(p => [p.id, p]))
  const currentMap = new Map(currentParticipants.map(p => [p.id, p]))

  // Find added and updated participants
  for (const currentParticipant of currentParticipants) {
    const previousParticipant = previousMap.get(currentParticipant.id)

    if (!previousParticipant) {
      // New participant
      changes.push({
        type: 'added',
        participant: currentParticipant,
      })
    } else if (!participantsEqual(previousParticipant, currentParticipant)) {
      // Updated participant
      changes.push({
        type: 'updated',
        participant: currentParticipant,
        previousParticipant,
      })
    }
  }

  // Find removed participants
  for (const previousParticipant of previousParticipants) {
    if (!currentMap.has(previousParticipant.id)) {
      changes.push({
        type: 'removed',
        participant: previousParticipant,
      })
    }
  }

  return changes
}

/**
 * Check if two participants are equal
 *
 * @param a - First participant
 * @param b - Second participant
 * @returns True if participants are equal
 */
function participantsEqual(a: Participant, b: Participant): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.status === b.status &&
    a.role === b.role &&
    a.lastUpdatedAt.getTime() === b.lastUpdatedAt.getTime()
  )
}

/**
 * Calculate wheel state differences
 *
 * @param previousRoom - Previous room state
 * @param currentRoom - Current room state
 * @returns Wheel state changes or null if no changes
 */
function calculateWheelStateDiff(previousRoom: Room, currentRoom: Room): WheelStateDiff | null {
  const changes: WheelStateDiff = {}
  let hasChanges = false

  // Check if current presenter (selected participant) changed
  if (previousRoom.currentPresenterId !== currentRoom.currentPresenterId) {
    changes.selectedParticipantChanged = currentRoom.currentPresenterId || undefined
    hasChanges = true
  }

  // Check if wheel is spinning (inferred from room status changes)
  const previousSpinning =
    previousRoom.status === 'active' && previousRoom.currentPresenterId === null
  const currentSpinning = currentRoom.status === 'active' && currentRoom.currentPresenterId === null

  if (previousSpinning !== currentSpinning) {
    changes.isSpinningChanged = currentSpinning
    hasChanges = true
  }

  // Check for new selection history entries (indicates a spin completed)
  if (currentRoom.selectionHistory.length > previousRoom.selectionHistory.length) {
    const latestSelection = currentRoom.selectionHistory[currentRoom.selectionHistory.length - 1]
    if (latestSelection) {
      changes.spinDurationChanged = latestSelection.spinDuration
      changes.spinStartTimeChanged = new Date(
        latestSelection.selectedAt.getTime() - latestSelection.spinDuration
      ).toISOString()
      hasChanges = true
    }
  }

  // Check if wheel configuration changed
  const wheelConfigChanged =
    previousRoom.wheelConfig.minSpinDuration !== currentRoom.wheelConfig.minSpinDuration ||
    previousRoom.wheelConfig.maxSpinDuration !== currentRoom.wheelConfig.maxSpinDuration ||
    previousRoom.wheelConfig.excludeFinished !== currentRoom.wheelConfig.excludeFinished ||
    previousRoom.wheelConfig.allowRepeatSelections !== currentRoom.wheelConfig.allowRepeatSelections

  if (wheelConfigChanged) {
    // Wheel config changes affect wheel behavior but don't directly change wheel state
    hasChanges = true
  }

  return hasChanges ? changes : null
}

/**
 * Calculate timer state differences
 *
 * @param previousRoom - Previous room state
 * @param currentRoom - Current room state
 * @returns Timer state changes or null if no changes
 */
function calculateTimerStateDiff(previousRoom: Room, currentRoom: Room): TimerStateDiff | null {
  const changes: TimerStateDiff = {}
  let hasChanges = false

  // Check if timer should be active (when room is active and someone is presenting)
  const previousTimerActive =
    previousRoom.status === 'active' && previousRoom.currentPresenterId !== null
  const currentTimerActive =
    currentRoom.status === 'active' && currentRoom.currentPresenterId !== null

  if (previousTimerActive !== currentTimerActive) {
    changes.isActiveChanged = currentTimerActive
    hasChanges = true
  }

  // Check if the participant being timed changed
  if (previousRoom.currentPresenterId !== currentRoom.currentPresenterId) {
    changes.participantIdChanged = currentRoom.currentPresenterId || undefined
    hasChanges = true

    // When presenter changes, timer starts fresh
    if (currentRoom.currentPresenterId) {
      changes.currentTimeChanged = 0
      changes.startTimeChanged = new Date().toISOString()
      // Set end time based on typical presentation duration
      changes.endTimeChanged = new Date(Date.now() + DEFAULT_PRESENTATION_DURATION_MS).toISOString()
    }
  }

  // Check if room status affects timer behavior
  if (previousRoom.status !== currentRoom.status) {
    switch (currentRoom.status) {
      case 'paused':
        // Timer should pause
        if (currentRoom.currentPresenterId) {
          changes.isActiveChanged = false
          hasChanges = true
        }
        break
      case 'active':
        // Timer should resume/start
        if (currentRoom.currentPresenterId) {
          changes.isActiveChanged = true
          hasChanges = true
        }
        break
      case 'completed':
      case 'expired':
        // Timer should stop
        changes.isActiveChanged = false
        changes.currentTimeChanged = 0
        hasChanges = true
        break
    }
  }

  // Check for selection history changes that affect timing
  if (currentRoom.selectionHistory.length > previousRoom.selectionHistory.length) {
    const latestSelection = currentRoom.selectionHistory[currentRoom.selectionHistory.length - 1]
    if (latestSelection && latestSelection.participantId === currentRoom.currentPresenterId) {
      // New selection started, reset timer
      changes.currentTimeChanged = 0
      changes.startTimeChanged = latestSelection.selectedAt.toISOString()
      changes.maxTimeChanged = DEFAULT_PRESENTATION_DURATION_MS
      hasChanges = true
    }
  }

  return hasChanges ? changes : null
}

/**
 * Convert room state diff to Socket.IO event data
 *
 * Transforms the diff result into the format expected by Socket.IO clients.
 *
 * @param room - Current room state
 * @returns RoomStateUpdateEvent data for broadcasting
 */
export function diffToSocketEvent(room: Room): Omit<RoomStateUpdateEvent, 'roomId' | 'timestamp'> {
  // Determine if wheel is currently spinning
  const isWheelSpinning = room.status === 'active' && room.currentPresenterId === null

  // Determine if timer is active
  const isTimerActive = room.status === 'active' && room.currentPresenterId !== null

  // Get the latest selection for timing information
  const latestSelection =
    room.selectionHistory.length > 0
      ? room.selectionHistory[room.selectionHistory.length - 1]
      : null

  // Calculate current timer values
  let currentTime = 0
  const maxTime = DEFAULT_PRESENTATION_DURATION_MS
  let timerStartTime: string | undefined
  let timerEndTime: string | undefined

  if (
    isTimerActive &&
    latestSelection &&
    latestSelection.participantId === room.currentPresenterId
  ) {
    const selectionTime = latestSelection.selectedAt.getTime()
    const now = Date.now()
    currentTime = Math.max(0, now - selectionTime)
    timerStartTime = latestSelection.selectedAt.toISOString()
    timerEndTime = new Date(selectionTime + maxTime).toISOString()
  }

  return {
    participants: room.participants,
    currentPresenter: room.currentPresenterId || undefined,
    wheelState: {
      isSpinning: isWheelSpinning,
      selectedParticipant: room.currentPresenterId || undefined,
      spinDuration: latestSelection?.spinDuration,
      spinStartTime: latestSelection
        ? new Date(
            latestSelection.selectedAt.getTime() - latestSelection.spinDuration
          ).toISOString()
        : undefined,
    },
    timerState: {
      isActive: isTimerActive,
      currentTime,
      maxTime,
      participantId: room.currentPresenterId || undefined,
      startTime: timerStartTime,
      endTime: timerEndTime,
    },
    sessionActive: room.status === 'active',
  }
}

/**
 * Performance threshold for diff calculation (in milliseconds)
 * Used to detect when diff calculation is taking too long
 */
export const DIFF_PERFORMANCE_THRESHOLD_MS = 100 // 100ms warning threshold

/**
 * Validate that diff calculation meets performance requirements
 *
 * @param startTime - Start time from performance.now()
 * @param endTime - End time from performance.now()
 * @param roomId - Room ID for logging
 */
export function validateDiffPerformance(startTime: number, endTime: number, roomId: string): void {
  const duration = endTime - startTime

  if (duration > DIFF_PERFORMANCE_THRESHOLD_MS) {
    console.warn(
      `Room state diff calculation took ${duration}ms for room ${roomId}, ` +
        `exceeding threshold of ${DIFF_PERFORMANCE_THRESHOLD_MS}ms`
    )
  }
}

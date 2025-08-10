'use client'

import { useState, useEffect } from 'react'
import {
  ParticipantRoleEnum,
  ParticipantStatusEnum,
} from '@/domain/room/value-objects/participant-attributes'
import { RoleDetectionService } from '../utils/role-detection'
import { useRoomSocket } from '@/infrastructure/communication/hooks'
import type { RoomStateUpdateEvent, ParticipantUpdateEvent } from '@/types/socket'
import type { Participant } from '@/domain/compatibility-types'
import { RoomTitle } from './RoomTitle'
import { ParticipantsList } from './ParticipantsList'
import { Wheel } from './Wheel'
import { TimerPanel } from './TimerPanel'
import { Instructions } from './Instructions'

// Conversion utilities between domain types and component types
const convertParticipantForComponent = (domainParticipant: Participant) => ({
  id: domainParticipant.id,
  name: domainParticipant.name,
  status: mapStatusToEnum(domainParticipant.status),
  role: mapRoleToEnum(domainParticipant.role),
})

const mapStatusToEnum = (status: string): ParticipantStatusEnum => {
  switch (status) {
    case 'queued':
      return ParticipantStatusEnum.QUEUED
    case 'active':
      return ParticipantStatusEnum.ACTIVE
    case 'finished':
      return ParticipantStatusEnum.FINISHED
    case 'disabled':
      return ParticipantStatusEnum.DISABLED
    default:
      return ParticipantStatusEnum.QUEUED
  }
}

const mapRoleToEnum = (role: string): ParticipantRoleEnum => {
  switch (role) {
    case 'organizer':
      return ParticipantRoleEnum.ORGANIZER
    case 'guest':
      return ParticipantRoleEnum.GUEST
    default:
      return ParticipantRoleEnum.GUEST
  }
}

const convertCurrentPresenterForComponent = (participant: Participant | null | undefined) => {
  if (!participant) return null
  return {
    id: participant.id,
    name: participant.name,
    status: mapStatusToEnum(participant.status),
  }
}

interface RoomData {
  id: string
  name?: string
  participants: Participant[]
  currentPresenterId?: string
  organizerId: string
  timerStartTime?: Date
  timerDurationMinutes?: number
  timerPausedTime?: Date
  timerRemainingSeconds?: number
}

interface RoomLayoutProps {
  roomId: string
  initialData?: RoomData
}
export function RoomLayout({ roomId, initialData }: RoomLayoutProps) {
  const [userRole, setUserRole] = useState<ParticipantRoleEnum>(ParticipantRoleEnum.GUEST)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [roomData, setRoomData] = useState<RoomData | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastWinnerState, setLastWinner] = useState<{ id: string; name: string } | null>(null)

  // Initialize role detection and user ID
  useEffect(() => {
    // For MVP, first visitor to a room becomes organizer
    // In production, this would be handled by proper authentication
    const isOrganizer = RoleDetectionService.isOrganizer(roomId)

    if (isOrganizer) {
      setUserRole(ParticipantRoleEnum.ORGANIZER)
    } else {
      // Mark as organizer if no cookie exists (first visitor)
      RoleDetectionService.setAsOrganizer(roomId)
      setUserRole(ParticipantRoleEnum.ORGANIZER)
    }

    // Generate a temporary user ID for this session
    // In real implementation, this would come from authentication or session management
    setCurrentUserId(crypto.randomUUID())
  }, [roomId])

  // Socket.IO integration for real-time communication
  const {
    socket,
    status: socketStatus,
    isConnected,
    error: socketError,
    reconnect,
  } = useRoomSocket({
    roomId,
    role: userRole === ParticipantRoleEnum.ORGANIZER ? 'organizer' : 'guest',
    userId: currentUserId,
    autoConnect: true,
  })

  // Handle socket connection errors
  useEffect(() => {
    if (socketError) {
      setError(`Connection error: ${socketError}`)
    }
  }, [socketError])

  // Set up Socket.IO event listeners for room state updates
  useEffect(() => {
    if (!socket || !isConnected) {
      return
    }

    // Listen for room state updates
    const handleRoomStateUpdate = (data: RoomStateUpdateEvent) => {
      console.log('Room state update received:', data)

      // Update local room data with received state
      setRoomData(prevData => {
        if (!prevData) return null

        return {
          ...prevData,
          participants: data.participants,
          currentPresenterId: data.currentPresenter,
          // Map other state as needed
        }
      })
    }

    const handleParticipantUpdated = (data: ParticipantUpdateEvent) => {
      console.log('Participant updated:', data)
      setRoomData(prevData =>
        prevData
          ? {
              ...prevData,
              participants: prevData.participants.map(p =>
                p.id === data.participant.id ? data.participant : p
              ),
            }
          : null
      )
    }

    // Set up event listeners
    socket.onRoomStateUpdate(handleRoomStateUpdate)
    socket.onParticipantUpdate(handleParticipantUpdated)

    // Cleanup listeners on unmount or socket change
    return () => {
      // The off method will handle cleanup when component unmounts or socket changes
      if (socket.off) {
        socket.off('room_state_update', handleRoomStateUpdate)
        socket.off('participant_update', handleParticipantUpdated)
      }
    }
  }, [socket, isConnected])

  // Initialize room data with mock data if no initial data and not connected yet
  useEffect(() => {
    if (!roomData && !isConnected && socketStatus !== 'connecting') {
      // Provide fallback mock data when socket is not available
      const now = new Date()
      setRoomData({
        id: roomId,
        name: `Demo Room`,
        participants: [
          {
            id: '1',
            name: 'Alice Johnson',
            status: ParticipantStatusEnum.QUEUED,
            role: ParticipantRoleEnum.ORGANIZER,
            joinedAt: now,
            lastUpdatedAt: now,
            lastSelectedAt: null,
          },
          {
            id: '2',
            name: 'Bob Smith',
            status: ParticipantStatusEnum.QUEUED,
            role: ParticipantRoleEnum.GUEST,
            joinedAt: now,
            lastUpdatedAt: now,
            lastSelectedAt: null,
          },
          {
            id: '3',
            name: 'Carol Williams',
            status: ParticipantStatusEnum.FINISHED,
            role: ParticipantRoleEnum.GUEST,
            joinedAt: now,
            lastUpdatedAt: now,
            lastSelectedAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
          },
          {
            id: '4',
            name: 'David Wilson',
            status: ParticipantStatusEnum.QUEUED,
            role: ParticipantRoleEnum.GUEST,
            joinedAt: now,
            lastUpdatedAt: now,
            lastSelectedAt: null,
          },
          {
            id: '5',
            name: 'Eve Brown',
            status: ParticipantStatusEnum.QUEUED,
            role: ParticipantRoleEnum.GUEST,
            joinedAt: now,
            lastUpdatedAt: now,
            lastSelectedAt: null,
          },
          {
            id: '6',
            name: 'Frank Miller',
            status: ParticipantStatusEnum.DISABLED,
            role: ParticipantRoleEnum.GUEST,
            joinedAt: now,
            lastUpdatedAt: now,
            lastSelectedAt: null,
          },
        ],
        organizerId: '1',
      })
    }
  }, [roomId, roomData, isConnected, socketStatus])

  const handleAddParticipant = async (name: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to server')
      return
    }

    setIsLoading(true)
    try {
      // Emit add participant event via Socket.IO
      const now = new Date()
      const newParticipant: Participant = {
        id: crypto.randomUUID(),
        name,
        status: ParticipantStatusEnum.QUEUED,
        role: ParticipantRoleEnum.GUEST,
        joinedAt: now,
        lastUpdatedAt: now,
        lastSelectedAt: null,
      }

      // Use socket to emit the event
      socket.emitParticipantUpdate({
        participant: newParticipant,
        action: 'added',
      })

      // Optimistically update UI - the real update will come via room_state_update event
      setRoomData(prev =>
        prev
          ? {
              ...prev,
              participants: [...prev.participants, newParticipant],
            }
          : null
      )
    } catch (error) {
      console.error('Failed to add participant:', error)
      setError('Failed to add participant')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleParticipant = async (id: string, enable: boolean) => {
    if (!socket || !isConnected) {
      setError('Not connected to server')
      return
    }

    setIsLoading(true)
    try {
      // Emit toggle participant event via Socket.IO
      const updatedParticipant = roomData?.participants.find(p => p.id === id)
      if (!updatedParticipant) {
        setError('Participant not found')
        return
      }

      const newStatus = enable ? ParticipantStatusEnum.QUEUED : ParticipantStatusEnum.DISABLED
      const updatedParticipantData: Participant = {
        ...updatedParticipant,
        status: newStatus,
        lastUpdatedAt: new Date(),
      }

      socket.emitParticipantUpdate({
        participant: updatedParticipantData,
        action: 'updated',
      })

      // Optimistically update UI
      setRoomData(prev =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map(p =>
                p.id === id ? { ...p, status: newStatus } : p
              ),
            }
          : null
      )
    } catch (error) {
      console.error('Failed to toggle participant:', error)
      setError('Failed to update participant')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkFinished = async (id: string) => {
    if (!socket || !isConnected) {
      setError('Not connected to server')
      return
    }

    setIsLoading(true)
    try {
      const participantToFinish = roomData?.participants.find(p => p.id === id)
      if (!participantToFinish) {
        setError('Participant not found')
        return
      }

      const finishedParticipant: Participant = {
        ...participantToFinish,
        status: ParticipantStatusEnum.FINISHED,
        lastUpdatedAt: new Date(),
      }

      socket.emitParticipantUpdate({
        participant: finishedParticipant,
        action: 'updated',
      })

      // Also emit timer stop event if needed (using room message for now)
      socket.emitRoomMessage({
        message: `Timer stopped for participant ${id}`,
        senderId: currentUserId,
        messageType: 'system',
      })

      // Optimistically update UI
      setRoomData(prev =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map(p =>
                p.id === id ? { ...p, status: ParticipantStatusEnum.FINISHED } : p
              ),
              currentPresenterId: undefined,
              timerStartTime: undefined,
            }
          : null
      )
    } catch (error) {
      console.error('Failed to mark participant as finished:', error)
      setError('Failed to mark as finished')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSpinStart = () => {
    setIsSpinning(true)
    setIsLoading(true)
  }

  const handleSpinResult = async (winner: { id: string; name: string }) => {
    if (!socket || !isConnected) {
      setError('Not connected to server')
      setIsSpinning(false)
      setIsLoading(false)
      return
    }

    try {
      // Emit wheel result via Socket.IO using wheel spin event
      socket.emitWheelSpin({
        wheelState: {
          isSpinning: false,
          selectedParticipant: winner.id,
          spinDuration: 3000,
          spinStartTime: new Date(Date.now() - 3000).toISOString(),
        },
        selectedParticipant: winner.id,
        spinDuration: 3000,
        action: 'spin_complete',
      })

      // Optimistically update UI
      setRoomData(prev =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map(p =>
                p.id === winner.id ? { ...p, status: ParticipantStatusEnum.ACTIVE } : p
              ),
              currentPresenterId: winner.id,
              timerStartTime: undefined, // Don't start timer automatically
              timerDurationMinutes: undefined,
            }
          : null
      )
      setLastWinner({ id: winner.id, name: winner.name })
    } catch (error) {
      console.error('Failed to process wheel result:', error)
      setError('Failed to process wheel result')
    } finally {
      setIsSpinning(false)
      setIsLoading(false)
    }
  }

  const handleSpinError = (error: Error) => {
    console.error('Wheel spin error:', error)
    setError(error.message)
    setIsSpinning(false)
    setIsLoading(false)
  }

  const handleStartTimer = async (timeInMinutes: number) => {
    if (!socket || !isConnected) {
      setError('Not connected to server')
      return
    }

    setIsLoading(true)
    try {
      const startTime = new Date()

      socket.emitTimerUpdate({
        timerState: {
          isActive: true,
          currentTime: 0,
          maxTime: timeInMinutes * 60,
          startTime: startTime.toISOString(),
          participantId: roomData?.currentPresenterId,
        },
        action: 'start',
      })

      // Optimistically update UI
      setRoomData(prev =>
        prev
          ? {
              ...prev,
              timerStartTime: startTime,
              timerDurationMinutes: timeInMinutes,
            }
          : null
      )
    } catch (error) {
      console.error('Failed to start timer:', error)
      setError('Failed to start timer')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePauseTimer = async () => {
    if (!socket || !isConnected) {
      setError('Not connected to server')
      return
    }

    setIsLoading(true)
    try {
      // Calculate remaining time when pausing
      const now = new Date()
      const currentRoomData = roomData
      if (currentRoomData?.timerStartTime && currentRoomData?.timerDurationMinutes) {
        const elapsed = Math.floor(
          (now.getTime() - currentRoomData.timerStartTime.getTime()) / 1000
        )
        const totalSeconds = currentRoomData.timerDurationMinutes * 60
        const remainingSeconds = Math.max(0, totalSeconds - elapsed)

        socket.emitTimerUpdate({
          timerState: {
            isActive: false,
            currentTime: totalSeconds - remainingSeconds,
            maxTime: totalSeconds,
            startTime: currentRoomData.timerStartTime.toISOString(),
            participantId: roomData?.currentPresenterId,
          },
          action: 'pause',
        })

        // Optimistically update UI
        setRoomData(prev =>
          prev
            ? {
                ...prev,
                timerStartTime: undefined,
                timerPausedTime: now,
                timerRemainingSeconds: remainingSeconds,
              }
            : null
        )
      }
    } catch (error) {
      console.error('Failed to pause timer:', error)
      setError('Failed to pause timer')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinueTimer = async () => {
    if (!socket || !isConnected) {
      setError('Not connected to server')
      return
    }

    setIsLoading(true)
    try {
      // Resume timer with remaining time
      const now = new Date()
      const currentRoomData = roomData
      if (currentRoomData?.timerRemainingSeconds !== undefined) {
        // Calculate new duration in minutes from remaining seconds
        const remainingMinutes = currentRoomData.timerRemainingSeconds / 60

        socket.emitTimerUpdate({
          timerState: {
            isActive: true,
            currentTime: remainingMinutes * 60 - currentRoomData.timerRemainingSeconds,
            maxTime: remainingMinutes * 60,
            startTime: now.toISOString(),
            participantId: roomData?.currentPresenterId,
          },
          action: 'resume',
        })

        // Optimistically update UI
        setRoomData(prev =>
          prev
            ? {
                ...prev,
                timerStartTime: now,
                timerDurationMinutes: remainingMinutes,
                timerPausedTime: undefined,
                timerRemainingSeconds: undefined,
              }
            : null
        )
      }
    } catch (error) {
      console.error('Failed to continue timer:', error)
      setError('Failed to continue timer')
    } finally {
      setIsLoading(false)
    }
  }

  if (!roomData) {
    return (
      <div
        className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 
        flex items-center justify-center'
      >
        <div className='text-center'>
          <svg
            className='animate-spin mx-auto h-12 w-12 text-blue-600'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            ></circle>
            <path
              className='opacity-75'
              fill='currentColor'
              d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            ></path>
          </svg>
          <p className='mt-4 text-gray-600 dark:text-gray-300'>
            {socketStatus === 'connecting' ? 'Connecting to room...' : 'Loading room...'}
          </p>
          {socketStatus === 'error' && (
            <div className='mt-2'>
              <p className='text-red-600 dark:text-red-400'>Connection failed</p>
              <button
                onClick={reconnect}
                className='mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
              >
                Retry Connection
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const currentPresenter = roomData.currentPresenterId
    ? roomData.participants.find(p => p.id === roomData.currentPresenterId)
    : null

  const lastWinner =
    lastWinnerState ||
    (currentPresenter
      ? {
          id: currentPresenter.id,
          name: currentPresenter.name,
        }
      : null)

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='container mx-auto px-4 py-6 max-w-7xl'>
        {/* Connection Status & Error Messages */}
        {(error || socketStatus !== 'connected') && (
          <div className='mb-6 space-y-2'>
            {/* Socket Connection Status */}
            {socketStatus !== 'connected' && (
              <div
                className={`border rounded-lg p-4 flex items-center justify-between ${
                  socketStatus === 'connecting'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                    : socketStatus === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      : 'bg-gray-50 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700'
                }`}
              >
                <div className='flex items-center space-x-2'>
                  {socketStatus === 'connecting' && (
                    <svg
                      className='animate-spin h-4 w-4 text-yellow-600'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                  )}
                  <p
                    className={
                      socketStatus === 'connecting'
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : socketStatus === 'error'
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-gray-700 dark:text-gray-300'
                    }
                  >
                    {socketStatus === 'connecting' && 'Connecting to room...'}
                    {socketStatus === 'error' && 'Connection lost'}
                    {socketStatus === 'disconnected' && 'Disconnected from room'}
                  </p>
                </div>
                {socketStatus === 'error' && (
                  <button
                    onClick={reconnect}
                    className='px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700'
                  >
                    Reconnect
                  </button>
                )}
              </div>
            )}

            {/* Error Messages */}
            {error && (
              <div
                className='bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 
                rounded-lg p-4 flex items-center justify-between'
              >
                <p className='text-red-700 dark:text-red-300'>{error}</p>
                <button
                  onClick={() => setError(null)}
                  className='text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                >
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M6 18L18 6M6 6l12 12'
                    ></path>
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Room Title - Full Width */}
        <RoomTitle roomId={roomData.id} roomName={roomData.name} currentUserRole={userRole} />

        {/* Main Content - Responsive Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
          {/* Desktop: Left Column - Participants List (1/3) */}
          <div className='lg:col-span-4 order-2 lg:order-1'>
            <ParticipantsList
              participants={roomData.participants.map(convertParticipantForComponent)}
              currentUserRole={userRole}
              currentUserId={currentUserId}
              onAddParticipant={
                userRole === ParticipantRoleEnum.ORGANIZER ? handleAddParticipant : undefined
              }
              onToggleParticipant={
                userRole === ParticipantRoleEnum.ORGANIZER ? handleToggleParticipant : undefined
              }
              onMarkFinished={
                userRole === ParticipantRoleEnum.ORGANIZER ? handleMarkFinished : undefined
              }
              isLoading={isLoading}
            />
          </div>

          {/* Desktop: Center Column - Wheel (2/3) */}
          <div className='lg:col-span-5 order-3 lg:order-2'>
            <Wheel
              participants={roomData.participants.map(convertParticipantForComponent)}
              currentUserRole={userRole}
              isSpinning={isSpinning}
              onSpinStart={userRole === ParticipantRoleEnum.ORGANIZER ? handleSpinStart : undefined}
              onResult={userRole === ParticipantRoleEnum.ORGANIZER ? handleSpinResult : undefined}
              onError={handleSpinError}
              lastWinner={lastWinner}
            />
          </div>

          {/* Mobile: Top / Desktop: Right Column - Timer Panel (1/3) */}
          <div className='lg:col-span-3 order-1 lg:order-3'>
            <TimerPanel
              currentPresenter={convertCurrentPresenterForComponent(currentPresenter)}
              currentUserRole={userRole}
              onMarkFinished={
                userRole === ParticipantRoleEnum.ORGANIZER ? handleMarkFinished : undefined
              }
              onPauseTimer={
                userRole === ParticipantRoleEnum.ORGANIZER ? handlePauseTimer : undefined
              }
              onContinueTimer={
                userRole === ParticipantRoleEnum.ORGANIZER ? handleContinueTimer : undefined
              }
              onStartTimer={
                userRole === ParticipantRoleEnum.ORGANIZER ? handleStartTimer : undefined
              }
              timerStartTime={roomData.timerStartTime}
              timerDurationMinutes={roomData.timerDurationMinutes}
              timerPausedTime={roomData.timerPausedTime}
              timerRemainingSeconds={roomData.timerRemainingSeconds}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Instructions - Full Width */}
        <Instructions currentUserRole={userRole} className='mt-6' />
      </div>
    </div>
  )
}

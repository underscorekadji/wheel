'use client'

import { useState, useEffect } from 'react'
import {
  ParticipantRoleEnum,
  ParticipantStatusEnum,
} from '@/domain/room/value-objects/participant-attributes'
import { Participant } from '@/domain/compatibility-types'
import { RoleDetectionService } from '../utils/role-detection'
import { useRoomSocket } from '@/hooks/useRoomSocket'
import { RoomTitle } from './RoomTitle'
import { ParticipantsList } from './ParticipantsList'
import { Wheel } from './Wheel'
import { TimerPanel } from './TimerPanel'
import { Instructions } from './Instructions'

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
  const [lastWinnerState, setLastWinner] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize Socket.IO connection
  const socket = useRoomSocket({
    roomId,
    userId: currentUserId,
    autoConnect: true,
  })

  // Initialize role detection and user session
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

  // Set up Socket.IO event listeners for real-time updates
  useEffect(() => {
    if (!socket.isConnected) return

    // Subscribe to room state updates
    const unsubscribeStateUpdate = socket.on.roomStateUpdate(data => {
      console.log('Received room state update:', data)
      setRoomData({
        id: data.roomId,
        participants: data.participants,
        currentPresenterId: data.currentPresenter,
        organizerId:
          data.participants.find(p => p.role === ParticipantRoleEnum.ORGANIZER)?.id || '',
        // Note: Timer state from socket would need to be mapped to local timer state
        // This is a simplified implementation
      })
    })

    // Subscribe to participant updates
    const unsubscribeParticipantUpdate = socket.on.participantUpdate(data => {
      console.log('Received participant update:', data)
      setRoomData(prev => {
        if (!prev) return prev

        const updatedParticipants = prev.participants.map(p =>
          p.id === data.participant.id
            ? {
                ...data.participant,
                status: data.participant.status as any, // Type conversion for enum compatibility
                role: data.participant.role as any,
              }
            : p
        )

        // Add new participant if not found
        if (!prev.participants.find(p => p.id === data.participant.id)) {
          updatedParticipants.push({
            ...data.participant,
            status: data.participant.status as any,
            role: data.participant.role as any,
          })
        }

        return {
          ...prev,
          participants: updatedParticipants,
        }
      })
    })

    // Subscribe to wheel spin events
    const unsubscribeWheelSpin = socket.on.wheelSpin(data => {
      console.log('Received wheel spin event:', data)
      if (data.action === 'spin_complete' && data.selectedParticipant) {
        setRoomData(prev => {
          if (!prev) return prev

          const participant = prev.participants.find(p => p.id === data.selectedParticipant)
          if (participant) {
            setLastWinner({ id: participant.id, name: participant.name })
            return {
              ...prev,
              participants: prev.participants.map(p =>
                p.id === data.selectedParticipant
                  ? { ...p, status: 'active' as any, lastUpdatedAt: new Date() }
                  : p
              ),
              currentPresenterId: data.selectedParticipant,
            }
          }
          return prev
        })
        setIsSpinning(false)
      } else if (data.action === 'start_spin') {
        setIsSpinning(true)
      }
    })

    // Subscribe to timer updates
    const unsubscribeTimerUpdate = socket.on.timerUpdate(data => {
      console.log('Received timer update:', data)
      // Handle timer state updates from the server
      // This would update the local timer state based on server events
    })

    // Subscribe to errors
    const unsubscribeError = socket.on.error(data => {
      console.error('Socket error:', data)
    })

    // Cleanup function
    return () => {
      unsubscribeStateUpdate()
      unsubscribeParticipantUpdate()
      unsubscribeWheelSpin()
      unsubscribeTimerUpdate()
      unsubscribeError()
    }
  }, [socket.isConnected, socket.on])

  // Mock data for development when not connected - replace with real Socket.IO integration
  useEffect(() => {
    if (!roomData && !socket.isConnected) {
      // Simulate loading room data when socket is not available
      setRoomData({
        id: roomId,
        name: `Demo Room`,
        participants: [
          {
            id: '1',
            name: 'Alice Johnson',
            status: 'queued',
            role: 'organizer',
            joinedAt: new Date(),
            lastUpdatedAt: new Date(),
            lastSelectedAt: null,
          },
          {
            id: '2',
            name: 'Bob Smith',
            status: 'queued',
            role: 'guest',
            joinedAt: new Date(),
            lastUpdatedAt: new Date(),
            lastSelectedAt: null,
          },
          {
            id: '3',
            name: 'Carol Williams',
            status: 'finished',
            role: 'guest',
            joinedAt: new Date(),
            lastUpdatedAt: new Date(),
            lastSelectedAt: new Date(),
          },
          {
            id: '4',
            name: 'David Wilson',
            status: 'queued',
            role: 'guest',
            joinedAt: new Date(),
            lastUpdatedAt: new Date(),
            lastSelectedAt: null,
          },
          {
            id: '5',
            name: 'Eve Brown',
            status: 'queued',
            role: 'guest',
            joinedAt: new Date(),
            lastUpdatedAt: new Date(),
            lastSelectedAt: null,
          },
          {
            id: '6',
            name: 'Frank Miller',
            status: 'disabled',
            role: 'guest',
            joinedAt: new Date(),
            lastUpdatedAt: new Date(),
            lastSelectedAt: null,
          },
        ],
        organizerId: '1',
      })
    }
  }, [roomId, roomData, socket.isConnected])

  const handleAddParticipant = async (name: string) => {
    setIsLoading(true)
    try {
      // Emit participant update via Socket.IO instead of API call
      const newParticipant: Participant = {
        id: crypto.randomUUID(),
        name,
        status: 'queued',
        role: 'guest',
        joinedAt: new Date(),
        lastUpdatedAt: new Date(),
        lastSelectedAt: null,
      }

      // Emit via socket if connected, otherwise fallback to local state
      if (socket.isConnected) {
        socket.emit.participantUpdate({
          participant: newParticipant,
          action: 'added',
        })
      } else {
        // Fallback to local state update for development
        setRoomData(prev =>
          prev
            ? {
                ...prev,
                participants: [...prev.participants, newParticipant],
              }
            : null
        )
      }
    } catch (error) {
      console.error('Failed to add participant:', error)
      // Use socket error if available, otherwise local error state
      if (!socket.error) {
        // For development fallback, we don't have an error state
        console.warn('No socket error state available')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleParticipant = async (id: string, enable: boolean) => {
    setIsLoading(true)
    try {
      const participant = roomData?.participants.find(p => p.id === id)
      if (!participant) return

      const updatedParticipant: Participant = {
        ...participant,
        status: enable ? 'queued' : 'disabled',
        lastUpdatedAt: new Date(),
      }

      // Emit via socket if connected, otherwise fallback to local state
      if (socket.isConnected) {
        socket.emit.participantUpdate({
          participant: updatedParticipant,
          action: 'updated',
        })
      } else {
        // Fallback to local state update
        setRoomData(prev =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map(p => (p.id === id ? updatedParticipant : p)),
              }
            : null
        )
      }
    } catch (error) {
      console.error('Failed to toggle participant:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkFinished = async (id: string) => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))

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

    // Emit wheel spin start via socket if connected
    if (socket.isConnected) {
      const queuedParticipants =
        roomData?.participants.filter(p => p.status === ParticipantStatusEnum.QUEUED) || []

      socket.emit.wheelSpin({
        wheelState: {
          isSpinning: true,
          spinStartTime: new Date().toISOString(),
          spinDuration: Math.random() * 2000 + 2000, // 2-4 seconds
        },
        action: 'start_spin',
        spinDuration: 3000,
      })
    }
  }

  const handleSpinResult = async (winner: { id: string; name: string }) => {
    try {
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
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))

      setRoomData(prev =>
        prev
          ? {
              ...prev,
              timerStartTime: new Date(),
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
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))

      // Calculate remaining time when pausing
      const now = new Date()
      const currentRoomData = roomData
      if (currentRoomData?.timerStartTime && currentRoomData?.timerDurationMinutes) {
        const elapsed = Math.floor(
          (now.getTime() - currentRoomData.timerStartTime.getTime()) / 1000
        )
        const totalSeconds = currentRoomData.timerDurationMinutes * 60
        const remainingSeconds = Math.max(0, totalSeconds - elapsed)

        setRoomData(prev =>
          prev
            ? {
                ...prev,
                timerStartTime: undefined, // Stop the timer
                timerPausedTime: now, // Mark when it was paused
                timerRemainingSeconds: remainingSeconds, // Save remaining time
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
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))

      // Resume timer with remaining time
      const now = new Date()
      const currentRoomData = roomData
      if (currentRoomData?.timerRemainingSeconds !== undefined) {
        // Calculate new duration in minutes from remaining seconds
        const remainingMinutes = currentRoomData.timerRemainingSeconds / 60

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
          <p className='mt-4 text-gray-600 dark:text-gray-300'>Loading room...</p>
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
        {/* Socket Connection Status */}
        <div className='mb-4 flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <div
              className={`w-3 h-3 rounded-full ${
                socket.status === 'connected'
                  ? 'bg-green-500'
                  : socket.status === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : socket.status === 'error'
                      ? 'bg-red-500'
                      : 'bg-gray-400'
              }`}
            ></div>
            <span className='text-sm text-gray-600 dark:text-gray-300'>
              {socket.status === 'connected' && socket.socketId
                ? `Connected (${socket.socketId.substring(0, 8)}...)`
                : socket.status === 'connecting'
                  ? 'Connecting...'
                  : socket.status === 'error'
                    ? `Connection Error: ${socket.error}`
                    : 'Disconnected'}
            </span>
          </div>
          {socket.status === 'error' && (
            <button
              onClick={socket.reconnect}
              className='px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors'
            >
              Retry
            </button>
          )}
        </div>

        {/* Error Message */}
        {socket.error && socket.status === 'error' && (
          <div
            className='mb-6 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 
            rounded-lg p-4 flex items-center justify-between'
          >
            <p className='text-red-700 dark:text-red-300'>{socket.error}</p>
            <button
              onClick={() => socket.reconnect()}
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

        {/* Room Title - Full Width */}
        <RoomTitle roomId={roomData.id} roomName={roomData.name} currentUserRole={userRole} />

        {/* Main Content - Responsive Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
          {/* Desktop: Left Column - Participants List (1/3) */}
          <div className='lg:col-span-4 order-2 lg:order-1'>
            <ParticipantsList
              participants={roomData.participants}
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
              participants={roomData.participants}
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
              currentPresenter={currentPresenter || null}
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

'use client'

import { useState, useEffect } from 'react'
import {
  ParticipantRoleEnum,
  ParticipantStatusEnum,
} from '@/domain/room/value-objects/participant-attributes'
import { RoleDetectionService } from '../utils/role-detection'
import { RoomTitle } from './RoomTitle'
import { ParticipantsList } from './ParticipantsList'
import { Wheel } from './Wheel'
import { TimerPanel } from './TimerPanel'
import { Instructions } from './Instructions'

interface Participant {
  id: string
  name: string
  status: ParticipantStatusEnum
  role: ParticipantRoleEnum
}

interface RoomData {
  id: string
  name?: string
  participants: Participant[]
  currentPresenterId?: string
  organizerId: string
  timerStartTime?: Date
  timerDurationMinutes?: number
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

  // Initialize role detection
  useEffect(() => {
    // For MVP, first visitor to a room becomes organizer
    // In production, this would be handled by proper authentication
    const isOrganizer = RoleDetectionService.isOrganizer(roomId)

    if (!isOrganizer) {
      // Mark as organizer if no cookie exists (first visitor)
      RoleDetectionService.setAsOrganizer(roomId)
      setUserRole(ParticipantRoleEnum.ORGANIZER)
    } else {
      setUserRole(ParticipantRoleEnum.ORGANIZER)
    }

    // Generate a temporary user ID for this session
    // In real implementation, this would come from authentication or session management
    setCurrentUserId(crypto.randomUUID())
  }, [roomId])

  // Mock data for development - replace with real Socket.IO integration
  useEffect(() => {
    if (!roomData) {
      // Simulate loading room data
      setRoomData({
        id: roomId,
        name: `Demo Room`,
        participants: [
          {
            id: '1',
            name: 'Alice Johnson',
            status: ParticipantStatusEnum.QUEUED,
            role: ParticipantRoleEnum.ORGANIZER,
          },
          {
            id: '2',
            name: 'Bob Smith',
            status: ParticipantStatusEnum.QUEUED,
            role: ParticipantRoleEnum.GUEST,
          },
          {
            id: '3',
            name: 'Carol Williams',
            status: ParticipantStatusEnum.FINISHED,
            role: ParticipantRoleEnum.GUEST,
          },
        ],
        organizerId: '1',
      })
    }
  }, [roomId, roomData])

  const handleAddParticipant = async (name: string) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      const newParticipant: Participant = {
        id: crypto.randomUUID(),
        name,
        status: ParticipantStatusEnum.QUEUED,
        role: ParticipantRoleEnum.GUEST,
      }

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
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))

      setRoomData(prev =>
        prev
          ? {
              ...prev,
              participants: prev.participants.map(p =>
                p.id === id
                  ? {
                      ...p,
                      status: enable
                        ? ParticipantStatusEnum.QUEUED
                        : ParticipantStatusEnum.DISABLED,
                    }
                  : p
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

  const handleSpin = async () => {
    setIsSpinning(true)
    setIsLoading(true)
    try {
      // Simulate wheel spin duration
      await new Promise(resolve => setTimeout(resolve, 3000))

      const eligibleParticipants =
        roomData?.participants.filter(p => p.status === ParticipantStatusEnum.QUEUED) || []

      if (eligibleParticipants.length > 0) {
        const selectedParticipant =
          eligibleParticipants[Math.floor(Math.random() * eligibleParticipants.length)]

        setRoomData(prev =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map(p =>
                  p.id === selectedParticipant.id
                    ? { ...p, status: ParticipantStatusEnum.ACTIVE }
                    : p
                ),
                currentPresenterId: selectedParticipant.id,
                timerStartTime: undefined, // Don't start timer automatically
                timerDurationMinutes: undefined,
              }
            : null
        )
      }
    } catch (error) {
      console.error('Failed to spin wheel:', error)
      setError('Failed to spin wheel')
    } finally {
      setIsSpinning(false)
      setIsLoading(false)
    }
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

  const handleStopTimer = async () => {
    setIsLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 300))

      setRoomData(prev =>
        prev
          ? {
              ...prev,
              timerStartTime: undefined,
            }
          : null
      )
    } catch (error) {
      console.error('Failed to stop timer:', error)
      setError('Failed to stop timer')
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

  const lastWinner = currentPresenter
    ? {
        id: currentPresenter.id,
        name: currentPresenter.name,
      }
    : null

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='container mx-auto px-4 py-6 max-w-7xl'>
        {/* Error Message */}
        {error && (
          <div
            className='mb-6 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 
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
              onSpin={userRole === ParticipantRoleEnum.ORGANIZER ? handleSpin : undefined}
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
              onStopTimer={userRole === ParticipantRoleEnum.ORGANIZER ? handleStopTimer : undefined}
              onStartTimer={
                userRole === ParticipantRoleEnum.ORGANIZER ? handleStartTimer : undefined
              }
              timerStartTime={roomData.timerStartTime}
              timerDurationMinutes={roomData.timerDurationMinutes}
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

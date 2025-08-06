'use client'

import { useState, useEffect } from 'react'
import {
  ParticipantRoleEnum,
  ParticipantStatusEnum,
} from '@/domain/room/value-objects/participant-attributes'

interface CurrentPresenter {
  id: string
  name: string
  status: ParticipantStatusEnum
}

interface TimerPanelProps {
  currentPresenter: CurrentPresenter | null
  currentUserRole: ParticipantRoleEnum
  onMarkFinished?: (id: string) => void
  onPauseTimer?: () => void
  onContinueTimer?: () => void
  onStartTimer?: (timeInMinutes: number) => void
  timerStartTime?: Date | null
  timerDurationMinutes?: number
  timerPausedTime?: Date | null
  timerRemainingSeconds?: number
  isLoading?: boolean
}

export function TimerPanel({
  currentPresenter,
  currentUserRole,
  onMarkFinished,
  onPauseTimer,
  onContinueTimer,
  onStartTimer,
  timerStartTime,
  timerDurationMinutes = 10,
  timerPausedTime,
  timerRemainingSeconds,
  isLoading = false,
}: TimerPanelProps) {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedTime, setSelectedTime] = useState(10)

  const isOrganizer = currentUserRole === ParticipantRoleEnum.ORGANIZER

  // Calculate time remaining
  useEffect(() => {
    if (!currentPresenter) {
      setTimeRemaining(0)
      setIsActive(false)
      setIsPaused(false)
      return
    }

    // Check if timer is paused
    if (timerPausedTime && !timerStartTime) {
      setIsPaused(true)
      setIsActive(false)
      // Set the remaining time from room data if available
      if (timerRemainingSeconds !== undefined) {
        setTimeRemaining(timerRemainingSeconds)
      }
      return
    }

    // Check if timer is not started
    if (!timerStartTime) {
      setTimeRemaining(0)
      setIsActive(false)
      setIsPaused(false)
      return
    }

    setIsActive(true)
    setIsPaused(false)

    const updateTimer = () => {
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - timerStartTime.getTime()) / 1000)
      const totalSeconds = timerDurationMinutes * 60
      const remaining = Math.max(0, totalSeconds - elapsed)

      setTimeRemaining(remaining)

      if (remaining === 0) {
        setIsActive(false)
        // Timer ended - could trigger auto-finish here
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [
    timerStartTime,
    timerDurationMinutes,
    timerPausedTime,
    timerRemainingSeconds,
    currentPresenter,
  ])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTimerColor = (): string => {
    if (isPaused) return 'text-orange-500' // Paused
    if (!isActive || timeRemaining === 0) return 'text-gray-500 dark:text-gray-400'

    if (timeRemaining <= 30) return 'text-red-500' // Critical: last 30 seconds
    if (timeRemaining <= 120) return 'text-yellow-500' // Warning: last 2 minutes
    return 'text-green-500' // Normal
  }

  const getTimerBgColor = (): string => {
    if (isPaused) return 'bg-orange-50 dark:bg-orange-900/20' // Paused
    if (!isActive || timeRemaining === 0) return 'bg-gray-100 dark:bg-gray-700'

    if (timeRemaining <= 30) return 'bg-red-50 dark:bg-red-900/20' // Critical
    if (timeRemaining <= 120) return 'bg-yellow-50 dark:bg-yellow-900/20' // Warning
    return 'bg-green-50 dark:bg-green-900/20' // Normal
  }

  const handleStartTimer = () => {
    if (onStartTimer && selectedTime > 0) {
      onStartTimer(selectedTime)
    }
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
      <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-6'>Current Session</h2>

      {currentPresenter ? (
        <div className='space-y-6'>
          {/* Current Presenter */}
          <div className='text-center'>
            <h3 className='text-lg font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Now Presenting
            </h3>
            <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4'>
              <p className='text-2xl font-bold text-blue-900 dark:text-blue-100'>
                {currentPresenter.name}
              </p>
              <span
                className={`inline-flex items-center mt-2 px-3 py-1 rounded-full text-sm font-medium
                ${
                  currentPresenter.status === ParticipantStatusEnum.ACTIVE
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {currentPresenter.status === ParticipantStatusEnum.ACTIVE
                  ? 'Presenting'
                  : 'Finished'}
              </span>
            </div>
          </div>

          {/* Timer Display */}
          {(isActive || isPaused) && (
            <div className='text-center'>
              <h4 className='text-md font-medium text-gray-700 dark:text-gray-300 mb-3'>
                Time Remaining
              </h4>
              <div className={`rounded-lg p-6 transition-colors ${getTimerBgColor()}`}>
                <div
                  className={`text-4xl font-mono font-bold transition-colors ${getTimerColor()}`}
                >
                  {formatTime(timeRemaining)}
                </div>
                {isPaused && (
                  <div className='mt-2 text-orange-600 dark:text-orange-400 text-sm font-medium'>
                    ⏸️ Timer Paused
                  </div>
                )}
                {!isPaused && timeRemaining <= 30 && timeRemaining > 0 && (
                  <div className='mt-2 text-red-600 dark:text-red-400 text-sm font-medium animate-pulse'>
                    Time running out!
                  </div>
                )}
                {!isPaused && timeRemaining === 0 && (
                  <div className='mt-2 text-red-600 dark:text-red-400 text-sm font-medium'>
                    Time&apos;s up!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timer Controls (Organizer Only) */}
          {isOrganizer &&
            !isActive &&
            !isPaused &&
            currentPresenter.status === ParticipantStatusEnum.ACTIVE &&
            onStartTimer && (
              <div className='space-y-4'>
                <div>
                  <h4 className='text-md font-medium text-gray-700 dark:text-gray-300 mb-3'>
                    Presentation Duration
                  </h4>
                  <div className='flex items-center space-x-3'>
                    <label
                      htmlFor='time-input'
                      className='text-sm font-medium text-gray-700 dark:text-gray-300'
                    >
                      Minutes:
                    </label>
                    <input
                      type='number'
                      id='time-input'
                      min='1'
                      max='60'
                      value={selectedTime}
                      onChange={e =>
                        setSelectedTime(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))
                      }
                      className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 
                      rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 
                      dark:bg-gray-700 dark:text-white text-center'
                    />
                  </div>

                  {/* Quick Choose Section */}
                  <div className='mt-3'>
                    <p className='text-xs font-medium text-gray-600 dark:text-gray-400 mb-2'>
                      Quick Choose:
                    </p>
                    <div className='flex space-x-2'>
                      {[5, 10, 15, 30].map(minutes => (
                        <button
                          key={minutes}
                          onClick={() => setSelectedTime(minutes)}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            selectedTime === minutes
                              ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600'
                              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                          }`}
                        >
                          {minutes}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartTimer}
                  disabled={isLoading}
                  className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                  text-white font-medium py-3 px-4 rounded-lg transition-colors'
                >
                  Start Timer ({selectedTime} min)
                </button>
              </div>
            )}

          {/* Control Buttons (Organizer Only) */}
          {isOrganizer && (
            <div className='space-y-3'>
              {currentPresenter.status === ParticipantStatusEnum.ACTIVE && onMarkFinished && (
                <button
                  onClick={() => onMarkFinished(currentPresenter.id)}
                  disabled={isLoading}
                  className='w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 
                    text-white font-medium py-3 px-4 rounded-lg transition-colors'
                >
                  Mark as Finished
                </button>
              )}

              {/* Show Pause button when timer is active */}
              {isActive && onPauseTimer && (
                <button
                  onClick={onPauseTimer}
                  disabled={isLoading}
                  className='w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 
                    text-white font-medium py-2 px-4 rounded-lg transition-colors'
                >
                  Pause Timer
                </button>
              )}

              {/* Show Continue button when timer is paused */}
              {isPaused && onContinueTimer && (
                <button
                  onClick={onContinueTimer}
                  disabled={isLoading}
                  className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
                    text-white font-medium py-2 px-4 rounded-lg transition-colors'
                >
                  Continue Timer
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* No Current Presenter */
        <div className='text-center py-8'>
          <div className='text-gray-400 dark:text-gray-500 mb-4'>
            <svg
              className='w-16 h-16 mx-auto mb-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
              ></path>
            </svg>
          </div>
          <h3 className='text-lg font-medium text-gray-700 dark:text-gray-300 mb-2'>
            No Active Presentation
          </h3>
          <p className='text-gray-500 dark:text-gray-400'>
            {isOrganizer
              ? 'Spin the wheel to select the next presenter'
              : 'Waiting for organizer to spin the wheel'}
          </p>
        </div>
      )}

      {/* Session Instructions */}
      <div className='mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
        <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>Session Info</h4>
        <ul className='text-xs text-gray-600 dark:text-gray-400 space-y-1'>
          <li>• Timer duration: {timerDurationMinutes} minutes</li>
          <li>• Yellow warning: Last 2 minutes</li>
          <li>• Red critical: Last 30 seconds</li>
          {isOrganizer && <li>• Click &quot;Mark as Finished&quot; to end early</li>}
        </ul>
      </div>

      {isLoading && (
        <div className='mt-4 text-center text-sm text-gray-500 dark:text-gray-400'>
          <svg
            className='animate-spin inline mr-2 h-4 w-4'
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
          Updating...
        </div>
      )}
    </div>
  )
}

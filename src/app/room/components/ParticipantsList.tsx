'use client'

import { useState } from 'react'
import {
  ParticipantRoleEnum,
  ParticipantStatusEnum,
} from '@/domain/room/value-objects/participant-attributes'

interface Participant {
  id: string
  name: string
  status: ParticipantStatusEnum
  role: ParticipantRoleEnum
  isCurrentUser?: boolean
}

interface ParticipantsListProps {
  participants: Participant[]
  currentUserRole: ParticipantRoleEnum
  currentUserId?: string
  onAddParticipant?: (name: string) => void
  onToggleParticipant?: (id: string, enable: boolean) => void
  onMarkFinished?: (id: string) => void
  isLoading?: boolean
}

export function ParticipantsList({
  participants,
  currentUserRole,
  currentUserId,
  onAddParticipant,
  onToggleParticipant,
  onMarkFinished,
  isLoading = false,
}: ParticipantsListProps) {
  const [newParticipantName, setNewParticipantName] = useState('')
  const [isAddingParticipant, setIsAddingParticipant] = useState(false)

  const isOrganizer = currentUserRole === ParticipantRoleEnum.ORGANIZER

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newParticipantName.trim() || !onAddParticipant) return

    setIsAddingParticipant(true)
    try {
      await onAddParticipant(newParticipantName.trim())
      setNewParticipantName('')
    } catch (error) {
      console.error('Failed to add participant:', error)
    } finally {
      setIsAddingParticipant(false)
    }
  }

  const getStatusColor = (status: ParticipantStatusEnum) => {
    switch (status) {
      case ParticipantStatusEnum.QUEUED:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case ParticipantStatusEnum.ACTIVE:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case ParticipantStatusEnum.FINISHED:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      case ParticipantStatusEnum.DISABLED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getStatusText = (status: ParticipantStatusEnum) => {
    switch (status) {
      case ParticipantStatusEnum.QUEUED:
        return 'Queued'
      case ParticipantStatusEnum.ACTIVE:
        return 'Presenting'
      case ParticipantStatusEnum.FINISHED:
        return 'Finished'
      case ParticipantStatusEnum.DISABLED:
        return 'Disabled'
      default:
        return status
    }
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
          Participants ({participants.length})
        </h2>
        {isOrganizer && (
          <span className='text-sm text-gray-500 dark:text-gray-400'>Organizer View</span>
        )}
      </div>

      {/* Add Participant Form (Organizer Only) */}
      {isOrganizer && onAddParticipant && (
        <form onSubmit={handleAddParticipant} className='mb-4 space-y-3'>
          <div>
            <label htmlFor='participant-name' className='sr-only'>
              Participant Name
            </label>
            <input
              type='text'
              id='participant-name'
              value={newParticipantName}
              onChange={e => setNewParticipantName(e.target.value)}
              placeholder='Enter participant name'
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500'
              disabled={isAddingParticipant || isLoading}
              required
            />
          </div>
          <button
            type='submit'
            disabled={isAddingParticipant || isLoading || !newParticipantName.trim()}
            className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 
              text-white font-medium py-2 px-4 rounded-md transition-colors 
              flex items-center justify-center'
          >
            {isAddingParticipant ? (
              <>
                <svg
                  className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
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
                Adding...
              </>
            ) : (
              'Add Participant'
            )}
          </button>
        </form>
      )}

      {/* Participants List */}
      <div className='space-y-2 max-h-96 overflow-y-auto'>
        {participants.length === 0 ? (
          <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
            <p className='text-lg'>No participants yet</p>
            {isOrganizer ? (
              <p className='text-sm mt-2'>Add the first participant to get started</p>
            ) : (
              <p className='text-sm mt-2'>Waiting for organizer to add participants</p>
            )}
          </div>
        ) : (
          participants.map(participant => {
            const isCurrentUser = participant.id === currentUserId
            return (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-3 rounded-md border 
                  ${
                    isCurrentUser
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                  }`}
              >
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center space-x-3'>
                    <p
                      className={`text-sm font-medium truncate
                      ${
                        isCurrentUser
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {participant.name}
                      {isCurrentUser && <span className='text-xs ml-2 opacity-75'>(You)</span>}
                      {participant.role === ParticipantRoleEnum.ORGANIZER && (
                        <span
                          className='text-xs ml-2 bg-yellow-100 text-yellow-800 
                          dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded'
                        >
                          Organizer
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className='flex items-center space-x-2'>
                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${getStatusColor(participant.status)}`}
                  >
                    {getStatusText(participant.status)}
                  </span>

                  {/* Action Buttons (Organizer Only) */}
                  {isOrganizer && participant.role !== ParticipantRoleEnum.ORGANIZER && (
                    <div className='flex space-x-1'>
                      {/* Toggle Enable/Disable */}
                      {onToggleParticipant && (
                        <button
                          onClick={() =>
                            onToggleParticipant(
                              participant.id,
                              participant.status === ParticipantStatusEnum.DISABLED
                            )
                          }
                          className={`px-2 py-1 text-xs font-medium rounded-md transition-colors
                            ${
                              participant.status === ParticipantStatusEnum.DISABLED
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30'
                                : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30'
                            }`}
                          disabled={isLoading}
                        >
                          {participant.status === ParticipantStatusEnum.DISABLED
                            ? 'Enable'
                            : 'Disable'}
                        </button>
                      )}

                      {/* Mark as Finished */}
                      {onMarkFinished && participant.status === ParticipantStatusEnum.ACTIVE && (
                        <button
                          onClick={() => onMarkFinished(participant.id)}
                          className='px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 
                            hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 
                            dark:hover:bg-gray-600 rounded-md transition-colors'
                          disabled={isLoading}
                        >
                          Finish
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
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
          Syncing...
        </div>
      )}
    </div>
  )
}

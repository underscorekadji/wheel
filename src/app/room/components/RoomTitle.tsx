'use client'

import { useState } from 'react'
import { ParticipantRoleEnum } from '@/domain/room/value-objects/participant-attributes'

interface RoomTitleProps {
  roomId: string
  roomName?: string
  currentUserRole: ParticipantRoleEnum
}

export function RoomTitle({ roomId, roomName, currentUserRole }: RoomTitleProps) {
  const [showCopied, setShowCopied] = useState(false)

  const isOrganizer = currentUserRole === ParticipantRoleEnum.ORGANIZER

  const handleCopyUrl = async () => {
    try {
      const url = `${window.location.origin}/room/${roomId}`
      await navigator.clipboard.writeText(url)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = `${window.location.origin}/room/${roomId}`
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    }
  }

  const displayName = roomName || `Room ${roomId.substring(0, 8)}...`

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        {/* Room Title */}
        <div className='flex-1'>
          <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white'>
            {displayName}
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>Room ID: {roomId}</p>
          <div className='flex items-center mt-2'>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${
                isOrganizer
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
              }`}
            >
              {isOrganizer ? 'Organizer' : 'Guest'}
            </span>
          </div>
        </div>

        {/* Copy URL Button (Organizer Only) */}
        {isOrganizer && (
          <div className='flex-shrink-0'>
            <button
              onClick={handleCopyUrl}
              className='flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 
                text-white font-medium py-2 px-4 rounded-lg transition-colors 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            >
              {showCopied ? (
                <>
                  <svg
                    className='w-4 h-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M5 13l4 4L19 7'
                    ></path>
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg
                    className='w-4 h-4'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                    ></path>
                  </svg>
                  <span>Copy Invite URL</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Instructions for guests */}
      {!isOrganizer && (
        <div className='mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md'>
          <p className='text-sm text-blue-800 dark:text-blue-300'>
            💡 You&apos;re in guest mode. You can view the wheel and timer in real-time, but only
            the organizer can control the session.
          </p>
        </div>
      )}

      {/* Instructions for organizer */}
      {isOrganizer && (
        <div className='mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md'>
          <p className='text-sm text-yellow-800 dark:text-yellow-300'>
            🎯 You&apos;re the organizer! Add participants, spin the wheel, and manage the session.
            Share the invite URL with others to have them join as guests.
          </p>
        </div>
      )}
    </div>
  )
}

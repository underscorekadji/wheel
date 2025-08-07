'use client'

import { useState } from 'react'
import { ParticipantRoleEnum } from '@/domain/room/value-objects/participant-attributes'

interface InstructionsProps {
  currentUserRole: ParticipantRoleEnum
  className?: string
}

export function Instructions({ currentUserRole, className = '' }: InstructionsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isOrganizer = currentUserRole === ParticipantRoleEnum.ORGANIZER

  const organizerInstructions = [
    'Add participants using the form in the participants panel',
    'Click "Spin the Wheel" and set a presentation time (1-60 minutes)',
    'The wheel will randomly select a presenter and start the timer',
    'Mark presentations as finished or let the timer expire',
    'Enable/disable participants as needed during the session',
    'Share the room URL with others to have them join as guests',
  ]

  const guestInstructions = [
    'Wait for the organizer to add you to the participants list',
    'Watch the wheel spin and see who gets selected to present',
    'Follow along with the presentation timer',
    'Your name will be highlighted in the participants list',
    'All updates happen in real-time across all connected users',
  ]

  const instructions = isOrganizer ? organizerInstructions : guestInstructions

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className='w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 
          rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700'
      >
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
            {isOrganizer ? 'Organizer Instructions' : 'How it Works'}
          </h3>
          <svg
            className={`w-5 h-5 text-gray-500 dark:text-gray-400 transform transition-transform
              ${isCollapsed ? '' : 'rotate-180'}`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M19 9l-7 7-7-7'
            ></path>
          </svg>
        </div>
      </button>

      {!isCollapsed && (
        <div className='px-4 pb-4'>
          <div className='border-t border-gray-200 dark:border-gray-600 pt-4'>
            <ul className='space-y-2'>
              {instructions.map((instruction, index) => (
                <li key={index} className='flex items-start space-x-3'>
                  <span
                    className='flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900/30 
                    text-blue-600 dark:text-blue-400 rounded-full flex items-center 
                    justify-center text-xs font-medium mt-0.5'
                  >
                    {index + 1}
                  </span>
                  <span className='text-sm text-gray-700 dark:text-gray-300'>{instruction}</span>
                </li>
              ))}
            </ul>

            {/* Additional Info */}
            <div className='mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md'>
              <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                💡 Pro Tips
              </h4>
              <ul className='text-xs text-gray-600 dark:text-gray-400 space-y-1'>
                {isOrganizer ? (
                  <>
                    <li>
                      • Participants must be in &quot;Queued&quot; status to be selected by the
                      wheel
                    </li>
                    <li>• Use &quot;Disable&quot; to temporarily remove someone from selection</li>
                    <li>• The timer shows yellow (last 2 min) and red (last 30 sec) warnings</li>
                    <li>• You can stop the timer early if needed</li>
                  </>
                ) : (
                  <>
                    <li>• All changes sync in real-time - no need to refresh</li>
                    <li>• Your name will be highlighted when you&apos;re in the list</li>
                    <li>• The wheel uses random selection for fairness</li>
                    <li>• You can see the current presentation status and timer</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

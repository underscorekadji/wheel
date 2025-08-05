'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ParticipantRoleEnum,
  ParticipantStatusEnum,
} from '@/domain/room/value-objects/participant-attributes'

interface Participant {
  id: string
  name: string
  status: ParticipantStatusEnum
  role: ParticipantRoleEnum
}

interface WheelProps {
  participants: Participant[]
  currentUserRole: ParticipantRoleEnum
  isSpinning?: boolean
  onSpin?: (timeInMinutes: number) => void
  lastWinner?: {
    id: string
    name: string
  } | null
}

const WHEEL_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8C471',
  '#82E0AA',
  '#F1948A',
  '#AED6F1',
]

export function Wheel({
  participants,
  currentUserRole,
  isSpinning = false,
  onSpin,
  lastWinner,
}: WheelProps) {
  const [rotation, setRotation] = useState(0)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [selectedTime, setSelectedTime] = useState(10)

  const isOrganizer = currentUserRole === ParticipantRoleEnum.ORGANIZER

  // Get eligible participants (queued only)
  const eligibleParticipants = participants.filter(
    p => p.status === ParticipantStatusEnum.QUEUED || p.status === ParticipantStatusEnum.ACTIVE
  )

  const canSpin = isOrganizer && eligibleParticipants.length > 0 && !isSpinning

  const handleSpinClick = () => {
    if (!canSpin) return
    setShowTimeModal(true)
  }

  const handleTimeSubmit = () => {
    if (onSpin && selectedTime > 0) {
      // Calculate random rotation (multiple full rotations + random position)
      const baseRotations = 5 + Math.random() * 3 // 5-8 full rotations
      const randomAngle = Math.random() * 360
      const newRotation = rotation + baseRotations * 360 + randomAngle

      setRotation(newRotation)
      onSpin(selectedTime)
    }
    setShowTimeModal(false)
  }

  // Calculate sector size and positions
  const sectorCount = Math.max(eligibleParticipants.length, 1)
  const sectorAngle = 360 / sectorCount

  const renderWheelSectors = () => {
    if (eligibleParticipants.length === 0) {
      return <circle cx='200' cy='200' r='150' fill='#E5E7EB' className='dark:fill-gray-600' />
    }

    return eligibleParticipants.map((participant, index) => {
      const startAngle = index * sectorAngle - 90 // Start from top
      const endAngle = (index + 1) * sectorAngle - 90
      const color = WHEEL_COLORS[index % WHEEL_COLORS.length]

      // Calculate path for sector
      const startAngleRad = (startAngle * Math.PI) / 180
      const endAngleRad = (endAngle * Math.PI) / 180
      const largeArcFlag = sectorAngle > 180 ? 1 : 0

      const x1 = 200 + 150 * Math.cos(startAngleRad)
      const y1 = 200 + 150 * Math.sin(startAngleRad)
      const x2 = 200 + 150 * Math.cos(endAngleRad)
      const y2 = 200 + 150 * Math.sin(endAngleRad)

      const pathData = [
        `M 200 200`,
        `L ${x1} ${y1}`,
        `A 150 150 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `Z`,
      ].join(' ')

      // Calculate text position
      const textAngle = startAngle + sectorAngle / 2
      const textAngleRad = (textAngle * Math.PI) / 180
      const textX = 200 + 100 * Math.cos(textAngleRad)
      const textY = 200 + 100 * Math.sin(textAngleRad)

      return (
        <g key={participant.id}>
          <path d={pathData} fill={color} stroke='#FFFFFF' strokeWidth='2' />
          <text
            x={textX}
            y={textY}
            textAnchor='middle'
            dominantBaseline='middle'
            fill='#FFFFFF'
            fontSize='14'
            fontWeight='bold'
            transform={`rotate(${textAngle} ${textX} ${textY})`}
            className='pointer-events-none select-none'
          >
            {participant.name.length > 10
              ? participant.name.substring(0, 10) + '...'
              : participant.name}
          </text>
        </g>
      )
    })
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
      <div className='text-center'>
        <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-6'>
          Presenter Selection Wheel
        </h2>

        {/* Wheel Container */}
        <div className='relative inline-block'>
          {/* Wheel */}
          <motion.div
            animate={{ rotate: rotation }}
            transition={{
              duration: isSpinning ? 3 : 0,
              ease: [0.23, 1, 0.32, 1], // Custom easing for realistic deceleration
            }}
            className='relative'
          >
            <svg width='400' height='400' className='drop-shadow-lg'>
              {renderWheelSectors()}
              {/* Center circle */}
              <circle cx='200' cy='200' r='20' fill='#374151' className='dark:fill-gray-700' />
            </svg>
          </motion.div>

          {/* Pointer */}
          <div className='absolute top-2 left-1/2 transform -translate-x-1/2 z-10'>
            <div
              className='w-0 h-0 border-l-[15px] border-r-[15px] border-b-[30px] 
              border-l-transparent border-r-transparent border-b-gray-800 dark:border-b-gray-700'
            ></div>
          </div>

          {/* Spinning overlay */}
          {isSpinning && (
            <div
              className='absolute inset-0 bg-black bg-opacity-20 rounded-full 
              flex items-center justify-center'
            >
              <div
                className='text-white text-lg font-bold bg-black bg-opacity-50 
                px-4 py-2 rounded-lg'
              >
                Spinning...
              </div>
            </div>
          )}
        </div>

        {/* Last Winner Display */}
        {lastWinner && !isSpinning && (
          <div className='mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg'>
            <p className='text-green-800 dark:text-green-300 font-medium'>
              Last Selected: <span className='font-bold'>{lastWinner.name}</span>
            </p>
          </div>
        )}

        {/* Spin Button */}
        <div className='mt-6'>
          {isOrganizer ? (
            <button
              onClick={handleSpinClick}
              disabled={!canSpin}
              className={`px-8 py-3 text-lg font-bold rounded-lg transition-all duration-200 
                ${
                  canSpin
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
            >
              {isSpinning
                ? 'Spinning...'
                : eligibleParticipants.length === 0
                  ? 'No Participants Available'
                  : 'Spin the Wheel'}
            </button>
          ) : (
            <div className='text-gray-500 dark:text-gray-400'>
              <p>Only the organizer can spin the wheel</p>
            </div>
          )}

          {eligibleParticipants.length === 0 && (
            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
              Add participants to enable wheel spinning
            </p>
          )}
        </div>
      </div>

      {/* Time Selection Modal */}
      {showTimeModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4'>
            <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-4'>
              Set Presentation Time
            </h3>

            <div className='mb-6'>
              <label
                htmlFor='time-input'
                className='block text-sm font-medium 
                text-gray-700 dark:text-gray-300 mb-2'
              >
                Minutes (1-60):
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
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
                  rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 
                  dark:bg-gray-700 dark:text-white'
                autoFocus
              />
            </div>

            <div className='flex space-x-3'>
              <button
                onClick={() => setShowTimeModal(false)}
                className='flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 
                  border border-gray-300 dark:border-gray-600 rounded-md 
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleTimeSubmit}
                className='flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                  text-white rounded-md transition-colors'
              >
                Spin ({selectedTime} min)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

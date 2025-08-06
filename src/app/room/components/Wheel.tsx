'use client'

import React, { useRef, useState, useEffect, useMemo } from 'react'
import {
  ParticipantRoleEnum,
  ParticipantStatusEnum,
} from '@/domain/room/value-objects/participant-attributes'

// Types
export type WheelItem = {
  id: string
  label: string
  color?: string
  meta?: Record<string, unknown>
}

interface Participant {
  id: string
  name: string
  status: ParticipantStatusEnum
  role: ParticipantRoleEnum
}

export type WheelProps = {
  participants: Participant[]
  currentUserRole: ParticipantRoleEnum
  isSpinning?: boolean
  onSpinStart?: () => void
  onResult?: (winner: { id: string; name: string }) => void
  onError?: (e: Error) => void
  lastWinner?: {
    id: string
    name: string
  } | null
  className?: string
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

// Predefined unique colors for wheel sectors
const WHEEL_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Blue
  '#FFA07A', // Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Violet
  '#85C1E9', // Light Blue
  '#F8C471', // Orange
  '#82E0AA', // Green
  '#F1948A', // Pink
  '#AED6F1', // Sky Blue
  '#D7BDE2', // Lavender
  '#A3E4D7', // Aquamarine
  '#FAD7A0', // Peach
  '#F9E79F', // Cream
  '#D5A6BD', // Dusty Rose
  '#A9CCE3', // Sky Blue
  '#ABEBC6', // Light Green
  '#F5B7B1', // Coral
]

// Generate color ensuring uniqueness within the wheel
const getUniqueWheelColor = (
  participantId: string,
  index: number,
  totalParticipants: number
): string => {
  // If participants are fewer than predefined colors, use them in order
  if (totalParticipants <= WHEEL_COLORS.length) {
    return WHEEL_COLORS[index]
  }

  // If more participants, generate colors evenly distributed on the color wheel
  const hueStep = 360 / totalParticipants
  const hue = Math.round(index * hueStep)

  // Add a small variation based on ID for determinism
  let hash = 0
  for (let i = 0; i < participantId.length; i++) {
    hash = participantId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hueOffset = (Math.abs(hash) % 30) - 15 // ±15 градусов вариации
  const finalHue = (hue + hueOffset + 360) % 360

  // Use high saturation and medium brightness for good contrast
  const saturation = 65 + (Math.abs(hash) % 20) // 65-84%
  const lightness = 55 + (Math.abs(hash >> 8) % 15) // 55-69%

  return `hsl(${finalHue}, ${saturation}%, ${lightness}%)`
}

export const Wheel: React.FC<WheelProps> = ({
  participants,
  currentUserRole,
  isSpinning = false,
  onSpinStart,
  onResult,
  onError,
  lastWinner,
  className = '',
}) => {
  // Ensure participants is array and get eligible ones
  const safeParticipants = Array.isArray(participants) ? participants : []
  const eligibleParticipants = safeParticipants.filter(
    p => p.status === ParticipantStatusEnum.QUEUED || p.status === ParticipantStatusEnum.ACTIVE
  )

  // Convert participants to wheel items
  const items = useMemo(
    () =>
      eligibleParticipants.map(p => ({
        id: p.id,
        label: p.name,
      })),
    [eligibleParticipants]
  )

  // Props validation
  useEffect(() => {
    try {
      if (items.length < 2 || items.length > 20) {
        if (items.length === 1) {
          // Allow single participant for display purposes
          return
        }
        throw new Error('Participants count must be between 2 and 20')
      }
      const ids = items.map(i => i.id)
      if (new Set(ids).size !== ids.length) {
        throw new Error('Duplicate participant id found')
      }
      items.forEach(item => {
        if (!item.label || item.label.length > 20) {
          throw new Error(`Label missing or exceeds 20 chars: ${item.id}`)
        }
      })
    } catch (err) {
      onError?.(err as Error)
    }
  }, [items, onError])

  const [currentAngle, setCurrentAngle] = useState<number>(0)
  const [spinning, setSpinning] = useState<boolean>(false)
  const rafRef = useRef<number | null>(null)

  const isOrganizer = currentUserRole === ParticipantRoleEnum.ORGANIZER
  const canSpin = isOrganizer && items.length >= 1 && !spinning && !isSpinning

  // Reduced motion preference
  const prefersReduced = useMemo(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  }, [])

  // Angle per sector
  const anglePerItem = items.length > 0 ? 360 / items.length : 360

  // Sectors with colors
  const sectors = useMemo(
    () =>
      items.map((item, index) => ({
        ...item,
        color: getUniqueWheelColor(item.id, index, items.length),
      })),
    [items]
  )

  // Convert polar to cartesian coordinates
  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    deg: number
  ): { x: number; y: number } => {
    const rad = ((deg - 90) * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  // Render sectors
  const renderSectors = (): React.ReactElement[] => {
    if (sectors.length === 0) {
      return [
        <circle
          key='empty'
          cx={200}
          cy={200}
          r={180}
          fill='#E5E7EB'
          className='dark:fill-gray-600'
        />,
      ]
    }

    return sectors.map((item, idx) => {
      const startAngle = idx * anglePerItem
      const endAngle = startAngle + anglePerItem
      const largeArcFlag = anglePerItem > 180 ? 1 : 0
      const start = polarToCartesian(200, 200, 180, startAngle)
      const end = polarToCartesian(200, 200, 180, endAngle)
      const pathData = `M200,200 L${start.x},${start.y} A180,180 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`

      // Calculate text position
      const textAngle = startAngle + anglePerItem / 2
      const textPos = polarToCartesian(200, 200, 120, textAngle)

      return (
        <g key={item.id}>
          <path d={pathData} fill={item.color} stroke='#fff' strokeWidth={2} />
          <text
            x={textPos.x}
            y={textPos.y}
            textAnchor='middle'
            dominantBaseline='middle'
            fill='#FFFFFF'
            fontSize='14'
            fontWeight='bold'
            className='pointer-events-none select-none'
          >
            {item.label.length > 10 ? item.label.substring(0, 10) + '...' : item.label}
          </text>
        </g>
      )
    })
  }

  // Обработчик спина
  const spin = (): void => {
    if (spinning || !canSpin || items.length === 0) return
    try {
      onSpinStart?.()
      setSpinning(true)

      // Выбор победителя
      const buf = new Uint32Array(1)
      window.crypto.getRandomValues(buf)
      const random = buf[0] / 0xffffffff
      const idx = Math.floor(random * items.length)
      const winner = items[idx]

      // Целевой угол (центр сектора)
      const sectorStart = idx * anglePerItem
      const targetAngle = sectorStart + anglePerItem / 2

      // Параметры анимации
      const rotations = prefersReduced ? 1 : Math.floor(Math.random() * 5) + 2
      const duration = prefersReduced ? 500 : Math.floor(Math.random() * 3000) + 2000
      const totalRotation = rotations * 360 + (360 - targetAngle)
      const startTime = performance.now()

      // Анимационный цикл
      const animate = (now: number) => {
        const elapsed = now - startTime
        const t = Math.min(elapsed / duration, 1)
        const eased = easeOutCubic(t)
        setCurrentAngle(eased * totalRotation)
        if (t < 1) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          setSpinning(false)
          onResult?.({
            id: winner.id,
            name: winner.label,
          })
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    } catch (err) {
      onError?.(err as Error)
      setSpinning(false)
    }
  }

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className='text-center'>
        <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-6'>
          Presenter Selection Wheel
        </h2>

        {/* Wheel Container */}
        <div className='relative inline-block' style={{ userSelect: 'none' }}>
          <svg width={400} height={400} viewBox='0 0 400 400' className='drop-shadow-lg'>
            <g transform={`rotate(${currentAngle} 200 200)`}>{renderSectors()}</g>
            {/* Pointer */}
            <polygon
              points='200,10 185,50 215,50'
              fill='#e74c3c'
              stroke='#c0392b'
              strokeWidth={2}
              style={{ pointerEvents: 'none' }}
            />
            {/* Center circle */}
            <circle cx='200' cy='200' r='20' fill='#374151' className='dark:fill-gray-700' />
          </svg>

          {/* Spinning overlay */}
          {(spinning || isSpinning) && (
            <div className='absolute inset-0 bg-black bg-opacity-20 rounded-full flex items-center justify-center'>
              <div className='text-white text-lg font-bold bg-black bg-opacity-50 px-4 py-2 rounded-lg'>
                Spinning...
              </div>
            </div>
          )}
        </div>

        {/* Last Winner Display */}
        {lastWinner && !spinning && !isSpinning && (
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
              onClick={spin}
              disabled={!canSpin}
              className={`px-8 py-3 text-lg font-bold rounded-lg transition-all duration-200 ${
                canSpin
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
              {spinning || isSpinning
                ? 'Spinning...'
                : items.length === 0
                  ? 'No Participants Available'
                  : 'Spin the Wheel'}
            </button>
          ) : (
            <div className='text-gray-500 dark:text-gray-400'>
              <p>Only the organizer can spin the wheel</p>
            </div>
          )}

          {items.length === 0 && (
            <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
              Add participants to enable wheel spinning
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Add default export for test compatibility
export default Wheel

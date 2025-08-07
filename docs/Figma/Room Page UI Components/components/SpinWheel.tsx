import { useState } from 'react'
import { Button } from './ui/button'
import { motion } from 'motion/react'

interface SpinWheelProps {
  onSpinClick: () => void
}

export function SpinWheel({ onSpinClick }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)

  // Sample participants for the wheel
  const participants = [
    'Alice Johnson',
    'Bob Smith',
    'Carol Davis',
    'David Wilson',
    'Eve Brown',
    'Frank Miller',
    'Grace Chen',
    'Henry Lee',
  ]

  // Vibrant colors for wheel sectors
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#FD79A8',
    '#FDCB6E',
    '#6C5CE7',
    '#A29BFE',
    '#FD79A8',
  ]

  const handleSpin = () => {
    if (isSpinning) return

    setIsSpinning(true)

    // Simulate spinning with realistic deceleration
    const spins = 5 + Math.random() * 5 // 5-10 full rotations
    const finalRotation = rotation + spins * 360 + Math.random() * 360
    setRotation(finalRotation)

    // Stop spinning after animation
    setTimeout(() => {
      setIsSpinning(false)
      onSpinClick()
    }, 3000)
  }

  const sectorAngle = 360 / participants.length

  return (
    <div className='h-full bg-card rounded-lg border p-6 flex flex-col items-center justify-center'>
      <div className='relative mb-8'>
        {/* Wheel Container */}
        <div className='relative w-80 h-80 md:w-96 md:h-96'>
          {/* Pointer */}
          <div className='absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 z-10'>
            <div
              className='w-6 h-8 bg-black'
              style={{
                clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
              }}
            ></div>
          </div>

          {/* Wheel */}
          <motion.div
            className='w-full h-full rounded-full border-4 border-black relative overflow-hidden'
            animate={{ rotate: rotation }}
            transition={{
              duration: isSpinning ? 3 : 0,
              ease: isSpinning ? [0.23, 1, 0.32, 1] : 'linear',
            }}
          >
            {/* Wheel Sectors */}
            {participants.map((participant, index) => {
              const startAngle = index * sectorAngle
              const endAngle = (index + 1) * sectorAngle
              const color = colors[index % colors.length]

              // Calculate sector path
              const centerX = 50
              const centerY = 50
              const radius = 50

              const startAngleRad = (startAngle * Math.PI) / 180
              const endAngleRad = (endAngle * Math.PI) / 180

              const x1 = centerX + radius * Math.cos(startAngleRad)
              const y1 = centerY + radius * Math.sin(startAngleRad)
              const x2 = centerX + radius * Math.cos(endAngleRad)
              const y2 = centerY + radius * Math.sin(endAngleRad)

              const largeArcFlag = sectorAngle > 180 ? 1 : 0

              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z',
              ].join(' ')

              // Text position
              const textAngle = startAngle + sectorAngle / 2
              const textAngleRad = (textAngle * Math.PI) / 180
              const textRadius = radius * 0.7
              const textX = centerX + textRadius * Math.cos(textAngleRad)
              const textY = centerY + textRadius * Math.sin(textAngleRad)

              return (
                <g key={index}>
                  <path d={pathData} fill={color} stroke='#fff' strokeWidth='2' />
                  <text
                    x={textX}
                    y={textY}
                    fill='white'
                    fontSize='12'
                    fontWeight='bold'
                    textAnchor='middle'
                    dominantBaseline='middle'
                    transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {participant.split(' ')[0]}
                  </text>
                </g>
              )
            })}

            {/* Render as SVG */}
            <svg className='absolute inset-0 w-full h-full' viewBox='0 0 100 100'>
              {participants.map((participant, index) => {
                const startAngle = index * sectorAngle
                const endAngle = (index + 1) * sectorAngle
                const color = colors[index % colors.length]

                const centerX = 50
                const centerY = 50
                const radius = 50

                const startAngleRad = (startAngle * Math.PI) / 180
                const endAngleRad = (endAngle * Math.PI) / 180

                const x1 = centerX + radius * Math.cos(startAngleRad)
                const y1 = centerY + radius * Math.sin(startAngleRad)
                const x2 = centerX + radius * Math.cos(endAngleRad)
                const y2 = centerY + radius * Math.sin(endAngleRad)

                const largeArcFlag = sectorAngle > 180 ? 1 : 0

                const pathData = [
                  `M ${centerX} ${centerY}`,
                  `L ${x1} ${y1}`,
                  `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                  'Z',
                ].join(' ')

                const textAngle = startAngle + sectorAngle / 2
                const textAngleRad = (textAngle * Math.PI) / 180
                const textRadius = radius * 0.7
                const textX = centerX + textRadius * Math.cos(textAngleRad)
                const textY = centerY + textRadius * Math.sin(textAngleRad)

                return (
                  <g key={index}>
                    <path d={pathData} fill={color} stroke='#fff' strokeWidth='1' />
                    <text
                      x={textX}
                      y={textY}
                      fill='white'
                      fontSize='3'
                      fontWeight='bold'
                      textAnchor='middle'
                      dominantBaseline='middle'
                      style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                    >
                      {participant.split(' ')[0]}
                    </text>
                  </g>
                )
              })}
            </svg>
          </motion.div>
        </div>

        {/* Spin Motion Blur Effect */}
        {isSpinning && (
          <div className='absolute inset-0 w-80 h-80 md:w-96 md:h-96 rounded-full bg-gradient-conic from-transparent via-white/20 to-transparent animate-spin'></div>
        )}
      </div>

      {/* Spin Button */}
      <Button onClick={handleSpin} disabled={isSpinning} size='lg' className='px-8 py-3'>
        {isSpinning ? 'Spinning...' : 'Spin Wheel'}
      </Button>

      {/* Wheel State Info */}
      <p className='text-sm text-muted-foreground mt-4 text-center'>
        {participants.length} participants ready to present
      </p>
    </div>
  )
}

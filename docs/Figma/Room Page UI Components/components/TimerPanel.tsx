import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { StopCircle } from 'lucide-react'

interface TimerPanelProps {
  isOrganizer: boolean
}

export function TimerPanel({ isOrganizer }: TimerPanelProps) {
  const [timeRemaining, setTimeRemaining] = useState(600) // 10 minutes in seconds
  const [isRunning, setIsRunning] = useState(true)

  // Timer countdown effect
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, timeRemaining])

  const handleStopTimer = () => {
    setIsRunning(false)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    if (timeRemaining <= 30) return 'text-red-500' // Critical - under 30 seconds
    if (timeRemaining <= 120) return 'text-yellow-500' // Warning - under 2 minutes
    return 'text-green-500' // Normal
  }

  const getTimerBgColor = () => {
    if (timeRemaining <= 30) return 'bg-red-50 border-red-200'
    if (timeRemaining <= 120) return 'bg-yellow-50 border-yellow-200'
    return 'bg-green-50 border-green-200'
  }

  return (
    <div className='h-full bg-card rounded-lg border p-4 flex flex-col'>
      <h3 className='mb-4'>Timer</h3>

      <div className='flex-1 flex flex-col justify-center items-center space-y-4'>
        {/* Timer Display */}
        <div className={`p-6 rounded-lg border-2 ${getTimerBgColor()}`}>
          <div className={`text-4xl font-mono ${getTimerColor()}`}>{formatTime(timeRemaining)}</div>
        </div>

        {/* Timer Status */}
        <div className='text-center'>
          {timeRemaining <= 0 ? (
            <p className='text-red-600'>Time's up!</p>
          ) : isRunning ? (
            <p className='text-muted-foreground'>Timer running</p>
          ) : (
            <p className='text-muted-foreground'>Timer stopped</p>
          )}
        </div>

        {/* Stop Button - Organizer Only */}
        {isOrganizer && isRunning && timeRemaining > 0 && (
          <Button onClick={handleStopTimer} variant='outline' className='w-full'>
            <StopCircle className='w-4 h-4 mr-2' />
            Stop Timer
          </Button>
        )}

        {/* Timer Progress Bar */}
        <div className='w-full bg-gray-200 rounded-full h-2'>
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${
              timeRemaining <= 30
                ? 'bg-red-500'
                : timeRemaining <= 120
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
            style={{
              width: `${Math.max(0, (timeRemaining / 600) * 100)}%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ParticipantsList } from './ParticipantsList'
import { SpinWheel } from './SpinWheel'
import { WinnerPanel } from './WinnerPanel'
import { TimerPanel } from './TimerPanel'
import { Instructions } from './Instructions'
import { TimePickerModal } from './TimePickerModal'
import { Button } from './ui/button'
import { Copy } from 'lucide-react'

interface RoomPageProps {
  roomId?: string
  isOrganizer?: boolean
}

export function RoomPage({ roomId = 'ROOM123', isOrganizer = true }: RoomPageProps) {
  const [showTimePicker, setShowTimePicker] = useState(false)

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href)
  }

  return (
    <div className='min-h-screen bg-background p-4'>
      <div className='mx-auto max-w-[1400px]'>
        {/* Desktop Grid Layout */}
        <div className='hidden md:grid md:grid-cols-4 md:grid-rows-3 gap-6 h-screen max-h-[900px]'>
          {/* Title - spans full width */}
          <div className='col-span-4 flex items-center justify-between p-6 bg-card rounded-lg border'>
            <h1 className='text-3xl'>Room {roomId}</h1>
            {isOrganizer && (
              <Button onClick={handleCopyUrl} variant='outline' size='sm'>
                <Copy className='w-4 h-4 mr-2' />
                Copy URL
              </Button>
            )}
          </div>

          {/* Participants List */}
          <div className='row-span-2'>
            <ParticipantsList isOrganizer={isOrganizer} />
          </div>

          {/* Wheel Section - spans 2 columns */}
          <div className='col-span-2 row-span-2'>
            <SpinWheel onSpinClick={() => setShowTimePicker(true)} />
          </div>

          {/* Winner Panel */}
          <div className='row-start-2'>
            <WinnerPanel isOrganizer={isOrganizer} />
          </div>

          {/* Timer Panel */}
          <div className='row-start-3'>
            <TimerPanel isOrganizer={isOrganizer} />
          </div>

          {/* Instructions - spans full width */}
          <div className='col-span-4'>
            <Instructions />
          </div>
        </div>

        {/* Mobile Stack Layout */}
        <div className='md:hidden space-y-6'>
          {/* Title */}
          <div className='flex items-center justify-between p-4 bg-card rounded-lg border'>
            <h1 className='text-2xl'>Room {roomId}</h1>
            {isOrganizer && (
              <Button onClick={handleCopyUrl} variant='outline' size='sm'>
                <Copy className='w-4 h-4' />
              </Button>
            )}
          </div>

          {/* Winner/Timer Panel */}
          <div className='grid grid-cols-1 gap-4'>
            <WinnerPanel isOrganizer={isOrganizer} />
            <TimerPanel isOrganizer={isOrganizer} />
          </div>

          {/* Wheel Section */}
          <SpinWheel onSpinClick={() => setShowTimePicker(true)} />

          {/* Participants List */}
          <ParticipantsList isOrganizer={isOrganizer} />

          {/* Instructions */}
          <Instructions />
        </div>
      </div>

      {/* Time Picker Modal */}
      <TimePickerModal
        open={showTimePicker}
        onOpenChange={setShowTimePicker}
        onConfirm={minutes => {
          console.log(`Starting timer for ${minutes} minutes`)
          setShowTimePicker(false)
        }}
      />
    </div>
  )
}

import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { CheckCircle } from 'lucide-react'

interface WinnerPanelProps {
  isOrganizer: boolean
}

export function WinnerPanel({ isOrganizer }: WinnerPanelProps) {
  // Mock current winner data
  const currentWinner = {
    name: 'Alice Johnson',
    status: 'active' as const,
  }

  const handleMarkFinished = () => {
    console.log('Marking winner as finished')
  }

  return (
    <div className='h-full bg-card rounded-lg border p-4 flex flex-col'>
      <h3 className='mb-4'>Current Presenter</h3>

      {currentWinner ? (
        <div className='flex-1 flex flex-col justify-center items-center text-center space-y-4'>
          {/* Winner Name */}
          <div>
            <h2 className='text-2xl mb-2'>{currentWinner.name}</h2>
            <Badge variant='outline' className='bg-green-100 text-green-800 border-green-200'>
              {currentWinner.status === 'active' ? 'Presenting' : 'Finished'}
            </Badge>
          </div>

          {/* Mark Finished Button - Organizer Only */}
          {isOrganizer && currentWinner.status === 'active' && (
            <Button onClick={handleMarkFinished} variant='outline' className='w-full'>
              <CheckCircle className='w-4 h-4 mr-2' />
              Mark Finished
            </Button>
          )}
        </div>
      ) : (
        <div className='flex-1 flex items-center justify-center text-center'>
          <div className='text-muted-foreground'>
            <p>No one is presenting yet.</p>
            <p className='text-sm mt-1'>Spin the wheel to select someone!</p>
          </div>
        </div>
      )}
    </div>
  )
}

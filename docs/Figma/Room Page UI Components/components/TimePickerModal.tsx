import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface TimePickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (minutes: number) => void
}

export function TimePickerModal({ open, onOpenChange, onConfirm }: TimePickerModalProps) {
  const [minutes, setMinutes] = useState(10)

  const handleConfirm = () => {
    onConfirm(minutes)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Set Presentation Time</DialogTitle>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='minutes'>Presentation duration (minutes)</Label>
            <Input
              id='minutes'
              type='number'
              min='1'
              max='60'
              value={minutes}
              onChange={e => setMinutes(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
              className='w-full'
            />
            <p className='text-sm text-muted-foreground'>Choose between 1-60 minutes</p>
          </div>

          {/* Quick Select Buttons */}
          <div className='space-y-2'>
            <Label>Quick select:</Label>
            <div className='flex gap-2 flex-wrap'>
              {[5, 10, 15, 20, 30].map(time => (
                <Button
                  key={time}
                  variant={minutes === time ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setMinutes(time)}
                >
                  {time}m
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className='flex gap-2'>
          <Button variant='outline' onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm & Spin</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

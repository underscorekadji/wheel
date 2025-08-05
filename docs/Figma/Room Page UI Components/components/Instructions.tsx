import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function Instructions() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className='bg-card rounded-lg border p-4'>
      {/* Desktop - Always visible */}
      <div className='hidden md:block'>
        <h3 className='mb-3'>How to use</h3>
        <div className='text-sm text-muted-foreground space-y-2'>
          <p>• Click "Spin Wheel" to randomly select the next presenter</p>
          <p>• Set a presentation timer before spinning</p>
          <p>• Organizers can add participants and manage the session</p>
          <p>• Mark presenters as finished when they complete their turn</p>
        </div>
      </div>

      {/* Mobile - Collapsible */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className='md:hidden'>
        <CollapsibleTrigger className='flex items-center justify-between w-full'>
          <h3>Instructions</h3>
          {isOpen ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
        </CollapsibleTrigger>

        <CollapsibleContent className='mt-3'>
          <div className='text-sm text-muted-foreground space-y-2'>
            <p>• Click "Spin Wheel" to randomly select the next presenter</p>
            <p>• Set a presentation timer before spinning</p>
            <p>• Organizers can add participants and manage the session</p>
            <p>• Mark presenters as finished when they complete their turn</p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react'

interface Participant {
  id: string
  name: string
  status: 'queued' | 'active' | 'finished' | 'disabled'
  isCurrentUser?: boolean
}

interface ParticipantsListProps {
  isOrganizer: boolean
}

export function ParticipantsList({ isOrganizer }: ParticipantsListProps) {
  const [newParticipantName, setNewParticipantName] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'Alice Johnson', status: 'active', isCurrentUser: true },
    { id: '2', name: 'Bob Smith', status: 'queued' },
    { id: '3', name: 'Carol Davis', status: 'finished' },
    { id: '4', name: 'David Wilson', status: 'queued' },
    { id: '5', name: 'Eve Brown', status: 'disabled' },
    { id: '6', name: 'Frank Miller', status: 'queued' },
    { id: '7', name: 'Grace Chen', status: 'queued' },
  ])

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) return

    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
      status: 'queued',
    }

    setParticipants([...participants, newParticipant])
    setNewParticipantName('')
  }

  const toggleParticipantStatus = (id: string) => {
    setParticipants(
      participants.map(p =>
        p.id === id
          ? { ...p, status: p.status === 'disabled' ? 'queued' : ('disabled' as const) }
          : p
      )
    )
  }

  const getStatusColor = (status: Participant['status']) => {
    switch (status) {
      case 'queued':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'finished':
        return 'bg-gray-100 text-gray-600 border-gray-200'
      case 'disabled':
        return 'bg-red-100 text-red-600 border-red-200'
    }
  }

  return (
    <div className='h-full bg-card rounded-lg border p-4 flex flex-col'>
      <h3 className='mb-4'>Participants</h3>

      {/* Add Participant Form - Organizer Only */}
      {isOrganizer && (
        <div className='flex gap-2 mb-4'>
          <Input
            placeholder='Enter participant name'
            value={newParticipantName}
            onChange={e => setNewParticipantName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAddParticipant()}
            className='flex-1'
          />
          <Button onClick={handleAddParticipant} size='sm'>
            <Plus className='w-4 h-4' />
          </Button>
        </div>
      )}

      {/* Participants List */}
      <ScrollArea className='flex-1'>
        <div className='space-y-2'>
          {participants.map(participant => (
            <div
              key={participant.id}
              className={`p-3 rounded-lg border transition-colors ${
                participant.isCurrentUser
                  ? 'bg-accent border-accent-foreground/20'
                  : 'bg-background'
              }`}
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2 flex-1 min-w-0'>
                  <span className={`truncate ${participant.isCurrentUser ? 'font-medium' : ''}`}>
                    {participant.name}
                    {participant.isCurrentUser && ' (You)'}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className={getStatusColor(participant.status)}>
                    {participant.status}
                  </Badge>

                  {/* Enable/Disable Toggle - Organizer Only */}
                  {isOrganizer && (
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => toggleParticipantStatus(participant.id)}
                      className='p-1'
                    >
                      {participant.status === 'disabled' ? (
                        <ToggleLeft className='w-4 h-4 text-red-500' />
                      ) : (
                        <ToggleRight className='w-4 h-4 text-green-500' />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Empty State */}
      {participants.length === 0 && (
        <div className='flex-1 flex items-center justify-center text-muted-foreground'>
          <p>No participants yet. Add someone to get started!</p>
        </div>
      )}
    </div>
  )
}

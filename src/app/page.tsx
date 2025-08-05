'use client'

import { useState } from 'react'

export default function StartPage() {
  const [joinRoomId, setJoinRoomId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleCreateRoom = async () => {
    setIsCreating(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to create room')
      }

      const result = (await response.json()) as { roomId: string }
      window.location.href = `/room/${result.roomId}`
    } catch (error) {
      console.error('Error creating room:', error)
      setErrorMessage('Failed to create room. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    setIsJoining(true)
    setErrorMessage('')

    const trimmedRoomId = joinRoomId.trim()

    if (!trimmedRoomId) {
      setErrorMessage('Please enter a room ID')
      setIsJoining(false)
      return
    }

    // Basic UUID format validation
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidPattern.test(trimmedRoomId)) {
      setErrorMessage('Please enter a valid room ID (UUID format)')
      setIsJoining(false)
      return
    }

    window.location.href = `/room/${trimmedRoomId}`
  }

  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='container mx-auto px-4 py-16'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-gray-900 dark:text-white mb-6'>
            Welcome to Wheel
          </h1>
          <p className='text-xl text-gray-600 dark:text-gray-300 mb-8'>
            Real-time spinning wheel app for presenter selection
          </p>
        </div>

        <div className='max-w-md mx-auto space-y-8'>
          {/* Create New Room Section */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
            <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center'>
              Create New Room
            </h2>
            <p className='text-gray-600 dark:text-gray-300 mb-6 text-center'>
              Start a new session and invite others to join
            </p>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center'
            >
              {isCreating ? (
                <>
                  <svg
                    className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  Creating Room...
                </>
              ) : (
                'Create Room'
              )}
            </button>
          </div>

          {/* Join Room Section */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
            <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center'>
              Join Existing Room
            </h2>
            <p className='text-gray-600 dark:text-gray-300 mb-6 text-center'>
              Enter the room ID to join an existing session
            </p>
            <form onSubmit={handleJoinRoom} className='space-y-4'>
              <div>
                <label
                  htmlFor='room-id'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
                >
                  Room ID (UUID)
                </label>
                <input
                  type='text'
                  id='room-id'
                  value={joinRoomId}
                  onChange={e => setJoinRoomId(e.target.value)}
                  placeholder='e.g., 123e4567-e89b-12d3-a456-426614174000'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white'
                  required
                />
              </div>
              <button
                type='submit'
                disabled={isJoining}
                className='w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center'
              >
                {isJoining ? (
                  <>
                    <svg
                      className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                    Joining...
                  </>
                ) : (
                  'Join Room'
                )}
              </button>
            </form>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className='bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4'>
              <p className='text-red-700 dark:text-red-300 text-sm text-center'>{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

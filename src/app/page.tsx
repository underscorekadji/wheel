'use client'

import { useState, useEffect, useRef } from 'react'

export default function HomePage() {
  const [text, setText] = useState('')
  const [receivedText, setReceivedText] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting')
  const [testRoomId, setTestRoomId] = useState('')
  const [clientId, setClientId] = useState('')
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Use fixed room for testing - all tabs will share the same room
    const roomId = 'test-room'
    const generatedClientId = Math.random().toString(36).substring(2, 15)

    setTestRoomId(roomId)
    setClientId(generatedClientId)

    // Use Server-Sent Events for real-time updates
    const eventSource = new EventSource(`/api/live-text?room=${roomId}&client=${generatedClientId}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.info('Connected to live text stream')
      setConnectionStatus('connected')
    }

    eventSource.onmessage = event => {
      const data = JSON.parse(event.data)

      if (data.clientId !== generatedClientId) {
        setReceivedText(data.text)
      }
    }

    eventSource.onerror = () => {
      setConnectionStatus('disconnected')
    }

    return () => {
      eventSource.close()
    }
  }, [])

  const handleTextChange = async (newText: string) => {
    setText(newText)

    // Send text update via POST request
    if (connectionStatus === 'connected') {
      try {
        await fetch('/api/live-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: testRoomId,
            text: newText,
            clientId: clientId,
          }),
        })
      } catch (error) {
        console.error('Failed to send text update:', error)
      }
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600'
      case 'connecting':
        return 'text-yellow-600'
      case 'disconnected':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <main className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='container mx-auto px-4 py-16'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-gray-900 dark:text-white mb-6'>
            Welcome to Wheel
          </h1>
          <p className='text-xl text-gray-600 dark:text-gray-300 mb-2'>
            Real-time spinning wheel app for presenter selection
          </p>
          <div className='flex items-center justify-center gap-2 mb-8'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>Socket Status:</span>
            <span className={`text-sm font-medium ${getStatusColor()}`}>{connectionStatus}</span>
          </div>
        </div>

        <div className='max-w-2xl mx-auto mb-12'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6'>
            <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-4'>
              Live Text Test
            </h2>
            <div className='space-y-6'>
              <div>
                <label
                  htmlFor='text-input'
                  className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
                >
                  Your Text (will sync in real-time)
                </label>
                <textarea
                  id='text-input'
                  value={text}
                  onChange={e => handleTextChange(e.target.value)}
                  placeholder='Type something to test real-time sync...'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none'
                  rows={4}
                  disabled={connectionStatus !== 'connected'}
                />
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  Characters: {text.length} | Room ID: {testRoomId || 'Generating...'}
                </p>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Received from Others
                </label>
                <div className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 min-h-[100px]'>
                  <p className='text-gray-700 dark:text-gray-300 whitespace-pre-wrap'>
                    {receivedText || 'No messages received yet...'}
                  </p>
                </div>
              </div>

              <div className='text-xs text-gray-500 dark:text-gray-400 space-y-1'>
                <p>• Open this page in multiple tabs to test real-time sync</p>
                <p>• Text changes are broadcast instantly to all connected clients</p>
                <p>• Client ID: {clientId || 'Generating...'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className='text-center'>
          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <button className='bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors'>
              Create Room
            </button>
            <button className='bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors'>
              Join Room
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

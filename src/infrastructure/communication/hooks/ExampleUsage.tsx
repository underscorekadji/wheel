/**
 * Example usage of the useRoomSocket hook
 *
 * This file demonstrates how to use the useRoomSocket hook for connecting to a room
 * and managing real-time communication.
 */

import React from 'react'
import { useRoomSocket } from './useRoomSocket'
import type { UserRole } from '@/types/socket'

interface ExampleRoomComponentProps {
  roomId: string
  userId?: string
  userName?: string
  role?: UserRole
}

export function ExampleRoomComponent({
  roomId,
  userId,
  userName,
  role = 'guest',
}: ExampleRoomComponentProps) {
  const { socket, status, isConnected, error, connect, disconnect, reconnect } = useRoomSocket({
    roomId,
    userId,
    userName,
    role,
    autoConnect: true, // Automatically connect when component mounts
  })

  const handleManualConnect = () => {
    connect()
  }

  const handleDisconnect = () => {
    disconnect()
  }

  const handleReconnect = () => {
    reconnect()
  }

  // Example: Listen for room state updates
  React.useEffect(() => {
    if (!socket || !isConnected) return

    const handleRoomStateUpdate = (data: import('@/types/socket').RoomStateUpdateEvent) => {
      console.log('Room state updated:', data)
    }

    socket.onRoomStateUpdate(handleRoomStateUpdate)

    // Cleanup listener on unmount or when socket changes
    return () => {
      socket.off('room_state_update', handleRoomStateUpdate)
    }
  }, [socket, isConnected])

  return (
    <div className='p-4 border rounded-lg'>
      <h2 className='text-xl font-bold mb-4'>Room: {roomId}</h2>

      <div className='space-y-2 mb-4'>
        <div>
          <strong>Status:</strong>{' '}
          <span
            className={`px-2 py-1 rounded text-xs ${
              status === 'connected'
                ? 'bg-green-100 text-green-800'
                : status === 'connecting'
                  ? 'bg-yellow-100 text-yellow-800'
                  : status === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
            }`}
          >
            {status}
          </span>
        </div>

        <div>
          <strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}
        </div>

        <div>
          <strong>Role:</strong> {role}
        </div>

        {userId && (
          <div>
            <strong>User ID:</strong> {userId}
          </div>
        )}

        {userName && (
          <div>
            <strong>User Name:</strong> {userName}
          </div>
        )}

        {error && (
          <div className='text-red-600'>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <div className='space-x-2'>
        <button
          onClick={handleManualConnect}
          disabled={status === 'connecting' || isConnected}
          className='px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300'
        >
          Connect
        </button>

        <button
          onClick={handleDisconnect}
          disabled={!isConnected}
          className='px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300'
        >
          Disconnect
        </button>

        <button
          onClick={handleReconnect}
          disabled={status === 'connecting'}
          className='px-4 py-2 bg-orange-500 text-white rounded disabled:bg-gray-300'
        >
          Reconnect
        </button>
      </div>
    </div>
  )
}

export default ExampleRoomComponent

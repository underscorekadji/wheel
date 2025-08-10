import { useEffect, useState, useRef, useCallback } from 'react'
import { getSocketManager } from '../socket-client'
import type { SocketManager } from '../socket-client'
import type { SocketStatus, SocketConfig, UserRole } from '@/types/socket'

/**
 * Configuration options for the useRoomSocket hook
 */
export interface UseRoomSocketConfig {
  roomId: string
  url?: string
  autoConnect?: boolean
  role?: UserRole
  userId?: string
  userName?: string
}

/**
 * Return type for the useRoomSocket hook
 */
export interface UseRoomSocketReturn {
  socket: SocketManager | null
  status: SocketStatus
  isConnected: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  reconnect: () => Promise<void>
}

/**
 * React hook for managing Socket.IO connection to a room namespace
 *
 * This hook provides:
 * - Automatic connection management with proper cleanup
 * - Auto-reconnect functionality via SocketManager
 * - Connection state tracking
 * - Error handling
 * - Room namespace connection (room:{id})
 *
 * @param config - Configuration object with roomId and connection options
 * @returns Object containing socket instance, connection state, and control methods
 */
export function useRoomSocket(config: UseRoomSocketConfig): UseRoomSocketReturn {
  const {
    roomId,
    url = process.env.NEXT_PUBLIC_SOCKET_URL || 
          (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
    autoConnect = true,
    role = 'guest', // Default to guest role if not specified
    userId,
    userName,
  } = config

  const [status, setStatus] = useState<SocketStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<SocketManager | null>(null)
  const isConnectingRef = useRef(false)

  // Initialize socket manager immediately (not in useEffect)
  if (!socketRef.current) {
    socketRef.current = getSocketManager()
  }

  // Connection handler
  const connect = useCallback(async () => {
    if (!socketRef.current || !roomId || isConnectingRef.current) {
      return
    }

    if (socketRef.current.isConnected()) {
      console.warn('Socket already connected')
      return
    }

    isConnectingRef.current = true
    setError(null)
    setStatus('connecting')

    try {
      const socketConfig: SocketConfig = {
        roomId,
        url,
        role,
        userId,
        userName,
      }

      await socketRef.current.connect(socketConfig)
      setStatus('connected')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed'
      setError(errorMessage)
      setStatus('error')
      console.error('Socket connection failed:', err)
    } finally {
      isConnectingRef.current = false
    }
  }, [roomId, url, role, userId, userName])

  // Disconnection handler
  const disconnect = useCallback(async () => {
    if (!socketRef.current) {
      return
    }

    try {
      await socketRef.current.disconnect()
      setStatus('disconnected')
      setError(null)
    } catch (err) {
      console.error('Socket disconnection failed:', err)
    }
  }, [])

  // Reconnection handler
  const reconnect = useCallback(async () => {
    await disconnect()
    await connect()
  }, [connect, disconnect])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && roomId) {
      connect()
    }

    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [autoConnect, roomId, role, userId, userName, connect])

  // Monitor socket status changes
  useEffect(() => {
    if (!socketRef.current) {
      return
    }

    const socket = socketRef.current

    // Set up periodic status checking to sync with SocketManager's internal state
    const statusCheckInterval = setInterval(() => {
      const currentStatus = socket.getStatus()
      if (currentStatus !== status) {
        setStatus(currentStatus)

        // Clear error when connection is successful
        if (currentStatus === 'connected') {
          setError(null)
        }
      }
    }, 1000)

    return () => {
      clearInterval(statusCheckInterval)
    }
  }, [status])

  const isConnected = status === 'connected'

  return {
    socket: socketRef.current,
    status,
    isConnected,
    error,
    connect,
    disconnect,
    reconnect,
  }
}

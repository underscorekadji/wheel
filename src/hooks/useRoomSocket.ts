'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { RoleDetectionService } from '@/app/room/utils/role-detection'
import type {
  SocketStatus,
  RoomStateUpdateEvent,
  ParticipantUpdateEvent,
  WheelSpinEvent,
  TimerUpdateEvent,
  RoomMessageEvent,
  ErrorEvent,
  ConnectionErrorEvent,
  UserRole,
} from '@/types/socket'
import { io, Socket } from 'socket.io-client'

/**
 * Configuration for the useRoomSocket hook
 */
export interface UseRoomSocketConfig {
  roomId: string
  userId?: string
  userName?: string
  autoConnect?: boolean
}

/**
 * Return type for the useRoomSocket hook
 */
export interface UseRoomSocketReturn {
  // Connection state
  status: SocketStatus
  socketId: string | null
  error: string | null
  isConnected: boolean

  // Connection methods
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  reconnect: () => Promise<void>

  // Event emitters
  emit: {
    roomStateUpdate: (data: Omit<RoomStateUpdateEvent, 'roomId' | 'timestamp'>) => void
    participantUpdate: (data: Omit<ParticipantUpdateEvent, 'roomId' | 'timestamp'>) => void
    wheelSpin: (data: Omit<WheelSpinEvent, 'roomId' | 'timestamp'>) => void
    timerUpdate: (data: Omit<TimerUpdateEvent, 'roomId' | 'timestamp'>) => void
    roomMessage: (data: Omit<RoomMessageEvent, 'roomId' | 'timestamp'>) => void
  }

  // Event subscription methods
  on: {
    roomStateUpdate: (callback: (data: RoomStateUpdateEvent) => void) => () => void
    participantUpdate: (callback: (data: ParticipantUpdateEvent) => void) => () => void
    wheelSpin: (callback: (data: WheelSpinEvent) => void) => () => void
    timerUpdate: (callback: (data: TimerUpdateEvent) => void) => () => void
    roomMessage: (callback: (data: RoomMessageEvent) => void) => () => void
    error: (callback: (data: ErrorEvent | ConnectionErrorEvent) => void) => () => void
  }
}

/**
 * Validates room ID format (expects UUID v4)
 */
function isValidRoomId(roomId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return typeof roomId === 'string' && roomId.length > 0 && uuidRegex.test(roomId)
}

/**
 * Custom hook for Socket.IO room connection with auto-reconnect functionality
 *
 * Provides real-time communication for wheel application rooms with:
 * - Auto-reconnect on network issues
 * - Role persistence via cookies
 * - Proper cleanup on unmount
 * - Namespace switching when roomId changes
 * - Error handling and connection state management
 */
export function useRoomSocket(config: UseRoomSocketConfig): UseRoomSocketReturn {
  const { roomId, userId, userName, autoConnect = true } = config

  // Socket instance (persistent across re-renders)
  const socketRef = useRef<Socket | null>(null)

  // Connection state
  const [status, setStatus] = useState<SocketStatus>('disconnected')
  const [socketId, setSocketId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)

  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true)

  // Get user role from cookie
  const getUserRole = useCallback((): UserRole => {
    const role = RoleDetectionService.getCurrentRole()
    return role === 'organizer' ? 'organizer' : 'guest'
  }, [])

  // Update status with mount check
  const safeSetStatus = useCallback((newStatus: SocketStatus) => {
    if (mountedRef.current) {
      setStatus(newStatus)
    }
  }, [])

  // Update error with mount check
  const safeSetError = useCallback((newError: string | null) => {
    if (mountedRef.current) {
      setError(newError)
    }
  }, [])

  // Update socketId with mount check
  const safeSetSocketId = useCallback((newSocketId: string | null) => {
    if (mountedRef.current) {
      setSocketId(newSocketId)
    }
  }, [])

  // Connect to room
  const connect = useCallback(async (): Promise<void> => {
    // Validate roomId before connecting
    if (!roomId || !isValidRoomId(roomId)) {
      const errorMsg = !roomId ? 'Room ID is required' : 'Invalid room ID format (expected UUID)'
      safeSetError(errorMsg)
      safeSetStatus('error')
      return
    }

    // Clear previous errors
    safeSetError(null)
    safeSetStatus('connecting')

    try {
      // Disconnect existing connection if connecting to different room
      if (currentRoomId && currentRoomId !== roomId && socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }

      const role = getUserRole()
      const baseUrl =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const namespace = `/room:${roomId}`

      // Create socket connection to room namespace with simple config
      socketRef.current = io(`${baseUrl}${namespace}`, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      })

      // Set up connection event handlers
      socketRef.current.on('connect', () => {
        safeSetStatus('connected')
        if (socketRef.current?.id) {
          safeSetSocketId(socketRef.current.id)
        }
      })

      socketRef.current.on('disconnect', () => {
        safeSetStatus('disconnected')
        safeSetSocketId(null)
      })

      socketRef.current.on('connect_error', error => {
        console.error('Socket connection error:', error)
        safeSetError(error.message || 'Connection failed')
        safeSetStatus('error')
      })

      setCurrentRoomId(roomId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to room'
      console.error('Socket connection error:', err)
      safeSetError(errorMessage)
      safeSetStatus('error')
    }
  }, [
    roomId,
    userId,
    userName,
    getUserRole,
    safeSetStatus,
    safeSetError,
    safeSetSocketId,
    currentRoomId,
  ])

  // Disconnect from room
  const disconnect = useCallback(async (): Promise<void> => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      safeSetStatus('disconnected')
      safeSetSocketId(null)
      setCurrentRoomId(null)
    }
  }, [safeSetStatus, safeSetSocketId])

  // Reconnect to room
  const reconnect = useCallback(async (): Promise<void> => {
    await disconnect()
    await connect()
  }, [disconnect, connect])

  // Event emitters with connection check
  const emit = {
    roomStateUpdate: useCallback(
      (data: Omit<RoomStateUpdateEvent, 'roomId' | 'timestamp'>) => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('room_state_update', {
            ...data,
            roomId,
            timestamp: new Date().toISOString(),
          })
        } else {
          console.warn('Cannot emit room state update: socket not connected')
        }
      },
      [roomId]
    ),

    participantUpdate: useCallback(
      (data: Omit<ParticipantUpdateEvent, 'roomId' | 'timestamp'>) => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('participant_update', {
            ...data,
            roomId,
            timestamp: new Date().toISOString(),
          })
        } else {
          console.warn('Cannot emit participant update: socket not connected')
        }
      },
      [roomId]
    ),

    wheelSpin: useCallback(
      (data: Omit<WheelSpinEvent, 'roomId' | 'timestamp'>) => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('wheel_spin', {
            ...data,
            roomId,
            timestamp: new Date().toISOString(),
          })
        } else {
          console.warn('Cannot emit wheel spin: socket not connected')
        }
      },
      [roomId]
    ),

    timerUpdate: useCallback(
      (data: Omit<TimerUpdateEvent, 'roomId' | 'timestamp'>) => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('timer_update', {
            ...data,
            roomId,
            timestamp: new Date().toISOString(),
          })
        } else {
          console.warn('Cannot emit timer update: socket not connected')
        }
      },
      [roomId]
    ),

    roomMessage: useCallback(
      (data: Omit<RoomMessageEvent, 'roomId' | 'timestamp'>) => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('room_message', {
            ...data,
            roomId,
            timestamp: new Date().toISOString(),
          })
        } else {
          console.warn('Cannot emit room message: socket not connected')
        }
      },
      [roomId]
    ),
  }

  // Event subscription methods
  const on = {
    roomStateUpdate: useCallback((callback: (data: RoomStateUpdateEvent) => void) => {
      if (socketRef.current) {
        socketRef.current.on('room_state_update', callback)
        return () => socketRef.current?.off('room_state_update', callback)
      }
      return () => {}
    }, []),

    participantUpdate: useCallback((callback: (data: ParticipantUpdateEvent) => void) => {
      if (socketRef.current) {
        socketRef.current.on('participant_update', callback)
        return () => socketRef.current?.off('participant_update', callback)
      }
      return () => {}
    }, []),

    wheelSpin: useCallback((callback: (data: WheelSpinEvent) => void) => {
      if (socketRef.current) {
        socketRef.current.on('wheel_spin', callback)
        return () => socketRef.current?.off('wheel_spin', callback)
      }
      return () => {}
    }, []),

    timerUpdate: useCallback((callback: (data: TimerUpdateEvent) => void) => {
      if (socketRef.current) {
        socketRef.current.on('timer_update', callback)
        return () => socketRef.current?.off('timer_update', callback)
      }
      return () => {}
    }, []),

    roomMessage: useCallback((callback: (data: RoomMessageEvent) => void) => {
      if (socketRef.current) {
        socketRef.current.on('room_message', callback)
        return () => socketRef.current?.off('room_message', callback)
      }
      return () => {}
    }, []),

    error: useCallback((callback: (data: ErrorEvent | ConnectionErrorEvent) => void) => {
      if (socketRef.current) {
        socketRef.current.on('error', callback)
        socketRef.current.on('connect_error', callback)
        return () => {
          socketRef.current?.off('error', callback)
          socketRef.current?.off('connect_error', callback)
        }
      }
      return () => {}
    }, []),
  }

  // Auto-connect on mount or roomId change
  useEffect(() => {
    if (autoConnect && roomId && isValidRoomId(roomId)) {
      connect()
    } else if (autoConnect && roomId && !isValidRoomId(roomId)) {
      // Handle invalid roomId immediately for autoConnect
      const errorMsg = !roomId ? 'Room ID is required' : 'Invalid room ID format (expected UUID)'
      safeSetError(errorMsg)
      safeSetStatus('error')
    }

    return () => {
      // Cleanup on unmount or roomId change
      if (currentRoomId !== roomId) {
        disconnect()
      }
    }
  }, [roomId, autoConnect, connect, disconnect, currentRoomId, safeSetError, safeSetStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (socketRef.current) {
        // Remove all listeners and disconnect
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  return {
    // Connection state
    status,
    socketId,
    error,
    isConnected: status === 'connected',

    // Connection methods
    connect,
    disconnect,
    reconnect,

    // Event emitters
    emit,

    // Event subscription methods
    on,
  }
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getSocketManager } from '@/infrastructure/communication/socket-client'
import { RoleDetectionService } from '@/app/room/utils/role-detection'
import { ParticipantRoleEnum } from '@/domain/room/value-objects/participant-attributes'
import type {
  SocketStatus,
  SocketConfig,
  RoomStateUpdateEvent,
  ParticipantUpdateEvent,
  WheelSpinEvent,
  TimerUpdateEvent,
  RoomMessageEvent,
  ErrorEvent,
  ConnectionErrorEvent,
} from '@/types/socket'

/**
 * Configuration for the useRoomSocket hook
 */
export interface UseRoomSocketConfig {
  roomId: string
  userId?: string
  userName?: string
  /** URL for socket connection, defaults to current origin */
  url?: string
  /** Auto-connect on mount, defaults to true */
  autoConnect?: boolean
}

/**
 * Return type for the useRoomSocket hook
 */
export interface UseRoomSocketReturn {
  /** Current connection status */
  status: SocketStatus
  /** Connection error if any */
  error: string | null
  /** Socket ID when connected */
  socketId: string | null
  /** Current user role */
  role: ParticipantRoleEnum
  /** Whether socket is connected */
  isConnected: boolean
  /** Connect to the room */
  connect: () => void
  /** Disconnect from the room */
  disconnect: () => void
  /** Subscribe to room state updates */
  onStateUpdate: (callback: (data: RoomStateUpdateEvent) => void) => () => void
  /** Emit room state update */
  emitRoomStateUpdate: (data: Omit<RoomStateUpdateEvent, 'roomId' | 'timestamp'>) => void
  /** Emit participant update */
  emitParticipantUpdate: (data: Omit<ParticipantUpdateEvent, 'roomId' | 'timestamp'>) => void
  /** Emit wheel spin event */
  emitWheelSpin: (data: Omit<WheelSpinEvent, 'roomId' | 'timestamp'>) => void
  /** Emit timer update */
  emitTimerUpdate: (data: Omit<TimerUpdateEvent, 'roomId' | 'timestamp'>) => void
  /** Emit room message */
  emitRoomMessage: (data: Omit<RoomMessageEvent, 'roomId' | 'timestamp'>) => void
}

/**
 * Hook for managing Socket.IO connection to a room with auto-reconnect
 *
 * This hook provides:
 * - Automatic connection management with room namespace
 * - Auto-reconnect functionality for network loss and tab backgrounding
 * - Role detection and restoration from cookies
 * - Event subscription management with cleanup
 * - Error handling and connection state management
 * - Graceful handling of emit during reconnect states
 */
export function useRoomSocket(config: UseRoomSocketConfig): UseRoomSocketReturn {
  const {
    roomId,
    userId,
    userName,
    url = typeof window !== 'undefined' ? window.location.origin : '',
    autoConnect = true,
  } = config

  // State management
  const [status, setStatus] = useState<SocketStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [socketId, setSocketId] = useState<string | null>(null)
  const [role, setRole] = useState<ParticipantRoleEnum>(ParticipantRoleEnum.GUEST)

  // Refs for cleanup and preventing stale closures
  const socketManagerRef = useRef(getSocketManager())
  const currentRoomIdRef = useRef<string | null>(null)
  const pendingEmitsRef = useRef<Array<{ type: string; data: unknown }>>([])
  const statusUpdateCallbackRef = useRef<((status: SocketStatus) => void) | null>(null)

  // Validate roomId
  const isValidRoomId = useCallback((id: string): boolean => {
    if (!id || typeof id !== 'string') return false
    // Check if it's a valid UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }, [])

  // Update role from cookies
  const updateRole = useCallback(() => {
    if (typeof window === 'undefined') return

    const currentRole = RoleDetectionService.getCurrentRole()
    setRole(currentRole)
  }, [])

  // Handle connection status changes
  const handleStatusChange = useCallback((newStatus: SocketStatus) => {
    setStatus(newStatus)

    // Clear error when successfully connected
    if (newStatus === 'connected') {
      setError(null)
      // Process any pending emits
      const pendingEmits = pendingEmitsRef.current
      if (pendingEmits.length > 0) {
        pendingEmits.forEach(({ type, data }) => {
          // Process each pending emit based on its type
          const manager = socketManagerRef.current
          switch (type) {
            case 'room_state_update':
              manager.emitRoomStateUpdate(
                data as Omit<RoomStateUpdateEvent, 'roomId' | 'timestamp'>
              )
              break
            case 'participant_update':
              manager.emitParticipantUpdate(
                data as Omit<ParticipantUpdateEvent, 'roomId' | 'timestamp'>
              )
              break
            case 'wheel_spin':
              manager.emitWheelSpin(data as Omit<WheelSpinEvent, 'roomId' | 'timestamp'>)
              break
            case 'timer_update':
              manager.emitTimerUpdate(data as Omit<TimerUpdateEvent, 'roomId' | 'timestamp'>)
              break
            case 'room_message':
              manager.emitRoomMessage(data as Omit<RoomMessageEvent, 'roomId' | 'timestamp'>)
              break
            default:
              console.warn(`Unknown pending emit type: ${type}`)
          }
        })
        pendingEmitsRef.current = []
      }
    }

    // Notify external callback if set
    if (statusUpdateCallbackRef.current) {
      statusUpdateCallbackRef.current(newStatus)
    }
  }, [])

  // Handle errors
  const handleError = useCallback((errorData: ErrorEvent | ConnectionErrorEvent) => {
    const errorMessage = errorData.error
    setError(errorMessage)
    setStatus('error')
  }, [])

  // Connect to room
  const connect = useCallback(async () => {
    if (!isValidRoomId(roomId)) {
      setError('Invalid room ID format. Expected UUID v4.')
      setStatus('error')
      return
    }

    try {
      setStatus('connecting')
      setError(null)

      // Update role from cookies
      updateRole()

      const socketConfig: SocketConfig = {
        url,
        roomId,
        userId,
        userName,
        role: role,
      }

      // Connect using the socket manager
      await socketManagerRef.current.connect(socketConfig)

      // Set up event listeners
      const manager = socketManagerRef.current

      // Connection events
      manager.onConnection(data => {
        setSocketId(data.socketId)
        handleStatusChange('connected')
      })

      manager.onError(handleError)

      // Track current room
      currentRoomIdRef.current = roomId

      handleStatusChange('connected')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed'
      setError(errorMessage)
      setStatus('error')
    }
  }, [
    roomId,
    userId,
    userName,
    url,
    role,
    isValidRoomId,
    updateRole,
    handleStatusChange,
    handleError,
  ])

  // Disconnect from room
  const disconnect = useCallback(async () => {
    try {
      await socketManagerRef.current.disconnect()
      setStatus('disconnected')
      setSocketId(null)
      setError(null)
      currentRoomIdRef.current = null
      pendingEmitsRef.current = []
    } catch (err) {
      console.warn('Error during disconnect:', err)
    }
  }, [])

  // Subscribe to room state updates
  const onStateUpdate = useCallback((callback: (data: RoomStateUpdateEvent) => void) => {
    const manager = socketManagerRef.current

    // Set up the listener
    manager.onRoomStateUpdate(callback)

    // Return cleanup function
    return () => {
      manager.off('room_state_update', callback)
    }
  }, [])

  // Emit functions
  const emitRoomStateUpdate = useCallback(
    (data: Omit<RoomStateUpdateEvent, 'roomId' | 'timestamp'>) => {
      const manager = socketManagerRef.current

      if (manager.isConnected()) {
        manager.emitRoomStateUpdate(data)
      } else if (status === 'connecting' || status === 'disconnected') {
        pendingEmitsRef.current.push({ type: 'room_state_update', data })
      } else {
        console.warn('Cannot emit room_state_update: socket is in error state')
      }
    },
    [status]
  )

  const emitParticipantUpdate = useCallback(
    (data: Omit<ParticipantUpdateEvent, 'roomId' | 'timestamp'>) => {
      const manager = socketManagerRef.current

      if (manager.isConnected()) {
        manager.emitParticipantUpdate(data)
      } else if (status === 'connecting' || status === 'disconnected') {
        pendingEmitsRef.current.push({ type: 'participant_update', data })
      } else {
        console.warn('Cannot emit participant_update: socket is in error state')
      }
    },
    [status]
  )

  const emitWheelSpin = useCallback(
    (data: Omit<WheelSpinEvent, 'roomId' | 'timestamp'>) => {
      const manager = socketManagerRef.current

      if (manager.isConnected()) {
        manager.emitWheelSpin(data)
      } else if (status === 'connecting' || status === 'disconnected') {
        pendingEmitsRef.current.push({ type: 'wheel_spin', data })
      } else {
        console.warn('Cannot emit wheel_spin: socket is in error state')
      }
    },
    [status]
  )

  const emitTimerUpdate = useCallback(
    (data: Omit<TimerUpdateEvent, 'roomId' | 'timestamp'>) => {
      const manager = socketManagerRef.current

      if (manager.isConnected()) {
        manager.emitTimerUpdate(data)
      } else if (status === 'connecting' || status === 'disconnected') {
        pendingEmitsRef.current.push({ type: 'timer_update', data })
      } else {
        console.warn('Cannot emit timer_update: socket is in error state')
      }
    },
    [status]
  )

  const emitRoomMessage = useCallback(
    (data: Omit<RoomMessageEvent, 'roomId' | 'timestamp'>) => {
      const manager = socketManagerRef.current

      if (manager.isConnected()) {
        manager.emitRoomMessage(data)
      } else if (status === 'connecting' || status === 'disconnected') {
        pendingEmitsRef.current.push({ type: 'room_message', data })
      } else {
        console.warn('Cannot emit room_message: socket is in error state')
      }
    },
    [status]
  )

  // Handle roomId changes - reconnect to new room
  useEffect(() => {
    const prevRoomId = currentRoomIdRef.current

    if (prevRoomId && prevRoomId !== roomId && socketManagerRef.current.isConnected()) {
      // Room ID changed, disconnect from previous and connect to new
      disconnect().then(() => {
        if (autoConnect) {
          connect()
        }
      })
    } else if (!prevRoomId && autoConnect) {
      // Initial connection
      connect()
    }
  }, [roomId, autoConnect, connect, disconnect])

  // Handle role changes
  useEffect(() => {
    updateRole()
  }, [updateRole])

  // Handle visibility change for auto-reconnect after tab backgrounding
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleVisibilityChange = () => {
      if (!document.hidden && status === 'disconnected' && currentRoomIdRef.current) {
        // Tab became visible and we're disconnected, try to reconnect
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status, connect])

  // Cleanup on unmount
  useEffect(() => {
    const manager = socketManagerRef.current
    return () => {
      // Remove all listeners and disconnect
      if (manager.isConnected()) {
        manager.removeAllListeners()
        manager.disconnect()
      }
      currentRoomIdRef.current = null
      pendingEmitsRef.current = []
    }
  }, [])

  return {
    status,
    error,
    socketId,
    role,
    isConnected: status === 'connected',
    connect,
    disconnect,
    onStateUpdate,
    emitRoomStateUpdate,
    emitParticipantUpdate,
    emitWheelSpin,
    emitTimerUpdate,
    emitRoomMessage,
  }
}

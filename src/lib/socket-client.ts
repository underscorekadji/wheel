import { io, Socket } from 'socket.io-client'
import type {
  SocketEventMap,
  SocketConfig,
  SocketStatus,
  RoomStateUpdateEvent,
  ParticipantUpdateEvent,
  WheelSpinEvent,
  TimerUpdateEvent,
  RoomMessageEvent,
  ConnectionEvent,
  UserConnectionEvent,
  UserDisconnectionEvent,
  ErrorEvent,
  ConnectionErrorEvent,
} from '@/types/socket'

/**
 * Socket.IO client manager for room-based communication
 *
 * This class provides a high-level interface for connecting to room namespaces
 * and handling real-time communication in the wheel application.
 */
export class SocketManager {
  private socket: Socket | null = null
  private config: SocketConfig | null = null
  private status: SocketStatus = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private reconnectTimeoutId: NodeJS.Timeout | null = null

  /**
   * Connect to a room namespace
   *
   * @param config - Socket connection configuration
   * @returns Promise that resolves when connection is established
   */
  async connect(config: SocketConfig): Promise<void> {
    if (this.socket?.connected) {
      console.warn('Socket already connected, disconnecting first')
      await this.disconnect()
    }

    this.config = config
    this.status = 'connecting'

    try {
      // Create socket connection to room namespace
      const namespace = `/room:${config.roomId}`

      this.socket = io(`${config.url}${namespace}`, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
      })

      // Set up connection event handlers
      this.setupConnectionHandlers()

      // Wait for connection
      await this.waitForConnection()

      console.log(`Connected to room namespace: ${namespace}`)
    } catch (error) {
      this.status = 'error'
      console.error('Failed to connect to socket:', error)
      throw new Error(`Socket connection failed: ${error}`)
    }
  }

  /**
   * Disconnect from the socket
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.status = 'disconnected'
    this.config = null
    console.log('Socket disconnected')
  }

  /**
   * Get current connection status
   */
  getStatus(): SocketStatus {
    return this.status
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected === true
  }

  /**
   * Wait for socket connection to be established
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialized'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, 10000)

      this.socket.on('connected', () => {
        clearTimeout(timeout)
        this.status = 'connected'
        resolve()
      })

      this.socket.on('connect_error', error => {
        clearTimeout(timeout)
        this.status = 'error'
        reject(error)
      })
    })
  }

  /**
   * Set up connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)
      this.status = 'connected'
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', reason => {
      console.log('Socket disconnected:', reason)
      this.status = 'disconnected'
    })

    this.socket.on('connect_error', error => {
      console.error('Socket connection error:', error)
      this.status = 'error'
      this.handleReconnection()
    })

    this.socket.on('reconnect', attemptNumber => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`)
      this.status = 'connected'
      this.reconnectAttempts = 0
    })

    this.socket.on('reconnect_error', error => {
      console.error('Socket reconnection error:', error)
      this.handleReconnection()
    })
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    this.reconnectAttempts++

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.status = 'error'
      return
    }

    // Clear any existing pending reconnection timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }

    this.reconnectTimeoutId = setTimeout(() => {
      if (this.config && this.status !== 'connected') {
        console.log(
          `Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
        )
        this.connect(this.config)
      }
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  // Event emission methods

  /**
   * Emit room state update
   */
  emitRoomStateUpdate(data: Omit<RoomStateUpdateEvent, 'roomId' | 'timestamp'>): void {
    this.emit('room_state_update', data)
  }

  /**
   * Emit participant update
   */
  emitParticipantUpdate(data: Omit<ParticipantUpdateEvent, 'roomId' | 'timestamp'>): void {
    this.emit('participant_update', data)
  }

  /**
   * Emit wheel spin event
   */
  emitWheelSpin(data: Omit<WheelSpinEvent, 'roomId' | 'timestamp'>): void {
    this.emit('wheel_spin', data)
  }

  /**
   * Emit timer update
   */
  emitTimerUpdate(data: Omit<TimerUpdateEvent, 'roomId' | 'timestamp'>): void {
    this.emit('timer_update', data)
  }

  /**
   * Emit room message
   */
  emitRoomMessage(data: Omit<RoomMessageEvent, 'roomId' | 'timestamp'>): void {
    this.emit('room_message', data)
  }

  /**
   * Generic emit method
   */
  private emit<K extends keyof SocketEventMap>(
    event: K,
    data: Omit<Parameters<SocketEventMap[K]>[0], 'roomId' | 'timestamp'>
  ): void {
    if (!this.socket?.connected) {
      console.warn(`Cannot emit ${event}: socket not connected`)
      return
    }

    this.socket.emit(event, {
      ...data,
      roomId: this.config?.roomId,
      timestamp: new Date().toISOString(),
    })
  }

  // Event listening methods

  /**
   * Listen for room state updates
   */
  onRoomStateUpdate(callback: (data: RoomStateUpdateEvent) => void): void {
    this.on('room_state_update', callback)
  }

  /**
   * Listen for participant updates
   */
  onParticipantUpdate(callback: (data: ParticipantUpdateEvent) => void): void {
    this.on('participant_update', callback)
  }

  /**
   * Listen for wheel spin events
   */
  onWheelSpin(callback: (data: WheelSpinEvent) => void): void {
    this.on('wheel_spin', callback)
  }

  /**
   * Listen for timer updates
   */
  onTimerUpdate(callback: (data: TimerUpdateEvent) => void): void {
    this.on('timer_update', callback)
  }

  /**
   * Listen for room messages
   */
  onRoomMessage(callback: (data: RoomMessageEvent) => void): void {
    this.on('room_message', callback)
  }

  /**
   * Listen for connection events
   */
  onConnection(callback: (data: ConnectionEvent) => void): void {
    this.on('connected', callback)
  }

  /**
   * Listen for user connection events
   */
  onUserConnected(callback: (data: UserConnectionEvent) => void): void {
    this.on('user_connected', callback)
  }

  /**
   * Listen for user disconnection events
   */
  onUserDisconnected(callback: (data: UserDisconnectionEvent) => void): void {
    this.on('user_disconnected', callback)
  }

  /**
   * Listen for errors
   */
  onError(callback: (data: ErrorEvent | ConnectionErrorEvent) => void): void {
    this.on('error', callback as (data: ErrorEvent) => void)
    this.on('connection_error', callback as (data: ConnectionErrorEvent) => void)
  }

  /**
   * Generic event listener method
   */
  private on<K extends keyof SocketEventMap>(event: K, callback: SocketEventMap[K]): void {
    if (!this.socket) {
      console.warn(`Cannot listen for ${event}: socket not initialized`)
      return
    }

    // Listen for typed events using Socket.IO's generic event map
    this.socket.on(event as string, callback as (...args: any[]) => void)
  }

  /**
   * Remove event listener
   */
  off<K extends keyof SocketEventMap>(event: K, callback?: SocketEventMap[K]): void {
    if (!this.socket) return

    if (callback) {
      this.socket.off(event as string, callback as (...args: unknown[]) => void)
    } else {
      this.socket.off(event as string)
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    if (!this.socket) return
    this.socket.removeAllListeners()
  }
}

/**
 * Create a new socket manager instance
 */
export function createSocketManager(): SocketManager {
  return new SocketManager()
}

/**
 * Global socket manager instance (singleton pattern)
 */
let globalSocketManager: SocketManager | null = null

/**
 * Get or create the global socket manager instance
 */
export function getSocketManager(): SocketManager {
  if (!globalSocketManager) {
    globalSocketManager = new SocketManager()
  }
  return globalSocketManager
}

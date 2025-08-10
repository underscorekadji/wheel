import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SocketManager, createSocketManager, getSocketManager } from '../socket-client'
import type { SocketConfig } from '@/types/socket'
import type { Socket } from 'socket.io-client'

// Mock Socket.IO client
const mockSocket = {
  connected: false,
  id: 'test-socket-id',
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  removeAllListeners: vi.fn(),
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

describe('SocketManager', () => {
  let socketManager: SocketManager
  const mockConfig: SocketConfig = {
    url: 'http://localhost:3001',
    roomId: '550e8400-e29b-41d4-a716-446655440000',
    userId: 'user-456',
    userName: 'Test User',
    role: 'organizer',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    socketManager = new SocketManager()
    mockSocket.connected = false
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Connection Management', () => {
    it('should connect to room namespace successfully', async () => {
      const { io } = await import('socket.io-client')

      // Setup connection success
      mockSocket.connected = true
      setTimeout(() => {
        const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connected')?.[1]
        if (connectCallback) connectCallback()
      }, 0)

      await socketManager.connect(mockConfig)

      expect(io).toHaveBeenCalledWith(
        'http://localhost:3001/room:550e8400-e29b-41d4-a716-446655440000',
        expect.objectContaining({
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5, // Client-side default value
          reconnectionDelay: 1000, // Client-side default value
          timeout: 20000, // Client-side default value
        })
      )

      expect(socketManager.isConnected()).toBe(true)
      expect(socketManager.getStatus()).toBe('connected')
    })

    it('should handle connection timeout', async () => {
      // Don't trigger connected event to simulate timeout
      const connectPromise = socketManager.connect(mockConfig)

      await expect(connectPromise).rejects.toThrow('Connection timeout')
      expect(socketManager.getStatus()).toBe('error')
    }, 25000) // Increased timeout to account for new 20s connection timeout

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed')

      // Mock the waitForConnection to reject immediately
      const originalWaitForConnection = socketManager['waitForConnection']
      socketManager['waitForConnection'] = vi.fn().mockRejectedValue(error)

      await expect(socketManager.connect(mockConfig)).rejects.toThrow(
        'Socket connection failed: Error: Connection failed'
      )
      expect(socketManager.getStatus()).toBe('error')

      // Restore original method
      socketManager['waitForConnection'] = originalWaitForConnection
    })

    it('should disconnect existing connection before new connection', async () => {
      // Mock existing connection
      mockSocket.connected = true
      socketManager['socket'] = mockSocket as Partial<Socket> as Socket

      setTimeout(() => {
        const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connected')?.[1]
        if (connectCallback) connectCallback()
      }, 0)

      await socketManager.connect(mockConfig)

      expect(mockSocket.disconnect).toHaveBeenCalled()
    })

    it('should disconnect properly', async () => {
      socketManager['socket'] = mockSocket as Partial<Socket> as Socket

      await socketManager.disconnect()

      expect(mockSocket.disconnect).toHaveBeenCalled()
      expect(socketManager.getStatus()).toBe('disconnected')
    })
  })

  describe('Event Emission', () => {
    beforeEach(() => {
      socketManager['socket'] = mockSocket as Partial<Socket> as Socket
      socketManager['config'] = mockConfig
      mockSocket.connected = true
    })

    it('should emit room state update', () => {
      const stateData = {
        participants: [],
        wheelState: { isSpinning: false },
        timerState: { isActive: false, currentTime: 0, maxTime: 600 },
        sessionActive: true,
      }

      socketManager.emitRoomStateUpdate(stateData)

      expect(mockSocket.emit).toHaveBeenCalledWith('room_state_update', {
        ...stateData,
        roomId: mockConfig.roomId,
        timestamp: expect.any(String),
      })
    })

    it('should emit participant update', () => {
      const participantData = {
        participant: {
          id: 'participant-1',
          name: 'John Doe',
          status: 'queued' as const,
          role: 'guest' as const,
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          lastUpdatedAt: new Date('2024-01-01T00:00:00Z'),
          lastSelectedAt: null,
        },
        action: 'added' as const,
      }

      socketManager.emitParticipantUpdate(participantData)

      expect(mockSocket.emit).toHaveBeenCalledWith('participant_update', {
        ...participantData,
        roomId: mockConfig.roomId,
        timestamp: expect.any(String),
      })
    })

    it('should emit wheel spin event', () => {
      const wheelData = {
        wheelState: { isSpinning: true, spinDuration: 3000 },
        selectedParticipant: 'participant-1',
        spinDuration: 3000,
        action: 'start_spin' as const,
      }

      socketManager.emitWheelSpin(wheelData)

      expect(mockSocket.emit).toHaveBeenCalledWith('wheel_spin', {
        ...wheelData,
        roomId: mockConfig.roomId,
        timestamp: expect.any(String),
      })
    })

    it('should emit timer update', () => {
      const timerData = {
        timerState: { isActive: true, currentTime: 300, maxTime: 600 },
        action: 'start' as const,
      }

      socketManager.emitTimerUpdate(timerData)

      expect(mockSocket.emit).toHaveBeenCalledWith('timer_update', {
        ...timerData,
        roomId: mockConfig.roomId,
        timestamp: expect.any(String),
      })
    })

    it('should emit room message', () => {
      const messageData = {
        message: 'Hello everyone!',
        senderId: 'user-456',
        senderName: 'Test User',
        messageType: 'user' as const,
      }

      socketManager.emitRoomMessage(messageData)

      expect(mockSocket.emit).toHaveBeenCalledWith('room_message', {
        ...messageData,
        roomId: mockConfig.roomId,
        timestamp: expect.any(String),
      })
    })

    it('should not emit when socket is not connected', () => {
      mockSocket.connected = false

      socketManager.emitRoomStateUpdate({
        participants: [],
        wheelState: { isSpinning: false },
        timerState: { isActive: false, currentTime: 0, maxTime: 600 },
        sessionActive: true,
      })

      expect(mockSocket.emit).not.toHaveBeenCalled()
    })
  })

  describe('Event Listening', () => {
    beforeEach(() => {
      socketManager['socket'] = mockSocket as Partial<Socket> as Socket
    })

    it('should set up room state update listener', () => {
      const callback = vi.fn()

      socketManager.onRoomStateUpdate(callback)

      expect(mockSocket.on).toHaveBeenCalledWith('room_state_update', callback)
    })

    it('should set up participant update listener', () => {
      const callback = vi.fn()

      socketManager.onParticipantUpdate(callback)

      expect(mockSocket.on).toHaveBeenCalledWith('participant_update', callback)
    })

    it('should set up wheel spin listener', () => {
      const callback = vi.fn()

      socketManager.onWheelSpin(callback)

      expect(mockSocket.on).toHaveBeenCalledWith('wheel_spin', callback)
    })

    it('should set up timer update listener', () => {
      const callback = vi.fn()

      socketManager.onTimerUpdate(callback)

      expect(mockSocket.on).toHaveBeenCalledWith('timer_update', callback)
    })

    it('should set up room message listener', () => {
      const callback = vi.fn()

      socketManager.onRoomMessage(callback)

      expect(mockSocket.on).toHaveBeenCalledWith('room_message', callback)
    })

    it('should set up connection event listeners', () => {
      const callback = vi.fn()

      socketManager.onConnection(callback)

      expect(mockSocket.on).toHaveBeenCalledWith('connected', callback)
    })

    it('should set up error listeners', () => {
      const callback = vi.fn()

      socketManager.onError(callback)

      expect(mockSocket.on).toHaveBeenCalledWith('error', callback)
      expect(mockSocket.on).toHaveBeenCalledWith('connection_error', callback)
    })

    it('should remove event listeners', () => {
      const callback = vi.fn()

      socketManager.off('room_state_update', callback)

      expect(mockSocket.off).toHaveBeenCalledWith('room_state_update', callback)
    })

    it('should remove all listeners for an event', () => {
      socketManager.off('room_state_update')

      expect(mockSocket.off).toHaveBeenCalledWith('room_state_update')
    })

    it('should remove all listeners', () => {
      socketManager.removeAllListeners()

      expect(mockSocket.removeAllListeners).toHaveBeenCalled()
    })

    it('should handle missing socket for event listeners', () => {
      socketManager['socket'] = null

      const callback = vi.fn()
      socketManager.onRoomStateUpdate(callback)

      expect(mockSocket.on).not.toHaveBeenCalled()
    })
  })

  describe('Reconnection Logic', () => {
    beforeEach(() => {
      socketManager['socket'] = mockSocket as Partial<Socket> as Socket
      socketManager['config'] = mockConfig
    })

    it('should handle reconnection success', () => {
      // Setup connection handlers first
      socketManager['setupConnectionHandlers']()

      // Set initial status
      socketManager['status'] = 'connecting'

      // Find and call the reconnect callback
      const reconnectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'reconnect')?.[1]

      if (reconnectCallback) {
        reconnectCallback(3) // 3 attempts
      }

      expect(socketManager.getStatus()).toBe('connected')
    })

    it('should handle maximum reconnection attempts', () => {
      // Setup connection handlers first
      socketManager['setupConnectionHandlers']()

      // Set up reconnection error scenario
      socketManager['reconnectAttempts'] = 4 // Will become 5 after increment (client default max is 5)
      socketManager['status'] = 'connecting'

      const reconnectErrorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'reconnect_error'
      )?.[1]

      if (reconnectErrorCallback) {
        reconnectErrorCallback(new Error('Reconnection failed'))
      }

      expect(socketManager.getStatus()).toBe('error')
    })
  })
})

describe('Socket Manager Factory Functions', () => {
  it('should create new socket manager instance', () => {
    const manager = createSocketManager()
    expect(manager).toBeInstanceOf(SocketManager)
  })

  it('should return singleton instance', () => {
    const manager1 = getSocketManager()
    const manager2 = getSocketManager()

    expect(manager1).toBe(manager2)
    expect(manager1).toBeInstanceOf(SocketManager)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRoomSocket } from '@/hooks/useRoomSocket'
import { getSocketManager } from '@/infrastructure/communication/socket-client'
import { RoleDetectionService } from '@/app/room/utils/role-detection'
import { ParticipantRoleEnum } from '@/domain/room/value-objects/participant-attributes'
import type { SocketStatus } from '@/types/socket'

// Mock the dependencies
vi.mock('@/infrastructure/communication/socket-client')
vi.mock('@/app/room/utils/role-detection', () => ({
  RoleDetectionService: {
    getCurrentRole: vi.fn(),
    isOrganizer: vi.fn(),
    setAsOrganizer: vi.fn(),
    setAsGuest: vi.fn(),
    clearRoles: vi.fn(),
  },
}))

// Mock socket manager
const mockSocketManager = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn(),
  getStatus: vi.fn(),
  onConnection: vi.fn(),
  onError: vi.fn(),
  onRoomStateUpdate: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
  emitRoomStateUpdate: vi.fn(),
  emitParticipantUpdate: vi.fn(),
  emitWheelSpin: vi.fn(),
  emitTimerUpdate: vi.fn(),
  emitRoomMessage: vi.fn(),
}

beforeEach(() => {
  vi.mocked(getSocketManager).mockReturnValue(mockSocketManager as never)
  
  // Reset all mocks
  vi.clearAllMocks()
  
  // Default mock implementations
  mockSocketManager.isConnected.mockReturnValue(false)
  mockSocketManager.getStatus.mockReturnValue('disconnected')
  vi.mocked(RoleDetectionService.getCurrentRole).mockReturnValue(ParticipantRoleEnum.GUEST)
  
  // Mock successful connection by default
  mockSocketManager.connect.mockImplementation(async () => {
    // Simulate successful connection
    mockSocketManager.isConnected.mockReturnValue(true)
    mockSocketManager.getStatus.mockReturnValue('connected')
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useRoomSocket', () => {
  const validRoomId = '550e8400-e29b-41d4-a716-446655440000'
  const invalidRoomId = 'invalid-uuid'

  describe('1) Connect to room on mount', () => {
    it('should transition status connecting → connected and provide namespace and socketId', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: false, // Start without auto-connect to control the flow
        })
      )

      // Initially should be disconnected
      expect(result.current.status).toBe('disconnected')
      expect(result.current.isConnected).toBe(false)
      expect(result.current.socketId).toBe(null)

      // Manually connect
      act(() => {
        result.current.connect()
      })

      // Wait for connect call
      await waitFor(() => {
        expect(mockSocketManager.connect).toHaveBeenCalledWith({
          url: 'http://localhost:3000',
          roomId: validRoomId,
          userId: undefined,
          userName: undefined,
          role: ParticipantRoleEnum.GUEST,
        })
      })

      // Simulate connection success
      act(() => {
        const onConnectionCallback = mockSocketManager.onConnection.mock.calls[0][0]
        onConnectionCallback({
          roomId: validRoomId,
          timestamp: new Date().toISOString(),
          message: 'Connected',
          socketId: 'socket-123',
        })
      })

      expect(result.current.status).toBe('connected')
      expect(result.current.isConnected).toBe(true)
      expect(result.current.socketId).toBe('socket-123')
    })

    it('should use correct namespace format room:{id}', async () => {
      renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: true,
        })
      )

      await waitFor(() => {
        expect(mockSocketManager.connect).toHaveBeenCalledWith(
          expect.objectContaining({
            roomId: validRoomId,
          })
        )
      })
    })
  })

  describe('2) Cleanup on unmount', () => {
    it('should remove all listeners and disconnect on unmount', async () => {
      const { unmount } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: true,
        })
      )

      // Simulate connected state
      mockSocketManager.isConnected.mockReturnValue(true)

      unmount()

      expect(mockSocketManager.removeAllListeners).toHaveBeenCalled()
      expect(mockSocketManager.disconnect).toHaveBeenCalled()
    })
  })

  describe('3) Switch namespace when roomId changes', () => {
    it('should disconnect from previous room and connect to new room', async () => {
      const newRoomId = '661f8500-e29b-41d4-a716-446655440001'
      
      const { result, rerender } = renderHook(
        ({ roomId }) => useRoomSocket({ roomId, autoConnect: true }),
        { initialProps: { roomId: validRoomId } }
      )

      // Wait for initial connection
      await waitFor(() => {
        expect(mockSocketManager.connect).toHaveBeenCalledWith(
          expect.objectContaining({ roomId: validRoomId })
        )
      })

      // Simulate connected state
      mockSocketManager.isConnected.mockReturnValue(true)

      // Change roomId
      rerender({ roomId: newRoomId })

      await waitFor(() => {
        expect(mockSocketManager.disconnect).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockSocketManager.connect).toHaveBeenCalledWith(
          expect.objectContaining({ roomId: newRoomId })
        )
      })
    })
  })

  describe('4) Auto-reconnect on brief network loss', () => {
    it('should set up visibility change listener for auto-reconnect', () => {
      // Mock document.hidden and visibility API
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      })

      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: false,
        })
      )

      // Should set up visibility change listener
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )

      // Should clean up listener on unmount
      unmount()
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('5) Role restoration from cookie', () => {
    it('should restore role from cookie on connect', async () => {
      vi.mocked(RoleDetectionService.getCurrentRole).mockReturnValue(
        ParticipantRoleEnum.ORGANIZER
      )

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: false,
        })
      )

      act(() => {
        result.current.connect()
      })

      await waitFor(() => {
        expect(mockSocketManager.connect).toHaveBeenCalledWith(
          expect.objectContaining({
            role: ParticipantRoleEnum.ORGANIZER,
          })
        )
      })
    })
  })

  describe('6) Emits during reconnect don\'t break UI', () => {
    it('should queue emits when socket is connecting and send them when connected', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: false,
        })
      )

      // Try to emit while disconnected
      act(() => {
        result.current.emitRoomStateUpdate({
          participants: [],
          wheelState: { isSpinning: false },
          timerState: { isActive: false, currentTime: 0, maxTime: 600 },
          sessionActive: true,
        })
      })

      // Should not emit immediately
      expect(mockSocketManager.emitRoomStateUpdate).not.toHaveBeenCalled()

      // Now connect
      act(() => {
        result.current.connect()
      })

      // Wait for connection setup
      await waitFor(() => {
        expect(mockSocketManager.onConnection).toHaveBeenCalled()
      })

      // Simulate connection success
      act(() => {
        const onConnectionCallback = mockSocketManager.onConnection.mock.calls[0][0]
        onConnectionCallback({
          roomId: validRoomId,
          timestamp: new Date().toISOString(),
          message: 'Connected',
          socketId: 'socket-123',
        })
      })

      // Should now emit the queued message
      expect(mockSocketManager.emitRoomStateUpdate).toHaveBeenCalledWith({
        participants: [],
        wheelState: { isSpinning: false },
        timerState: { isActive: false, currentTime: 0, maxTime: 600 },
        sessionActive: true,
      })
    })

    it('should emit immediately when connected', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: true,
        })
      )

      // Simulate connected state
      mockSocketManager.isConnected.mockReturnValue(true)

      act(() => {
        result.current.emitParticipantUpdate({
          participant: {
            id: 'participant-1',
            name: 'Test User',
            status: 'queued',
            role: 'guest',
          },
          action: 'added',
        })
      })

      expect(mockSocketManager.emitParticipantUpdate).toHaveBeenCalledWith({
        participant: {
          id: 'participant-1',
          name: 'Test User',
          status: 'queued',
          role: 'guest',
        },
        action: 'added',
      })
    })
  })

  describe('7) Subscribe to room state diffs', () => {
    it('should set up subscription and return cleanup function', () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: true,
        })
      )

      const mockCallback = vi.fn()
      const cleanup = result.current.onStateUpdate(mockCallback)

      expect(mockSocketManager.onRoomStateUpdate).toHaveBeenCalledWith(mockCallback)
      expect(typeof cleanup).toBe('function')

      // Call cleanup
      cleanup()
      expect(mockSocketManager.off).toHaveBeenCalledWith('room_state_update', mockCallback)
    })
  })

  describe('8) Connection errors are visible to the UI', () => {
    it('should set error status when connection fails', async () => {
      mockSocketManager.connect.mockRejectedValue(new Error('Connection failed'))

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: true,
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('error')
        expect(result.current.error).toBe('Connection failed')
      })
    })

    it('should handle socket errors via error callback', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: true,
        })
      )

      // Wait for connection setup
      await waitFor(() => {
        expect(mockSocketManager.onError).toHaveBeenCalled()
      })

      // Simulate error
      act(() => {
        const errorCallback = mockSocketManager.onError.mock.calls[0][0]
        errorCallback({
          roomId: validRoomId,
          timestamp: new Date().toISOString(),
          error: 'Network error',
        })
      })

      expect(result.current.status).toBe('error')
      expect(result.current.error).toBe('Network error')
    })
  })

  describe('9) Invalid roomId', () => {
    it('should not connect and show error for invalid roomId', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: invalidRoomId,
          autoConnect: true,
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('error')
        expect(result.current.error).toBe('Invalid room ID format. Expected UUID v4.')
      })

      expect(mockSocketManager.connect).not.toHaveBeenCalled()
    })

    it('should not connect for empty roomId', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: '',
          autoConnect: true,
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('error')
        expect(result.current.error).toBe('Invalid room ID format. Expected UUID v4.')
      })

      expect(mockSocketManager.connect).not.toHaveBeenCalled()
    })
  })

  describe('10) Multiple tabs support', () => {
    it('should allow multiple hook instances for the same room', async () => {
      // Clear mocks to get clean counts
      vi.clearAllMocks()
      
      const { result: result1 } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: false, // Use manual connect to control timing
        })
      )

      const { result: result2 } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: false,
        })
      )

      // Connect both manually
      act(() => {
        result1.current.connect()
        result2.current.connect()
      })

      // Both should attempt to connect
      await waitFor(() => {
        expect(mockSocketManager.connect).toHaveBeenCalledTimes(2)
      })

      // Both should have the same configuration
      expect(mockSocketManager.connect).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ roomId: validRoomId })
      )
      expect(mockSocketManager.connect).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ roomId: validRoomId })
      )
    })
  })

  describe('11) Manual connection control', () => {
    it('should not auto-connect when autoConnect is false', async () => {
      renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: false,
        })
      )

      // Wait a bit to ensure no automatic connection
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockSocketManager.connect).not.toHaveBeenCalled()
    })

    it('should connect manually when connect() is called', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: false,
        })
      )

      expect(mockSocketManager.connect).not.toHaveBeenCalled()

      act(() => {
        result.current.connect()
      })

      expect(mockSocketManager.connect).toHaveBeenCalled()
    })
  })

  describe('12) Proper disconnect functionality', () => {
    it('should disconnect and clear state when disconnect() is called', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: validRoomId,
          autoConnect: true,
        })
      )

      // Wait for connection
      await waitFor(() => {
        expect(mockSocketManager.connect).toHaveBeenCalled()
      })

      // Simulate connected state
      act(() => {
        const onConnectionCallback = mockSocketManager.onConnection.mock.calls[0][0]
        onConnectionCallback({
          roomId: validRoomId,
          timestamp: new Date().toISOString(),
          message: 'Connected',
          socketId: 'socket-123',
        })
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.socketId).toBe('socket-123')

      // Disconnect
      await act(async () => {
        await result.current.disconnect()
      })

      expect(mockSocketManager.disconnect).toHaveBeenCalled()
      expect(result.current.status).toBe('disconnected')
      expect(result.current.socketId).toBe(null)
      expect(result.current.error).toBe(null)
    })
  })
})
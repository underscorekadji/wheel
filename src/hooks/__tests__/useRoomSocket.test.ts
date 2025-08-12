import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, Mock } from 'vitest'
import { useRoomSocket } from '../useRoomSocket'
import { SocketManager } from '@/infrastructure/communication/socket-client'
import { RoleDetectionService } from '@/app/room/utils/role-detection'

// Mock dependencies
vi.mock('@/infrastructure/communication/socket-client')
vi.mock('@/app/room/utils/role-detection')

const MockedSocketManager = SocketManager as Mock
const MockedRoleDetectionService = RoleDetectionService as Mock

describe('useRoomSocket', () => {
  const mockRoomId = '550e8400-e29b-41d4-a716-446655440000'
  const mockUserId = 'user-123'
  const mockUserName = 'Test User'

  let mockSocketManager: any
  let mockConnect: Mock
  let mockDisconnect: Mock
  let mockGetStatus: Mock
  let mockIsConnected: Mock
  let mockEmitRoomStateUpdate: Mock
  let mockOnRoomStateUpdate: Mock
  let mockOff: Mock
  let mockRemoveAllListeners: Mock

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock RoleDetectionService
    MockedRoleDetectionService.getCurrentRole = vi.fn().mockReturnValue('organizer')

    // Create mock socket manager instance
    mockConnect = vi.fn()
    mockDisconnect = vi.fn()
    mockGetStatus = vi.fn().mockReturnValue('disconnected')
    mockIsConnected = vi.fn().mockReturnValue(false)
    mockEmitRoomStateUpdate = vi.fn()
    mockOnRoomStateUpdate = vi.fn()
    mockOff = vi.fn()
    mockRemoveAllListeners = vi.fn()

    mockSocketManager = {
      connect: mockConnect,
      disconnect: mockDisconnect,
      getStatus: mockGetStatus,
      isConnected: mockIsConnected,
      emitRoomStateUpdate: mockEmitRoomStateUpdate,
      emitParticipantUpdate: vi.fn(),
      emitWheelSpin: vi.fn(),
      emitTimerUpdate: vi.fn(),
      emitRoomMessage: vi.fn(),
      onRoomStateUpdate: mockOnRoomStateUpdate,
      onParticipantUpdate: vi.fn(),
      onWheelSpin: vi.fn(),
      onTimerUpdate: vi.fn(),
      onRoomMessage: vi.fn(),
      onError: vi.fn(),
      off: mockOff,
      removeAllListeners: mockRemoveAllListeners,
      socket: { id: 'socket-123' },
      _statusCleanup: vi.fn(),
    }

    // Mock SocketManager constructor
    MockedSocketManager.mockImplementation(() => mockSocketManager)

    // Mock window.location for tests
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    })
  })

  describe('User Case 1: Connect to room on mount', () => {
    it('should connect to room namespace successfully', async () => {
      mockConnect.mockResolvedValue(undefined)
      mockGetStatus.mockReturnValue('connecting')
      mockIsConnected.mockReturnValue(false)

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
          userId: mockUserId,
          userName: mockUserName,
        })
      )

      // Should start connecting
      expect(result.current.status).toBe('disconnected')

      // Wait for connect to be called
      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalled()
      })

      // Simulate connection success
      mockGetStatus.mockReturnValue('connected')
      mockIsConnected.mockReturnValue(true)

      // Wait for status to update to connected
      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      })

      expect(result.current.isConnected).toBe(true)
      expect(result.current.socketId).toBe('socket-123')
      expect(mockConnect).toHaveBeenCalledWith({
        url: 'http://localhost:3000',
        roomId: mockRoomId,
        userId: mockUserId,
        userName: mockUserName,
        role: 'organizer',
      })
    })
  })

  describe('User Case 2: Cleanup on unmount', () => {
    it('should remove listeners and disconnect on unmount', async () => {
      mockConnect.mockResolvedValue(undefined)
      mockGetStatus.mockReturnValue('connected')

      const { unmount } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
          autoConnect: true,
        })
      )

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalled()
      })

      // Unmount the component
      unmount()

      // Should cleanup listeners and disconnect
      expect(mockRemoveAllListeners).toHaveBeenCalled()
      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('User Case 3: Switch namespace when roomId changes', () => {
    it('should disconnect from previous room and connect to new room', async () => {
      mockConnect.mockResolvedValue(undefined)
      mockDisconnect.mockResolvedValue(undefined)
      mockGetStatus.mockReturnValue('connected')

      const { result, rerender } = renderHook(({ roomId }) => useRoomSocket({ roomId }), {
        initialProps: { roomId: mockRoomId },
      })

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledTimes(1)
      })

      // Change roomId
      const newRoomId = '123e4567-e89b-12d3-a456-426614174000'
      rerender({ roomId: newRoomId })

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledTimes(2)
      })

      // Should connect to new room
      expect(mockConnect).toHaveBeenLastCalledWith({
        url: 'http://localhost:3000',
        roomId: newRoomId,
        role: 'organizer',
      })
    })
  })

  describe('User Case 4: Auto-reconnect on network loss', () => {
    it('should handle reconnection and restore role from cookie', async () => {
      mockConnect.mockResolvedValue(undefined)
      let statusValue = 'connected'
      mockGetStatus.mockImplementation(() => statusValue)

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      })

      // Simulate network loss
      statusValue = 'reconnecting'

      await act(async () => {
        // Wait for status update
        await new Promise(resolve => setTimeout(resolve, 1100))
      })

      expect(result.current.status).toBe('reconnecting')

      // Simulate reconnection
      statusValue = 'connected'

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100))
      })

      expect(result.current.status).toBe('connected')
      expect(MockedRoleDetectionService.getCurrentRole).toHaveBeenCalled()
    })
  })

  describe('User Case 5: Handle tab backgrounding', () => {
    it('should reconnect after tab returns from background', async () => {
      mockConnect.mockResolvedValue(undefined)
      mockGetStatus.mockReturnValue('connected')

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      })

      // Simulate reconnection after tab returns
      await act(async () => {
        await result.current.reconnect()
      })

      expect(mockDisconnect).toHaveBeenCalled()
      expect(mockConnect).toHaveBeenCalledTimes(2)
    })
  })

  describe('User Case 6: Emits during reconnect', () => {
    it('should handle emits gracefully when not connected', async () => {
      mockIsConnected.mockReturnValue(false)
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
          autoConnect: false,
        })
      )

      // Try to emit while disconnected
      act(() => {
        result.current.emit.roomStateUpdate({
          participants: [],
          wheelState: { isSpinning: false },
          timerState: { isActive: false, currentTime: 0, maxTime: 600 },
          sessionActive: true,
        })
      })

      expect(consoleSpy).toHaveBeenCalledWith('Cannot emit room state update: socket not connected')
      expect(mockEmitRoomStateUpdate).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('User Case 7: Subscribe to room state diffs', () => {
    it('should handle room state subscriptions properly', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
          autoConnect: false,
        })
      )

      const mockCallback = vi.fn()
      let unsubscribe: () => void

      act(() => {
        unsubscribe = result.current.on.roomStateUpdate(mockCallback)
      })

      // Verify subscription was set up
      expect(mockOnRoomStateUpdate).toHaveBeenCalledWith(mockCallback)

      // Should be able to unsubscribe
      act(() => {
        unsubscribe()
      })

      expect(mockOff).toHaveBeenCalledWith('room_state_update', mockCallback)
    })
  })

  describe('User Case 8: Connection errors are visible', () => {
    it('should show error when connection fails', async () => {
      const errorMessage = 'Connection failed'
      mockConnect.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('error')
        expect(result.current.error).toBe('Connection failed')
      })
    })
  })

  describe('User Case 9: Invalid roomId', () => {
    it('should show error for invalid roomId', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'invalid-room-id',
        })
      )

      // Should immediately set error status for invalid roomId
      await waitFor(() => {
        expect(result.current.status).toBe('error')
        expect(result.current.error).toBe('Invalid room ID format (expected UUID)')
      })

      expect(mockConnect).not.toHaveBeenCalled()
    })

    it('should show error for empty roomId', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: '',
        })
      )

      // Should immediately set error status for empty roomId
      await waitFor(() => {
        expect(result.current.status).toBe('error')
        expect(result.current.error).toBe('Room ID is required')
      })

      expect(mockConnect).not.toHaveBeenCalled()
    })
  })

  describe('User Case 10: Multiple tabs for same user', () => {
    it('should handle multiple hook instances for same room', async () => {
      mockConnect.mockResolvedValue(undefined)
      mockGetStatus.mockReturnValue('connected')

      // Reset call count before creating instances
      mockConnect.mockClear()

      // Create two hook instances for same room
      const { result: result1 } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
          userId: 'user-1',
        })
      )

      const { result: result2 } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
          userId: 'user-2',
        })
      )

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledTimes(2)
      })

      // Both should be connected to the same room
      expect(result1.current.isConnected).toBe(true)
      expect(result2.current.isConnected).toBe(true)
    })
  })

  describe('User Case 11: Role changes via cookie', () => {
    it('should reinitialize with new role when cookie changes', async () => {
      MockedRoleDetectionService.getCurrentRole.mockReturnValue('guest')
      mockConnect.mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
        })
      )

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'guest',
          })
        )
      })

      // Change role and reconnect
      MockedRoleDetectionService.getCurrentRole.mockReturnValue('organizer')

      await act(async () => {
        await result.current.reconnect()
      })

      expect(mockConnect).toHaveBeenLastCalledWith(
        expect.objectContaining({
          role: 'organizer',
        })
      )
    })
  })

  describe('User Case 12: Limit unnecessary re-renders', () => {
    it('should not trigger unnecessary state updates', async () => {
      mockConnect.mockResolvedValue(undefined)
      mockGetStatus.mockReturnValue('connected')

      let renderCount = 0
      const { result } = renderHook(() => {
        renderCount++
        return useRoomSocket({
          roomId: mockRoomId,
        })
      })

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      })

      const initialRenderCount = renderCount

      // Emit multiple times but status shouldn't change
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100))
      })

      // Should not cause unnecessary re-renders
      expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 2) // Allow for some status updates
    })
  })

  describe('Connection methods', () => {
    it('should provide connect method', async () => {
      mockConnect.mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
          autoConnect: false,
        })
      )

      expect(result.current.status).toBe('disconnected')

      await act(async () => {
        await result.current.connect()
      })

      expect(mockConnect).toHaveBeenCalled()
    })

    it('should provide disconnect method', async () => {
      mockConnect.mockResolvedValue(undefined)
      mockDisconnect.mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
        })
      )

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalled()
      })

      await act(async () => {
        await result.current.disconnect()
      })

      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('Event handling', () => {
    it('should provide all event emission methods', () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
          autoConnect: false,
        })
      )

      expect(typeof result.current.emit.roomStateUpdate).toBe('function')
      expect(typeof result.current.emit.participantUpdate).toBe('function')
      expect(typeof result.current.emit.wheelSpin).toBe('function')
      expect(typeof result.current.emit.timerUpdate).toBe('function')
      expect(typeof result.current.emit.roomMessage).toBe('function')
    })

    it('should provide all event subscription methods', () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: mockRoomId,
          autoConnect: false,
        })
      )

      expect(typeof result.current.on.roomStateUpdate).toBe('function')
      expect(typeof result.current.on.participantUpdate).toBe('function')
      expect(typeof result.current.on.wheelSpin).toBe('function')
      expect(typeof result.current.on.timerUpdate).toBe('function')
      expect(typeof result.current.on.roomMessage).toBe('function')
      expect(typeof result.current.on.error).toBe('function')
    })
  })
})

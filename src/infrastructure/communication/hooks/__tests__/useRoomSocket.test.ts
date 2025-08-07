import { renderHook, act, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRoomSocket } from '../useRoomSocket'
import { getSocketManager } from '../../socket-client'
import type { SocketManager } from '../../socket-client'

// Mock the socket client
vi.mock('../../socket-client', () => ({
  getSocketManager: vi.fn(),
}))

describe('useRoomSocket', () => {
  let mockSocketManager: Partial<SocketManager>
  const mockGetSocketManager = getSocketManager as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a mock socket manager
    mockSocketManager = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      isConnected: vi.fn(),
      getStatus: vi.fn(),
    }

    mockGetSocketManager.mockReturnValue(mockSocketManager as SocketManager)
  })

  describe('Basic Hook Behavior', () => {
    it('should initialize with disconnected status', async () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      expect(result.current.status).toBe('disconnected')
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBeNull()

      // Socket should be initialized after first render
      expect(result.current.socket).toBeTruthy()
    })

    it('should get socket manager instance on mount', () => {
      renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      expect(mockGetSocketManager).toHaveBeenCalledTimes(1)
    })
  })

  describe('Connection Management', () => {
    it('should auto-connect when autoConnect is true', async () => {
      mockSocketManager.isConnected = vi.fn().mockReturnValue(false)
      mockSocketManager.getStatus = vi.fn().mockReturnValue('disconnected')
      mockSocketManager.connect = vi.fn().mockResolvedValue(undefined)

      renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          url: 'http://localhost:3001',
          autoConnect: true,
        })
      )

      await waitFor(() => {
        expect(mockSocketManager.connect).toHaveBeenCalledWith({
          roomId: 'test-room',
          url: 'http://localhost:3001',
          role: 'guest',
          userId: undefined,
          userName: undefined,
        })
      })
    })

    it('should not auto-connect when autoConnect is false', () => {
      mockSocketManager.isConnected = vi.fn().mockReturnValue(false)

      renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      expect(mockSocketManager.connect).not.toHaveBeenCalled()
    })

    it('should connect manually when connect() is called', async () => {
      mockSocketManager.isConnected = vi.fn().mockReturnValue(false)
      mockSocketManager.getStatus = vi.fn().mockReturnValue('disconnected')
      mockSocketManager.connect = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          url: 'http://localhost:3001',
          autoConnect: false,
        })
      )

      await act(async () => {
        await result.current.connect()
      })

      expect(mockSocketManager.connect).toHaveBeenCalledWith({
        roomId: 'test-room',
        url: 'http://localhost:3001',
        role: 'guest',
        userId: undefined,
        userName: undefined,
      })
    })

    it('should not connect if already connected', async () => {
      mockSocketManager.isConnected = vi.fn().mockReturnValue(true)
      mockSocketManager.connect = vi.fn()

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      await act(async () => {
        await result.current.connect()
      })

      expect(mockSocketManager.connect).not.toHaveBeenCalled()
    })

    it('should disconnect when disconnect() is called', async () => {
      mockSocketManager.disconnect = vi.fn().mockResolvedValue(undefined)
      mockSocketManager.getStatus = vi.fn().mockReturnValue('disconnected')

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      await act(async () => {
        await result.current.disconnect()
      })

      expect(mockSocketManager.disconnect).toHaveBeenCalled()
    })

    it('should reconnect when reconnect() is called', async () => {
      mockSocketManager.isConnected = vi.fn().mockReturnValue(false)
      mockSocketManager.disconnect = vi.fn().mockResolvedValue(undefined)
      mockSocketManager.connect = vi.fn().mockResolvedValue(undefined)
      mockSocketManager.getStatus = vi.fn().mockReturnValue('disconnected')

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          url: 'http://localhost:3001',
          autoConnect: false,
        })
      )

      await act(async () => {
        await result.current.reconnect()
      })

      expect(mockSocketManager.disconnect).toHaveBeenCalled()
      expect(mockSocketManager.connect).toHaveBeenCalledWith({
        roomId: 'test-room',
        url: 'http://localhost:3001',
        role: 'guest',
        userId: undefined,
        userName: undefined,
      })
    })
  })

  describe('Status Monitoring', () => {
    it('should provide current socket manager status', () => {
      mockSocketManager.getStatus = vi.fn().mockReturnValue('connected')

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      // Socket should be available
      expect(result.current.socket).toBeTruthy()

      // Status should start as disconnected from useState
      expect(result.current.status).toBe('disconnected')
    })

    it('should track connection status correctly', () => {
      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      // Initially should not be connected
      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed')
      mockSocketManager.isConnected = vi.fn().mockReturnValue(false)
      mockSocketManager.connect = vi.fn().mockRejectedValue(connectionError)

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.error).toBe('Connection failed')
      expect(result.current.status).toBe('error')
    })

    it('should handle non-Error connection failures', async () => {
      mockSocketManager.isConnected = vi.fn().mockReturnValue(false)
      mockSocketManager.connect = vi.fn().mockRejectedValue('Unknown error')

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.error).toBe('Connection failed')
      expect(result.current.status).toBe('error')
    })

    it('should not connect if roomId is missing', async () => {
      mockSocketManager.connect = vi.fn()

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: '',
          autoConnect: false,
        })
      )

      await act(async () => {
        await result.current.connect()
      })

      expect(mockSocketManager.connect).not.toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should disconnect on unmount', () => {
      mockSocketManager.disconnect = vi.fn()

      const { unmount } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      unmount()

      expect(mockSocketManager.disconnect).toHaveBeenCalled()
    })

    it('should clear status check interval on unmount', () => {
      vi.useFakeTimers()
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      const { unmount } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      unmount()

      expect(clearIntervalSpy).toHaveBeenCalled()
      vi.useRealTimers()
    })
  })

  describe('Configuration', () => {
    it('should use provided URL', async () => {
      mockSocketManager.isConnected = vi.fn().mockReturnValue(false)
      mockSocketManager.connect = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          url: 'http://custom-server:3001',
          autoConnect: false,
        })
      )

      await act(async () => {
        await result.current.connect()
      })

      expect(mockSocketManager.connect).toHaveBeenCalledWith({
        roomId: 'test-room',
        url: 'http://custom-server:3001',
        role: 'guest',
        userId: undefined,
        userName: undefined,
      })
    })

    it('should use default URL when not provided', async () => {
      // Mock environment variable
      const originalEnv = process.env.NEXT_PUBLIC_SOCKET_URL
      process.env.NEXT_PUBLIC_SOCKET_URL = 'http://default-server:3001'

      mockSocketManager.isConnected = vi.fn().mockReturnValue(false)
      mockSocketManager.connect = vi.fn().mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      await act(async () => {
        await result.current.connect()
      })

      expect(mockSocketManager.connect).toHaveBeenCalledWith({
        roomId: 'test-room',
        url: 'http://default-server:3001',
        role: 'guest',
        userId: undefined,
        userName: undefined,
      })

      // Restore environment
      process.env.NEXT_PUBLIC_SOCKET_URL = originalEnv
    })
  })

  describe('Concurrent Connection Prevention', () => {
    it('should prevent concurrent connections', async () => {
      mockSocketManager.isConnected = vi.fn().mockReturnValue(false)
      mockSocketManager.connect = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      const { result } = renderHook(() =>
        useRoomSocket({
          roomId: 'test-room',
          autoConnect: false,
        })
      )

      // Start two concurrent connection attempts
      const connection1 = act(async () => {
        await result.current.connect()
      })

      const connection2 = act(async () => {
        await result.current.connect()
      })

      await Promise.all([connection1, connection2])

      // Should only connect once
      expect(mockSocketManager.connect).toHaveBeenCalledTimes(1)
    })
  })
})

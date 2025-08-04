import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GET } from '../route'
import type { Server as SocketIOServer } from 'socket.io'
import type { Server as HttpServer } from 'http'

// Mock Socket.IO and socket-server utilities
vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation((server, options) => ({
    of: vi.fn().mockReturnValue({
      on: vi.fn(),
    }),
    options,
    server,
  })),
}))

vi.mock('@/lib/socket-server', () => ({
  isSocketServerInitialized: vi.fn(),
  setSocketServer: vi.fn(),
  getSocketServer: vi.fn(),
}))

vi.mock('@/lib/http-server', () => ({
  getOrCreateHttpServer: vi.fn(),
  isHttpServerInitialized: vi.fn(),
  getCurrentHttpServer: vi.fn(),
  cleanupHttpServer: vi.fn(),
  resetHttpServerInstance: vi.fn(),
}))

// Mock HTTP server creation to avoid port conflicts
vi.mock('http', () => {
  const mockCreateServer = vi.fn().mockReturnValue({
    listen: vi.fn().mockImplementation((_port, callback) => {
      // Simulate successful server start
      if (callback) callback()
    }),
  })

  return {
    createServer: mockCreateServer,
    default: { createServer: mockCreateServer },
  }
})

describe('Socket.IO API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/socket', () => {
    it('should initialize Socket.IO server successfully', async () => {
      const { isSocketServerInitialized, setSocketServer } = await import('@/lib/socket-server')
      const { getOrCreateHttpServer } = await import('@/lib/http-server')

      // Mock server not initialized
      vi.mocked(isSocketServerInitialized).mockReturnValue(false)

      // Mock HTTP server creation
      const mockHttpServer = {
        listen: vi.fn(),
        close: vi.fn(),
      } as unknown as HttpServer
      vi.mocked(getOrCreateHttpServer).mockReturnValue(mockHttpServer)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Socket.IO server initialized',
        namespacePattern: 'room:{id}',
        supportedEvents: [
          'room_state_update',
          'participant_update',
          'wheel_spin',
          'timer_update',
          'room_message',
        ],
        timestamp: expect.any(String),
      })

      expect(setSocketServer).toHaveBeenCalled()
    })

    it('should return success if Socket.IO server is already initialized', async () => {
      const { isSocketServerInitialized, setSocketServer } = await import('@/lib/socket-server')
      const { getOrCreateHttpServer } = await import('@/lib/http-server')

      // Mock server already initialized
      vi.mocked(isSocketServerInitialized).mockReturnValue(true)

      // Mock HTTP server (shouldn't be called but provide anyway)
      const mockHttpServer = {
        listen: vi.fn(),
        close: vi.fn(),
      } as unknown as HttpServer
      vi.mocked(getOrCreateHttpServer).mockReturnValue(mockHttpServer)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Socket.IO server initialized')

      // Should not try to set server again
      expect(setSocketServer).not.toHaveBeenCalled()
    })

    it('should handle Socket.IO server initialization errors', async () => {
      const { isSocketServerInitialized } = await import('@/lib/socket-server')
      const { getOrCreateHttpServer } = await import('@/lib/http-server')

      vi.mocked(isSocketServerInitialized).mockReturnValue(false)

      // Mock error in HTTP server creation
      vi.mocked(getOrCreateHttpServer).mockImplementationOnce(() => {
        throw new Error('Server initialization failed')
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        success: false,
        error: 'Failed to initialize Socket.IO server',
        message: 'Server initialization failed',
        timestamp: expect.any(String),
      })
    })

    it('should set up correct Socket.IO server configuration', async () => {
      const { isSocketServerInitialized } = await import('@/lib/socket-server')
      const { getOrCreateHttpServer } = await import('@/lib/http-server')
      const { Server } = await import('socket.io')

      vi.mocked(isSocketServerInitialized).mockReturnValue(false)

      // Mock HTTP server
      const mockHttpServer = {
        listen: vi.fn(),
        on: vi.fn(),
        close: vi.fn(),
      } as unknown as HttpServer
      vi.mocked(getOrCreateHttpServer).mockReturnValue(mockHttpServer)

      await GET()

      expect(Server).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          cors: expect.objectContaining({
            origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
            methods: ['GET', 'POST'],
            credentials: true,
          }),
          transports: ['websocket', 'polling'],
          allowEIO3: true,
        })
      )
    })

    it('should set up room namespace pattern', async () => {
      const { isSocketServerInitialized } = await import('@/lib/socket-server')
      const { getOrCreateHttpServer } = await import('@/lib/http-server')
      const { Server } = await import('socket.io')

      vi.mocked(isSocketServerInitialized).mockReturnValue(false)

      // Mock HTTP server
      const mockHttpServer = {
        listen: vi.fn(),
        on: vi.fn(),
        close: vi.fn(),
      } as unknown as HttpServer
      vi.mocked(getOrCreateHttpServer).mockReturnValue(mockHttpServer)

      const mockOf = vi.fn().mockReturnValue({ on: vi.fn() })
      const mockServer = { of: mockOf } as Partial<SocketIOServer>
      vi.mocked(Server).mockReturnValue(mockServer as SocketIOServer)

      await GET()

      // Should set up dynamic namespace for room:{id} pattern (UUID format only)
      expect(mockOf).toHaveBeenCalledWith(
        /^\/room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })

    it('should handle production CORS configuration', async () => {
      const { isSocketServerInitialized } = await import('@/lib/socket-server')
      const { getOrCreateHttpServer } = await import('@/lib/http-server')
      const { Server } = await import('socket.io')

      vi.mocked(isSocketServerInitialized).mockReturnValue(false)

      // Mock HTTP server
      const mockHttpServer = {
        listen: vi.fn(),
        on: vi.fn(),
        close: vi.fn(),
      } as unknown as HttpServer
      vi.mocked(getOrCreateHttpServer).mockReturnValue(mockHttpServer)

      // Mock production environment
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.com')

      try {
        await GET()

        expect(Server).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            cors: expect.objectContaining({
              origin: ['https://example.com'],
            }),
          })
        )
      } finally {
        vi.unstubAllEnvs()
      }
    })
  })
})

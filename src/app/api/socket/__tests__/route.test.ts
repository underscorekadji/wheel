import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GET } from '../route'

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

// Mock HTTP server creation to avoid port conflicts
vi.mock('http', () => ({
  createServer: vi.fn().mockReturnValue({
    listen: vi.fn().mockImplementation((port, callback) => {
      // Simulate successful server start
      if (callback) callback()
    }),
  }),
}))

describe('Socket.IO API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset global state
    delete (global as any).__socketHttpServer
  })

  afterEach(() => {
    vi.clearAllMocks()
    // Clean up global state
    delete (global as any).__socketHttpServer
  })

  describe('GET /api/socket', () => {
    it('should initialize Socket.IO server successfully', async () => {
      const { isSocketServerInitialized, setSocketServer } = await import('@/lib/socket-server')

      // Mock server not initialized
      vi.mocked(isSocketServerInitialized).mockReturnValue(false)

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

      // Mock server already initialized
      vi.mocked(isSocketServerInitialized).mockReturnValue(true)

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

      // Mock server not initialized
      vi.mocked(isSocketServerInitialized).mockReturnValue(false)

      // Mock error in server creation by making createServer throw
      const { createServer } = await import('http')
      vi.mocked(createServer).mockImplementation(() => {
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
      const { Server } = await import('socket.io')

      vi.mocked(isSocketServerInitialized).mockReturnValue(false)

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
      const { Server } = await import('socket.io')

      vi.mocked(isSocketServerInitialized).mockReturnValue(false)

      const mockOf = vi.fn().mockReturnValue({ on: vi.fn() })
      const mockServer = { of: mockOf }
      vi.mocked(Server).mockReturnValue(mockServer as any)

      await GET()

      // Should set up dynamic namespace for room:{id} pattern
      expect(mockOf).toHaveBeenCalledWith(/^\/room:[\w-]+$/)
    })

    it('should handle production CORS configuration', async () => {
      const { isSocketServerInitialized } = await import('@/lib/socket-server')
      const { Server } = await import('socket.io')

      vi.mocked(isSocketServerInitialized).mockReturnValue(false)

      // Mock production environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'

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
        process.env.NODE_ENV = originalEnv
        delete process.env.NEXT_PUBLIC_APP_URL
      }
    })
  })
})

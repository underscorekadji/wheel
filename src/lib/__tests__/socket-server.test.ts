import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// We need to import the functions directly to test them
let getSocketServer: () => any
let setSocketServer: (server: any) => void
let isSocketServerInitialized: () => boolean

// Mock Socket.IO Server
const mockSocketServer = {
  emit: vi.fn(),
  to: vi.fn().mockReturnThis(),
  of: vi.fn(),
  close: vi.fn(),
}

describe('Socket Server Utilities', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Clear module cache and re-import to get fresh module state
    vi.resetModules()

    // Import the fresh module
    const socketModule = await import('../socket-server')
    getSocketServer = socketModule.getSocketServer
    setSocketServer = socketModule.setSocketServer
    isSocketServerInitialized = socketModule.isSocketServerInitialized
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Socket Server State Management', () => {
    it('should return undefined when server is not initialized', () => {
      const server = getSocketServer()
      expect(server).toBeUndefined()
    })

    it('should return false when server is not initialized', () => {
      const initialized = isSocketServerInitialized()
      expect(initialized).toBe(false)
    })

    it('should set and get socket server instance', () => {
      setSocketServer(mockSocketServer)

      const server = getSocketServer()
      expect(server).toBe(mockSocketServer)
    })

    it('should return true when server is initialized', () => {
      setSocketServer(mockSocketServer)

      const initialized = isSocketServerInitialized()
      expect(initialized).toBe(true)
    })

    it('should allow updating socket server instance', () => {
      const firstServer = mockSocketServer
      const secondServer = {
        emit: vi.fn(),
        to: vi.fn().mockReturnThis(),
        of: vi.fn(),
        close: vi.fn(),
      }

      // Set first server
      setSocketServer(firstServer)
      expect(getSocketServer()).toBe(firstServer)

      // Update to second server
      setSocketServer(secondServer)
      expect(getSocketServer()).toBe(secondServer)
      expect(getSocketServer()).not.toBe(firstServer)
    })

    it('should maintain singleton behavior within same import', () => {
      // Set server in current context
      setSocketServer(mockSocketServer)

      expect(getSocketServer()).toBe(mockSocketServer)
      expect(isSocketServerInitialized()).toBe(true)
    })
  })

  describe('Type Safety', () => {
    it('should accept valid SocketIOServer instance', () => {
      expect(() => setSocketServer(mockSocketServer)).not.toThrow()
    })

    it('should return correct type for getSocketServer', () => {
      setSocketServer(mockSocketServer)
      const server = getSocketServer()

      // TypeScript compile-time check - if this compiles, types are correct
      expect(typeof server?.emit).toBe('function')
      expect(typeof server?.to).toBe('function')
      expect(typeof server?.of).toBe('function')
    })

    it('should return boolean for isSocketServerInitialized', () => {
      const result = isSocketServerInitialized()
      expect(typeof result).toBe('boolean')

      setSocketServer(mockSocketServer)
      const resultAfterSet = isSocketServerInitialized()
      expect(typeof resultAfterSet).toBe('boolean')
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple calls to isSocketServerInitialized', () => {
      // Before initialization
      expect(isSocketServerInitialized()).toBe(false)
      expect(isSocketServerInitialized()).toBe(false)

      // After initialization
      setSocketServer(mockSocketServer)
      expect(isSocketServerInitialized()).toBe(true)
      expect(isSocketServerInitialized()).toBe(true)
    })

    it('should handle multiple calls to getSocketServer', () => {
      // Before initialization
      expect(getSocketServer()).toBeUndefined()
      expect(getSocketServer()).toBeUndefined()

      // After initialization
      setSocketServer(mockSocketServer)
      const server1 = getSocketServer()
      const server2 = getSocketServer()
      expect(server1).toBe(mockSocketServer)
      expect(server2).toBe(mockSocketServer)
      expect(server1).toBe(server2)
    })

    it('should handle null server (edge case)', () => {
      // This shouldn't happen in normal usage, but testing defensive programming
      setSocketServer(null as any)
      expect(getSocketServer()).toBe(null)
      expect(isSocketServerInitialized()).toBe(true) // null is still "set"
    })
  })
})

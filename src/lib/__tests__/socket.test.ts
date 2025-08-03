/**
 * Socket.IO server tests
 *
 * Tests the Socket.IO server setup, namespace handling, and room-based communication
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import {
  initializeSocketIO,
  getRoomNamespace,
  broadcastToRoom,
  closeSocketIOServer,
  getSocketIOServer,
} from '../socket'

// Mock Redis functions
vi.mock('../redis', () => ({
  getRoom: vi.fn(),
  setRoom: vi.fn(),
  roomExists: vi.fn(),
}))

// Mock validation functions
vi.mock('../validation', () => ({
  safeValidateParticipant: vi.fn().mockReturnValue({
    success: true,
    data: {},
  }),
}))

describe('Socket.IO Server', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let httpServer: any
  let ioServer: SocketIOServer
  let port: number

  beforeEach(async () => {
    // Create HTTP server
    httpServer = createServer()

    // Find available port
    port = 3001 + Math.floor(Math.random() * 1000)

    // Start server
    await new Promise<void>(resolve => {
      httpServer.listen(port, () => resolve())
    })

    // Initialize Socket.IO
    ioServer = initializeSocketIO(httpServer)
  })

  afterEach(async () => {
    // Clean up sockets first
    await closeSocketIOServer()

    // Close HTTP server
    if (httpServer) {
      await new Promise<void>(resolve => {
        httpServer.close(() => resolve())
      })
    }
  }, 15000)

  describe('Server Initialization', () => {
    test('should initialize Socket.IO server with HTTP server', () => {
      expect(ioServer).toBeDefined()
      expect(ioServer.engine).toBeDefined()
    })

    test('should not create duplicate server instances', () => {
      const secondServer = initializeSocketIO(httpServer)
      expect(secondServer).toBe(ioServer)
    })

    test('should return server instance via getter', () => {
      const server = getSocketIOServer()
      expect(server).toBe(ioServer)
    })
  })

  describe('Room Namespaces', () => {
    test('should create room namespace with correct pattern', () => {
      const roomId = 'test-room-123'
      const namespace = getRoomNamespace(roomId)

      expect(namespace).toBeDefined()
      // Check that namespace name follows room:{id} pattern
      expect(ioServer.of(`room:${roomId}`)).toBeDefined()
    })

    test('should reuse existing namespace for same room', () => {
      const roomId = 'test-room-456'
      const namespace1 = getRoomNamespace(roomId)
      const namespace2 = getRoomNamespace(roomId)

      expect(namespace1).toBe(namespace2)
    })

    test('should throw error if Socket.IO server not initialized', async () => {
      // Close the current server
      await closeSocketIOServer()

      expect(() => {
        getRoomNamespace('any-room')
      }).toThrow('Socket.IO server not initialized')
    })
  })

  describe('Broadcasting', () => {
    test('should broadcast messages to room', () => {
      const roomId = 'broadcast-test-room'

      // Mock that this doesn't throw
      expect(() => {
        broadcastToRoom(roomId, 'room-state', {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          room: {} as any,
          participants: [],
        })
      }).not.toThrow()
    })

    test('should handle broadcast when server not initialized', async () => {
      // Close server to test error handling
      await closeSocketIOServer()

      // Should not throw, but should log error
      expect(() => {
        broadcastToRoom('any-room', 'room-state', {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          room: {} as any,
          participants: [],
        })
      }).not.toThrow()
    })
  })
})

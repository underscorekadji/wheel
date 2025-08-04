import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'

// Mock Redis client
const mockRedisClient = {
  scan: vi.fn(),
  ttl: vi.fn(),
}

// Mock console to reduce noise
vi.spyOn(console, 'info').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'debug').mockImplementation(() => {})

// Mock room state broadcaster
vi.mock('../room-state-broadcaster', () => ({
  clearRoomStateCache: vi.fn(),
  clearRoomDebounce: vi.fn(),
}))

// Mock socket server
const mockSocketServer = {
  _nsps: new Map(),
}

vi.mock('../socket-server', () => ({
  getSocketServer: vi.fn(() => mockSocketServer),
}))

// Mock Redis
vi.mock('../redis', () => ({
  getRedisClient: vi.fn(() => Promise.resolve(mockRedisClient)),
  ROOM_KEY_PREFIX: 'room:',
}))

// Import after mocking
import {
  startRedisCleanupJob,
  stopRedisCleanupJob,
  isRedisCleanupJobRunning,
  CLEANUP_CONFIG,
} from '../redis-cleanup'
import { clearRoomStateCache, clearRoomDebounce } from '../room-state-broadcaster'

// Type the mocked functions
const mockClearRoomStateCache = vi.mocked(clearRoomStateCache)
const mockClearRoomDebounce = vi.mocked(clearRoomDebounce)

describe('Redis Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stopRedisCleanupJob() // Ensure cleanup job is stopped before each test
    mockSocketServer._nsps.clear()
  })

  afterEach(() => {
    stopRedisCleanupJob()
  })

  describe('startRedisCleanupJob', () => {
    it('should start the cleanup job', () => {
      expect(isRedisCleanupJobRunning()).toBe(false)

      startRedisCleanupJob()

      expect(isRedisCleanupJobRunning()).toBe(true)
    })

    it('should run initial cleanup immediately', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', []])

      startRedisCleanupJob()

      // Wait a bit for the async cleanup to execute
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(mockRedisClient.scan).toHaveBeenCalled()
    })

    it('should not start if already running', () => {
      startRedisCleanupJob()
      expect(isRedisCleanupJobRunning()).toBe(true)

      startRedisCleanupJob() // Try to start again

      expect(console.warn).toHaveBeenCalledWith('Redis cleanup job is already running')
    })
  })

  describe('stopRedisCleanupJob', () => {
    it('should stop the cleanup job', () => {
      startRedisCleanupJob()
      expect(isRedisCleanupJobRunning()).toBe(true)

      stopRedisCleanupJob()

      expect(isRedisCleanupJobRunning()).toBe(false)
    })

    it('should warn if already stopped', () => {
      stopRedisCleanupJob() // Stop when not running

      expect(console.warn).toHaveBeenCalledWith('Redis cleanup job is not running')
    })
  })

  describe('cleanup functionality', () => {
    it('should scan for expired keys', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', ['room:test-1', 'room:test-2']])
      mockRedisClient.ttl.mockResolvedValue(-2) // Expired

      startRedisCleanupJob()

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(mockRedisClient.scan).toHaveBeenCalledWith('0', 'MATCH', 'room:*', 'COUNT', '100')
    })

    it('should identify expired keys', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', ['room:expired-1', 'room:soon-expired-2']])
      mockRedisClient.ttl
        .mockResolvedValueOnce(-2) // expired-1: already expired
        .mockResolvedValueOnce(1800) // soon-expired-2: expires in 30 minutes (within threshold)

      startRedisCleanupJob()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(mockRedisClient.ttl).toHaveBeenCalledTimes(2)
      expect(mockClearRoomStateCache).toHaveBeenCalledWith('expired-1')
      expect(mockClearRoomStateCache).toHaveBeenCalledWith('soon-expired-2')
    })

    it('should clean up Socket.IO namespaces', async () => {
      const mockSocket = {
        disconnect: vi.fn(),
      }

      const mockNamespace = {
        fetchSockets: vi.fn().mockResolvedValue([mockSocket]),
      }

      mockSocketServer._nsps.set('/room:test-room', mockNamespace)

      mockRedisClient.scan.mockResolvedValue(['0', ['room:test-room']])
      mockRedisClient.ttl.mockResolvedValue(-2) // Expired

      startRedisCleanupJob()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true)
      expect(mockSocketServer._nsps.has('/room:test-room')).toBe(false)
    })

    it('should handle scanning errors gracefully', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', ['room:test-1']])
      mockRedisClient.ttl.mockRejectedValue(new Error('Redis connection failed'))

      startRedisCleanupJob()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(console.warn).toHaveBeenCalledWith(
        'Error checking TTL for key room:test-1:',
        expect.any(Error)
      )
    })

    it('should respect max scan count limit', async () => {
      const largeBatch = Array.from({ length: 1500 }, (_, i) => `room:test-${i}`)
      mockRedisClient.scan.mockResolvedValue(['0', largeBatch])
      mockRedisClient.ttl.mockResolvedValue(-2)

      startRedisCleanupJob()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Reached maximum scan count (1000)')
      )
    })

    it('should log when no expired rooms found', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', ['room:active-1']])
      mockRedisClient.ttl.mockResolvedValue(7200) // 2 hours remaining, not expired

      startRedisCleanupJob()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(console.info).toHaveBeenCalledWith('No expired rooms found during cleanup')
    })

    it('should handle cleanup errors gracefully', async () => {
      mockRedisClient.scan.mockRejectedValue(new Error('Redis scan failed'))

      startRedisCleanupJob()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(console.error).toHaveBeenCalledWith('Error during Redis cleanup:', expect.any(Error))
    })

    it('should clear memory caches for expired rooms', async () => {
      mockRedisClient.scan.mockResolvedValue(['0', ['room:test-room']])
      mockRedisClient.ttl.mockResolvedValue(-2) // Expired

      startRedisCleanupJob()

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(mockClearRoomStateCache).toHaveBeenCalledWith('test-room')
      expect(mockClearRoomDebounce).toHaveBeenCalledWith('test-room')
    })
  })

  describe('configuration', () => {
    it('should have correct cleanup configuration', () => {
      expect(CLEANUP_CONFIG.CLEANUP_INTERVAL_MS).toBe(2 * 60 * 60 * 1000) // 2 hours
      expect(CLEANUP_CONFIG.EXPIRY_THRESHOLD_SECONDS).toBe(60 * 60) // 1 hour
      expect(CLEANUP_CONFIG.MAX_SCAN_COUNT).toBe(1000)
      expect(CLEANUP_CONFIG.SCAN_PATTERN).toBe('room:*')
    })
  })
})

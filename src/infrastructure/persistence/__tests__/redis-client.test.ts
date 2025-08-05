import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Room } from '@/domain/compatibility-types'
import {
  setRoom,
  getRoom,
  roomExists,
  deleteRoom,
  getRoomTTL,
  getRoomKey,
  getRedisClient,
  closeRedisConnection,
} from '../redis-client'
import { configurationService } from '../../../core/services/configuration'

// Mock ioredis
vi.mock('ioredis', () => {
  const mockRedis = {
    setex: vi.fn(),
    get: vi.fn(),
    exists: vi.fn(),
    del: vi.fn(),
    ttl: vi.fn(),
    ping: vi.fn(),
    quit: vi.fn(),
    on: vi.fn(),
    status: 'ready',
  }

  return {
    default: vi.fn(() => mockRedis),
  }
})

// Sample room data for testing
const mockRoom: Room = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test Room',
  status: 'waiting',
  participants: [],
  organizerId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  lastUpdatedAt: new Date('2024-01-01T10:00:00Z'),
  expiresAt: new Date('2024-01-01T18:00:00Z'),
  currentPresenterId: null,
  wheelConfig: {
    minSpinDuration: 2000,
    maxSpinDuration: 5000,
    excludeFinished: true,
    allowRepeatSelections: false,
  },
  selectionHistory: [
    {
      id: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
      participantId: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
      participantName: 'John Doe',
      initiatedBy: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      selectedAt: new Date('2024-01-01T11:00:00Z'),
      spinDuration: 3000,
    },
  ],
}

describe('Redis Helper Functions', () => {
  let mockRedisInstance: {
    setex: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
    exists: ReturnType<typeof vi.fn>
    del: ReturnType<typeof vi.fn>
    ttl: ReturnType<typeof vi.fn>
    ping: ReturnType<typeof vi.fn>
    quit: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
    status: string
  }

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()

    // Get the mocked Redis instance
    const Redis = await import('ioredis')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRedisInstance = new (Redis.default as any)() as typeof mockRedisInstance

    // Setup default mock behaviors
    mockRedisInstance.ping.mockResolvedValue('PONG')
    mockRedisInstance.setex.mockResolvedValue('OK')
    mockRedisInstance.get.mockResolvedValue(null)
    mockRedisInstance.exists.mockResolvedValue(0)
    mockRedisInstance.del.mockResolvedValue(0)
    mockRedisInstance.ttl.mockResolvedValue(-2)
    mockRedisInstance.quit.mockResolvedValue('OK')
  })

  afterEach(async () => {
    // Clean up Redis connection after each test, but don't fail test if cleanup fails
    try {
      await closeRedisConnection()
    } catch {
      // Ignore cleanup errors for test isolation
    }
  })

  describe('Redis Configuration', () => {
    it('should have correct TTL constant for test environment', () => {
      // In test environment, TTL is 60 seconds (as configured in test.ts)
      expect(configurationService.getRedisConfig().roomTtlSeconds).toBe(60)
    })

    it('should have correct key prefix for test environment', () => {
      // In test environment, prefix is 'test:room:' (as configured in test.ts)
      expect(configurationService.getRedisConfig().keyPrefix).toBe('test:room:')
    })

    it('should generate correct room key with test prefix', () => {
      const roomId = '550e8400-e29b-41d4-a716-446655440000'
      const key = getRoomKey(roomId)
      expect(key).toBe('test:room:550e8400-e29b-41d4-a716-446655440000')
    })
  })

  describe('Redis Client Initialization', () => {
    it('should initialize Redis client successfully', async () => {
      const client = await getRedisClient()
      expect(client).toBeDefined()
      expect(mockRedisInstance.ping).toHaveBeenCalled()
    })

    it('should reuse existing Redis client', async () => {
      const client1 = await getRedisClient()
      const client2 = await getRedisClient()
      expect(client1).toBe(client2)
    })

    it('should handle Redis connection errors', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection failed'))

      await expect(getRedisClient()).rejects.toThrow(
        'Redis initialization failed: Connection failed'
      )
    })
  })

  describe('setRoom', () => {
    it('should store room data with TTL successfully', async () => {
      mockRedisInstance.setex.mockResolvedValue('OK')

      const result = await setRoom(mockRoom.id, mockRoom)

      expect(result).toBe(true)
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'test:room:550e8400-e29b-41d4-a716-446655440000',
        configurationService.getRedisConfig().roomTtlSeconds,
        JSON.stringify(mockRoom)
      )
    })

    it('should return false when Redis setex fails', async () => {
      mockRedisInstance.setex.mockResolvedValue('ERROR')

      const result = await setRoom(mockRoom.id, mockRoom)

      expect(result).toBe(false)
    })

    it('should throw error when Redis operation fails', async () => {
      mockRedisInstance.setex.mockRejectedValue(new Error('Redis error'))

      await expect(setRoom(mockRoom.id, mockRoom)).rejects.toThrow(
        'Failed to store room data: Redis error'
      )
    })
  })

  describe('getRoom', () => {
    it('should retrieve and parse room data successfully', async () => {
      const serializedRoom = JSON.stringify(mockRoom)
      mockRedisInstance.get.mockResolvedValue(serializedRoom)

      const result = await getRoom(mockRoom.id)

      expect(result).toEqual(
        expect.objectContaining({
          id: mockRoom.id,
          name: mockRoom.name,
          status: mockRoom.status,
        })
      )
      expect(mockRedisInstance.get).toHaveBeenCalledWith(
        'test:room:550e8400-e29b-41d4-a716-446655440000'
      )

      // Verify dates are properly parsed
      expect(result?.createdAt).toBeInstanceOf(Date)
      expect(result?.lastUpdatedAt).toBeInstanceOf(Date)
      expect(result?.expiresAt).toBeInstanceOf(Date)
      expect(result?.selectionHistory[0].selectedAt).toBeInstanceOf(Date)
    })

    it('should return null when room does not exist', async () => {
      mockRedisInstance.get.mockResolvedValue(null)

      const result = await getRoom('non-existent-room')

      expect(result).toBe(null)
    })

    it('should throw error when JSON parsing fails', async () => {
      mockRedisInstance.get.mockResolvedValue('invalid json')

      await expect(getRoom(mockRoom.id)).rejects.toThrow('Failed to parse room data')
    })

    it('should throw error when Redis operation fails', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis error'))

      await expect(getRoom(mockRoom.id)).rejects.toThrow(
        'Failed to retrieve room data: Redis error'
      )
    })
  })

  describe('roomExists', () => {
    it('should return true when room exists', async () => {
      mockRedisInstance.exists.mockResolvedValue(1)

      const result = await roomExists(mockRoom.id)

      expect(result).toBe(true)
      expect(mockRedisInstance.exists).toHaveBeenCalledWith(
        'test:room:550e8400-e29b-41d4-a716-446655440000'
      )
    })

    it('should return false when room does not exist', async () => {
      mockRedisInstance.exists.mockResolvedValue(0)

      const result = await roomExists('non-existent-room')

      expect(result).toBe(false)
    })

    it('should throw error when Redis operation fails', async () => {
      mockRedisInstance.exists.mockRejectedValue(new Error('Redis error'))

      await expect(roomExists(mockRoom.id)).rejects.toThrow(
        'Failed to check room existence: Redis error'
      )
    })
  })

  describe('deleteRoom', () => {
    it('should delete room successfully', async () => {
      mockRedisInstance.del.mockResolvedValue(1)

      const result = await deleteRoom(mockRoom.id)

      expect(result).toBe(true)
      expect(mockRedisInstance.del).toHaveBeenCalledWith(
        'test:room:550e8400-e29b-41d4-a716-446655440000'
      )
    })

    it('should return false when room does not exist for deletion', async () => {
      mockRedisInstance.del.mockResolvedValue(0)

      const result = await deleteRoom('non-existent-room')

      expect(result).toBe(false)
    })

    it('should throw error when Redis operation fails', async () => {
      mockRedisInstance.del.mockRejectedValue(new Error('Redis error'))

      await expect(deleteRoom(mockRoom.id)).rejects.toThrow('Failed to delete room: Redis error')
    })
  })

  describe('getRoomTTL', () => {
    it('should return TTL in seconds', async () => {
      mockRedisInstance.ttl.mockResolvedValue(3600) // 1 hour remaining

      const result = await getRoomTTL(mockRoom.id)

      expect(result).toBe(3600)
      expect(mockRedisInstance.ttl).toHaveBeenCalledWith(
        'test:room:550e8400-e29b-41d4-a716-446655440000'
      )
    })

    it('should return -1 when key exists but has no TTL', async () => {
      mockRedisInstance.ttl.mockResolvedValue(-1)

      const result = await getRoomTTL(mockRoom.id)

      expect(result).toBe(-1)
    })

    it('should return -2 when key does not exist', async () => {
      mockRedisInstance.ttl.mockResolvedValue(-2)

      const result = await getRoomTTL('non-existent-room')

      expect(result).toBe(-2)
    })

    it('should throw error when Redis operation fails', async () => {
      mockRedisInstance.ttl.mockRejectedValue(new Error('Redis error'))

      await expect(getRoomTTL(mockRoom.id)).rejects.toThrow('Failed to get room TTL: Redis error')
    })
  })

  describe('closeRedisConnection', () => {
    it('should close Redis connection successfully', async () => {
      // First get a client to ensure connection exists
      await getRedisClient()

      await closeRedisConnection()

      expect(mockRedisInstance.quit).toHaveBeenCalled()
    })

    it('should handle closing when no connection exists', async () => {
      // Should not throw error when no connection exists
      await expect(closeRedisConnection()).resolves.not.toThrow()
    })

    it('should throw error when quit fails', async () => {
      // First get a client to ensure connection exists
      await getRedisClient()

      mockRedisInstance.quit.mockRejectedValue(new Error('Quit failed'))

      await expect(closeRedisConnection()).rejects.toThrow(
        'Failed to close Redis connection: Quit failed'
      )
    })
  })
})

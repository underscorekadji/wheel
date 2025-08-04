import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import * as redisCleanupModule from '@/lib/redis-cleanup'

// Mock the redis-cleanup module
vi.mock('@/lib/redis-cleanup')

describe('Cleanup API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/cleanup', () => {
    it('should return cleanup job status when running', async () => {
      vi.mocked(redisCleanupModule.isRedisCleanupJobRunning).mockReturnValue(true)
      vi.mocked(redisCleanupModule.getCleanupConfig).mockReturnValue({
        CLEANUP_INTERVAL_MS: 7200000,
        EXPIRY_THRESHOLD_SECONDS: 3600,
        MAX_SCAN_COUNT: 1000,
        MAX_CLEANUP_TIME_MS: 30000,
        SCAN_PATTERN: 'room:*',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.status.isRunning).toBe(true)
      expect(data.status.intervalMs).toBe(7200000)
      expect(data.message).toBe('Cleanup job is running')
    })

    it('should return cleanup job status when stopped', async () => {
      vi.mocked(redisCleanupModule.isRedisCleanupJobRunning).mockReturnValue(false)
      vi.mocked(redisCleanupModule.getCleanupConfig).mockReturnValue({
        CLEANUP_INTERVAL_MS: 7200000,
        EXPIRY_THRESHOLD_SECONDS: 3600,
        MAX_SCAN_COUNT: 1000,
        MAX_CLEANUP_TIME_MS: 30000,
        SCAN_PATTERN: 'room:*',
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.status.isRunning).toBe(false)
      expect(data.message).toBe('Cleanup job is stopped')
    })

    it('should handle errors when getting status', async () => {
      vi.mocked(redisCleanupModule.isRedisCleanupJobRunning).mockImplementation(() => {
        throw new Error('Status check failed')
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to get cleanup status')
      expect(data.message).toBe('Status check failed')
    })
  })

  describe('POST /api/cleanup', () => {
    describe('trigger action', () => {
      it('should trigger manual cleanup successfully', async () => {
        const mockMetrics = {
          startTime: new Date('2023-01-01T10:00:00Z'),
          endTime: new Date('2023-01-01T10:00:05Z'),
          durationMs: 5000,
          keysScanned: 100,
          expiredKeysFound: 5,
          expiredKeysDeleted: 5,
          cacheEntriesCleared: 5,
          namespacesCleared: 3,
          errors: [],
        }

        vi.mocked(redisCleanupModule.triggerManualCleanup).mockResolvedValue(mockMetrics)

        const request = new NextRequest('http://localhost/api/cleanup', {
          method: 'POST',
          body: JSON.stringify({ action: 'trigger' }),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('trigger')
        expect(data.metrics.durationMs).toBe(5000)
        expect(data.metrics.expiredKeysDeleted).toBe(5)
        expect(data.metrics.cacheEntriesCleared).toBe(5)
        expect(data.metrics.namespacesCleared).toBe(3)
        expect(data.message).toContain('5 keys deleted')
      })

      it('should handle cleanup errors', async () => {
        vi.mocked(redisCleanupModule.triggerManualCleanup).mockRejectedValue(
          new Error('Cleanup failed')
        )

        const request = new NextRequest('http://localhost/api/cleanup', {
          method: 'POST',
          body: JSON.stringify({ action: 'trigger' }),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Cleanup operation failed')
        expect(data.message).toBe('Cleanup failed')
      })
    })

    describe('start action', () => {
      it('should start cleanup job successfully', async () => {
        vi.mocked(redisCleanupModule.startRedisCleanupJob).mockReturnValue(true)

        const request = new NextRequest('http://localhost/api/cleanup', {
          method: 'POST',
          body: JSON.stringify({ action: 'start' }),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('start')
        expect(data.result).toBe(true)
        expect(data.message).toBe('Cleanup job started')
      })

      it('should handle already running cleanup job', async () => {
        vi.mocked(redisCleanupModule.startRedisCleanupJob).mockReturnValue(false)

        const request = new NextRequest('http://localhost/api/cleanup', {
          method: 'POST',
          body: JSON.stringify({ action: 'start' }),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('start')
        expect(data.result).toBe(false)
        expect(data.message).toBe('Cleanup job was already running')
      })
    })

    describe('stop action', () => {
      it('should stop cleanup job successfully', async () => {
        vi.mocked(redisCleanupModule.stopRedisCleanupJob).mockReturnValue(true)

        const request = new NextRequest('http://localhost/api/cleanup', {
          method: 'POST',
          body: JSON.stringify({ action: 'stop' }),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('stop')
        expect(data.result).toBe(true)
        expect(data.message).toBe('Cleanup job stopped')
      })

      it('should handle non-running cleanup job', async () => {
        vi.mocked(redisCleanupModule.stopRedisCleanupJob).mockReturnValue(false)

        const request = new NextRequest('http://localhost/api/cleanup', {
          method: 'POST',
          body: JSON.stringify({ action: 'stop' }),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('stop')
        expect(data.result).toBe(false)
        expect(data.message).toBe('Cleanup job was not running')
      })
    })

    describe('invalid action', () => {
      it('should return error for unsupported action', async () => {
        const request = new NextRequest('http://localhost/api/cleanup', {
          method: 'POST',
          body: JSON.stringify({ action: 'invalid' }),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Invalid action')
        expect(data.message).toContain('Unsupported action: invalid')
      })
    })

    describe('default behavior', () => {
      it('should default to trigger action when no action specified', async () => {
        const mockMetrics = {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 1000,
          keysScanned: 0,
          expiredKeysFound: 0,
          expiredKeysDeleted: 0,
          cacheEntriesCleared: 0,
          namespacesCleared: 0,
          errors: [],
        }

        vi.mocked(redisCleanupModule.triggerManualCleanup).mockResolvedValue(mockMetrics)

        const request = new NextRequest('http://localhost/api/cleanup', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('trigger')
        expect(redisCleanupModule.triggerManualCleanup).toHaveBeenCalled()
      })

      it('should handle malformed JSON body', async () => {
        const mockMetrics = {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 1000,
          keysScanned: 0,
          expiredKeysFound: 0,
          expiredKeysDeleted: 0,
          cacheEntriesCleared: 0,
          namespacesCleared: 0,
          errors: [],
        }

        vi.mocked(redisCleanupModule.triggerManualCleanup).mockResolvedValue(mockMetrics)

        const request = new NextRequest('http://localhost/api/cleanup', {
          method: 'POST',
          body: 'invalid json',
          headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.action).toBe('trigger')
        expect(redisCleanupModule.triggerManualCleanup).toHaveBeenCalled()
      })
    })
  })
})

import { NextRequest, NextResponse } from 'next/server'
import {
  triggerManualCleanup,
  isRedisCleanupJobRunning,
  startRedisCleanupJob,
  stopRedisCleanupJob,
  getCleanupConfig,
} from '@/lib/redis-cleanup'

/**
 * GET /api/cleanup - Get cleanup job status and configuration
 *
 * Returns current status of the Redis cleanup job and configuration details.
 */
export async function GET() {
  try {
    const isRunning = isRedisCleanupJobRunning()
    const config = getCleanupConfig()

    return NextResponse.json({
      success: true,
      status: {
        isRunning,
        intervalMs: config.CLEANUP_INTERVAL_MS,
        expiryThresholdSeconds: config.EXPIRY_THRESHOLD_SECONDS,
        maxScanCount: config.MAX_SCAN_COUNT,
        maxCleanupTimeMs: config.MAX_CLEANUP_TIME_MS,
      },
      message: `Cleanup job is ${isRunning ? 'running' : 'stopped'}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error getting cleanup status:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get cleanup status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cleanup - Trigger manual cleanup or control cleanup job
 *
 * Supports different actions:
 * - { action: "trigger" } - Trigger manual cleanup
 * - { action: "start" } - Start automatic cleanup job
 * - { action: "stop" } - Stop automatic cleanup job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { action = 'trigger' } = body

    switch (action) {
      case 'trigger': {
        console.info('Manual Redis cleanup triggered via API')
        const metrics = await triggerManualCleanup()

        return NextResponse.json({
          success: true,
          action: 'trigger',
          metrics: {
            durationMs: metrics.durationMs,
            expiredKeysFound: metrics.expiredKeysFound,
            expiredKeysDeleted: metrics.expiredKeysDeleted,
            cacheEntriesCleared: metrics.cacheEntriesCleared,
            namespacesCleared: metrics.namespacesCleared,
            errorCount: metrics.errors.length,
            startTime: metrics.startTime,
            endTime: metrics.endTime,
          },
          message: `Cleanup completed: ${metrics.expiredKeysDeleted} keys deleted, ${metrics.cacheEntriesCleared} cache entries cleared`,
          timestamp: new Date().toISOString(),
        })
      }

      case 'start': {
        const started = startRedisCleanupJob()

        return NextResponse.json({
          success: true,
          action: 'start',
          result: started,
          message: started ? 'Cleanup job started' : 'Cleanup job was already running',
          timestamp: new Date().toISOString(),
        })
      }

      case 'stop': {
        const stopped = stopRedisCleanupJob()

        return NextResponse.json({
          success: true,
          action: 'stop',
          result: stopped,
          message: stopped ? 'Cleanup job stopped' : 'Cleanup job was not running',
          timestamp: new Date().toISOString(),
        })
      }

      default: {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
            message: `Unsupported action: ${action}. Supported actions: trigger, start, stop`,
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        )
      }
    }
  } catch (error) {
    console.error('Error in cleanup API:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

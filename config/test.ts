/**
 * Test Configuration
 *
 * Configuration values optimized for testing environment.
 */

import type { AppConfiguration } from '@/core/services/configuration/configuration.interface'

export const testConfig: AppConfiguration = {
  app: {
    environment: 'test',
    publicUrl: 'http://localhost:3000',
    name: 'wheel',
    version: '0.1.0',
    debug: false,
    nodeEnv: 'test',
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 1, // Faster failure for tests
    roomTtlSeconds: 60, // Short TTL for tests
    keyPrefix: 'test:room:',
  },
  socket: {
    port: 3002, // Different port to avoid conflicts
    corsOrigins: ['http://localhost:3000'],
    transports: ['polling', 'websocket'],
    path: '/socket.io/',
    corsCredentials: true,
  },
  socketClient: {
    maxReconnectAttempts: 2, // Lower for faster test failure
    reconnectDelay: 500, // Shorter delay for tests
    connectionTimeout: 5000, // Shorter timeout for tests
  },
  wheel: {
    minSpinDuration: 500, // Shorter for tests
    maxSpinDuration: 2000, // Shorter for tests
    defaultMinSpin: 800,
    defaultMaxSpin: 1200,
  },
  cache: {
    maxSize: 100, // Smaller cache for tests
    ttlMs: 60 * 1000, // 1 minute for tests
    cleanupIntervalMs: 5 * 1000, // 5 seconds for tests
    retry: {
      maxAttempts: 2,
      baseDelayMs: 50,
      maxDelayMs: 200,
    },
    debounceDelayMs: 10, // Very short for tests
    defaultPresentationDurationMs: 30 * 1000, // 30 seconds for tests
  },
  security: {
    httpsEnabled: false,
    jwtSecret: undefined,
    rateLimit: {
      windowMs: 1 * 60 * 1000, // 1 minute
      maxRequests: 100,
    },
  },
  performance: {
    maxConnections: 100, // Lower limits for tests
    maxRooms: 10,
    cleanupIntervalMs: 5 * 1000, // 5 seconds for faster test cleanup
    cleanupExpiryThresholdSeconds: 30, // 30 seconds for tests
    cleanupMaxScanCount: 100, // Smaller scan count for tests
  },
}

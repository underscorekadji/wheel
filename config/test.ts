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
  },
}

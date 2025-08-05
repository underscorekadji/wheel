/**
 * Development Configuration
 *
 * Configuration values optimized for local development environment.
 */

import type { AppConfiguration } from '@/core/services/configuration/configuration.interface'

export const developmentConfig: AppConfiguration = {
  app: {
    environment: 'development',
    publicUrl: 'http://localhost:3000',
    name: 'wheel',
    version: '0.1.0',
    debug: true,
    nodeEnv: 'development',
  },
  redis: {
    host: 'localhost',
    port: 6379,
    password: undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    roomTtlSeconds: 8 * 60 * 60, // 8 hours as per FR-2
    keyPrefix: 'room:',
  },
  socket: {
    port: 3001,
    corsOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    transports: ['polling', 'websocket'],
    path: '/socket.io/',
    corsCredentials: true,
  },
  socketClient: {
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    connectionTimeout: 10000,
  },
  wheel: {
    minSpinDuration: 1000,
    maxSpinDuration: 15000,
    defaultMinSpin: 2000,
    defaultMaxSpin: 5000,
  },
  cache: {
    maxSize: 1000,
    ttlMs: 8 * 60 * 60 * 1000, // 8 hours
    cleanupIntervalMs: 30 * 60 * 1000, // 30 minutes
    retry: {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
    },
    debounceDelayMs: 50,
    defaultPresentationDurationMs: 10 * 60 * 1000, // 10 minutes
  },
  security: {
    httpsEnabled: false,
    jwtSecret: undefined, // Not needed for MVP
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // Generous for development
    },
  },
  performance: {
    maxConnections: 3000, // As per scalability target
    maxRooms: 100, // As per scalability target
    cleanupIntervalMs: 60 * 1000, // 1 minute
    cleanupExpiryThresholdSeconds: 60 * 60, // 1 hour
    cleanupMaxScanCount: 1000, // Maximum keys to scan per cleanup cycle
  },
}

/**
 * Production Configuration
 *
 * Configuration values optimized for production environment.
 * Environment variables override these defaults.
 */

import type { AppConfiguration } from '@/core/services/configuration/configuration.interface'

export const productionConfig: AppConfiguration = {
  app: {
    environment: 'production',
    publicUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000',
    name: 'wheel',
    version: '0.1.0',
    debug: false,
    nodeEnv: 'production',
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    roomTtlSeconds: 8 * 60 * 60, // 8 hours as per FR-2
    keyPrefix: 'room:',
  },
  socket: {
    port: process.env.SOCKET_PORT ? parseInt(process.env.SOCKET_PORT, 10) : 3001,
    corsOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'],
    transports: ['polling', 'websocket'],
    path: '/socket.io/',
    corsCredentials: true,
  },
  socketClient: {
    maxReconnectAttempts: parseInt(process.env.SOCKET_MAX_RECONNECT_ATTEMPTS || '5', 10),
    reconnectDelay: parseInt(process.env.SOCKET_RECONNECT_DELAY || '1000', 10),
    connectionTimeout: parseInt(process.env.SOCKET_CONNECTION_TIMEOUT || '10000', 10),
  },
  wheel: {
    minSpinDuration: parseInt(process.env.WHEEL_MIN_SPIN_DURATION || '1000', 10),
    maxSpinDuration: parseInt(process.env.WHEEL_MAX_SPIN_DURATION || '15000', 10),
    defaultMinSpin: parseInt(process.env.WHEEL_DEFAULT_MIN_SPIN || '2000', 10),
    defaultMaxSpin: parseInt(process.env.WHEEL_DEFAULT_MAX_SPIN || '5000', 10),
  },
  cache: {
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
    ttlMs: parseInt(process.env.CACHE_TTL_MS || String(8 * 60 * 60 * 1000), 10), // 8 hours
    cleanupIntervalMs: parseInt(
      process.env.CACHE_CLEANUP_INTERVAL_MS || String(30 * 60 * 1000),
      10
    ), // 30 minutes
    retry: {
      maxAttempts: parseInt(process.env.CACHE_RETRY_MAX_ATTEMPTS || '3', 10),
      baseDelayMs: parseInt(process.env.CACHE_RETRY_BASE_DELAY_MS || '100', 10),
      maxDelayMs: parseInt(process.env.CACHE_RETRY_MAX_DELAY_MS || '1000', 10),
    },
    debounceDelayMs: parseInt(process.env.CACHE_DEBOUNCE_DELAY_MS || '50', 10),
    defaultPresentationDurationMs: parseInt(
      process.env.DEFAULT_PRESENTATION_DURATION_MS || String(10 * 60 * 1000),
      10
    ), // 10 minutes
  },
  security: {
    httpsEnabled: true,
    jwtSecret: process.env.JWT_SECRET,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // Conservative for production
    },
  },
  performance: {
    maxConnections: 3000, // As per scalability target
    maxRooms: 100, // As per scalability target
    cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
    cleanupExpiryThresholdSeconds: 60 * 60, // 1 hour
    cleanupMaxScanCount: 1000, // Maximum keys to scan per cleanup cycle
  },
}

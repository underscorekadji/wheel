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

/**
 * Configuration Service Tests
 *
 * Tests for the centralized configuration management system.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ConfigurationService } from '../configuration.service'
import type { AppConfiguration } from '../configuration.interface'

describe('Configuration Service', () => {
  let configService: ConfigurationService

  beforeEach(() => {
    // Reset singleton instance for each test
    ConfigurationService.resetInstance()
    configService = ConfigurationService.getInstance()
  })

  afterEach(() => {
    ConfigurationService.resetInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ConfigurationService.getInstance()
      const instance2 = ConfigurationService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('Configuration Loading', () => {
    it('should load configuration successfully', () => {
      const config = configService.getConfig()

      expect(config).toBeDefined()
      expect(config.app).toBeDefined()
      expect(config.redis).toBeDefined()
      expect(config.socket).toBeDefined()
      expect(config.security).toBeDefined()
      expect(config.performance).toBeDefined()
    })

    it('should return individual configuration sections', () => {
      const appConfig = configService.getAppConfig()
      const redisConfig = configService.getRedisConfig()
      const socketConfig = configService.getSocketConfig()
      const securityConfig = configService.getSecurityConfig()
      const performanceConfig = configService.getPerformanceConfig()

      expect(appConfig.environment).toMatch(/^(development|test|production)$/)
      expect(redisConfig.roomTtlSeconds).toBeGreaterThan(0)
      expect(socketConfig.port).toBeGreaterThan(0)
      expect(securityConfig.rateLimit).toBeDefined()
      expect(performanceConfig.maxConnections).toBeGreaterThan(0)
    })
  })

  describe('Configuration Validation', () => {
    it('should validate configuration successfully', () => {
      const result = configService.validateConfiguration()

      expect(result.success).toBe(true)
      expect(result.errors).toBeUndefined()
      expect(result.config).toBeDefined()
    })
  })

  describe('Environment Detection', () => {
    it('should correctly detect test environment', () => {
      expect(configService.isTest()).toBe(true)
      expect(configService.isDevelopment()).toBe(false)
      expect(configService.isProduction()).toBe(false)
    })
  })

  describe('Sensitive Value Masking', () => {
    it('should mask sensitive configuration values', () => {
      const testConfig: Partial<AppConfiguration> = {
        redis: {
          url: 'redis://secret:password@localhost:6379',
          password: 'secretpassword',
          host: 'localhost',
          port: 6379,
          roomTtlSeconds: 28800,
          keyPrefix: 'room:',
        },
        security: {
          jwtSecret: 'verysecretjwtkey',
          httpsEnabled: false,
          rateLimit: { windowMs: 900000, maxRequests: 100 },
        },
      }

      const masked = configService.maskSensitiveValues(testConfig)

      expect(masked.redis?.password).toBe('***')
      expect(masked.redis?.url).toBe('***')
      expect(masked.security?.jwtSecret).toBe('***')
      expect(masked.redis?.host).toBe('localhost') // Not sensitive
      expect(masked.redis?.port).toBe(6379) // Not sensitive
    })
  })

  describe('Configuration Schema', () => {
    it('should return configuration schema', () => {
      const schema = configService.getConfigurationSchema()

      expect(schema).toBeDefined()
      expect(schema.type).toBe('object')
      expect(schema.properties).toBeDefined()
      expect(schema.required).toContain('app')
      expect(schema.required).toContain('redis')
    })
  })

  describe('Configuration Change Listeners', () => {
    it('should allow subscribing to configuration changes', () => {
      const listener = vi.fn()
      const unsubscribe = configService.onConfigurationChange(listener)

      expect(typeof unsubscribe).toBe('function')

      // Clean up
      unsubscribe()
    })

    it('should allow unsubscribing from configuration changes', () => {
      const listener = vi.fn()
      const unsubscribe = configService.onConfigurationChange(listener)

      unsubscribe()

      // Listeners should be removed (we can't easily test the reload trigger in unit tests)
      expect(unsubscribe).not.toThrow()
    })
  })

  describe('Configuration Sections', () => {
    it('should have valid Redis configuration', () => {
      const redisConfig = configService.getRedisConfig()

      expect(redisConfig.roomTtlSeconds).toBe(60) // Test environment
      expect(redisConfig.keyPrefix).toBe('test:room:') // Test environment
      expect(redisConfig.maxRetriesPerRequest).toBe(1) // Test environment
    })

    it('should have valid Socket configuration', () => {
      const socketConfig = configService.getSocketConfig()

      expect(socketConfig.port).toBe(3002) // Test environment
      expect(socketConfig.corsOrigins).toContain('http://localhost:3000')
      expect(socketConfig.transports).toContain('websocket')
      expect(socketConfig.path).toBe('/socket.io/')
    })

    it('should have valid Performance configuration', () => {
      const performanceConfig = configService.getPerformanceConfig()

      expect(performanceConfig.maxConnections).toBe(100) // Test environment
      expect(performanceConfig.maxRooms).toBe(10) // Test environment
      expect(performanceConfig.cleanupIntervalMs).toBe(5000) // Test environment
    })
  })
})

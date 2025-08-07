/**
 * Configuration Testing Utilities Tests
 *
 * Tests for the configuration testing utilities to ensure they work correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  MockConfigurationService,
  mockConfiguration,
  mockProductionConfiguration,
  setupConfigurationTest,
  cleanupConfigurationTest,
  configValidationHelpers,
  configFixtures,
  invalidConfiguration,
} from '../testing'

describe('Configuration Testing Utilities', () => {
  describe('MockConfigurationService', () => {
    let mockService: MockConfigurationService

    beforeEach(() => {
      mockService = new MockConfigurationService()
    })

    it('should return mock configuration', () => {
      const config = mockService.getConfig()
      expect(config).toEqual(mockConfiguration)
    })

    it('should return individual configuration sections', () => {
      const appConfig = mockService.getAppConfig()
      const redisConfig = mockService.getRedisConfig()

      expect(appConfig.environment).toBe('test')
      expect(redisConfig.keyPrefix).toBe('test:room:')
    })

    it('should handle environment detection', () => {
      expect(mockService.isTest()).toBe(true)
      expect(mockService.isDevelopment()).toBe(false)
      expect(mockService.isProduction()).toBe(false)

      const prodService = new MockConfigurationService(mockProductionConfiguration)
      expect(prodService.isProduction()).toBe(true)
      expect(prodService.isDevelopment()).toBe(false)
      expect(prodService.isTest()).toBe(false)
    })

    it('should support configuration change listeners', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let changeEvent: any = null
      const unsubscribe = mockService.onConfigurationChange(event => {
        changeEvent = event
      })

      mockService.triggerConfigChange('app', ['debug'])

      expect(changeEvent).toBeDefined()
      expect(changeEvent.section).toBe('app')
      expect(changeEvent.changedKeys).toContain('debug')

      unsubscribe()
    })

    it('should mask sensitive values', () => {
      const config = {
        redis: { password: 'secret', url: 'redis://user:pass@host:6379' },
        security: { jwtSecret: 'jwt-secret' },
        app: { name: 'test' },
      }

      const masked = mockService.maskSensitiveValues(config)

      expect(masked.redis.password).toBe('***')
      expect(masked.redis.url).toBe('***')
      expect(masked.security.jwtSecret).toBe('***')
      expect(masked.app.name).toBe('test') // Not sensitive
    })
  })

  describe('Configuration Test Setup', () => {
    afterEach(() => {
      cleanupConfigurationTest()
    })

    it('should setup and cleanup configuration test', () => {
      const mockService = setupConfigurationTest()

      expect(mockService).toBeInstanceOf(MockConfigurationService)
      expect(mockService.getConfig()).toEqual(mockConfiguration)

      cleanupConfigurationTest()
    })

    it('should setup with custom configuration', () => {
      const mockService = setupConfigurationTest(mockProductionConfiguration)

      expect(mockService.getConfig()).toEqual(mockProductionConfiguration)
    })
  })

  describe('Configuration Validation Helpers', () => {
    it('should validate correct configuration', () => {
      const validConfig = configFixtures.minimal()

      expect(() => {
        configValidationHelpers.expectValidConfig(validConfig)
      }).not.toThrow()
    })

    it('should detect invalid configuration', () => {
      expect(() => {
        configValidationHelpers.expectInvalidConfig(invalidConfiguration)
      }).not.toThrow()
    })

    it('should check for specific validation errors', () => {
      expect(() => {
        configValidationHelpers.expectInvalidConfig(invalidConfiguration, [
          'app.environment: Environment must be development, test, or production',
        ])
      }).not.toThrow()
    })
  })

  describe('Configuration Fixtures', () => {
    it('should generate minimal configuration', () => {
      const config = configFixtures.minimal()

      expect(config.app.environment).toBe('test')
      expect(config.redis.host).toBe('localhost')
      expect(config.socket.port).toBe(3001)
      expect(config.security.httpsEnabled).toBe(false)
      expect(config.performance.maxConnections).toBe(10)
    })

    it('should generate complete configuration', () => {
      const config = configFixtures.complete()

      expect(config.redis.url).toBeDefined()
      expect(config.redis.password).toBeDefined()
      expect(config.security.jwtSecret).toBeDefined()
      expect(config.security.httpsEnabled).toBe(true)
    })

    it('should generate different instances', () => {
      const config1 = configFixtures.minimal()
      const config2 = configFixtures.minimal()

      expect(config1).toEqual(config2)
      expect(config1).not.toBe(config2) // Different object instances
    })
  })

  describe('Mock Configurations', () => {
    it('should have valid test configuration', () => {
      expect(mockConfiguration.app.environment).toBe('test')
      expect(mockConfiguration.redis.keyPrefix).toBe('test:room:')
      expect(mockConfiguration.socket.port).toBe(3003)
    })

    it('should have valid production configuration', () => {
      expect(mockProductionConfiguration.app.environment).toBe('production')
      expect(mockProductionConfiguration.security.httpsEnabled).toBe(true)
      expect(mockProductionConfiguration.redis.url).toContain('redis://')
    })

    it('should have invalid configuration for testing', () => {
      expect(invalidConfiguration.app.environment).toBe('invalid-env')
      expect(invalidConfiguration.redis.port).toBe(-1)
      expect(invalidConfiguration.socket.corsOrigins).toEqual([])
    })
  })
})

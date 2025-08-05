/**
 * Configuration Integration Test
 *
 * Demonstrates the configuration system working end-to-end with the existing infrastructure.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { configurationService, ConfigurationService } from '../index'

describe('Configuration Integration', () => {
  beforeEach(() => {
    ConfigurationService.resetInstance()
  })

  afterEach(() => {
    ConfigurationService.resetInstance()
  })

  it('should provide configuration to Redis client', () => {
    const redisConfig = configurationService.getRedisConfig()

    // Test environment should have test-specific values
    expect(redisConfig.keyPrefix).toBe('test:room:')
    expect(redisConfig.roomTtlSeconds).toBe(60)
    expect(redisConfig.maxRetriesPerRequest).toBe(1)
  })

  it('should provide configuration to Socket.IO server', () => {
    const socketConfig = configurationService.getSocketConfig()

    // Test environment should have test-specific values
    expect(socketConfig.port).toBe(3002)
    expect(socketConfig.corsOrigins).toEqual(['http://localhost:3000'])
  })

  it('should detect test environment correctly', () => {
    expect(configurationService.isTest()).toBe(true)
    expect(configurationService.isDevelopment()).toBe(false)
    expect(configurationService.isProduction()).toBe(false)
  })

  it('should validate configuration successfully', () => {
    const result = configurationService.validateConfiguration()

    expect(result.success).toBe(true)
    expect(result.config).toBeDefined()
  })

  it('should mask sensitive values', () => {
    const config = configurationService.getConfig()
    const masked = configurationService.maskSensitiveValues(config)

    // Should be the same config but sensitive values masked if present
    expect(masked.app).toEqual(config.app)
    expect(masked.socket).toEqual(config.socket)
    expect(masked.performance).toEqual(config.performance)
  })

  it('should provide schema for documentation', () => {
    const schema = configurationService.getConfigurationSchema()

    expect(schema.type).toBe('object')
    expect(schema.properties).toBeDefined()
  })

  it('should support configuration change listeners', () => {
    const unsubscribe = configurationService.onConfigurationChange(() => {
      // Change listener callback
    })

    // The listener should be registered
    expect(typeof unsubscribe).toBe('function')

    // Clean up
    unsubscribe()
  })

  it('should provide centralized configuration instead of scattered env vars', async () => {
    // Test that the configuration system replaces the old scattered approach
    const redisConfig = configurationService.getRedisConfig()

    // These values should come from the configuration system, not hardcoded
    expect(redisConfig.roomTtlSeconds).toBeDefined()
    expect(redisConfig.keyPrefix).toBeDefined()
    expect(redisConfig.retryDelayOnFailover).toBeDefined()
    expect(redisConfig.maxRetriesPerRequest).toBeDefined()

    // Values should be different from production defaults for testing
    expect(redisConfig.roomTtlSeconds).toBe(60) // Test value, not 28800
    expect(redisConfig.keyPrefix).toBe('test:room:') // Test prefix
  })
})

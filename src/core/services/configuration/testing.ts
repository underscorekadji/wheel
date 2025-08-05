/**
 * Configuration Testing Utilities
 *
 * Utilities for testing configuration-dependent code with mocks and fixtures.
 */

import { vi } from 'vitest'
import type { AppConfiguration } from '@/core/services/configuration/configuration.interface'
import { ConfigurationService } from '@/core/services/configuration/configuration.service'
import { validateConfiguration } from '@/core/services/configuration/configuration.schemas'
import { loadConfiguration } from '@/infrastructure/configuration/configuration-loader'

/**
 * Mock configuration for testing
 */
export const mockConfiguration: AppConfiguration = {
  app: {
    environment: 'test',
    publicUrl: 'http://localhost:3000',
    name: 'wheel-test',
    version: '0.1.0-test',
    debug: false,
    nodeEnv: 'test',
  },
  redis: {
    host: 'localhost',
    port: 6380, // Different port for tests
    password: undefined,
    retryDelayOnFailover: 50,
    maxRetriesPerRequest: 1,
    roomTtlSeconds: 30, // Short TTL for tests
    keyPrefix: 'test:room:',
  },
  socket: {
    port: 3003, // Different port for tests
    corsOrigins: ['http://localhost:3000'],
    transports: ['polling', 'websocket'],
    path: '/socket.io/',
    corsCredentials: true,
  },
  security: {
    httpsEnabled: false,
    jwtSecret: 'test-jwt-secret-key-for-testing-only',
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50,
    },
  },
  performance: {
    maxConnections: 50, // Lower for tests
    maxRooms: 5, // Lower for tests
    cleanupIntervalMs: 1000, // 1 second for faster tests
  },
}

/**
 * Production-like configuration for testing
 */
export const mockProductionConfiguration: AppConfiguration = {
  app: {
    environment: 'production',
    publicUrl: 'https://example.com',
    name: 'wheel',
    version: '1.0.0',
    debug: false,
    nodeEnv: 'production',
  },
  redis: {
    url: 'redis://production:password@redis.example.com:6379',
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    roomTtlSeconds: 8 * 60 * 60, // 8 hours
    keyPrefix: 'room:',
  },
  socket: {
    port: 3001,
    corsOrigins: ['https://example.com'],
    transports: ['polling', 'websocket'],
    path: '/socket.io/',
    corsCredentials: true,
  },
  security: {
    httpsEnabled: true,
    jwtSecret: 'super-secure-production-secret-key',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
  },
  performance: {
    maxConnections: 3000,
    maxRooms: 100,
    cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  },
}

/**
 * Development configuration for testing
 */
export const mockDevelopmentConfiguration: AppConfiguration = {
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
    roomTtlSeconds: 8 * 60 * 60, // 8 hours
    keyPrefix: 'room:',
  },
  socket: {
    port: 3001,
    corsOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    transports: ['polling', 'websocket'],
    path: '/socket.io/',
    corsCredentials: true,
  },
  security: {
    httpsEnabled: false,
    jwtSecret: undefined,
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // Generous for development
    },
  },
  performance: {
    maxConnections: 3000,
    maxRooms: 100,
    cleanupIntervalMs: 60 * 1000, // 1 minute
  },
}

/**
 * Invalid configuration for testing validation
 */
export const invalidConfiguration = {
  app: {
    environment: 'invalid-env', // Invalid environment
    publicUrl: 'not-a-url', // Invalid URL
    name: '', // Empty name
    version: 'invalid-version', // Invalid version format
    debug: 'not-boolean', // Wrong type
    nodeEnv: '',
  },
  redis: {
    port: -1, // Invalid port
    roomTtlSeconds: 0, // Invalid TTL
    keyPrefix: '', // Empty prefix
  },
  socket: {
    port: 70000, // Invalid port
    corsOrigins: [], // Empty array
    transports: [], // Empty array
    path: 'no-slash', // Invalid path
    corsCredentials: 'not-boolean', // Wrong type
  },
  security: {
    httpsEnabled: 'not-boolean', // Wrong type
    jwtSecret: 'short', // Too short
    rateLimit: {
      windowMs: 500, // Too short
      maxRequests: 0, // Invalid
    },
  },
  performance: {
    maxConnections: 0, // Invalid
    maxRooms: 0, // Invalid
    cleanupIntervalMs: 500, // Too short
  },
}

/**
 * Configuration service mock factory
 */
export class MockConfigurationService {
  private config: AppConfiguration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private changeListeners: Array<(event: any) => void> = []

  constructor(config: AppConfiguration = mockConfiguration) {
    this.config = config
  }

  getConfig(): AppConfiguration {
    return { ...this.config }
  }

  getAppConfig() {
    return { ...this.config.app }
  }

  getRedisConfig() {
    return { ...this.config.redis }
  }

  getSocketConfig() {
    return { ...this.config.socket }
  }

  getSecurityConfig() {
    return { ...this.config.security }
  }

  getPerformanceConfig() {
    return { ...this.config.performance }
  }

  validateConfiguration() {
    return { success: true, config: this.config }
  }

  async reloadConfiguration() {
    // Mock implementation - could simulate config changes
  }

  isDevelopment() {
    return this.config.app.environment === 'development'
  }

  isProduction() {
    return this.config.app.environment === 'production'
  }

  isTest() {
    return this.config.app.environment === 'test'
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConfigurationChange(listener: (event: any) => void) {
    this.changeListeners.push(listener)
    return () => {
      const index = this.changeListeners.indexOf(listener)
      if (index > -1) {
        this.changeListeners.splice(index, 1)
      }
    }
  }

  getConfigurationSchema() {
    return {
      type: 'object',
      properties: {},
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  maskSensitiveValues(config: any) {
    const masked = JSON.parse(JSON.stringify(config))
    if (masked.redis?.password) masked.redis.password = '***'
    if (masked.redis?.url) masked.redis.url = '***'
    if (masked.security?.jwtSecret) masked.security.jwtSecret = '***'
    return masked
  }

  // Test helper methods
  updateConfig(updates: Partial<AppConfiguration>) {
    this.config = { ...this.config, ...updates }
  }

  triggerConfigChange(section: string, changedKeys: string[]) {
    const event = {
      timestamp: new Date(),
      section,
      changedKeys,
      previousValues: {},
      newValues: {},
    }
    this.changeListeners.forEach(listener => listener(event))
  }
}

/**
 * Setup function for configuration tests
 */
export function setupConfigurationTest(config: AppConfiguration = mockConfiguration) {
  // Reset the singleton instance
  ConfigurationService.resetInstance()

  // Create mock service
  const mockService = new MockConfigurationService(config)

  // Mock the configuration service module
  vi.doMock('@/core/services/configuration', () => ({
    configurationService: mockService,
    ConfigurationService: {
      getInstance: () => mockService,
      resetInstance: vi.fn(),
    },
  }))

  return mockService
}

/**
 * Cleanup function for configuration tests
 */
export function cleanupConfigurationTest() {
  ConfigurationService.resetInstance()
  vi.doUnmock('@/core/services/configuration')
}

/**
 * Test environment variable setup
 */
export function setupTestEnvironmentVariables(envVars: Record<string, string>) {
  const originalEnv = { ...process.env }

  // Set test environment variables
  Object.assign(process.env, envVars)

  // Return cleanup function
  return () => {
    // Restore original environment
    process.env = originalEnv
  }
}

/**
 * Configuration validation test helpers
 */
export const configValidationHelpers = {
  /**
   * Test that a configuration section validates successfully
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectValidConfig(config: any) {
    const result = validateConfiguration(config)
    expect(result.success).toBe(true)
    expect(result.errors).toBeUndefined()
  },

  /**
   * Test that a configuration section fails validation
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectInvalidConfig(config: any, expectedErrors?: string[]) {
    const result = validateConfiguration(config)
    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()

    if (expectedErrors) {
      expectedErrors.forEach(error => {
        expect(result.errors).toContain(error)
      })
    }
  },

  /**
   * Test environment variable mapping
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectEnvironmentMapping(envKey: string, configPath: string, value: any) {
    const cleanup = setupTestEnvironmentVariables({ [envKey]: String(value) })

    try {
      // Reset configuration service to pick up new env vars
      ConfigurationService.resetInstance()

      const config = loadConfiguration()

      // Navigate to the config path
      const keys = configPath.split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = config
      for (const key of keys) {
        current = current[key]
      }

      expect(current).toBe(value)
    } finally {
      cleanup()
      ConfigurationService.resetInstance()
    }
  },
}

/**
 * Configuration fixture generators
 */
export const configFixtures = {
  /**
   * Generate minimal valid configuration
   */
  minimal: (): AppConfiguration => ({
    app: {
      environment: 'test',
      publicUrl: 'http://localhost:3000',
      name: 'test-app',
      version: '1.0.0',
      debug: false,
      nodeEnv: 'test',
    },
    redis: {
      host: 'localhost',
      port: 6379,
      roomTtlSeconds: 60,
      keyPrefix: 'test:',
    },
    socket: {
      port: 3001,
      corsOrigins: ['http://localhost:3000'],
      transports: ['websocket'],
      path: '/socket.io/',
      corsCredentials: true,
    },
    security: {
      httpsEnabled: false,
      rateLimit: {
        windowMs: 60000,
        maxRequests: 10,
      },
    },
    performance: {
      maxConnections: 10,
      maxRooms: 1,
      cleanupIntervalMs: 1000,
    },
  }),

  /**
   * Generate configuration with all optional fields
   */
  complete: (): AppConfiguration => ({
    ...configFixtures.minimal(),
    redis: {
      url: 'redis://localhost:6379',
      host: 'localhost',
      port: 6379,
      password: 'secret',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      roomTtlSeconds: 28800,
      keyPrefix: 'room:',
    },
    security: {
      httpsEnabled: true,
      jwtSecret: 'very-secret-jwt-key-for-testing-purposes',
      rateLimit: {
        windowMs: 900000,
        maxRequests: 100,
      },
    },
  }),
}

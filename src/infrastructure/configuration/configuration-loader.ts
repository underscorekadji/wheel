/**
 * Configuration Loader
 *
 * Loads configuration from files and environment variables with proper precedence.
 */

import { developmentConfig } from '../../../config/development'
import { testConfig } from '../../../config/test'
import { productionConfig } from '../../../config/production'
import { validateConfiguration } from '@/core/services/configuration/configuration.schemas'
import type { AppConfiguration } from '@/core/services/configuration/configuration.interface'

/**
 * Environment variable mapping to configuration paths
 */
interface EnvironmentVariableMapping {
  envKey: string
  configPath: string
  type: 'string' | 'number' | 'boolean' | 'array'
  required?: boolean
  sensitive?: boolean
}

/**
 * Environment variable mappings
 */
const ENV_MAPPINGS: EnvironmentVariableMapping[] = [
  // App configuration
  { envKey: 'NODE_ENV', configPath: 'app.nodeEnv', type: 'string' },
  { envKey: 'NEXT_PUBLIC_APP_URL', configPath: 'app.publicUrl', type: 'string' },
  { envKey: 'APP_DEBUG', configPath: 'app.debug', type: 'boolean' },

  // Redis configuration
  { envKey: 'REDIS_URL', configPath: 'redis.url', type: 'string', sensitive: true },
  { envKey: 'REDIS_HOST', configPath: 'redis.host', type: 'string' },
  { envKey: 'REDIS_PORT', configPath: 'redis.port', type: 'number' },
  { envKey: 'REDIS_PASSWORD', configPath: 'redis.password', type: 'string', sensitive: true },
  { envKey: 'REDIS_RETRY_DELAY', configPath: 'redis.retryDelayOnFailover', type: 'number' },
  { envKey: 'REDIS_MAX_RETRIES', configPath: 'redis.maxRetriesPerRequest', type: 'number' },
  { envKey: 'REDIS_ROOM_TTL_SECONDS', configPath: 'redis.roomTtlSeconds', type: 'number' },
  { envKey: 'REDIS_KEY_PREFIX', configPath: 'redis.keyPrefix', type: 'string' },

  // Socket configuration
  { envKey: 'SOCKET_PORT', configPath: 'socket.port', type: 'number' },
  { envKey: 'SOCKET_CORS_ORIGINS', configPath: 'socket.corsOrigins', type: 'array' },
  { envKey: 'SOCKET_PATH', configPath: 'socket.path', type: 'string' },
  { envKey: 'SOCKET_CORS_CREDENTIALS', configPath: 'socket.corsCredentials', type: 'boolean' },

  // Security configuration
  { envKey: 'HTTPS_ENABLED', configPath: 'security.httpsEnabled', type: 'boolean' },
  { envKey: 'JWT_SECRET', configPath: 'security.jwtSecret', type: 'string', sensitive: true },
  { envKey: 'RATE_LIMIT_WINDOW_MS', configPath: 'security.rateLimit.windowMs', type: 'number' },
  {
    envKey: 'RATE_LIMIT_MAX_REQUESTS',
    configPath: 'security.rateLimit.maxRequests',
    type: 'number',
  },

  // Performance configuration
  { envKey: 'MAX_CONNECTIONS', configPath: 'performance.maxConnections', type: 'number' },
  { envKey: 'MAX_ROOMS', configPath: 'performance.maxRooms', type: 'number' },
  { envKey: 'CLEANUP_INTERVAL_MS', configPath: 'performance.cleanupIntervalMs', type: 'number' },
]

/**
 * Get base configuration for the current environment
 */
function getBaseConfig(): AppConfiguration {
  const env = process.env.NODE_ENV || 'development'

  switch (env) {
    case 'test':
      return testConfig
    case 'production':
      return productionConfig
    case 'development':
    default:
      return developmentConfig
  }
}

/**
 * Parse environment variable value based on type
 */
function parseEnvValue(value: string, type: EnvironmentVariableMapping['type']): unknown {
  switch (type) {
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1'
    case 'number':
      const num = Number(value)
      if (isNaN(num)) {
        throw new Error(`Invalid number value: ${value}`)
      }
      return num
    case 'array':
      return value
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)
    case 'string':
    default:
      return value
  }
}

/**
 * Set nested property in object using dot notation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNestedProperty(obj: any, path: string, value: unknown): void {
  const keys = path.split('.')
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}

/**
 * Apply environment variables to configuration
 */
function applyEnvironmentVariables(baseConfig: AppConfiguration): AppConfiguration {
  const config = JSON.parse(JSON.stringify(baseConfig)) // Deep clone

  for (const mapping of ENV_MAPPINGS) {
    const envValue = process.env[mapping.envKey]

    if (envValue !== undefined) {
      try {
        const parsedValue = parseEnvValue(envValue, mapping.type)
        setNestedProperty(config, mapping.configPath, parsedValue)
      } catch (error) {
        throw new Error(
          `Failed to parse environment variable ${mapping.envKey}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }
  }

  return config
}

/**
 * Validate required environment variables
 */
function validateRequiredEnvironmentVariables(): void {
  const requiredMappings = ENV_MAPPINGS.filter(mapping => mapping.required)
  const missingVariables: string[] = []

  for (const mapping of requiredMappings) {
    if (!process.env[mapping.envKey]) {
      missingVariables.push(mapping.envKey)
    }
  }

  if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`)
  }
}

/**
 * Load and validate configuration
 */
export function loadConfiguration(): AppConfiguration {
  try {
    // Validate required environment variables
    validateRequiredEnvironmentVariables()

    // Get base configuration
    const baseConfig = getBaseConfig()

    // Apply environment variable overrides
    const configWithEnv = applyEnvironmentVariables(baseConfig)

    // Validate the final configuration
    const validationResult = validateConfiguration(configWithEnv)

    if (!validationResult.success) {
      const errorMessage = `Configuration validation failed:\n${validationResult.errors?.join('\n')}`
      throw new Error(errorMessage)
    }

    return validationResult.config
  } catch (error) {
    console.error('Failed to load configuration:', error)
    throw new Error(
      `Configuration loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get environment variable mappings for documentation
 */
export function getEnvironmentVariableMappings(): EnvironmentVariableMapping[] {
  return [...ENV_MAPPINGS]
}

/**
 * Get sensitive configuration keys
 */
export function getSensitiveConfigKeys(): string[] {
  return ENV_MAPPINGS.filter(mapping => mapping.sensitive).map(mapping => mapping.configPath)
}

/**
 * Check if a configuration path is sensitive
 */
export function isConfigPathSensitive(path: string): boolean {
  return getSensitiveConfigKeys().includes(path)
}

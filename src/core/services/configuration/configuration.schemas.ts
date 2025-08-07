/**
 * Configuration Validation Schemas
 *
 * Zod schemas for validating configuration structure and values with detailed error messages.
 */

import { z } from 'zod'

/**
 * Redis configuration schema
 */
export const redisConfigSchema = z
  .object({
    url: z.string().url('Redis URL must be a valid URL').optional(),
    host: z.string().min(1, 'Redis host cannot be empty').optional(),
    port: z.number().int().min(1).max(65535, 'Redis port must be between 1 and 65535').optional(),
    password: z.string().optional(),
    retryDelayOnFailover: z.number().int().min(0, 'Retry delay must be non-negative').optional(),
    maxRetriesPerRequest: z.number().int().min(0, 'Max retries must be non-negative').optional(),
    roomTtlSeconds: z.number().int().min(60, 'Room TTL must be at least 60 seconds'),
    keyPrefix: z.string().min(1, 'Key prefix cannot be empty'),
  })
  .refine(data => data.url || (data.host && data.port), {
    message: 'Either Redis URL or both host and port must be provided',
    path: ['url'],
  })

/**
 * Socket server configuration schema
 */
export const socketConfigSchema = z.object({
  port: z.number().int().min(1).max(65535, 'Socket port must be between 1 and 65535'),
  corsOrigins: z
    .array(z.string().url('CORS origin must be a valid URL'))
    .min(1, 'At least one CORS origin must be specified'),
  transports: z
    .array(z.enum(['polling', 'websocket']))
    .min(1, 'At least one transport method must be specified'),
  path: z
    .string()
    .min(1, 'Socket path cannot be empty')
    .regex(/^\//, 'Socket path must start with /'),
  corsCredentials: z.boolean(),
})

/**
 * Socket client configuration schema
 */
export const socketClientConfigSchema = z.object({
  maxReconnectAttempts: z.number().int().min(0, 'Max reconnect attempts must be non-negative'),
  reconnectDelay: z.number().int().min(100, 'Reconnect delay must be at least 100ms'),
  connectionTimeout: z.number().int().min(1000, 'Connection timeout must be at least 1000ms'),
})

/**
 * Wheel configuration schema
 */
export const wheelConfigSchema = z
  .object({
    minSpinDuration: z.number().int().min(500, 'Minimum spin duration must be at least 500ms'),
    maxSpinDuration: z.number().int().min(1000, 'Maximum spin duration must be at least 1000ms'),
    defaultMinSpin: z.number().int().min(500, 'Default minimum spin must be at least 500ms'),
    defaultMaxSpin: z.number().int().min(1000, 'Default maximum spin must be at least 1000ms'),
  })
  .refine(data => data.minSpinDuration <= data.maxSpinDuration, {
    message: 'Minimum spin duration must be less than or equal to maximum spin duration',
    path: ['minSpinDuration'],
  })
  .refine(data => data.defaultMinSpin <= data.defaultMaxSpin, {
    message: 'Default minimum spin must be less than or equal to default maximum spin',
    path: ['defaultMinSpin'],
  })
  .refine(
    data =>
      data.defaultMinSpin >= data.minSpinDuration && data.defaultMaxSpin <= data.maxSpinDuration,
    {
      message: 'Default spin durations must be within the allowed min/max range',
      path: ['defaultMinSpin'],
    }
  )

/**
 * Cache configuration schema
 */
export const cacheConfigSchema = z.object({
  maxSize: z.number().int().min(1, 'Cache max size must be at least 1'),
  ttlMs: z.number().int().min(1000, 'Cache TTL must be at least 1000ms'),
  cleanupIntervalMs: z.number().int().min(1000, 'Cache cleanup interval must be at least 1000ms'),
  retry: z
    .object({
      maxAttempts: z.number().int().min(1, 'Max retry attempts must be at least 1'),
      baseDelayMs: z.number().int().min(10, 'Base retry delay must be at least 10ms'),
      maxDelayMs: z.number().int().min(100, 'Max retry delay must be at least 100ms'),
    })
    .refine(data => data.baseDelayMs <= data.maxDelayMs, {
      message: 'Base delay must be less than or equal to max delay',
      path: ['baseDelayMs'],
    }),
  debounceDelayMs: z.number().int().min(1, 'Debounce delay must be at least 1ms'),
  defaultPresentationDurationMs: z
    .number()
    .int()
    .min(1000, 'Default presentation duration must be at least 1000ms'),
})

/**
 * Application configuration schema
 */
export const appConfigSchema = z.object({
  environment: z.enum(['development', 'test', 'production'], {
    message: 'Environment must be development, test, or production',
  }),
  publicUrl: z.string().url('Public URL must be a valid URL'),
  name: z.string().min(1, 'Application name cannot be empty'),
  version: z
    .string()
    .min(1, 'Application version cannot be empty')
    .regex(/^\d+\.\d+\.\d+/, 'Version must follow semantic versioning (e.g., 1.0.0)'),
  debug: z.boolean(),
  nodeEnv: z.string().min(1, 'Node environment cannot be empty'),
})

/**
 * Security configuration schema
 */
export const securityConfigSchema = z.object({
  httpsEnabled: z.boolean(),
  jwtSecret: z.string().min(32, 'JWT secret must be at least 32 characters').optional(),
  rateLimit: z.object({
    windowMs: z.number().int().min(1000, 'Rate limit window must be at least 1000ms'),
    maxRequests: z.number().int().min(1, 'Max requests must be at least 1'),
  }),
})

/**
 * Performance configuration schema
 */
export const performanceConfigSchema = z.object({
  maxConnections: z.number().int().min(1, 'Max connections must be at least 1'),
  maxRooms: z.number().int().min(1, 'Max rooms must be at least 1'),
  cleanupIntervalMs: z.number().int().min(1000, 'Cleanup interval must be at least 1000ms'),
  cleanupExpiryThresholdSeconds: z
    .number()
    .int()
    .min(10, 'Cleanup expiry threshold must be at least 10 seconds'),
  cleanupMaxScanCount: z.number().int().min(100, 'Cleanup max scan count must be at least 100'),
})

/**
 * Complete application configuration schema
 */
export const appConfigurationSchema = z.object({
  app: appConfigSchema,
  redis: redisConfigSchema,
  socket: socketConfigSchema,
  socketClient: socketClientConfigSchema,
  wheel: wheelConfigSchema,
  cache: cacheConfigSchema,
  security: securityConfigSchema,
  performance: performanceConfigSchema,
})

/**
 * Configuration change event schema
 */
export const configurationChangeEventSchema = z.object({
  timestamp: z.date(),
  section: z.enum([
    'app',
    'redis',
    'socket',
    'socketClient',
    'wheel',
    'cache',
    'security',
    'performance',
  ]),
  changedKeys: z.array(z.string()),
  previousValues: z.record(z.string(), z.unknown()),
  newValues: z.record(z.string(), z.unknown()),
})

/**
 * Validate configuration with detailed error reporting
 */
export function validateConfiguration(config: unknown) {
  try {
    const result = appConfigurationSchema.safeParse(config)

    if (result.success) {
      return {
        success: true as const,
        config: result.data,
        errors: undefined,
      }
    } else {
      const errors = result.error.issues.map(issue => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
        return `${path}: ${issue.message}`
      })

      return {
        success: false as const,
        config: undefined,
        errors,
      }
    }
  } catch (error) {
    return {
      success: false as const,
      config: undefined,
      errors: [
        `Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
    }
  }
}

/**
 * Validate a specific configuration section
 */
export function validateConfigurationSection<T>(
  section: keyof typeof sectionSchemas,
  config: unknown
): { success: boolean; data?: T; errors?: string[] } {
  const schema = sectionSchemas[section]

  try {
    const result = schema.safeParse(config)

    if (result.success) {
      return {
        success: true,
        data: result.data as T,
        errors: undefined,
      }
    } else {
      const errors = result.error.issues.map(issue => {
        const path = issue.path.length > 0 ? issue.path.join('.') : section
        return `${path}: ${issue.message}`
      })

      return {
        success: false,
        data: undefined,
        errors,
      }
    }
  } catch (error) {
    return {
      success: false,
      data: undefined,
      errors: [
        `${section} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
    }
  }
}

/**
 * Section schemas mapping
 */
const sectionSchemas = {
  app: appConfigSchema,
  redis: redisConfigSchema,
  socket: socketConfigSchema,
  socketClient: socketClientConfigSchema,
  wheel: wheelConfigSchema,
  cache: cacheConfigSchema,
  security: securityConfigSchema,
  performance: performanceConfigSchema,
} as const

/**
 * Type exports for external use
 */
export type RedisConfigInput = z.input<typeof redisConfigSchema>
export type SocketConfigInput = z.input<typeof socketConfigSchema>
export type SocketClientConfigInput = z.input<typeof socketClientConfigSchema>
export type WheelConfigInput = z.input<typeof wheelConfigSchema>
export type CacheConfigInput = z.input<typeof cacheConfigSchema>
export type AppConfigInput = z.input<typeof appConfigSchema>
export type SecurityConfigInput = z.input<typeof securityConfigSchema>
export type PerformanceConfigInput = z.input<typeof performanceConfigSchema>
export type AppConfigurationInput = z.input<typeof appConfigurationSchema>

export type RedisConfigOutput = z.output<typeof redisConfigSchema>
export type SocketConfigOutput = z.output<typeof socketConfigSchema>
export type SocketClientConfigOutput = z.output<typeof socketClientConfigSchema>
export type WheelConfigOutput = z.output<typeof wheelConfigSchema>
export type CacheConfigOutput = z.output<typeof cacheConfigSchema>
export type AppConfigOutput = z.output<typeof appConfigSchema>
export type SecurityConfigOutput = z.output<typeof securityConfigSchema>
export type PerformanceConfigOutput = z.output<typeof performanceConfigSchema>
export type AppConfigurationOutput = z.output<typeof appConfigurationSchema>

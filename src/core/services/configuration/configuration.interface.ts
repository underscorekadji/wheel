/**
 * Configuration Service Interface
 *
 * Defines the contract for centralized configuration management with type safety,
 * validation, and environment-specific configuration loading.
 */

/**
 * Redis configuration interface
 */
export interface RedisConfig {
  url?: string
  host?: string
  port?: number
  password?: string
  retryDelayOnFailover?: number
  maxRetriesPerRequest?: number
  /** Room TTL in seconds (8 hours = 28800 seconds as per FR-2) */
  roomTtlSeconds: number
  /** Redis key prefix for room data */
  keyPrefix: string
}

/**
 * Socket.IO server configuration interface
 */
export interface SocketConfig {
  /** Port for dedicated Socket.IO HTTP server */
  port: number
  /** CORS allowed origins */
  corsOrigins: string[]
  /** Supported transport methods */
  transports: ('polling' | 'websocket')[]
  /** Socket.IO path */
  path: string
  /** Enable credentials for CORS */
  corsCredentials: boolean
}

/**
 * Socket.IO client configuration interface
 */
export interface SocketClientConfig {
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number
  /** Delay between reconnection attempts in milliseconds */
  reconnectDelay: number
  /** Socket connection timeout in milliseconds */
  connectionTimeout: number
}

/**
 * Application configuration interface
 */
export interface AppConfig {
  /** Application environment */
  environment: 'development' | 'test' | 'production'
  /** Public application URL */
  publicUrl: string
  /** Application name */
  name: string
  /** Application version */
  version: string
  /** Enable debug logging */
  debug: boolean
  /** Node.js environment */
  nodeEnv: string
}

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  /** Enable HTTPS */
  httpsEnabled: boolean
  /** JWT secret for session management (if needed) */
  jwtSecret?: string
  /** Rate limiting configuration */
  rateLimit: {
    windowMs: number
    maxRequests: number
  }
}

/**
 * Wheel configuration interface
 */
export interface WheelConfig {
  /** Minimum spin duration in milliseconds */
  minSpinDuration: number
  /** Maximum spin duration in milliseconds */
  maxSpinDuration: number
  /** Default minimum spin duration in milliseconds */
  defaultMinSpin: number
  /** Default maximum spin duration in milliseconds */
  defaultMaxSpin: number
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  /** Maximum number of cached rooms */
  maxSize: number
  /** Cache TTL in milliseconds */
  ttlMs: number
  /** Cleanup interval in milliseconds */
  cleanupIntervalMs: number
  /** Retry configuration */
  retry: {
    maxAttempts: number
    baseDelayMs: number
    maxDelayMs: number
  }
  /** Debounce delay in milliseconds */
  debounceDelayMs: number
  /** Default presentation duration in milliseconds */
  defaultPresentationDurationMs: number
}

/**
 * Performance configuration interface
 */
export interface PerformanceConfig {
  /** Target concurrent WebSocket connections */
  maxConnections: number
  /** Maximum rooms per instance */
  maxRooms: number
  /** Cleanup job interval in milliseconds */
  cleanupIntervalMs: number
  /** TTL threshold in seconds for cleanup (consider keys expiring within this time) */
  cleanupExpiryThresholdSeconds: number
  /** Maximum number of keys to scan in one cleanup cycle */
  cleanupMaxScanCount: number
}

/**
 * Complete application configuration
 */
export interface AppConfiguration {
  app: AppConfig
  redis: RedisConfig
  socket: SocketConfig
  socketClient: SocketClientConfig
  wheel: WheelConfig
  cache: CacheConfig
  security: SecurityConfig
  performance: PerformanceConfig
}

/**
 * Configuration change event
 */
export interface ConfigurationChangeEvent {
  /** Timestamp of the change */
  timestamp: Date
  /** Configuration section that changed */
  section: keyof AppConfiguration
  /** Changed keys within the section */
  changedKeys: string[]
  /** Previous values (for sensitive configs, this may be masked) */
  previousValues: Record<string, unknown>
  /** New values (for sensitive configs, this may be masked) */
  newValues: Record<string, unknown>
}

/**
 * Configuration validation result
 */
export interface ConfigurationValidationResult {
  /** Whether validation was successful */
  success: boolean
  /** Validation errors if any */
  errors?: string[]
  /** Validated configuration (only present if successful) */
  config?: AppConfiguration
}

/**
 * Configuration service interface
 */
export interface IConfigurationService {
  /**
   * Get the complete configuration
   */
  getConfig(): AppConfiguration

  /**
   * Get a specific configuration section
   */
  getAppConfig(): AppConfig
  getRedisConfig(): RedisConfig
  getSocketConfig(): SocketConfig
  getSocketClientConfig(): SocketClientConfig
  getWheelConfig(): WheelConfig
  getCacheConfig(): CacheConfig
  getSecurityConfig(): SecurityConfig
  getPerformanceConfig(): PerformanceConfig

  /**
   * Validate the current configuration
   */
  validateConfiguration(): ConfigurationValidationResult

  /**
   * Reload configuration from sources
   */
  reloadConfiguration(): Promise<void>

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean

  /**
   * Check if running in production mode
   */
  isProduction(): boolean

  /**
   * Check if running in test mode
   */
  isTest(): boolean

  /**
   * Subscribe to configuration changes
   */
  onConfigurationChange(listener: (event: ConfigurationChangeEvent) => void): () => void

  /**
   * Get configuration as a JSON schema for documentation
   */
  getConfigurationSchema(): Record<string, unknown>

  /**
   * Mask sensitive configuration values for logging
   */
  maskSensitiveValues(config: Partial<AppConfiguration>): Partial<AppConfiguration>
}

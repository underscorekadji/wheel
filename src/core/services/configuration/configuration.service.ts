/**
 * Configuration Service Implementation
 *
 * Centralized configuration management with type safety, validation, hot-reloading,
 * and change detection.
 */

import { existsSync, watchFile, unwatchFile } from 'fs'
import { join } from 'path'
import type {
  IConfigurationService,
  AppConfiguration,
  AppConfig,
  RedisConfig,
  SocketConfig,
  SecurityConfig,
  PerformanceConfig,
  ConfigurationChangeEvent,
  ConfigurationValidationResult,
} from './configuration.interface'
import {
  loadConfiguration,
  getSensitiveConfigKeys,
  isConfigPathSensitive,
} from '@/infrastructure/configuration/configuration-loader'
import { validateConfiguration } from './configuration.schemas'

/**
 * Configuration service implementation
 */
export class ConfigurationService implements IConfigurationService {
  private static instance: ConfigurationService | null = null
  private config: AppConfiguration
  private changeListeners: Array<(event: ConfigurationChangeEvent) => void> = []
  private isWatching = false

  private constructor() {
    this.config = loadConfiguration()
    this.setupHotReloading()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService()
    }
    return ConfigurationService.instance
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    if (ConfigurationService.instance) {
      ConfigurationService.instance.cleanup()
      ConfigurationService.instance = null
    }
  }

  /**
   * Get the complete configuration
   */
  getConfig(): AppConfiguration {
    return { ...this.config }
  }

  /**
   * Get application configuration
   */
  getAppConfig(): AppConfig {
    return { ...this.config.app }
  }

  /**
   * Get Redis configuration
   */
  getRedisConfig(): RedisConfig {
    return { ...this.config.redis }
  }

  /**
   * Get Socket configuration
   */
  getSocketConfig(): SocketConfig {
    return { ...this.config.socket }
  }

  /**
   * Get Security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return { ...this.config.security }
  }

  /**
   * Get Performance configuration
   */
  getPerformanceConfig(): PerformanceConfig {
    return { ...this.config.performance }
  }

  /**
   * Validate the current configuration
   */
  validateConfiguration(): ConfigurationValidationResult {
    const result = validateConfiguration(this.config)
    return {
      success: result.success,
      errors: result.errors,
      config: result.config,
    }
  }

  /**
   * Reload configuration from sources
   */
  async reloadConfiguration(): Promise<void> {
    try {
      const previousConfig = { ...this.config }
      const newConfig = loadConfiguration()

      // Detect changes
      const changes = this.detectConfigurationChanges(previousConfig, newConfig)

      // Update configuration
      this.config = newConfig

      // Notify listeners about changes
      for (const change of changes) {
        this.notifyConfigurationChange(change)
      }

      console.info('Configuration reloaded successfully')
    } catch (error) {
      console.error('Failed to reload configuration:', error)
      throw new Error(
        `Configuration reload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Check if running in development mode
   */
  isDevelopment(): boolean {
    return this.config.app.environment === 'development'
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return this.config.app.environment === 'production'
  }

  /**
   * Check if running in test mode
   */
  isTest(): boolean {
    return this.config.app.environment === 'test'
  }

  /**
   * Subscribe to configuration changes
   */
  onConfigurationChange(listener: (event: ConfigurationChangeEvent) => void): () => void {
    this.changeListeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener)
      if (index > -1) {
        this.changeListeners.splice(index, 1)
      }
    }
  }

  /**
   * Get configuration as a JSON schema for documentation
   */
  getConfigurationSchema(): Record<string, unknown> {
    // Convert Zod schema to JSON schema representation
    return {
      type: 'object',
      properties: {
        app: { type: 'object', description: 'Application configuration' },
        redis: { type: 'object', description: 'Redis configuration' },
        socket: { type: 'object', description: 'Socket.IO configuration' },
        security: { type: 'object', description: 'Security configuration' },
        performance: { type: 'object', description: 'Performance configuration' },
      },
      required: ['app', 'redis', 'socket', 'security', 'performance'],
    }
  }

  /**
   * Mask sensitive configuration values for logging
   */
  maskSensitiveValues(config: Partial<AppConfiguration>): Partial<AppConfiguration> {
    const maskedConfig = JSON.parse(JSON.stringify(config))
    const sensitiveKeys = getSensitiveConfigKeys()

    for (const keyPath of sensitiveKeys) {
      this.maskNestedValue(maskedConfig, keyPath)
    }

    return maskedConfig
  }

  /**
   * Setup hot-reloading for development
   */
  private setupHotReloading(): void {
    if (!this.isDevelopment() || this.isWatching) {
      return
    }

    try {
      // Watch .env files for changes
      const envFiles = ['.env', '.env.local', '.env.development']

      for (const envFile of envFiles) {
        const envPath = join(process.cwd(), envFile)
        if (existsSync(envPath)) {
          watchFile(envPath, { interval: 1000 }, () => {
            console.info(`Environment file ${envFile} changed, reloading configuration...`)
            this.reloadConfiguration().catch(error => {
              console.error('Failed to reload configuration after file change:', error)
            })
          })
        }
      }

      this.isWatching = true
      console.info('Configuration hot-reloading enabled for development')
    } catch (error) {
      console.warn('Failed to setup configuration hot-reloading:', error)
    }
  }

  /**
   * Detect changes between configurations
   */
  private detectConfigurationChanges(
    previous: AppConfiguration,
    current: AppConfiguration
  ): ConfigurationChangeEvent[] {
    const changes: ConfigurationChangeEvent[] = []

    // Check each section for changes
    for (const section of ['app', 'redis', 'socket', 'security', 'performance'] as const) {
      const sectionChanges = this.detectSectionChanges(section, previous[section], current[section])
      if (sectionChanges.changedKeys.length > 0) {
        changes.push(sectionChanges)
      }
    }

    return changes
  }

  /**
   * Detect changes in a specific configuration section
   */
  private detectSectionChanges(
    section: keyof AppConfiguration,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    previous: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    current: any
  ): ConfigurationChangeEvent {
    const changedKeys: string[] = []
    const previousValues: Record<string, unknown> = {}
    const newValues: Record<string, unknown> = {}

    // Compare all keys in both previous and current
    const allKeys = new Set([...Object.keys(previous || {}), ...Object.keys(current || {})])

    for (const key of allKeys) {
      const prevValue = previous?.[key]
      const currentValue = current?.[key]

      if (JSON.stringify(prevValue) !== JSON.stringify(currentValue)) {
        changedKeys.push(key)

        // Mask sensitive values
        const keyPath = `${section}.${key}`
        previousValues[key] = isConfigPathSensitive(keyPath) ? '***' : prevValue
        newValues[key] = isConfigPathSensitive(keyPath) ? '***' : currentValue
      }
    }

    return {
      timestamp: new Date(),
      section,
      changedKeys,
      previousValues,
      newValues,
    }
  }

  /**
   * Notify listeners about configuration changes
   */
  private notifyConfigurationChange(event: ConfigurationChangeEvent): void {
    console.info(
      `Configuration changed in section '${event.section}': ${event.changedKeys.join(', ')}`
    )

    for (const listener of this.changeListeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in configuration change listener:', error)
      }
    }
  }

  /**
   * Mask nested value using dot notation path
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private maskNestedValue(obj: any, path: string): void {
    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object') {
        return // Path doesn't exist
      }
      current = current[key]
    }

    const finalKey = keys[keys.length - 1]
    if (finalKey in current && current[finalKey] !== undefined) {
      current[finalKey] = '***'
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.isWatching) {
      try {
        const envFiles = ['.env', '.env.local', '.env.development']
        for (const envFile of envFiles) {
          const envPath = join(process.cwd(), envFile)
          if (existsSync(envPath)) {
            unwatchFile(envPath)
          }
        }
        this.isWatching = false
      } catch (error) {
        console.warn('Error during configuration cleanup:', error)
      }
    }

    this.changeListeners = []
  }
}

/**
 * Global configuration service instance
 */
export const configurationService = ConfigurationService.getInstance()

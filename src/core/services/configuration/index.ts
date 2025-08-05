/**
 * Configuration Service Exports
 *
 * Central exports for the configuration management system.
 */

export * from './configuration.interface'
export * from './configuration.schemas'
export { ConfigurationService, configurationService } from './configuration.service'

// Convenience exports for common use cases
export {
  loadConfiguration,
  getEnvironmentVariableMappings,
} from '@/infrastructure/configuration/configuration-loader'

// Testing utilities (only import in test files)
export * from './testing'

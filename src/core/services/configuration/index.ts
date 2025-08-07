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

// Testing utilities - DO NOT IMPORT - use direct import in test files only
// export * from './testing'

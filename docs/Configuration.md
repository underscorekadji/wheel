# Configuration Management

This document describes the centralized configuration management system for the Wheel application.

## Overview

The configuration management system provides:

- **Type-safe configuration** with Zod validation
- **Environment-specific configuration** files (development, test, production)
- **Hot-reloading** for development environments
- **Sensitive value masking** for logging and debugging
- **Configuration change detection** and notifications
- **Centralized environment variable mapping**

## Architecture

### Core Components

- **`IConfigurationService`** - Interface defining the configuration service contract
- **`ConfigurationService`** - Main implementation with singleton pattern
- **Configuration Schemas** - Zod schemas for validation
- **Configuration Loader** - Environment variable and file loading logic
- **Environment Configs** - Environment-specific configuration files

### Directory Structure

```
src/core/services/configuration/
├── configuration.interface.ts     # Type definitions and interfaces
├── configuration.schemas.ts       # Zod validation schemas
├── configuration.service.ts       # Main service implementation
└── index.ts                      # Public exports

src/infrastructure/configuration/
└── configuration-loader.ts       # Environment loading logic

config/
├── development.ts                # Development configuration
├── test.ts                      # Test configuration
└── production.ts                # Production configuration
```

## Configuration Sections

### Application Configuration (`AppConfig`)

```typescript
interface AppConfig {
  environment: 'development' | 'test' | 'production'
  publicUrl: string
  name: string
  version: string
  debug: boolean
  nodeEnv: string
}
```

### Redis Configuration (`RedisConfig`)

```typescript
interface RedisConfig {
  url?: string
  host?: string
  port?: number
  password?: string
  retryDelayOnFailover?: number
  maxRetriesPerRequest?: number
  roomTtlSeconds: number // 8 hours as per FR-2
  keyPrefix: string
}
```

### Socket.IO Configuration (`SocketConfig`)

```typescript
interface SocketConfig {
  port: number
  corsOrigins: string[]
  transports: ('polling' | 'websocket')[]
  path: string
  corsCredentials: boolean
}
```

### Security Configuration (`SecurityConfig`)

```typescript
interface SecurityConfig {
  httpsEnabled: boolean
  jwtSecret?: string
  rateLimit: {
    windowMs: number
    maxRequests: number
  }
}
```

### Performance Configuration (`PerformanceConfig`)

```typescript
interface PerformanceConfig {
  maxConnections: number // Target: 3,000 concurrent connections
  maxRooms: number // Target: 100 rooms per instance
  cleanupIntervalMs: number
}
```

## Environment Variables

The configuration system supports the following environment variables:

| Variable              | Type    | Description            | Config Path                  |
| --------------------- | ------- | ---------------------- | ---------------------------- |
| `NODE_ENV`            | string  | Node.js environment    | `app.nodeEnv`                |
| `NEXT_PUBLIC_APP_URL` | string  | Public application URL | `app.publicUrl`              |
| `APP_DEBUG`           | boolean | Enable debug logging   | `app.debug`                  |
| `REDIS_URL`           | string  | Redis connection URL   | `redis.url`                  |
| `REDIS_HOST`          | string  | Redis host             | `redis.host`                 |
| `REDIS_PORT`          | number  | Redis port             | `redis.port`                 |
| `REDIS_PASSWORD`      | string  | Redis password         | `redis.password`             |
| `SOCKET_PORT`         | number  | Socket.IO server port  | `socket.port`                |
| `HTTPS_ENABLED`       | boolean | Enable HTTPS           | `security.httpsEnabled`      |
| `JWT_SECRET`          | string  | JWT secret key         | `security.jwtSecret`         |
| `MAX_CONNECTIONS`     | number  | Maximum connections    | `performance.maxConnections` |
| `MAX_ROOMS`           | number  | Maximum rooms          | `performance.maxRooms`       |

**Note**: Environment variables marked as sensitive will be masked in logs and error messages.

## Usage

### Basic Usage

```typescript
import { configurationService } from '@/core/services/configuration'

// Get complete configuration
const config = configurationService.getConfig()

// Get specific configuration sections
const redisConfig = configurationService.getRedisConfig()
const socketConfig = configurationService.getSocketConfig()

// Environment checks
if (configurationService.isDevelopment()) {
  console.log('Running in development mode')
}
```

### Configuration Change Listeners

```typescript
import { configurationService } from '@/core/services/configuration'

// Subscribe to configuration changes
const unsubscribe = configurationService.onConfigurationChange(event => {
  console.log(`Configuration changed in ${event.section}:`, event.changedKeys)
})

// Unsubscribe when no longer needed
unsubscribe()
```

### Validation

```typescript
import { configurationService } from '@/core/services/configuration'

// Validate current configuration
const result = configurationService.validateConfiguration()

if (!result.success) {
  console.error('Configuration validation failed:', result.errors)
}
```

### Manual Reload

```typescript
import { configurationService } from '@/core/services/configuration'

// Manually reload configuration (useful for testing)
await configurationService.reloadConfiguration()
```

## Environment-Specific Configurations

### Development (`config/development.ts`)

- Debug logging enabled
- Relaxed rate limiting
- Local Redis connection
- Hot-reloading enabled
- Lower TTL for testing

### Test (`config/test.ts`)

- Debug logging disabled
- Test-specific prefixes (`test:room:`)
- Short TTLs for faster tests
- Different port to avoid conflicts
- Reduced connection limits

### Production (`config/production.ts`)

- Debug logging disabled
- Environment variable overrides
- HTTPS enabled
- Conservative rate limiting
- Production security settings

## Hot Reloading (Development Only)

In development mode, the configuration service automatically watches for changes to:

- `.env`
- `.env.local`
- `.env.development`

When changes are detected, the configuration is automatically reloaded and change listeners are notified.

## Security

### Sensitive Value Masking

The following configuration values are considered sensitive and will be masked in logs:

- `redis.url`
- `redis.password`
- `security.jwtSecret`

### Environment Variable Precedence

Configuration values are loaded in the following order (later values override earlier ones):

1. Base configuration file (development/test/production)
2. Environment variables
3. Manual overrides (via reload)

## Testing

### Testing Utilities

```typescript
import { ConfigurationService } from '@/core/services/configuration'

// Reset service for isolated tests
beforeEach(() => {
  ConfigurationService.resetInstance()
})

afterEach(() => {
  ConfigurationService.resetInstance()
})
```

### Mocking Configuration

```typescript
// Configuration service automatically uses test environment values
// when NODE_ENV=test, no additional mocking needed
const config = configurationService.getRedisConfig()
expect(config.keyPrefix).toBe('test:room:')
```

## Migration from Old System

### Before (Scattered Configuration)

```typescript
// Old approach - scattered throughout codebase
const redisHost = process.env.REDIS_HOST || 'localhost'
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10)
const roomTtl = 8 * 60 * 60 // Hardcoded
```

### After (Centralized Configuration)

```typescript
// New approach - centralized and type-safe
import { configurationService } from '@/core/services/configuration'

const redisConfig = configurationService.getRedisConfig()
// All values are validated and type-safe
```

## Error Handling

The configuration system provides detailed error messages for common issues:

- Missing required environment variables
- Invalid configuration values
- Schema validation failures
- Type conversion errors

Example error output:

```
Configuration validation failed:
- redis.port: Redis port must be between 1 and 65535
- app.publicUrl: Public URL must be a valid URL
- security.rateLimit.maxRequests: Max requests must be at least 1
```

## Performance Considerations

- Configuration is loaded once at startup and cached
- Hot reloading is only enabled in development
- Singleton pattern prevents multiple service instances
- Validation is performed once during load
- Change detection uses shallow comparison for performance

## Troubleshooting

### Configuration Not Loading

1. Check environment variable names and values
2. Verify schema validation passes
3. Check file permissions for config files
4. Review console logs for detailed error messages

### Hot Reloading Not Working

1. Ensure running in development mode
2. Check file watch permissions
3. Verify `.env` file exists and is readable
4. Check console logs for watch setup messages

### Validation Errors

1. Review the error messages for specific issues
2. Check data types match schema expectations
3. Verify required fields are provided
4. Ensure URLs are valid and properly formatted

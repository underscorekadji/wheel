import { createServer, Server as HttpServer } from 'http'
import { configurationService } from '@/core/services/configuration'

/**
 * HTTP Server singleton for Socket.IO
 *
 * This module encapsulates HTTP server management to avoid direct global variable access
 * and provides proper initialization/cleanup methods for testing and production use.
 */
class HttpServerManager {
  private static instance: HttpServerManager | null = null
  private httpServer: HttpServer | null = null
  private isListening = false

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): HttpServerManager {
    if (!HttpServerManager.instance) {
      HttpServerManager.instance = new HttpServerManager()
    }
    return HttpServerManager.instance
  }

  /**
   * Get or create HTTP server for Socket.IO
   *
   * This function implements a singleton pattern for the HTTP server to prevent
   * multiple server instances during Next.js development hot reloads.
   *
   * @returns HTTP server instance
   */
  getOrCreateHttpServer(): HttpServer {
    if (this.httpServer) {
      return this.httpServer
    }

    this.httpServer = createServer()

    // Start the server on port from configuration
    const socketConfig = configurationService.getSocketConfig()
    const socketPort = socketConfig.port

    if (!this.isListening) {
      this.httpServer.listen(socketPort, () => {
        console.info(`Socket.IO HTTP server listening on port ${socketPort}`)
        this.isListening = true
      })

      // Handle server cleanup on process termination (production only)
      const appConfig = configurationService.getAppConfig()
      if (appConfig.environment === 'production') {
        process.on('SIGTERM', () => {
          this.cleanup()
        })
      }
    }

    return this.httpServer
  }

  /**
   * Check if HTTP server exists and is listening
   */
  isServerInitialized(): boolean {
    return this.httpServer !== null && this.isListening
  }

  /**
   * Get the current HTTP server instance (without creating)
   */
  getCurrentServer(): HttpServer | null {
    return this.httpServer
  }

  /**
   * Clean up the HTTP server and reset state
   * Useful for testing and graceful shutdown
   */
  cleanup(): Promise<void> {
    return new Promise(resolve => {
      if (this.httpServer && this.isListening) {
        this.httpServer.close(() => {
          this.httpServer = null
          this.isListening = false
          resolve()
        })
      } else {
        this.httpServer = null
        this.isListening = false
        resolve()
      }
    })
  }

  /**
   * Reset the singleton instance (for testing purposes)
   */
  static resetInstance(): void {
    if (HttpServerManager.instance) {
      HttpServerManager.instance.cleanup()
      HttpServerManager.instance = null
    }
  }
}

/**
 * Get or create HTTP server instance
 */
export function getOrCreateHttpServer(): HttpServer {
  return HttpServerManager.getInstance().getOrCreateHttpServer()
}

/**
 * Check if HTTP server is initialized
 */
export function isHttpServerInitialized(): boolean {
  return HttpServerManager.getInstance().isServerInitialized()
}

/**
 * Get current HTTP server without creating new one
 */
export function getCurrentHttpServer(): HttpServer | null {
  return HttpServerManager.getInstance().getCurrentServer()
}

/**
 * Clean up HTTP server (for testing and shutdown)
 */
export function cleanupHttpServer(): Promise<void> {
  return HttpServerManager.getInstance().cleanup()
}

/**
 * Reset HTTP server singleton (for testing)
 */
export function resetHttpServerInstance(): void {
  HttpServerManager.resetInstance()
}

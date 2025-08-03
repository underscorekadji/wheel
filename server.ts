/**
 * Custom Next.js server with Socket.IO integration
 *
 * This server handles both HTTP requests (Next.js) and WebSocket connections (Socket.IO)
 * for real-time communication in the Wheel application.
 */

import { createServer } from 'http'
import next from 'next'
import { initializeSocketIO } from './src/lib/socket'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Create Next.js app
const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

/**
 * Start the custom server with Next.js and Socket.IO
 */
async function startServer() {
  try {
    console.log('Preparing Next.js application...')
    await app.prepare()

    // Create HTTP server
    const httpServer = createServer(handler)

    // Initialize Socket.IO with the HTTP server
    console.log('Initializing Socket.IO server...')
    const io = initializeSocketIO(httpServer)

    // Start the server
    httpServer.listen(port, () => {
      console.log(`🚀 Server running on http://${hostname}:${port}`)
      console.log(`📡 Socket.IO server ready for WebSocket connections`)
      console.log(`🎯 Real-time room namespaces available at /room:*`)
      console.log(`📊 Target capacity: 3,000 WebSocket connections across 100 rooms`)

      if (dev) {
        console.log(`🔧 Development mode enabled`)
      }
    })

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down gracefully...`)

      // Close Socket.IO server
      await new Promise<void>(resolve => {
        io.close(() => {
          console.log('Socket.IO server closed')
          resolve()
        })
      })

      // Close HTTP server
      await new Promise<void>(resolve => {
        httpServer.close(() => {
          console.log('HTTP server closed')
          resolve()
        })
      })

      console.log('Server shutdown complete')
      process.exit(0)
    }

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      console.error('Uncaught Exception:', error)
      gracefulShutdown('UNCAUGHT_EXCEPTION')
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason)
      gracefulShutdown('UNHANDLED_REJECTION')
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

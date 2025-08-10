import { NextResponse } from 'next/server'

/**
 * GET /api/test-socket - Test Socket.IO server status and connectivity
 * 
 * This endpoint provides information about the Socket.IO server status
 * and can be used to verify that the WebSocket connections are working.
 */
export async function GET() {
  try {
    // Check if the global Socket.IO instance is available
    const isSocketIOAvailable = typeof global.io !== 'undefined'
    
    // Get server information
    const serverInfo: {
      socketIOAvailable: boolean
      expectedSocketURL: string
      namespacePattern: string
      supportedTransports: string[]
      environment: string
      timestamp: string
      connectedClients?: number
      namespaces?: string[]
    } = {
      socketIOAvailable: isSocketIOAvailable,
      expectedSocketURL: 'ws://localhost:3000/socket.io/',
      namespacePattern: '/room:{uuid}',
      supportedTransports: ['websocket', 'polling'],
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    }

    if (isSocketIOAvailable) {
      // If Socket.IO is available, provide additional info
      const io = global.io as any
      serverInfo.connectedClients = io.engine?.clientsCount || 0
      serverInfo.namespaces = Object.keys(io._nsps || {})
    }

    return NextResponse.json({
      success: true,
      message: 'Socket.IO server status check',
      server: serverInfo,
      testInstructions: {
        clientConnection: 'Connect to ws://localhost:3000/socket.io/ from your client',
        roomNamespace: 'Connect to a room using: ws://localhost:3000/room:{uuid}',
        example: 'ws://localhost:3000/room:550e8400-e29b-41d4-a716-446655440000',
      },
    })
  } catch (error) {
    console.error('Error checking Socket.IO server status:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check Socket.IO server status',
        message: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: {
          checkServer: 'Ensure the custom server.js is running (npm run dev)',
          checkLogs: 'Look for "Socket.IO server attached" in server logs',
          checkConnection: 'Try connecting to ws://localhost:3000/socket.io/',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { setSocketServer, isSocketServerInitialized } from '@/lib/socket-server'
import type {
  RoomStateUpdateEvent,
  ParticipantUpdateEvent,
  WheelSpinEvent,
  TimerUpdateEvent,
  RoomMessageEvent,
} from '@/types/socket'

/**
 * GET /api/socket - Initialize Socket.IO server
 *
 * Sets up Socket.IO server with room-based namespaces for real-time communication.
 * Implements namespace pattern room:{id} for isolated room communications.
 *
 * Note: This endpoint handles Socket.IO server initialization. The actual WebSocket
 * connections will be handled by the Socket.IO server instance.
 *
 * @returns Response indicating Socket.IO server status
 */
export async function GET() {
  try {
    // Check if Socket.IO server is already initialized
    if (!isSocketServerInitialized()) {
      // Initialize Socket.IO server
      const server = initializeSocketServer()
      setSocketServer(server)
    }

    return NextResponse.json({
      success: true,
      message: 'Socket.IO server initialized',
      namespacePattern: 'room:{id}',
      supportedEvents: [
        'room_state_update',
        'participant_update',
        'wheel_spin',
        'timer_update',
        'room_message',
      ],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error initializing Socket.IO server:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize Socket.IO server',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * Initialize Socket.IO server with room-based namespace configuration
 *
 * This creates a Socket.IO server that handles room-based namespaces.
 * For Next.js compatibility, we use the response.socket.server approach.
 *
 * @returns Configured Socket.IO server instance
 */
function initializeSocketServer(): SocketIOServer {
  // Create Socket.IO server with simplified configuration
  const socketServer = new SocketIOServer({
    cors: {
      origin:
        process.env.NODE_ENV === 'production'
          ? [process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000']
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['polling', 'websocket'],
    path: '/socket.io/',
  })

  // Set up room-based namespace pattern: room:{id}
  setupRoomNamespaces(socketServer)

  console.info('Socket.IO server initialized successfully with room namespaces')
  return socketServer
}

/**
 * Set up room-based namespaces with connection handling
 *
 * @param io - Socket.IO server instance
 */
function setupRoomNamespaces(io: SocketIOServer) {
  // Dynamic namespace for room:{id} pattern (UUID format only)
  io.of(/^\/room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).on(
    'connection',
    socket => {
      const namespace = socket.nsp.name
      const roomId = namespace.replace('/room:', '')

      console.info(`Client connected to room: ${roomId}`)

      // Join the room automatically
      socket.join(roomId)

      // Handle room-specific events
      setupRoomEventHandlers(socket, roomId)

      // Handle disconnection
      socket.on('disconnect', reason => {
        // Notify other clients in the room about disconnection
        socket.to(roomId).emit('user_disconnected', {
          socketId: socket.id,
          roomId,
          timestamp: new Date().toISOString(),
          reason,
        })
      })

      // Handle connection errors
      socket.on('error', error => {
        console.error(`Socket error in room ${roomId} (${socket.id}):`, error)

        // Emit error to the client
        socket.emit('connection_error', {
          error: 'Socket connection error',
          roomId,
          timestamp: new Date().toISOString(),
        })
      })

      // Send welcome message to the connected client
      socket.emit('connected', {
        message: `Connected to room ${roomId}`,
        roomId,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      })

      // Notify other clients in the room about new connection
      socket.to(roomId).emit('user_connected', {
        socketId: socket.id,
        roomId,
        timestamp: new Date().toISOString(),
      })
    }
  )
}

/**
 * Set up event handlers for room-specific communication
 *
 * @param socket - Socket instance
 * @param roomId - Room identifier
 * @param namespace - Namespace string
 */
function setupRoomEventHandlers(socket: Socket, roomId: string) {
  // Handle room state updates (participants, wheel state, timer, etc.)
  socket.on('room_state_update', (data: Omit<RoomStateUpdateEvent, 'roomId' | 'timestamp'>) => {
    try {
      // Broadcast state update to all clients in the room except sender
      socket.to(roomId).emit('room_state_update', {
        ...data,
        roomId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`Error handling room state update in ${roomId}:`, error)
      socket.emit('error', {
        event: 'room_state_update',
        error: 'Failed to process room state update',
        roomId,
      })
    }
  })

  // Handle participant updates (add, remove, enable/disable)
  socket.on('participant_update', (data: Omit<ParticipantUpdateEvent, 'roomId' | 'timestamp'>) => {
    try {
      // Broadcast to all clients in the room
      socket.to(roomId).emit('participant_update', {
        ...data,
        roomId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`Error handling participant update in ${roomId}:`, error)
      socket.emit('error', {
        event: 'participant_update',
        error: 'Failed to process participant update',
        roomId,
      })
    }
  })

  // Handle wheel spin events
  socket.on('wheel_spin', (data: Omit<WheelSpinEvent, 'roomId' | 'timestamp'>) => {
    try {
      // Broadcast to all clients in the room
      socket.to(roomId).emit('wheel_spin', {
        ...data,
        roomId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`Error handling wheel spin in ${roomId}:`, error)
      socket.emit('error', {
        event: 'wheel_spin',
        error: 'Failed to process wheel spin',
        roomId,
      })
    }
  })

  // Handle timer events
  socket.on('timer_update', (data: Omit<TimerUpdateEvent, 'roomId' | 'timestamp'>) => {
    try {
      // Broadcast to all clients in the room
      socket.to(roomId).emit('timer_update', {
        ...data,
        roomId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`Error handling timer update in ${roomId}:`, error)
      socket.emit('error', {
        event: 'timer_update',
        error: 'Failed to process timer update',
        roomId,
      })
    }
  })

  // Handle chat/messaging (optional for organizer-guest communication)
  socket.on('room_message', (data: Omit<RoomMessageEvent, 'roomId' | 'timestamp'>) => {
    try {
      // Broadcast to all clients in the room
      socket.to(roomId).emit('room_message', {
        ...data,
        roomId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`Error handling room message in ${roomId}:`, error)
      socket.emit('error', {
        event: 'room_message',
        error: 'Failed to process room message',
        roomId,
      })
    }
  })

  // Handle text updates for live testing
  socket.on('text_update', (data: { text: string; senderId: string }) => {
    try {
      // Broadcast to all clients in the room except sender
      socket.to(roomId).emit('text_update', {
        ...data,
        roomId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error(`Error handling text update in ${roomId}:`, error)
      socket.emit('error', {
        event: 'text_update',
        error: 'Failed to process text update',
        roomId,
      })
    }
  })
}

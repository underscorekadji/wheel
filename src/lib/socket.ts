/**
 * Socket.IO server configuration and setup
 *
 * Implements real-time communication with room-based namespaces (room:{id})
 * for the Wheel application. Supports organizer and guest roles with
 * proper connection handling and error management.
 */

import { Server as SocketIOServer } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import type {
  SocketEvents,
  TypedSocket,
  TypedNamespace,
  SocketNamespace,
  SocketConnectionData,
  JoinRoomData,
  LeaveRoomData,
} from '@/types/socket'
import { getRoom, setRoom } from '@/lib/redis'

/**
 * Global Socket.IO server instance
 * Using singleton pattern for single server architecture
 */
let io: SocketIOServer | null = null

/**
 * Socket.IO server configuration options
 */
const SOCKET_CONFIG = {
  // Connection settings
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds

  // CORS settings for cross-origin requests
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },

  // Connection state recovery
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },

  // Transport settings for reliability
  transports: ['websocket', 'polling'] as const,

  // Upgrade settings
  upgradeTimeout: 30000, // 30 seconds

  // Maximum HTTP buffer size (for large payloads)
  maxHttpBufferSize: 1e6, // 1 MB
}

/**
 * Initialize Socket.IO server with HTTP server
 *
 * @param httpServer - HTTP server instance from Next.js
 * @returns Socket.IO server instance
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    console.log('Socket.IO server already initialized')
    return io
  }

  console.log('Initializing Socket.IO server...')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  io = new SocketIOServer(httpServer, SOCKET_CONFIG as any)

  // Global middleware for connection logging
  io.use((socket, next) => {
    const { handshake } = socket
    console.log(
      `Socket connection attempt from ${handshake.address} at ${new Date().toISOString()}`
    )
    next()
  })

  // Handle connection to main namespace (used for initial room discovery)
  io.on('connection', socket => {
    console.log(`Client connected to main namespace: ${socket.id}`)

    socket.on('disconnect', reason => {
      console.log(`Client disconnected from main namespace: ${socket.id}, reason: ${reason}`)
    })
  })

  console.log('Socket.IO server initialized successfully')
  return io
}

/**
 * Get or create namespace for a specific room
 *
 * @param roomId - Unique room identifier
 * @returns Typed namespace for the room
 */
export function getRoomNamespace(roomId: string): TypedNamespace {
  if (!io) {
    throw new Error('Socket.IO server not initialized')
  }

  const namespaceName: SocketNamespace = `room:${roomId}`
  const namespace = io.of(namespaceName)

  // Set up namespace middleware and event handlers if not already done
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!namespace.listeners('connection').length) {
    setupNamespaceHandlers(namespace, roomId)
  }

  return namespace as TypedNamespace
}

/**
 * Set up event handlers for a room namespace
 *
 * @param namespace - Socket.IO namespace instance
 * @param roomId - Room identifier
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupNamespaceHandlers(namespace: any, roomId: string): void {
  console.log(`Setting up handlers for namespace room:${roomId}`)

  // Middleware for room validation
  namespace.use(async (socket: TypedSocket, next: (err?: Error) => void) => {
    try {
      // Verify room exists in Redis
      const room = await getRoom(roomId)
      if (!room) {
        return next(new Error(`Room ${roomId} not found or expired`))
      }

      console.log(`Socket ${socket.id} validated for room ${roomId}`)
      next()
    } catch (error) {
      console.error(`Room validation failed for ${roomId}:`, error)
      next(new Error('Room validation failed'))
    }
  })

  // Handle connections to room namespace
  namespace.on('connection', (socket: TypedSocket) => {
    console.log(`Client connected to room namespace ${roomId}: ${socket.id}`)

    // Handle join room event
    socket.on('join-room', async (data: JoinRoomData) => {
      try {
        await handleJoinRoom(socket, namespace as TypedNamespace, data)
      } catch (error) {
        console.error(`Error handling join-room for ${socket.id}:`, error)
        socket.emit('error', {
          code: 'JOIN_ROOM_FAILED',
          message: 'Failed to join room',
          details: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })

    // Handle leave room event
    socket.on('leave-room', async (data: LeaveRoomData) => {
      try {
        await handleLeaveRoom(socket, namespace as TypedNamespace, data)
      } catch (error) {
        console.error(`Error handling leave-room for ${socket.id}:`, error)
        socket.emit('error', {
          code: 'LEAVE_ROOM_FAILED',
          message: 'Failed to leave room',
          details: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })

    // Handle disconnect
    socket.on('disconnect', async reason => {
      console.log(`Client disconnected from room ${roomId}: ${socket.id}, reason: ${reason}`)

      if (socket.data?.participantId) {
        try {
          await handleParticipantDisconnect(socket, namespace as TypedNamespace, reason)
        } catch (error) {
          console.error(`Error handling disconnect for ${socket.id}:`, error)
        }
      }
    })

    // Handle connection errors
    socket.on('error', error => {
      console.error(`Socket error in room ${roomId} for ${socket.id}:`, error)
    })
  })
}

/**
 * Handle participant joining a room
 */
async function handleJoinRoom(
  socket: TypedSocket,
  namespace: TypedNamespace,
  data: JoinRoomData
): Promise<void> {
  const { roomId, participantName, role } = data

  console.log(`Handling join-room for ${socket.id}: name=${participantName}, role=${role}`)

  // Validate participant name
  if (!participantName?.trim()) {
    throw new Error('Participant name is required')
  }

  // Get current room state
  const room = await getRoom(roomId)
  if (!room) {
    throw new Error('Room not found or expired')
  }

  // Create or find participant
  let participant = room.participants.find(p => p.name === participantName.trim())

  if (!participant) {
    // Create new participant
    participant = {
      id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: participantName.trim(),
      status: 'queued',
      joinedAt: new Date(),
      lastUpdatedAt: new Date(),
      lastSelectedAt: null,
      role: role === 'organizer' ? 'organizer' : 'guest',
      isConnected: true,
    }

    // For organizer role, ensure they are the room creator or no organizer exists
    if (role === 'organizer') {
      const hasOrganizer = room.participants.some(p => p.role === 'organizer')
      if (hasOrganizer && room.organizerId !== participant.id) {
        throw new Error('Room already has an organizer')
      }

      if (!hasOrganizer) {
        room.organizerId = participant.id
      }
    }

    // Add to room
    room.participants.push(participant)
    room.lastUpdatedAt = new Date()

    // Save updated room state
    await setRoom(roomId, room)
  } else {
    // Update existing participant connection status
    participant.isConnected = true
    room.lastUpdatedAt = new Date()
    await setRoom(roomId, room)
  }

  // Store connection data on socket
  socket.data = {
    roomId,
    participantId: participant.id,
    role: participant.role,
    connectedAt: new Date(),
  } satisfies SocketConnectionData

  // Join the socket to the room
  await socket.join(roomId)

  // Notify participant about successful join
  socket.emit('room-state', {
    room,
    participants: room.participants,
    currentTimer: undefined, // TODO: Implement timer state
  })

  // Notify other participants about new participant
  socket.broadcast.emit('participant-joined', {
    roomId,
    participant,
  })

  console.log(`Participant ${participant.name} joined room ${roomId} as ${role}`)
}

/**
 * Handle participant leaving a room
 */
async function handleLeaveRoom(
  socket: TypedSocket,
  namespace: TypedNamespace,
  data: LeaveRoomData
): Promise<void> {
  const { roomId, participantId } = data

  console.log(`Handling leave-room for ${socket.id}: participantId=${participantId}`)

  // Get current room state
  const room = await getRoom(roomId)
  if (!room) {
    console.log(`Room ${roomId} not found during leave operation`)
    return
  }

  // Find and update participant
  const participant = room.participants.find(p => p.id === participantId)
  if (participant) {
    participant.isConnected = false
    room.lastUpdatedAt = new Date()
    await setRoom(roomId, room)

    // Leave the socket room
    await socket.leave(roomId)

    // Notify other participants
    socket.broadcast.emit('participant-left', {
      roomId,
      participantId,
      participantName: participant.name,
    })

    console.log(`Participant ${participant.name} left room ${roomId}`)
  }

  // Clear socket data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.data = undefined as any
}

/**
 * Handle participant disconnect
 */
async function handleParticipantDisconnect(
  socket: TypedSocket,
  namespace: TypedNamespace,
  reason: string
): Promise<void> {
  if (!socket.data) return

  const { roomId, participantId } = socket.data

  console.log(
    `Handling disconnect for participant ${participantId} in room ${roomId}, reason: ${reason}`
  )

  // For unexpected disconnects, mark participant as disconnected but keep in room
  // They can reconnect and resume their session
  const room = await getRoom(roomId)
  if (room) {
    const participant = room.participants.find(p => p.id === participantId)
    if (participant) {
      participant.isConnected = false
      room.lastUpdatedAt = new Date()
      await setRoom(roomId, room)

      // Notify other participants about disconnection
      socket.broadcast.emit('participant-left', {
        roomId,
        participantId,
        participantName: participant.name,
      })
    }
  }
}

/**
 * Broadcast message to all clients in a room
 *
 * @param roomId - Room identifier
 * @param event - Event name
 * @param data - Event data
 */
export function broadcastToRoom<K extends keyof SocketEvents>(
  roomId: string,
  event: K,
  data: Parameters<SocketEvents[K]>[0]
): void {
  if (!io) {
    console.error('Cannot broadcast: Socket.IO server not initialized')
    return
  }

  const namespace = getRoomNamespace(roomId)
  namespace.to(roomId).emit(event, data)

  console.log(`Broadcasted ${event} to room ${roomId}`)
}

/**
 * Get the Socket.IO server instance
 *
 * @returns Socket.IO server instance or null if not initialized
 */
export function getSocketIOServer(): SocketIOServer | null {
  return io
}

/**
 * Close Socket.IO server
 * Should be called during application shutdown
 */
export async function closeSocketIOServer(): Promise<void> {
  if (io) {
    console.log('Closing Socket.IO server...')
    await new Promise<void>(resolve => {
      io!.close(() => {
        console.log('Socket.IO server closed')
        io = null // Reset global variable
        resolve()
      })
    })
  }
}

/**
 * Custom Next.js server with Socket.IO integration
 * 
 * This server integrates Socket.IO with Next.js to enable real-time communication
 * for the wheel application. It handles both HTTP requests (via Next.js) and
 * WebSocket connections (via Socket.IO) on the same port.
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server: SocketIOServer } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

// Initialize Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO server attached to the HTTP server
  const io = new SocketIOServer(server, {
    cors: {
      origin: dev ? ["http://localhost:3000", "http://127.0.0.1:3000"] : false,
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io/',
  })

  // Set up room-based namespaces with the same pattern as the original implementation
  setupRoomNamespaces(io)

  // Store the io instance globally so API routes can access it
  global.io = io

  server
    .once('error', (err) => {
      console.error('Server error:', err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log(`> Socket.IO server attached and ready for WebSocket connections`)
    })
})

/**
 * Set up room-based namespaces with connection handling
 * This is the same implementation as in the API route
 */
function setupRoomNamespaces(io) {
  // Dynamic namespace for room:{id} pattern (UUID format only)
  io.of(/^\/room:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).on(
    'connection',
    socket => {
      const namespace = socket.nsp.name
      const roomId = namespace.replace('/room:', '')

      console.log(`Client connected to room: ${roomId}`)

      // Join the room automatically
      socket.join(roomId)

      // Handle room-specific events
      setupRoomEventHandlers(socket, roomId)

      // Handle disconnection
      socket.on('disconnect', reason => {
        console.log(`Client disconnected from room ${roomId}:`, reason)
        
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
 */
function setupRoomEventHandlers(socket, roomId) {
  // Handle room state updates (participants, wheel state, timer, etc.)
  socket.on('room_state_update', (data) => {
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
  socket.on('participant_update', (data) => {
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
  socket.on('wheel_spin', (data) => {
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
  socket.on('timer_update', (data) => {
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
  socket.on('room_message', (data) => {
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
  socket.on('text_update', (data) => {
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
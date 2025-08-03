# Socket.IO Server Implementation

This document provides an overview of the Socket.IO server implementation for real-time communication in the Wheel application.

## Quick Start

1. **Start the development server:**

   ```bash
   npm run dev
   ```

2. **Connect to a room namespace:**

   ```javascript
   // Client-side code example
   import { io } from 'socket.io-client'

   const socket = io('/room:abc123', {
     autoConnect: true,
     reconnection: true,
   })

   // Join a room as a guest
   socket.emit('join-room', {
     roomId: 'abc123',
     participantName: 'John Doe',
     role: 'guest',
   })

   // Listen for room state updates
   socket.on('room-state', data => {
     console.log('Room state:', data.room)
     console.log('Participants:', data.participants)
   })
   ```

## Architecture

### Room-based Namespaces

- **Pattern:** `room:{id}` (e.g., `room:abc123`)
- **Isolation:** Each room has its own namespace for isolated communication
- **Validation:** Middleware validates room existence before allowing connections

### Connection Flow

1. Client connects to room namespace
2. Middleware validates room exists in Redis
3. Client emits `join-room` event with participant details
4. Server creates/updates participant in room state
5. Server broadcasts participant updates to all room members

### Event Types

**Client to Server:**

- `join-room` - Join a room as organizer or guest
- `leave-room` - Leave the current room
- `participant-add` - Add a new participant (organizer only)
- `participant-update` - Update participant status
- `wheel-spin` - Initiate wheel spinning
- `timer-start` - Start presentation timer

**Server to Client:**

- `room-state` - Complete room state with participants
- `participant-joined` - New participant joined
- `participant-left` - Participant left the room
- `wheel-spinning` - Wheel animation started
- `wheel-result` - Wheel selection result
- `timer-started` - Timer started for participant

## Configuration

The Socket.IO server is configured with:

- **Connection timeout:** 60 seconds
- **Ping interval:** 25 seconds
- **Connection state recovery:** 2 minutes
- **CORS:** Enabled for cross-origin requests
- **Transports:** WebSocket and polling fallback

## Error Handling

- Room validation on connection
- Graceful disconnect handling
- Automatic reconnection support
- Comprehensive error logging
- Error events sent to clients

## Testing

Run Socket.IO tests:

```bash
npm run test:run src/lib/__tests__/socket.test.ts
```

## Scaling

Current implementation supports:

- **Single server instance** (no horizontal scaling for MVP)
- **Target capacity:** 3,000 concurrent WebSocket connections
- **100 simultaneous rooms**
- **30 participants per room average**

## Integration with Redis

- Room state persisted in Redis with 8-hour TTL
- Namespace middleware validates room existence
- Participant state updates saved to Redis
- Room cleanup handled by Redis expiration

## Next Steps

Future enhancements could include:

- Redis Pub/Sub for horizontal scaling
- Rate limiting for connections
- Authentication and authorization
- Metrics and monitoring
- Advanced error recovery

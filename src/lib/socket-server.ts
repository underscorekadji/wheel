import { Server as SocketIOServer } from 'socket.io'

/**
 * Socket.IO server instance cache to ensure single server per process
 */
let io: SocketIOServer | undefined

/**
 * Get the current Socket.IO server instance
 *
 * @returns Socket.IO server instance or undefined if not initialized
 */
export function getSocketServer(): SocketIOServer | undefined {
  return io
}

/**
 * Set the Socket.IO server instance (used internally by the API route)
 *
 * @param server - Socket.IO server instance
 */
export function setSocketServer(server: SocketIOServer): void {
  io = server
}

/**
 * Check if Socket.IO server is initialized
 *
 * @returns True if server is initialized
 */
export function isSocketServerInitialized(): boolean {
  return io !== undefined
}

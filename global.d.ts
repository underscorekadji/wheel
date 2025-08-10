/**
 * Global type definitions for Node.js global variables
 */

import type { Server as HttpServer } from 'http'
import type { Server as SocketIOServer } from 'socket.io'

declare global {
  // eslint-disable-next-line no-var
  var __socketHttpServer: HttpServer | undefined
  
  // Global Socket.IO server instance (set by custom server)
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined
}

export {}

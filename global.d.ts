/**
 * Global type definitions for Node.js global variables
 */

import type { Server as HttpServer } from 'http'

declare global {
  // eslint-disable-next-line no-var
  var __socketHttpServer: HttpServer | undefined
}

export {}

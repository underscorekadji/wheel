/**
 * TypeScript type definitions for the Wheel application
 *
 * This module exports Socket.IO types and global type augmentations.
 * Core entities are now in the domain layer following DDD patterns.
 */

export * from './socket'

/**
 * Global augmentation for socket server caching
 */
declare global {
  // eslint-disable-next-line no-var
  var __socketHttpServer: import('http').Server | undefined
}

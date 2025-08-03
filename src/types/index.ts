/**
 * TypeScript type definitions for the Wheel application
 *
 * This module exports core interfaces and types used throughout the application
 * for Room and Participant entities in the presenter selection system.
 */

export * from './room'
export * from './participant'

/**
 * Global augmentation for socket server caching
 */
declare global {
  // eslint-disable-next-line no-var
  var __socketHttpServer: import('http').Server | undefined
}

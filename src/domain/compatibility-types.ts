/**
 * Compatibility types for smooth migration from src/types/ to DDD domain
 *
 * These types provide a bridge between the old TypeScript interfaces
 * and the new DDD entities with rich business logic.
 */

import { Room as RoomEntity } from './room/entities/room'
import { Participant as ParticipantEntity } from './room/entities/participant'

/**
 * Plain object representation of Room for API/serialization
 */
export interface Room {
  id: string
  name: string
  status: RoomStatus
  participants: Participant[]
  organizerId: string
  createdAt: Date
  lastUpdatedAt: Date
  expiresAt: Date
  currentPresenterId: string | null
  wheelConfig: WheelConfig
  selectionHistory: SelectionHistoryEntry[]
}

/**
 * Plain object representation of Participant for API/serialization
 */
export interface Participant {
  id: string
  name: string
  status: ParticipantStatus
  role: ParticipantRole
  joinedAt: Date
  lastUpdatedAt: Date
  lastSelectedAt: Date | null
}

/**
 * Plain object representation of WheelConfig
 */
export interface WheelConfig {
  minSpinDuration: number
  maxSpinDuration: number
  excludeFinished: boolean
  allowRepeatSelections: boolean
}

/**
 * Plain object representation of SelectionHistoryEntry
 */
export interface SelectionHistoryEntry {
  id: string
  participantId: string
  participantName: string
  initiatedBy: string
  selectedAt: Date
  spinDuration: number
}

/**
 * Type aliases for backward compatibility
 */
export type RoomStatus = 'waiting' | 'active' | 'paused' | 'completed' | 'expired'
export type ParticipantStatus = 'queued' | 'active' | 'finished' | 'disabled'
export type ParticipantRole = 'organizer' | 'guest'

/**
 * Conversion utilities
 */
export class DomainConverter {
  /**
   * Convert DDD Room entity to plain object
   */
  static roomToPlain(room: RoomEntity): Room {
    const plainObject = room.toPlainObject()
    return {
      id: plainObject.id as string,
      name: plainObject.name as string,
      status: plainObject.status as RoomStatus,
      participants: (plainObject.participants as Record<string, unknown>[]).map(p => ({
        id: p.id as string,
        name: p.name as string,
        status: p.status as ParticipantStatus,
        role: p.role as ParticipantRole,
        joinedAt: p.joinedAt as Date,
        lastUpdatedAt: p.lastUpdatedAt as Date,
        lastSelectedAt: p.lastSelectedAt as Date | null,
      })),
      organizerId: plainObject.organizerId as string,
      createdAt: plainObject.createdAt as Date,
      lastUpdatedAt: plainObject.lastUpdatedAt as Date,
      expiresAt: plainObject.expiresAt as Date,
      currentPresenterId: plainObject.currentPresenterId as string | null,
      wheelConfig: plainObject.wheelConfig as WheelConfig,
      selectionHistory: (plainObject.selectionHistory as Record<string, unknown>[]).map(entry => ({
        id: entry.id as string,
        participantId: entry.participantId as string,
        participantName: entry.participantName as string,
        initiatedBy: entry.initiatedBy as string,
        selectedAt: entry.selectedAt as Date,
        spinDuration: entry.spinDuration as number,
      })),
    }
  }

  /**
   * Convert DDD Participant entity to plain object
   */
  static participantToPlain(participant: ParticipantEntity): Participant {
    const plainObject = participant.toPlainObject()
    return {
      id: plainObject.id as string,
      name: plainObject.name as string,
      status: plainObject.status as ParticipantStatus,
      role: plainObject.role as ParticipantRole,
      joinedAt: plainObject.joinedAt as Date,
      lastUpdatedAt: plainObject.lastUpdatedAt as Date,
      lastSelectedAt: plainObject.lastSelectedAt as Date | null,
    }
  }
}

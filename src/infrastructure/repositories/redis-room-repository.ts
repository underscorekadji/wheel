import { Room, SelectionHistoryEntry } from '../../domain/room/entities/room'
import { Participant } from '../../domain/room/entities/participant'
import { RoomId, ParticipantId } from '../../domain/shared/value-objects/id'
import { RoomName } from '../../domain/room/value-objects/names'
import {
  RoomStatus,
  RoomStatusEnum,
  WheelConfig,
} from '../../domain/room/value-objects/room-attributes'
import {
  ParticipantStatus,
  ParticipantStatusEnum,
  ParticipantRole,
  ParticipantRoleEnum,
} from '../../domain/room/value-objects/participant-attributes'
import { ParticipantName } from '../../domain/room/value-objects/names'
import { RoomRepository } from '../../domain/room/repository/room-repository'
import { getRedisClient } from '../persistence/redis-client'
import { configurationService } from '../../core/services/configuration'
import { safeValidateRoom } from '../validation/zod-schemas'

/**
 * Redis implementation of Room Repository
 */
export class RedisRoomRepository implements RoomRepository {
  private readonly keyPrefix: string
  private readonly roomTtlSeconds: number

  constructor() {
    const redisConfig = configurationService.getRedisConfig()
    this.keyPrefix = redisConfig.keyPrefix
    this.roomTtlSeconds = redisConfig.roomTtlSeconds
  }
  async save(room: Room): Promise<void> {
    const redis = await getRedisClient()
    const key = `${this.keyPrefix}${room.id.value}`

    // Convert domain object to plain object for storage
    const plainRoom = room.toPlainObject()

    // Store with TTL
    await redis.setex(key, this.roomTtlSeconds, JSON.stringify(plainRoom))
  }

  async findById(roomId: RoomId): Promise<Room | null> {
    const redis = await getRedisClient()
    const key = `${this.keyPrefix}${roomId.value}`

    const data = await redis.get(key)
    if (!data) {
      return null
    }

    try {
      const parsedData = JSON.parse(data)

      // Validate and convert to domain object
      const validationResult = safeValidateRoom(parsedData)
      if (!validationResult.success) {
        console.error('Invalid room data in Redis:', validationResult.error)
        return null
      }

      return this.toDomainObject(parsedData)
    } catch (error) {
      console.error('Error parsing room data from Redis:', error)
      return null
    }
  }

  async exists(roomId: RoomId): Promise<boolean> {
    const redis = await getRedisClient()
    const key = `${this.keyPrefix}${roomId.value}`

    const exists = await redis.exists(key)
    return exists === 1
  }

  async delete(roomId: RoomId): Promise<boolean> {
    const redis = await getRedisClient()
    const key = `${this.keyPrefix}${roomId.value}`

    const deleted = await redis.del(key)
    return deleted === 1
  }

  async getTTL(roomId: RoomId): Promise<number> {
    const redis = await getRedisClient()
    const key = `${this.keyPrefix}${roomId.value}`

    return await redis.ttl(key)
  }

  async findExpiredRooms(): Promise<RoomId[]> {
    const redis = await getRedisClient()
    const pattern = `${this.keyPrefix}*`

    const keys = await redis.keys(pattern)
    const expiredRoomIds: RoomId[] = []

    for (const key of keys) {
      const ttl = await redis.ttl(key)
      if (ttl <= 0) {
        const roomId = key.replace(this.keyPrefix, '')
        try {
          expiredRoomIds.push(new RoomId(roomId))
        } catch {
          // Invalid room ID format, skip
        }
      }
    }

    return expiredRoomIds
  }

  /**
   * Convert plain object from Redis to domain Room object
   */
  private toDomainObject(data: Record<string, unknown>): Room {
    // Convert participants
    const participants = (data.participants as Array<Record<string, unknown>>).map(p => {
      return new Participant(
        new ParticipantId(p.id as string),
        new ParticipantName(p.name as string),
        new ParticipantStatus(p.status as ParticipantStatusEnum),
        new ParticipantRole(p.role as ParticipantRoleEnum),
        new Date(p.joinedAt as string),
        new Date(p.lastUpdatedAt as string),
        p.lastSelectedAt ? new Date(p.lastSelectedAt as string) : null
      )
    })

    // Convert wheel config
    const wheelConfigData = data.wheelConfig as Record<string, unknown>
    const wheelConfig = new WheelConfig(
      wheelConfigData.minSpinDuration as number,
      wheelConfigData.maxSpinDuration as number,
      wheelConfigData.excludeFinished as boolean,
      wheelConfigData.allowRepeatSelections as boolean
    )

    // Convert selection history entries
    const selectionHistory = (data.selectionHistory as Array<Record<string, unknown>>).map(
      entry => {
        return new SelectionHistoryEntry(
          entry.id as string,
          new ParticipantId(entry.participantId as string),
          entry.participantName as string,
          new ParticipantId(entry.initiatedBy as string),
          new Date(entry.selectedAt as string),
          entry.spinDuration as number
        )
      }
    )

    // Create Room using static reconstruction method
    return Room.reconstruct({
      id: new RoomId(data.id as string),
      name: new RoomName(data.name as string),
      status: new RoomStatus(data.status as RoomStatusEnum),
      participants,
      organizerId: new ParticipantId(data.organizerId as string),
      createdAt: new Date(data.createdAt as string),
      lastUpdatedAt: new Date(data.lastUpdatedAt as string),
      expiresAt: new Date(data.expiresAt as string),
      currentPresenterId: data.currentPresenterId
        ? new ParticipantId(data.currentPresenterId as string)
        : null,
      wheelConfig,
      selectionHistory,
    })
  }
}

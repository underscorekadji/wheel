import { Room } from '../entities/room'
import { RoomId } from '../../shared/value-objects/id'

/**
 * Repository interface for Room aggregate
 *
 * Defines the contract for persisting and retrieving Room aggregates.
 * Implementation should be provided by the infrastructure layer.
 */
export interface RoomRepository {
  /**
   * Save a room aggregate
   *
   * @param room - Room aggregate to save
   * @returns Promise that resolves when save is complete
   */
  save(room: Room): Promise<void>

  /**
   * Find a room by its ID
   *
   * @param roomId - Room identifier
   * @returns Promise that resolves to Room or null if not found
   */
  findById(roomId: RoomId): Promise<Room | null>

  /**
   * Check if a room exists
   *
   * @param roomId - Room identifier
   * @returns Promise that resolves to true if room exists
   */
  exists(roomId: RoomId): Promise<boolean>

  /**
   * Delete a room
   *
   * @param roomId - Room identifier
   * @returns Promise that resolves to true if room was deleted
   */
  delete(roomId: RoomId): Promise<boolean>

  /**
   * Get TTL (Time To Live) for a room
   *
   * @param roomId - Room identifier
   * @returns Promise that resolves to TTL in seconds
   */
  getTTL(roomId: RoomId): Promise<number>

  /**
   * Find all expired rooms for cleanup
   *
   * @returns Promise that resolves to array of expired room IDs
   */
  findExpiredRooms(): Promise<RoomId[]>
}

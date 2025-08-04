import { NextResponse } from 'next/server'
import { RoomApplicationService } from '@/core/services/room-application-service'
import { RedisRoomRepository } from '@/infrastructure/repositories/redis-room-repository'
import { WheelSpinService } from '@/domain/room/services/wheel-spin-service'
import { ParticipantManagementService } from '@/domain/room/services/participant-management-service'

/**
 * Create application service instance
 */
function createRoomApplicationService(): RoomApplicationService {
  const roomRepository = new RedisRoomRepository()
  const wheelSpinService = new WheelSpinService()
  const participantManagementService = new ParticipantManagementService()

  return new RoomApplicationService(roomRepository, wheelSpinService, participantManagementService)
}

/**
 * POST /api/room - Create a new presentation room
 *
 * Creates a new room with a crypto-random UUID v4 identifier using DDD architecture.
 * The room can be used for presenter selection via the spinning wheel.
 *
 * @returns {Object} Response object containing the room details
 *
 * @example
 * POST /api/room
 *
 * Response (201):
 * {
 *   "roomId": "123e4567-e89b-12d3-a456-426614174000",
 *   "organizerId": "456e7890-e89b-12d3-a456-426614174001",
 *   "roomName": "Presentation Room",
 *   "status": RoomStatusEnum.WAITING
 * }
 */
export async function POST() {
  try {
    const roomService = createRoomApplicationService()

    // Create room using DDD application service
    const result = await roomService.createRoom({
      organizerName: 'Organizer', // Default organizer name
    })

    // Return the room details with 201 Created status
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    // Log error for debugging (in production, use proper logging)
    console.error('Error creating room:', error)

    // Return 500 Internal Server Error for any unexpected issues
    return NextResponse.json(
      {
        error: 'Failed to create room',
        message: 'An internal server error occurred while creating the room',
      },
      { status: 500 }
    )
  }
}

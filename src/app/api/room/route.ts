import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

/**
 * POST /api/room - Create a new presentation room
 *
 * Creates a new room with a crypto-random UUID v4 identifier.
 * The room can be used for presenter selection via the spinning wheel.
 *
 * @returns {Object} Response object containing the room ID
 * @returns {string} response.id - Crypto-random UUID v4 room identifier
 *
 * @example
 * POST /api/room
 *
 * Response (201):
 * {
 *   "id": "123e4567-e89b-12d3-a456-426614174000"
 * }
 */
export async function POST() {
  try {
    // Generate crypto-random UUID v4 for 128-bit security
    const roomId = randomUUID()

    // Return the room ID with 201 Created status
    return NextResponse.json(
      {
        id: roomId,
      },
      { status: 201 }
    )
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

import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for room data (in production, use Redis)
const roomData = new Map<string, { text: string; clientId: string; timestamp: number }>()
const roomConnections = new Map<string, Set<ReadableStreamDefaultController>>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get('room')
  const clientId = searchParams.get('client')

  if (!room || !clientId) {
    return new NextResponse('Missing room or client parameter', { status: 400 })
  }

  // Create a readable stream for Server-Sent Events
  let streamController: ReadableStreamDefaultController

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller

      // Store the connection for this room
      if (!roomConnections.has(room)) {
        roomConnections.set(room, new Set())
      }
      roomConnections.get(room)!.add(controller)

      // Send initial connection message
      const connectionMessage = `data: ${JSON.stringify({
        type: 'connected',
        room,
        clientId,
        timestamp: Date.now(),
      })}\n\n`

      controller.enqueue(new TextEncoder().encode(connectionMessage))

      // Send current room data if it exists
      const currentData = roomData.get(room)
      if (currentData) {
        const dataMessage = `data: ${JSON.stringify({
          type: 'text_update',
          text: currentData.text,
          clientId: currentData.clientId,
          timestamp: currentData.timestamp,
        })}\n\n`

        controller.enqueue(new TextEncoder().encode(dataMessage))
      }
    },
    cancel() {
      // Remove connection when client disconnects
      const connections = roomConnections.get(room)
      if (connections) {
        connections.delete(streamController)
        if (connections.size === 0) {
          roomConnections.delete(room)
        }
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { room, text, clientId } = await request.json()

    if (!room || typeof text !== 'string' || !clientId) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Store the text update
    const timestamp = Date.now()
    roomData.set(room, { text, clientId, timestamp })

    // Send update to all connected clients in this room
    const connections = roomConnections.get(room)
    if (connections) {
      const message = `data: ${JSON.stringify({
        type: 'text_update',
        text,
        clientId,
        timestamp,
      })}\n\n`

      const encodedMessage = new TextEncoder().encode(message)

      // Send to all connections
      connections.forEach(controller => {
        try {
          controller.enqueue(encodedMessage)
        } catch {
          // Remove broken connections
          connections.delete(controller)
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling text update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

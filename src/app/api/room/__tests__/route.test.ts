import { describe, it, expect } from 'vitest'
import { POST } from '../route'

describe('POST /api/room', () => {
  it('should create a room with a valid UUID v4', async () => {
    // Call the API handler
    const response = await POST()

    // Verify response status
    expect(response.status).toBe(201)

    // Parse and verify response body structure
    const responseBody = await response.json()
    expect(responseBody).toHaveProperty('id')
    expect(typeof responseBody.id).toBe('string')

    // UUID v4 regex pattern to verify format
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(responseBody.id).toMatch(uuidV4Regex)
  })

  it('should return unique UUIDs on multiple calls', async () => {
    // Make multiple calls
    const responses = await Promise.all([POST(), POST(), POST()])

    // Verify all responses have 201 status
    responses.forEach(response => {
      expect(response.status).toBe(201)
    })

    // Parse response bodies
    const responseBodies = await Promise.all(responses.map(response => response.json()))

    // Extract IDs
    const ids = responseBodies.map(body => body.id)

    // Verify all IDs are different (uniqueness)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)

    // Verify all IDs are valid UUID v4 format
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    ids.forEach(id => {
      expect(id).toMatch(uuidV4Regex)
    })
  })

  it('should return proper Content-Type header', async () => {
    const response = await POST()

    // Verify Content-Type is application/json
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.status).toBe(201)
  })

  it('should return consistent response structure', async () => {
    const response = await POST()
    const responseBody = await response.json()

    // Verify response structure
    expect(responseBody).toHaveProperty('id')
    expect(Object.keys(responseBody)).toEqual(['id'])

    // Verify response status and content type
    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('should generate different UUIDs across a larger sample', async () => {
    // Test uniqueness across a larger sample
    const numberOfCalls = 10
    const promises = Array.from({ length: numberOfCalls }, () => POST())
    const responses = await Promise.all(promises)

    // Parse all response bodies
    const responseBodies = await Promise.all(responses.map(response => response.json()))

    // Extract all IDs
    const ids = responseBodies.map(body => body.id)

    // Verify all IDs are unique
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(numberOfCalls)

    // Verify all responses have correct status and format
    responses.forEach(response => {
      expect(response.status).toBe(201)
    })

    // Verify UUID v4 format for all IDs
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    ids.forEach(id => {
      expect(id).toMatch(uuidV4Regex)
    })
  })

  it('should handle potential edge cases in UUID generation', async () => {
    // Test that UUID generation is consistent in behavior
    const response1 = await POST()
    const response2 = await POST()

    const body1 = await response1.json()
    const body2 = await response2.json()

    // Verify both calls succeed
    expect(response1.status).toBe(201)
    expect(response2.status).toBe(201)

    // Verify IDs are strings and different
    expect(typeof body1.id).toBe('string')
    expect(typeof body2.id).toBe('string')
    expect(body1.id).not.toBe(body2.id)

    // Verify both IDs are valid UUID v4 format
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(body1.id).toMatch(uuidV4Regex)
    expect(body2.id).toMatch(uuidV4Regex)
  })
})

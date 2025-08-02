import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Extend Vitest's expect with additional matchers
expect.extend({})

// Clean up after each test
afterEach(() => {
  cleanup()
})

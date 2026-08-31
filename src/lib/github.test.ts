import { describe, expect, it } from 'vitest'
import { loadRuntimeConfig } from './github'

describe('GitHub configuration', () => {
  it('exports the runtime configuration loader', () => {
    expect(typeof loadRuntimeConfig).toBe('function')
  })
})

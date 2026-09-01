import { describe, expect, it } from 'vitest'
import { SEED } from '../seed'
import { childrenOf, parentsOf, plexZones, siblingsOf } from './plex'

describe('plex zones', () => {
  it('puts Dream Unity children below the home thought', () => {
    const zones = plexZones(SEED, 'home')
    expect(zones?.active.name).toBe('Dream Unity')
    expect(zones?.children.map((t) => t.id).sort()).toEqual(['maker', 'machine', 'unity', 'world'].sort())
    expect(zones?.parents).toEqual([])
    expect(zones?.jumps.map((t) => t.id).sort()).toEqual(['mirror', 'realisation'].sort())
  })

  it('derives siblings from a shared parent', () => {
    expect(parentsOf(SEED, 'intention')).toEqual(['maker'])
    expect(childrenOf(SEED, 'maker')).toContain('craft')
    expect(siblingsOf(SEED, 'intention')).toEqual(expect.arrayContaining(['craft', 'insight']))
  })

  it('shows jumps beside the active thought', () => {
    const zones = plexZones(SEED, 'unity-core')
    expect(zones?.jumps.some((t) => t.id === 'creative-freedom')).toBe(true)
    expect(zones?.parents.some((t) => t.id === 'unity')).toBe(true)
  })
})

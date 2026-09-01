import { describe, expect, it } from 'vitest'
import { SEED } from '../seed'
import { childrenOf, parentsOf, plexZones, relationFromPoint, siblingsOf } from './plex'
import type { PlacedThought } from '../types'

describe('plex zones', () => {
  it('puts Dream Unity children below the home thought', () => {
    const zones = plexZones(SEED, 'home')
    expect(zones?.active.name).toBe('Dream Unity')
    expect(zones?.children.map((t) => t.id).sort()).toEqual(['maker', 'machine', 'unity', 'world'].sort())
    expect(zones?.parents).toEqual([])
  })

  it('derives siblings from a shared parent', () => {
    expect(parentsOf(SEED, 'intention')).toEqual(['maker'])
    expect(childrenOf(SEED, 'maker')).toContain('craft')
    expect(siblingsOf(SEED, 'intention')).toEqual(expect.arrayContaining(['craft', 'insight']))
  })

  it('shows jumps beside the active thought', () => {
    const zones = plexZones(SEED, 'unity-core')
    expect(zones?.jumps.some((t) => t.id === 'creative-freedom')).toBe(true)
  })
})

describe('spatial capture', () => {
  const origin: PlacedThought = {
    id: 'home',
    thought: SEED.thoughts[0] as PlacedThought['thought'],
    role: 'active',
    x: 400,
    y: 300,
    w: 200,
    h: 80,
  }

  it('reads empty-space taps as parent, child, jump or sibling', () => {
    expect(relationFromPoint(origin, 500, 200)).toBe('parent')
    expect(relationFromPoint(origin, 500, 500)).toBe('child')
    expect(relationFromPoint(origin, 200, 340)).toBe('jump')
    expect(relationFromPoint(origin, 800, 340)).toBe('sibling')
  })
})

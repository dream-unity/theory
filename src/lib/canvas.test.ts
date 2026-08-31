import { describe, expect, it } from 'vitest'
import { neighborInDirection, packMap, spawnBeside, tightenPositions } from './canvas'

describe('canvas spatial helpers', () => {
  it('walks to the neighbour in a compass direction', () => {
    const origin = { id: 'a', x: 0, y: 0 }
    const candidates = [
      origin,
      { id: 'right', x: 300, y: 10 },
      { id: 'far-right', x: 900, y: 0 },
      { id: 'down', x: 20, y: 260 },
      { id: 'left', x: -280, y: -8 },
    ]
    expect(neighborInDirection(origin, candidates, 'right')).toBe('right')
    expect(neighborInDirection(origin, candidates, 'down')).toBe('down')
    expect(neighborInDirection(origin, candidates, 'left')).toBe('left')
    expect(neighborInDirection(origin, candidates, 'up')).toBeNull()
  })

  it('spawns to the right and steps down when the slot is taken', () => {
    const origin = { x: 0, y: 0 }
    expect(spawnBeside(origin, [])).toEqual({ x: 280, y: 0 })
    expect(spawnBeside(origin, [{ x: 280, y: 0 }]).y).toBeGreaterThan(0)
  })

  it('pulls cards toward the shared centre', () => {
    const next = tightenPositions({
      a: { x: 0, y: 0 },
      b: { x: 1000, y: 0 },
    }, 0.5)
    expect(next.a.x).toBeGreaterThan(0)
    expect(next.b.x).toBeLessThan(1000)
    expect(next.b.x - next.a.x).toBe(500)
  })

  it('packs a sprawling map into a tighter neighbourhood', () => {
    const packed = packMap({
      a: { x: 0, y: 0 },
      b: { x: 1400, y: 0 },
      c: { x: 0, y: 1200 },
    })
    const width = Math.max(packed.a.x, packed.b.x, packed.c.x) - Math.min(packed.a.x, packed.b.x, packed.c.x)
    const height = Math.max(packed.a.y, packed.b.y, packed.c.y) - Math.min(packed.a.y, packed.b.y, packed.c.y)
    expect(width).toBeLessThan(1400)
    expect(height).toBeLessThan(1200)
  })
})

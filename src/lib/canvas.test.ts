import { describe, expect, it } from 'vitest'
import { neighborInDirection, spawnBeside } from './canvas'

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
})

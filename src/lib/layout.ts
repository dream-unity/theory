import type { AtlasView, Concept, Position, Quadrant } from '../types'

const CARD = { w: 228, h: 164 }
const CORE = { w: 320, h: 236 }
const GAP_X = 268
const GAP_Y = 214
const ORIGIN = { x: 640, y: 430 }

const QUAD_OFFSET: Record<Quadrant, { x: number; y: number }> = {
  maker: { x: -1, y: -1 },
  machine: { x: 1, y: -1 },
  world: { x: -1, y: 1 },
  unity: { x: 1, y: 1 },
}

export function defaultPosition(concept: Concept, siblings: Concept[]): Position {
  if (concept.kind === 'core') return { x: ORIGIN.x - CORE.w / 2, y: ORIGIN.y - CORE.h / 2 }

  const peers = siblings.filter((item) => item.quadrant === concept.quadrant && item.kind !== 'core')
  const index = Math.max(0, peers.findIndex((item) => item.id === concept.id))
  const col = index % 2
  const row = Math.floor(index / 2)
  const offset = QUAD_OFFSET[concept.quadrant]
  const localX = (col === 0 ? -1 : 1) * (GAP_X / 2)
  const localY = (row === 0 ? -1 : 1) * (GAP_Y / 2)

  return {
    x: ORIGIN.x + offset.x * 360 + localX - CARD.w / 2,
    y: ORIGIN.y + offset.y * 250 + localY - CARD.h / 2,
  }
}

export function packView(concepts: Concept[], positions: Record<string, Position>, view: AtlasView): Record<string, Position> {
  const visible = concepts.filter((concept) => concept.views.includes(view) || (view === 'inbox' && concept.inbox))
  const next = { ...positions }
  visible.forEach((concept) => {
    if (!next[concept.id]) next[concept.id] = defaultPosition(concept, visible)
  })
  return next
}

export function spawnBeside(origin: Position, index = 0): Position {
  const angle = (index % 8) * (Math.PI / 4)
  return {
    x: origin.x + Math.cos(angle) * 280,
    y: origin.y + Math.sin(angle) * 200,
  }
}

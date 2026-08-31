export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Point {
  x: number
  y: number
}

export interface Located extends Point {
  id: string
}

const DIRECTION_VECTOR: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

/** Pick the spatially nearest neighbour that lies in a compass direction. */
export function neighborInDirection(origin: Located, candidates: Located[], direction: Direction): string | null {
  const axis = DIRECTION_VECTOR[direction]
  let best: { id: string; score: number } | null = null

  for (const candidate of candidates) {
    if (candidate.id === origin.id) continue
    const vx = candidate.x - origin.x
    const vy = candidate.y - origin.y
    const distance = Math.hypot(vx, vy)
    if (distance < 8) continue
    const alignment = (vx * axis.x + vy * axis.y) / distance
    if (alignment < 0.35) continue
    const score = distance / (alignment * alignment)
    if (!best || score < best.score) best = { id: candidate.id, score }
  }

  return best?.id ?? null
}

/** Place a new card to the right of an origin, stepping down to avoid overlap. */
export function spawnBeside(origin: Point, occupancy: Point[], gapX = 280, gapY = 118): Point {
  let x = origin.x + gapX
  let y = origin.y
  const collides = (px: number, py: number) => occupancy.some((point) => Math.hypot(point.x - px, point.y - py) < 150)
  for (let step = 0; step < 16 && collides(x, y); step += 1) y += gapY
  return { x, y }
}

export function clientPoint(event: MouseEvent | TouchEvent): Point {
  if ('changedTouches' in event && event.changedTouches[0]) {
    return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
  }
  const mouse = event as MouseEvent
  return { x: mouse.clientX, y: mouse.clientY }
}

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

/** Pull a sparse map toward its centre so cards sit closer without changing their relative order. */
export function tightenPositions(
  positions: Record<string, Point>,
  scale = 0.62,
): Record<string, Point> {
  const points = Object.values(positions)
  if (points.length < 2) return positions
  const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length
  const next: Record<string, Point> = {}
  for (const [id, point] of Object.entries(positions)) {
    next[id] = {
      x: cx + (point.x - cx) * scale,
      y: cy + (point.y - cy) * scale,
    }
  }
  return next
}

export function mapBounds(positions: Record<string, Point>) {
  const points = Object.values(positions)
  if (points.length === 0) return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 }
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
}

export function medianNearestGap(positions: Record<string, Point>) {
  const points = Object.values(positions)
  if (points.length < 2) return 0
  const gaps = points.map((point, index) => {
    let nearest = Number.POSITIVE_INFINITY
    for (let other = 0; other < points.length; other += 1) {
      if (other === index) continue
      nearest = Math.min(nearest, Math.hypot(point.x - points[other].x, point.y - points[other].y))
    }
    return nearest
  })
  gaps.sort((left, right) => left - right)
  return gaps[Math.floor(gaps.length / 2)]
}

export function separateOverlaps(positions: Record<string, Point>, minGap = 248): Record<string, Point> {
  const next: Record<string, Point> = {}
  for (const [id, point] of Object.entries(positions)) next[id] = { x: point.x, y: point.y }
  const ids = Object.keys(next)
  for (let pass = 0; pass < 14; pass += 1) {
    let moved = false
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const left = next[ids[i]]
        const right = next[ids[j]]
        const dx = right.x - left.x
        const dy = right.y - left.y
        const distance = Math.hypot(dx, dy) || 0.01
        if (distance >= minGap) continue
        const push = (minGap - distance) / 2
        const ux = dx / distance
        const uy = dy / distance
        left.x -= ux * push
        left.y -= uy * push
        right.x += ux * push
        right.y += uy * push
        moved = true
      }
    }
    if (!moved) break
  }
  return next
}

/** Compact a sparse constellation while keeping relative neighbourhoods. */
export function packMap(positions: Record<string, Point>, targetGap = 268): Record<string, Point> {
  if (Object.keys(positions).length < 2) return positions
  const gap = medianNearestGap(positions)
  const bounds = mapBounds(positions)
  const tooWide = bounds.width > 1680 || bounds.height > 1280 || gap > targetGap * 1.28
  const scaled = tooWide ? tightenPositions(positions, Math.min(0.72, targetGap / Math.max(gap, 1))) : positions
  return separateOverlaps(scaled, Math.round(targetGap * 0.88))
}

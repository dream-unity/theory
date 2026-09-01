import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { BrainDocument, CreateKind, PlexZones } from '../types'
import { childrenOf, curvePath, gatePoint, jumpsOf, layoutPlex, parentsOf } from '../lib/plex'

type Menu = { x: number; y: number; id: string } | null
type Drag = {
  fromId: string
  kind: CreateKind
  x: number
  y: number
  startX: number
  startY: number
  moved: boolean
} | null

const TAP_SLOP = 14

export function Plex({
  doc,
  zones,
  expand,
  onActivate,
  onCreate,
  onLink,
  onForget,
  onPin,
}: {
  doc: BrainDocument
  zones: PlexZones
  expand: boolean
  onActivate: (id: string) => void
  onCreate: (kind: CreateKind, fromId: string) => void
  onLink: (fromId: string, toId: string, kind: CreateKind) => void
  onForget: (id: string) => void
  onPin: (id: string) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const skipClick = useRef(false)
  const [size, setSize] = useState({ w: 1000, h: 700 })
  const [drag, setDrag] = useState<Drag>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [menu, setMenu] = useState<Menu>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const apply = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { nodes, edges } = useMemo(() => layoutPlex(zones, size.w, size.h, expand), [zones, size, expand])
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

  useEffect(() => {
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  function localPoint(event: ReactPointerEvent | PointerEvent) {
    const rect = host.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function hitThought(x: number, y: number, except?: string) {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index]
      if (!node || node.id === except) continue
      if (x >= node.x && x <= node.x + node.w && y >= node.y && y <= node.y + node.h) return node.id
    }
    return null
  }

  function startGate(event: ReactPointerEvent, fromId: string, kind: CreateKind) {
    event.preventDefault()
    event.stopPropagation()
    skipClick.current = true
    const point = localPoint(event)
    host.current?.setPointerCapture(event.pointerId)
    setDrag({ fromId, kind, x: point.x, y: point.y, startX: point.x, startY: point.y, moved: false })
  }

  function move(event: ReactPointerEvent) {
    if (!drag) return
    const point = localPoint(event)
    const moved = drag.moved || Math.hypot(point.x - drag.startX, point.y - drag.startY) > TAP_SLOP
    setDrag({ ...drag, x: point.x, y: point.y, moved })
    setHover(moved ? hitThought(point.x, point.y, drag.fromId) : null)
  }

  function endDrag(event: ReactPointerEvent) {
    if (!drag) return
    if (host.current?.hasPointerCapture(event.pointerId)) {
      host.current.releasePointerCapture(event.pointerId)
    }
    const point = localPoint(event)
    const moved = drag.moved || Math.hypot(point.x - drag.startX, point.y - drag.startY) > TAP_SLOP
    const targetId = moved ? hitThought(point.x, point.y, drag.fromId) : null
    if (targetId) onLink(drag.fromId, targetId, drag.kind)
    else onCreate(drag.kind, drag.fromId)
    setDrag(null)
    setHover(null)
  }

  function cancelDrag() {
    setDrag(null)
    setHover(null)
  }

  const origin = drag ? byId.get(drag.fromId) : undefined
  const originGate = origin
    ? gatePoint(origin, drag?.kind === 'parent' ? 'parent' : drag?.kind === 'child' ? 'child' : 'jump')
    : null

  return (
    <div
      ref={host}
      className={`plex${drag ? ' is-wiring' : ''}`}
      onPointerMove={move}
      onPointerUp={endDrag}
      onPointerCancel={cancelDrag}
      onContextMenu={(event) => event.preventDefault()}
    >
      <svg className="plex-lines" width={size.w} height={size.h}>
        {edges.map((edge) => {
          const from = byId.get(edge.fromId)
          const to = byId.get(edge.toId)
          if (!from || !to) return null
          const a =
            edge.kind === 'jump'
              ? gatePoint(from, from.role === 'jump' ? 'center' : 'jump')
              : edge.kind === 'sibling'
                ? gatePoint(from, 'center')
                : from.y < to.y
                  ? gatePoint(from, 'child')
                  : gatePoint(from, 'parent')
          const b =
            edge.kind === 'jump'
              ? gatePoint(to, to.role === 'jump' ? 'center' : 'jump')
              : edge.kind === 'sibling'
                ? gatePoint(to, 'center')
                : from.y < to.y
                  ? gatePoint(to, 'parent')
                  : gatePoint(to, 'child')
          return <path key={edge.id} d={curvePath(a.x, a.y, b.x, b.y)} className={`link link-${edge.kind}`} />
        })}
        {drag?.moved && originGate ? (
          <path d={curvePath(originGate.x, originGate.y, drag.x, drag.y)} className="link link-drag" />
        ) : null}
      </svg>

      {nodes.map((node) => {
        const filledParent = parentsOf(doc, node.id).length > 0
        const filledChild = childrenOf(doc, node.id).length > 0
        const filledJump = jumpsOf(doc, node.id).length > 0
        return (
          <div
            key={node.id}
            className={`thought role-${node.role}${hover === node.id ? ' drop-target' : ''}`}
            data-thought-id={node.id}
            style={{
              left: node.x,
              top: node.y,
              width: node.w,
              height: node.h,
              borderColor: node.thought.color,
              color: node.role === 'active' ? '#f8fbff' : node.thought.color,
            }}
            onClick={() => {
              if (skipClick.current) {
                skipClick.current = false
                return
              }
              onActivate(node.id)
            }}
            onDoubleClick={() => onCreate('child', node.id)}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setMenu({ x: event.clientX, y: event.clientY, id: node.id })
            }}
          >
            <button
              type="button"
              className="gate parent-gate"
              data-filled={filledParent}
              title="Tap to create a parent · drag onto a thought to link"
              onPointerDown={(event) => startGate(event, node.id, 'parent')}
            />
            <button
              type="button"
              className="gate jump-gate"
              data-filled={filledJump}
              title="Tap to create a jump · drag onto a thought to link"
              onPointerDown={(event) => startGate(event, node.id, 'jump')}
            />
            <button
              type="button"
              className="gate child-gate"
              data-filled={filledChild}
              title="Tap to create a child · drag onto a thought to link"
              onPointerDown={(event) => startGate(event, node.id, 'child')}
            />
            {node.thought.label ? <em>{node.thought.label}</em> : null}
            <strong>{node.thought.name}</strong>
            {node.role === 'active' ? (
              <div className="quick-add">
                <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onCreate('parent', node.id) }}>
                  + parent
                </button>
                <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onCreate('jump', node.id) }}>
                  + jump
                </button>
                <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onCreate('child', node.id) }}>
                  + child
                </button>
              </div>
            ) : null}
          </div>
        )
      })}

      <div className="plex-legend">
        <span>tap a dot to create</span>
        <span>drag a dot onto another thought to link</span>
        <span>↑ parent · ↓ child · ← jump</span>
      </div>

      {menu ? (
        <div className="ctx-menu" style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => { onActivate(menu.id); setMenu(null) }}>Activate</button>
          <button type="button" onClick={() => { onCreate('child', menu.id); setMenu(null) }}>Create child</button>
          <button type="button" onClick={() => { onCreate('parent', menu.id); setMenu(null) }}>Create parent</button>
          <button type="button" onClick={() => { onCreate('jump', menu.id); setMenu(null) }}>Create jump</button>
          <button type="button" onClick={() => { onPin(menu.id); setMenu(null) }}>Pin / unpin</button>
          <button type="button" onClick={() => { onForget(menu.id); setMenu(null) }}>Forget</button>
        </div>
      ) : null}
    </div>
  )
}

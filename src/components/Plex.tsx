import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { BrainDocument, CreateKind, PlexZones } from '../types'
import { childrenOf, curvePath, gatePoint, jumpsOf, layoutPlex, parentsOf } from '../lib/plex'

type Menu = { x: number; y: number; id: string } | null
type Drag = { fromId: string; kind: CreateKind; x: number; y: number } | null

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
  const [size, setSize] = useState({ w: 1000, h: 700 })
  const [drag, setDrag] = useState<Drag>(null)
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

  function startGate(event: ReactPointerEvent, fromId: string, kind: CreateKind) {
    event.preventDefault()
    event.stopPropagation()
    const rect = host.current?.getBoundingClientRect()
    if (!rect) return
    setDrag({ fromId, kind, x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  function move(event: ReactPointerEvent) {
    if (!drag || !host.current) return
    const rect = host.current.getBoundingClientRect()
    setDrag({ ...drag, x: event.clientX - rect.left, y: event.clientY - rect.top })
  }

  function endDrag(event: ReactPointerEvent) {
    if (!drag) return
    const target = (event.target as HTMLElement).closest('[data-thought-id]')
    const toId = target?.getAttribute('data-thought-id')
    if (toId && toId !== drag.fromId) onLink(drag.fromId, toId, drag.kind)
    else onCreate(drag.kind, drag.fromId)
    setDrag(null)
  }

  const origin = drag ? byId.get(drag.fromId) : undefined
  const originGate = origin ? gatePoint(origin, drag?.kind === 'parent' ? 'parent' : drag?.kind === 'child' ? 'child' : 'jump') : null

  return (
    <div ref={host} className="plex" onPointerMove={move} onPointerUp={endDrag} onContextMenu={(event) => event.preventDefault()}>
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
        {drag && originGate ? <path d={curvePath(originGate.x, originGate.y, drag.x, drag.y)} className="link link-drag" /> : null}
      </svg>

      {nodes.map((node) => {
        const filledParent = parentsOf(doc, node.id).length > 0
        const filledChild = childrenOf(doc, node.id).length > 0
        const filledJump = jumpsOf(doc, node.id).length > 0
        return (
          <div
            key={node.id}
            className={`thought role-${node.role}`}
            data-thought-id={node.id}
            style={{
              left: node.x,
              top: node.y,
              width: node.w,
              height: node.h,
              borderColor: node.thought.color,
              color: node.role === 'active' ? '#f8fbff' : node.thought.color,
            }}
            onClick={() => onActivate(node.id)}
            onDoubleClick={() => onCreate('child', node.id)}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setMenu({ x: event.clientX, y: event.clientY, id: node.id })
            }}
          >
            <button type="button" className="gate parent-gate" data-filled={filledParent} title="Drag to create / link parent" onPointerDown={(event) => startGate(event, node.id, 'parent')} />
            <button type="button" className="gate jump-gate" data-filled={filledJump} title="Drag to create / link jump" onPointerDown={(event) => startGate(event, node.id, 'jump')} />
            <button type="button" className="gate child-gate" data-filled={filledChild} title="Drag to create / link child" onPointerDown={(event) => startGate(event, node.id, 'child')} />
            {node.thought.label ? <em>{node.thought.label}</em> : null}
            <strong>{node.thought.name}</strong>
          </div>
        )
      })}

      <div className="plex-legend">
        <span>↑ parents</span>
        <span>↓ children</span>
        <span>← jumps</span>
        <span>→ siblings</span>
        <span>drag a gate to link</span>
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

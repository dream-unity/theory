import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { BrainDocument, CreateKind, PlexZones } from '../types'
import { childrenOf, curvePath, gatePoint, jumpsOf, layoutPlex, parentsOf, relationFromPoint, zoneAnchor } from '../lib/plex'

type Menu = { x: number; y: number; id: string } | null
type Drag = {
  fromId: string
  kind: CreateKind
  x: number
  y: number
  startX: number
  startY: number
  moved: boolean
  via: 'gate' | 'body' | 'empty'
} | null
type Draft = { kind: CreateKind; fromId: string; x: number; y: number; name: string }

const TAP_SLOP = 12
const KIND_LABEL: Record<CreateKind, string> = {
  parent: 'parent',
  child: 'child',
  jump: 'jump',
  sibling: 'sibling',
}

export function Plex({
  doc,
  zones,
  expand,
  spark,
  onSparkConsumed,
  onActivate,
  onCommit,
  onLink,
  onForget,
  onPin,
}: {
  doc: BrainDocument
  zones: PlexZones
  expand: boolean
  spark: { kind: CreateKind; fromId: string; seed?: string } | null
  onSparkConsumed: () => void
  onActivate: (id: string) => void
  onCommit: (kind: CreateKind, fromId: string, name: string, dive: boolean) => void
  onLink: (fromId: string, toId: string, kind: CreateKind) => void
  onForget: (id: string) => void
  onPin: (id: string) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const skipClick = useRef(false)
  const [size, setSize] = useState({ w: 1000, h: 700 })
  const [drag, setDrag] = useState<Drag>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [hint, setHint] = useState<{ x: number; y: number; kind: CreateKind } | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
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
  const activeNode = byId.get(zones.active.id)

  useEffect(() => {
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    if (!spark || !activeNode) return
    const point = zoneAnchor(activeNode, spark.kind)
    setDraft({ kind: spark.kind, fromId: spark.fromId, x: point.x, y: point.y, name: spark.seed ?? '' })
    onSparkConsumed()
  }, [spark, activeNode, onSparkConsumed])

  useEffect(() => {
    if (draft) input.current?.focus()
  }, [draft])

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

  function openDraft(kind: CreateKind, fromId: string, x: number, y: number, name = '') {
    setMenu(null)
    setDrag(null)
    setHint(null)
    setDraft({ kind, fromId, x: Math.max(12, Math.min(size.w - 200, x - 90)), y: Math.max(12, Math.min(size.h - 64, y - 24)), name })
  }

  function commitDraft(dive: boolean) {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) {
      setDraft(null)
      host.current?.focus()
      return
    }
    onCommit(draft.kind, draft.fromId, name, dive)
    setDraft(null)
    host.current?.focus()
  }

  function startWire(event: ReactPointerEvent, fromId: string, kind: CreateKind, via: Drag['via']) {
    event.preventDefault()
    event.stopPropagation()
    skipClick.current = true
    const point = localPoint(event)
    host.current?.setPointerCapture(event.pointerId)
    setDraft(null)
    setDrag({ fromId, kind, x: point.x, y: point.y, startX: point.x, startY: point.y, moved: false, via })
  }

  function pointerDown(event: ReactPointerEvent) {
    const target = event.target as HTMLElement
    if (target.closest('.gate, .quick-add, .inline-draft, .ctx-menu')) return
    const point = localPoint(event)
    const hit = hitThought(point.x, point.y)
    if (hit) {
      startWire(event, hit, 'child', 'body')
      return
    }
    startWire(event, zones.active.id, activeNode ? relationFromPoint(activeNode, point.x, point.y) : 'child', 'empty')
  }

  function move(event: ReactPointerEvent) {
    const point = localPoint(event)
    if (!drag) {
      if (draft || (event.target as HTMLElement).closest('.thought, .inline-draft, .ctx-menu')) {
        setHint(null)
        return
      }
      if (activeNode) setHint({ x: point.x, y: point.y, kind: relationFromPoint(activeNode, point.x, point.y) })
      return
    }
    const origin = byId.get(drag.fromId)
    const moved = drag.moved || Math.hypot(point.x - drag.startX, point.y - drag.startY) > TAP_SLOP
    const kind = drag.via === 'gate' || !origin ? drag.kind : relationFromPoint(origin, point.x, point.y)
    setDrag({ ...drag, x: point.x, y: point.y, moved, kind })
    setHover(moved ? hitThought(point.x, point.y, drag.fromId) : null)
  }

  function endDrag(event: ReactPointerEvent) {
    if (!drag) return
    if (host.current?.hasPointerCapture(event.pointerId)) host.current.releasePointerCapture(event.pointerId)
    const point = localPoint(event)
    const moved = drag.moved || Math.hypot(point.x - drag.startX, point.y - drag.startY) > TAP_SLOP
    const targetId = moved ? hitThought(point.x, point.y, drag.fromId) : null
    const origin = byId.get(drag.fromId)
    const kind = drag.via === 'gate' || !origin ? drag.kind : relationFromPoint(origin, point.x, point.y)
    setDrag(null)
    setHover(null)
    if (targetId) {
      onLink(drag.fromId, targetId, kind === 'sibling' ? 'child' : kind)
      return
    }
    if (!moved && drag.via === 'body') {
      skipClick.current = false
      onActivate(drag.fromId)
      return
    }
    openDraft(kind, drag.fromId, point.x, point.y)
  }

  function onKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (draft) return
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key === 'Escape') {
      setMenu(null)
      return
    }
    if (event.key.length === 1 && !/\s/.test(event.key)) {
      event.preventDefault()
      const point = activeNode ? zoneAnchor(activeNode, 'child') : { x: size.w / 2, y: size.h / 2 + 80 }
      openDraft('child', zones.active.id, point.x + 90, point.y + 24, event.key)
    }
    if (event.key === 'Enter') {
      const point = activeNode ? zoneAnchor(activeNode, 'child') : { x: size.w / 2, y: size.h / 2 + 80 }
      openDraft('child', zones.active.id, point.x + 90, point.y + 24)
    }
  }

  const origin = drag ? byId.get(drag.fromId) : undefined
  const originGate = origin
    ? gatePoint(origin, drag?.kind === 'parent' ? 'parent' : drag?.kind === 'child' ? 'child' : 'jump')
    : null
  const draftFrom = draft ? byId.get(draft.fromId) : undefined

  return (
    <div
      ref={host}
      className={`plex${drag ? ' is-wiring' : ''}${draft ? ' is-drafting' : ''}`}
      tabIndex={0}
      onPointerDown={pointerDown}
      onPointerMove={move}
      onPointerUp={endDrag}
      onPointerCancel={() => { setDrag(null); setHover(null) }}
      onKeyDown={onKey}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="space-guide" aria-hidden="true">
        <b className={hint?.kind === 'parent' ? 'on' : undefined}>tap above · parent</b>
        <b className={hint?.kind === 'jump' ? 'on' : undefined}>tap left · jump</b>
        <b className={hint?.kind === 'sibling' ? 'on' : undefined}>tap right · sibling</b>
        <b className={hint?.kind === 'child' ? 'on' : undefined}>tap below · child</b>
      </div>

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
        {draft && draftFrom ? (
          <path
            d={curvePath(gatePoint(draftFrom, 'center').x, gatePoint(draftFrom, 'center').y, draft.x + 90, draft.y + 24)}
            className={`link link-drag link-${draft.kind}`}
          />
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
            onDoubleClick={(event) => {
              event.stopPropagation()
              const point = zoneAnchor(node, 'child')
              openDraft('child', node.id, point.x + 90, point.y + 24)
            }}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setMenu({ x: event.clientX, y: event.clientY, id: node.id })
            }}
          >
            <button type="button" className="gate parent-gate" data-filled={filledParent} title="Parent" onPointerDown={(event) => startWire(event, node.id, 'parent', 'gate')} />
            <button type="button" className="gate jump-gate" data-filled={filledJump} title="Jump" onPointerDown={(event) => startWire(event, node.id, 'jump', 'gate')} />
            <button type="button" className="gate child-gate" data-filled={filledChild} title="Child" onPointerDown={(event) => startWire(event, node.id, 'child', 'gate')} />
            {node.thought.label ? <em>{node.thought.label}</em> : null}
            <strong>{node.thought.name}</strong>
            {node.role === 'active' ? (
              <div className="quick-add">
                <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); openDraft('parent', node.id, node.x + node.w / 2, node.y - 36) }}>+ parent</button>
                <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); openDraft('jump', node.id, node.x - 36, node.y + node.h / 2) }}>+ jump</button>
                <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); openDraft('sibling', node.id, node.x + node.w + 36, node.y + node.h / 2) }}>+ sibling</button>
                <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); openDraft('child', node.id, node.x + node.w / 2, node.y + node.h + 36) }}>+ child</button>
              </div>
            ) : null}
          </div>
        )
      })}

      {hint && !draft && !drag ? (
        <div className={`cursor-hint kind-${hint.kind}`} style={{ left: hint.x + 14, top: hint.y + 10 }}>
          {KIND_LABEL[hint.kind]}
        </div>
      ) : null}

      {draft ? (
        <form
          className={`inline-draft kind-${draft.kind}`}
          style={{ left: draft.x, top: draft.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault()
            commitDraft(false)
          }}
        >
          <em>{KIND_LABEL[draft.kind]} of {byId.get(draft.fromId)?.thought.name ?? 'thought'}</em>
          <input
            ref={input}
            value={draft.name}
            placeholder="Name the thought"
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                setDraft(null)
                host.current?.focus()
              }
              if (event.key === 'Enter' && event.shiftKey) {
                event.preventDefault()
                commitDraft(true)
              }
              if (event.key === 'Tab') {
                event.preventDefault()
                const order: CreateKind[] = ['parent', 'jump', 'sibling', 'child']
                const next = order[(order.indexOf(draft.kind) + (event.shiftKey ? 3 : 1)) % 4]
                if (next) setDraft({ ...draft, kind: next })
              }
            }}
            onBlur={() => {
              window.setTimeout(() => {
                if (document.activeElement !== input.current) commitDraft(false)
              }, 80)
            }}
          />
          <small>Enter add more · Shift+Enter go into it · Tab change relation · Esc cancel</small>
        </form>
      ) : null}

      <div className="plex-legend">
        <span>tap empty space to capture</span>
        <span>type to start a child</span>
        <span>drag a thought onto another to link</span>
      </div>

      {menu ? (
        <div className="ctx-menu" style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => { onActivate(menu.id); setMenu(null) }}>Activate</button>
          <button type="button" onClick={() => { openDraft('child', menu.id, menu.x, menu.y); setMenu(null) }}>Create child</button>
          <button type="button" onClick={() => { openDraft('parent', menu.id, menu.x, menu.y); setMenu(null) }}>Create parent</button>
          <button type="button" onClick={() => { openDraft('jump', menu.id, menu.x, menu.y); setMenu(null) }}>Create jump</button>
          <button type="button" onClick={() => { openDraft('sibling', menu.id, menu.x, menu.y); setMenu(null) }}>Create sibling</button>
          <button type="button" onClick={() => { onPin(menu.id); setMenu(null) }}>Pin / unpin</button>
          <button type="button" onClick={() => { onForget(menu.id); setMenu(null) }}>Forget</button>
        </div>
      ) : null}
    </div>
  )
}

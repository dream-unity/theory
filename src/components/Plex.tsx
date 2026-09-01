import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { BrainDocument, CreateKind, PlexZones } from '../types'
import { childrenOf, curvePath, gatePoint, jumpsOf, layoutPlex, nextCreateKind, parentsOf, relationFromPoint } from '../lib/plex'

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
type Draft = {
  x: number
  y: number
  kind: CreateKind
  name: string
  fromId: string
}
type Press = { x: number; y: number }

const TAP_SLOP = 14
const DRAFT_W = 248
const DRAFT_H = 126
const KINDS: CreateKind[] = ['parent', 'child', 'jump', 'sibling']

export function Plex({
  doc,
  zones,
  expand,
  onActivate,
  onCreate,
  onCommit,
  onLink,
  onForget,
  onPin,
}: {
  doc: BrainDocument
  zones: PlexZones
  expand: boolean
  onActivate: (id: string) => void
  onCreate: (kind: CreateKind, fromId: string) => void
  onCommit: (kind: CreateKind, fromId: string, name: string) => void
  onLink: (fromId: string, toId: string, kind: CreateKind) => void
  onForget: (id: string) => void
  onPin: (id: string) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const skipClick = useRef(false)
  const press = useRef<Press | null>(null)
  const ignoreBlur = useRef(0)
  const [size, setSize] = useState({ w: 1000, h: 700 })
  const [drag, setDrag] = useState<Drag>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [menu, setMenu] = useState<Menu>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

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
  const activeNode = byId.get(doc.activeId) ?? nodes.find((node) => node.role === 'active')

  useEffect(() => {
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    if (!draft) return
    const handle = window.setTimeout(() => input.current?.focus(), 30)
    return () => window.clearTimeout(handle)
  }, [draft?.x, draft?.y, draft?.fromId])

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

  function isChrome(target: EventTarget | null) {
    const el = target as HTMLElement | null
    if (!el) return false
    return Boolean(el.closest('.thought, .gate, .quick-add, .ctx-menu, .inline-draft'))
  }

  function openDraft(point: { x: number; y: number }, kind?: CreateKind) {
    if (!activeNode) return
    const left = Math.max(12, Math.min(size.w - DRAFT_W - 12, point.x - DRAFT_W / 2))
    const top = Math.max(12, Math.min(size.h - DRAFT_H - 12, point.y - 18))
    ignoreBlur.current = Date.now() + 600
    setMenu(null)
    setDraft({
      x: left,
      y: top,
      kind: kind ?? relationFromPoint(activeNode, point),
      name: draft?.name ?? '',
      fromId: activeNode.id,
    })
  }

  function finishDraft() {
    if (!draft) return
    const name = draft.name.trim()
    if (!name) return
    onCommit(draft.kind, draft.fromId, name)
    setDraft(null)
  }

  function startGate(event: ReactPointerEvent, fromId: string, kind: CreateKind) {
    event.preventDefault()
    event.stopPropagation()
    skipClick.current = true
    press.current = null
    const point = localPoint(event)
    host.current?.setPointerCapture(event.pointerId)
    setDraft(null)
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

  function onBackgroundDown(event: ReactPointerEvent) {
    if (event.button !== 0) return
    if (drag || isChrome(event.target)) {
      press.current = null
      return
    }
    press.current = localPoint(event)
  }

  function onBackgroundUp(event: ReactPointerEvent) {
    if (drag) {
      endDrag(event)
      press.current = null
      return
    }
    const start = press.current
    press.current = null
    if (!start || event.button !== 0) return
    const point = localPoint(event)
    if (Math.hypot(point.x - start.x, point.y - start.y) > TAP_SLOP) return
    if (isChrome(event.target) || hitThought(point.x, point.y)) return
    event.preventDefault()
    if (draft?.name.trim()) {
      onCommit(draft.kind, draft.fromId, draft.name.trim())
      setDraft(null)
    }
    openDraft(point)
  }

  const origin = drag ? byId.get(drag.fromId) : undefined
  const originGate = origin
    ? gatePoint(origin, drag?.kind === 'parent' ? 'parent' : drag?.kind === 'child' ? 'child' : 'jump')
    : null
  const draftFrom = draft ? byId.get(draft.fromId) : undefined
  const draftGate = draftFrom
    ? gatePoint(draftFrom, draft.kind === 'parent' ? 'parent' : draft.kind === 'child' ? 'child' : 'jump')
    : null
  const sourceName = draftFrom?.thought.name ?? zones.active.name

  return (
    <div
      ref={host}
      className={`plex${drag ? ' is-wiring' : ''}${draft ? ' is-drafting' : ' is-capturing'}`}
      onPointerDown={onBackgroundDown}
      onPointerMove={move}
      onPointerUp={onBackgroundUp}
      onPointerCancel={() => {
        cancelDrag()
        press.current = null
      }}
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
        {draft && draftGate ? (
          <path
            d={curvePath(draftGate.x, draftGate.y, draft.x + DRAFT_W / 2, draft.y + 28)}
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
            onDoubleClick={() => onCreate('child', node.id)}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setMenu({ x: event.clientX, y: event.clientY, id: node.id })
            }}
          >
            <button type="button" className="gate parent-gate" data-filled={filledParent} title="Tap to create a parent · drag onto a thought to link" onPointerDown={(event) => startGate(event, node.id, 'parent')} />
            <button type="button" className="gate jump-gate" data-filled={filledJump} title="Tap to create a jump · drag onto a thought to link" onPointerDown={(event) => startGate(event, node.id, 'jump')} />
            <button type="button" className="gate child-gate" data-filled={filledChild} title="Tap to create a child · drag onto a thought to link" onPointerDown={(event) => startGate(event, node.id, 'child')} />
            {node.thought.label ? <em>{node.thought.label}</em> : null}
            <strong>{node.thought.name}</strong>
            {node.role === 'active' ? (
              <div className="quick-add">
                <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onCreate('parent', node.id) }}>+ parent</button>
                <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onCreate('jump', node.id) }}>+ jump</button>
                <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onCreate('child', node.id) }}>+ child</button>
              </div>
            ) : null}
          </div>
        )
      })}

      {draft ? (
        <form
          className={`inline-draft kind-${draft.kind}`}
          style={{ left: draft.x, top: draft.y, width: DRAFT_W }}
          onSubmit={(event) => {
            event.preventDefault()
            finishDraft()
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <em>{draft.kind} of {sourceName}</em>
          <input
            ref={input}
            value={draft.name}
            placeholder="Name the thought"
            aria-label={`New ${draft.kind} thought`}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                setDraft(null)
              }
              if (event.key === 'Tab') {
                event.preventDefault()
                setDraft({ ...draft, kind: nextCreateKind(draft.kind) })
              }
            }}
            onBlur={() => {
              if (Date.now() < ignoreBlur.current) {
                input.current?.focus()
              }
            }}
          />
          <div className="draft-kinds">
            {KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className={draft.kind === kind ? 'on' : undefined}
                onClick={() => {
                  ignoreBlur.current = Date.now() + 400
                  setDraft({ ...draft, kind })
                  input.current?.focus()
                }}
              >
                {kind}
              </button>
            ))}
          </div>
          <div className="draft-actions">
            <button type="submit" disabled={!draft.name.trim()}>Create</button>
            <button type="button" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </form>
      ) : null}

      <div className="plex-legend">
        <span>tap empty space to think</span>
        <span>↑ parent · ↓ child · ← jump · → sibling</span>
        <span>tap a dot to create · drag a dot to link</span>
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

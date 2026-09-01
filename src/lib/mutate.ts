import type { BrainDocument, LinkKind, Thought } from '../types'
import { uid, nowIso } from './ids'
import { hasLink } from './plex'
import { SEED } from '../seed'

function stamp(doc: BrainDocument): BrainDocument {
  return { ...doc, updatedAt: nowIso() }
}

export function cloneSeed(): BrainDocument {
  return structuredClone(SEED)
}

export function activate(doc: BrainDocument, id: string): BrainDocument {
  if (id === doc.activeId) return doc
  const history = [id, ...doc.history.filter((item) => item !== id)].slice(0, 40)
  return stamp({ ...doc, activeId: id, history })
}

export function updateThought(doc: BrainDocument, id: string, patch: Partial<Thought>): BrainDocument {
  return stamp({
    ...doc,
    thoughts: doc.thoughts.map((thought) => (thought.id === id ? { ...thought, ...patch } : thought)),
  })
}

export function createLinkedThought(
  doc: BrainDocument,
  fromId: string,
  kind: LinkKind,
  name: string,
): BrainDocument {
  const title = name.trim() || 'New Thought'
  const source = doc.thoughts.find((thought) => thought.id === fromId)
  const thought: Thought = {
    id: uid('t'),
    name: title,
    notes: '',
    color: source?.color ?? '#94a3b8',
    tags: [],
    attachments: [],
  }
  const parent = kind === 'child' ? fromId : kind === 'jump' ? fromId : thought.id
  const child = kind === 'child' ? thought.id : kind === 'jump' ? thought.id : fromId
  const link = { id: uid('e'), kind: kind === 'jump' ? 'jump' as const : 'child' as const, from: parent, to: child }
  if (kind !== 'jump' && kind === 'child') {
    /* parent is fromId, child is new */
  }
  const directed =
    kind === 'jump'
      ? link
      : kind === 'child'
        ? { ...link, from: fromId, to: thought.id }
        : { ...link, kind: 'child' as const, from: thought.id, to: fromId }
  return activate(
    stamp({
      ...doc,
      thoughts: [...doc.thoughts, thought],
      links: hasLink(doc.links, directed.kind, directed.from, directed.to) ? doc.links : [...doc.links, directed],
    }),
    thought.id,
  )
}

export function linkExisting(doc: BrainDocument, fromId: string, toId: string, kind: LinkKind): BrainDocument {
  if (fromId === toId) return doc
  const directed =
    kind === 'jump'
      ? { id: uid('e'), kind: 'jump' as const, from: fromId, to: toId }
      : kind === 'child'
        ? { id: uid('e'), kind: 'child' as const, from: fromId, to: toId }
        : { id: uid('e'), kind: 'child' as const, from: toId, to: fromId }
  if (hasLink(doc.links, directed.kind, directed.from, directed.to)) return doc
  return stamp({ ...doc, links: [...doc.links, directed] })
}

export function forgetThought(doc: BrainDocument, id: string): BrainDocument {
  if (id === doc.homeId) return doc
  const next = stamp({
    ...doc,
    thoughts: doc.thoughts.map((thought) => (thought.id === id ? { ...thought, forgotten: true } : thought)),
    pins: doc.pins.filter((pin) => pin !== id),
    activeId: doc.activeId === id ? doc.homeId : doc.activeId,
  })
  return next
}

export function togglePin(doc: BrainDocument, id: string): BrainDocument {
  const pins = doc.pins.includes(id) ? doc.pins.filter((pin) => pin !== id) : [...doc.pins, id]
  return stamp({ ...doc, pins })
}

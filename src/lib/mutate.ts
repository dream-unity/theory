import type { BrainDocument, Thought } from '../types'
import { uid, nowIso } from './ids'
import { hasLink } from './plex'
import { SEED } from '../seed'

export type CreateKind = 'child' | 'parent' | 'jump'

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

export function createLinkedThought(doc: BrainDocument, fromId: string, kind: CreateKind, name: string): BrainDocument {
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
  const directed =
    kind === 'jump'
      ? { id: uid('e'), kind: 'jump' as const, from: fromId, to: thought.id }
      : kind === 'child'
        ? { id: uid('e'), kind: 'child' as const, from: fromId, to: thought.id }
        : { id: uid('e'), kind: 'child' as const, from: thought.id, to: fromId }
  if (hasLink(doc.links, directed.kind, directed.from, directed.to)) {
    return activate(stamp({ ...doc, thoughts: [...doc.thoughts, thought] }), thought.id)
  }
  return activate(
    stamp({
      ...doc,
      thoughts: [...doc.thoughts, thought],
      links: [...doc.links, directed],
    }),
    thought.id,
  )
}

export function forgetThought(doc: BrainDocument, id: string): BrainDocument {
  if (id === doc.homeId) return doc
  return stamp({
    ...doc,
    thoughts: doc.thoughts.map((thought) => (thought.id === id ? { ...thought, forgotten: true } : thought)),
    pins: doc.pins.filter((pin) => pin !== id),
    activeId: doc.activeId === id ? doc.homeId : doc.activeId,
  })
}

export function togglePin(doc: BrainDocument, id: string): BrainDocument {
  const pins = doc.pins.includes(id) ? doc.pins.filter((pin) => pin !== id) : [...doc.pins, id]
  return stamp({ ...doc, pins })
}

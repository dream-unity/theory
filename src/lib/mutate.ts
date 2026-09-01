import type { Attachment, BrainDocument, CreateKind, Link, Thought } from '../types'
import { uid, nowIso } from './ids'
import { findByName, hasLink } from './plex'
import { SEED } from '../seed'

function stamp(doc: BrainDocument): BrainDocument {
  return { ...doc, updatedAt: nowIso() }
}

export function cloneSeed(): BrainDocument {
  return structuredClone(SEED)
}

export function activate(doc: BrainDocument, id: string): BrainDocument {
  if (id === doc.activeId) return doc
  const exists = doc.thoughts.some((thought) => thought.id === id && !thought.forgotten)
  if (!exists) return doc
  const trimmed = doc.history.slice(0, doc.historyIndex + 1)
  const history = [...trimmed.filter((item) => item !== id), id].slice(-60)
  return stamp({ ...doc, activeId: id, history, historyIndex: history.length - 1 })
}

export function goHistory(doc: BrainDocument, direction: -1 | 1): BrainDocument {
  const next = doc.historyIndex + direction
  if (next < 0 || next >= doc.history.length) return doc
  const id = doc.history[next]
  if (!id) return doc
  return stamp({ ...doc, activeId: id, historyIndex: next })
}

export function updateThought(doc: BrainDocument, id: string, patch: Partial<Thought>): BrainDocument {
  return stamp({
    ...doc,
    thoughts: doc.thoughts.map((thought) => (thought.id === id ? { ...thought, ...patch } : thought)),
  })
}

function linkOf(kind: CreateKind, fromId: string, toId: string): Link {
  if (kind === 'jump') return { id: uid('e'), kind: 'jump', from: fromId, to: toId }
  if (kind === 'child') return { id: uid('e'), kind: 'child', from: fromId, to: toId }
  return { id: uid('e'), kind: 'child', from: toId, to: fromId }
}

export function createLinkedThought(doc: BrainDocument, fromId: string, kind: CreateKind, name: string): BrainDocument {
  const title = name.trim() || 'New Thought'
  const existing = findByName(doc, title)
  if (existing && existing.id !== fromId) return linkThoughts(doc, fromId, existing.id, kind)

  const source = doc.thoughts.find((thought) => thought.id === fromId)
  const thought: Thought = {
    id: uid('t'),
    name: title,
    notes: '',
    color: source?.color ?? '#94a3b8',
    tags: [],
    attachments: [],
  }
  return activate(
    stamp({
      ...doc,
      thoughts: [...doc.thoughts, thought],
      links: [...doc.links, linkOf(kind, fromId, thought.id)],
    }),
    thought.id,
  )
}

export function linkThoughts(doc: BrainDocument, fromId: string, toId: string, kind: CreateKind): BrainDocument {
  if (fromId === toId) return doc
  const directed = linkOf(kind, fromId, toId)
  if (hasLink(doc.links, directed.kind, directed.from, directed.to)) return activate(doc, toId)
  return activate(stamp({ ...doc, links: [...doc.links, directed] }), toId)
}

export function unlinkThoughts(doc: BrainDocument, a: string, b: string): BrainDocument {
  return stamp({
    ...doc,
    links: doc.links.filter((link) => {
      const pair = (link.from === a && link.to === b) || (link.from === b && link.to === a)
      return !pair
    }),
  })
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

export function rememberThought(doc: BrainDocument, id: string): BrainDocument {
  return stamp({
    ...doc,
    thoughts: doc.thoughts.map((thought) => (thought.id === id ? { ...thought, forgotten: false } : thought)),
  })
}

export function togglePin(doc: BrainDocument, id: string): BrainDocument {
  const pins = doc.pins.includes(id) ? doc.pins.filter((pin) => pin !== id) : [...doc.pins, id]
  return stamp({ ...doc, pins })
}

export function addAttachment(doc: BrainDocument, id: string, attachment: Omit<Attachment, 'id'>): BrainDocument {
  const item: Attachment = { id: uid('a'), title: attachment.title, url: attachment.url }
  return stamp({
    ...doc,
    thoughts: doc.thoughts.map((thought) =>
      thought.id === id ? { ...thought, attachments: [...thought.attachments, item] } : thought,
    ),
  })
}

export function removeAttachment(doc: BrainDocument, thoughtId: string, attachmentId: string): BrainDocument {
  return stamp({
    ...doc,
    thoughts: doc.thoughts.map((thought) =>
      thought.id === thoughtId
        ? { ...thought, attachments: thought.attachments.filter((item) => item.id !== attachmentId) }
        : thought,
    ),
  })
}

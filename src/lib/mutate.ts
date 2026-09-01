import type { Attachment, BrainDocument, CreateKind, Link, Thought } from '../types'
import { uid, nowIso } from './ids'
import { findByName, hasLink, parentsOf } from './plex'
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

function linkOf(kind: CreateKind, fromId: string, toId: string, parentId?: string): Link {
  if (kind === 'jump') return { id: uid('e'), kind: 'jump', from: fromId, to: toId }
  if (kind === 'parent') return { id: uid('e'), kind: 'child', from: toId, to: fromId }
  if (kind === 'sibling') return { id: uid('e'), kind: 'child', from: parentId ?? fromId, to: toId }
  return { id: uid('e'), kind: 'child', from: fromId, to: toId }
}

export function createLinkedThought(
  doc: BrainDocument,
  fromId: string,
  kind: CreateKind,
  name: string,
  options: { focus?: 'new' | 'source' } = {},
): BrainDocument {
  const title = name.trim() || 'New Thought'
  const existing = findByName(doc, title)
  if (existing && existing.id !== fromId) {
    return linkThoughts(doc, fromId, existing.id, kind === 'sibling' ? 'child' : kind, options)
  }

  const source = doc.thoughts.find((thought) => thought.id === fromId)
  const thought: Thought = {
    id: uid('t'),
    name: title,
    notes: '',
    color: source?.color ?? '#94a3b8',
    tags: [],
    attachments: [],
  }
  const parentId = kind === 'sibling' ? parentsOf(doc, fromId)[0] : undefined
  const next = stamp({
    ...doc,
    thoughts: [...doc.thoughts, thought],
    links: [...doc.links, linkOf(kind, fromId, thought.id, parentId)],
  })
  return options.focus === 'source' ? next : activate(next, thought.id)
}

export function linkThoughts(
  doc: BrainDocument,
  fromId: string,
  toId: string,
  kind: CreateKind,
  options: { focus?: 'new' | 'source' } = {},
): BrainDocument {
  if (fromId === toId) return doc
  const parentId = kind === 'sibling' ? parentsOf(doc, fromId)[0] : undefined
  const directed = linkOf(kind, fromId, toId, parentId)
  if (hasLink(doc.links, directed.kind, directed.from, directed.to)) {
    return options.focus === 'source' ? doc : activate(doc, toId)
  }
  const next = stamp({ ...doc, links: [...doc.links, directed] })
  return options.focus === 'source' ? next : activate(next, toId)
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

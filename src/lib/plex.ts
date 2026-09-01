import type { BrainDocument, Link, PlexZones, Thought } from '../types'

export function thoughtMap(doc: BrainDocument): Map<string, Thought> {
  return new Map(doc.thoughts.map((thought) => [thought.id, thought]))
}

export function visibleThoughts(doc: BrainDocument): Thought[] {
  return doc.thoughts.filter((thought) => !thought.forgotten)
}

export function parentsOf(doc: BrainDocument, id: string): string[] {
  return doc.links.filter((link) => link.kind === 'child' && link.to === id).map((link) => link.from)
}

export function childrenOf(doc: BrainDocument, id: string): string[] {
  return doc.links.filter((link) => link.kind === 'child' && link.from === id).map((link) => link.to)
}

export function jumpsOf(doc: BrainDocument, id: string): string[] {
  return doc.links
    .filter((link) => link.kind === 'jump' && (link.from === id || link.to === id))
    .map((link) => (link.from === id ? link.to : link.from))
}

export function siblingsOf(doc: BrainDocument, id: string): string[] {
  const seen = new Set<string>()
  for (const parent of parentsOf(doc, id)) {
    for (const child of childrenOf(doc, parent)) {
      if (child !== id) seen.add(child)
    }
  }
  return [...seen]
}

export function resolve(doc: BrainDocument, ids: string[]): Thought[] {
  const map = thoughtMap(doc)
  return ids.map((id) => map.get(id)).filter((thought): thought is Thought => Boolean(thought && !thought.forgotten))
}

export function plexZones(doc: BrainDocument, activeId = doc.activeId): PlexZones | null {
  const active = thoughtMap(doc).get(activeId)
  if (!active || active.forgotten) return null
  return {
    active,
    parents: resolve(doc, parentsOf(doc, activeId)),
    children: resolve(doc, childrenOf(doc, activeId)),
    jumps: resolve(doc, jumpsOf(doc, activeId)),
    siblings: resolve(doc, siblingsOf(doc, activeId)),
  }
}

export function searchThoughts(doc: BrainDocument, query: string): Thought[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return visibleThoughts(doc).filter((thought) => {
    const hay = `${thought.name} ${thought.label ?? ''} ${thought.notes} ${thought.tags.join(' ')}`.toLowerCase()
    return hay.includes(q)
  })
}

export function hasLink(links: Link[], kind: Link['kind'], a: string, b: string): boolean {
  if (kind === 'jump') {
    return links.some((link) => link.kind === 'jump' && ((link.from === a && link.to === b) || (link.from === b && link.to === a)))
  }
  return links.some((link) => link.kind === 'child' && link.from === a && link.to === b)
}

import type { AtlasDocument, AtlasView, Concept, Relation } from '../types'
import { SEED, createConcept } from '../seed'
import { defaultPosition, packView, spawnBeside } from './layout'
import { nowIso, uid } from './ids'

export function visibleConcepts(doc: AtlasDocument, view: AtlasView): Concept[] {
  if (view === 'inbox') return doc.concepts.filter((concept) => concept.inbox || concept.views.includes('inbox'))
  return doc.concepts.filter((concept) => concept.views.includes(view))
}

export function visibleRelations(doc: AtlasDocument, view: AtlasView): Relation[] {
  const ids = new Set(visibleConcepts(doc, view).map((concept) => concept.id))
  return doc.relations.filter((relation) => ids.has(relation.from) && ids.has(relation.to))
}

export function tagCounts(doc: AtlasDocument): Record<string, number> {
  const counts: Record<string, number> = { portal: 0, maturity: 0, stance: 0, form: 0 }
  for (const concept of doc.concepts) {
    for (const tag of concept.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1
    }
  }
  return counts
}

export function updateConcept(doc: AtlasDocument, id: string, patch: Partial<Concept>): AtlasDocument {
  return {
    ...doc,
    revision: doc.revision + 1,
    updatedAt: nowIso(),
    concepts: doc.concepts.map((concept) => (concept.id === id ? { ...concept, ...patch } : concept)),
  }
}

export function moveConcept(doc: AtlasDocument, id: string, x: number, y: number): AtlasDocument {
  return {
    ...doc,
    revision: doc.revision + 1,
    updatedAt: nowIso(),
    positions: { ...doc.positions, [id]: { x, y } },
  }
}

export function addConcept(
  doc: AtlasDocument,
  view: AtlasView,
  input: { title: string; x?: number; y?: number; fromId?: string; verb?: string; quadrant?: Concept['quadrant'] },
): AtlasDocument {
  const from = doc.concepts.find((concept) => concept.id === input.fromId)
  const concept = createConcept({
    id: uid('c'),
    title: input.title,
    quadrant: input.quadrant ?? from?.quadrant ?? 'maker',
    kind: 'facet',
    views: view === 'inbox' ? ['inbox', 'whole-theory'] : [view, 'whole-theory'],
    inbox: view === 'inbox',
  })
  const origin = from ? doc.positions[from.id] : undefined
  const position =
    input.x !== undefined && input.y !== undefined
      ? { x: input.x, y: input.y }
      : origin
        ? spawnBeside(origin, doc.concepts.length)
        : defaultPosition(concept, visibleConcepts(doc, view))
  const relations = input.fromId
    ? [...doc.relations, { id: uid('e'), from: input.fromId, to: concept.id, verb: input.verb ?? 'relates to' }]
    : doc.relations
  return {
    ...doc,
    revision: doc.revision + 1,
    updatedAt: nowIso(),
    concepts: [...doc.concepts, concept],
    relations,
    positions: { ...doc.positions, [concept.id]: position },
  }
}

export function addRelation(doc: AtlasDocument, from: string, to: string, verb = 'relates to'): AtlasDocument {
  if (from === to) return doc
  if (doc.relations.some((relation) => relation.from === from && relation.to === to)) return doc
  return {
    ...doc,
    revision: doc.revision + 1,
    updatedAt: nowIso(),
    relations: [...doc.relations, { id: uid('e'), from, to, verb }],
  }
}

export function removeConcept(doc: AtlasDocument, id: string): AtlasDocument {
  const { [id]: _removed, ...positions } = doc.positions
  return {
    ...doc,
    revision: doc.revision + 1,
    updatedAt: nowIso(),
    concepts: doc.concepts.filter((concept) => concept.id !== id),
    relations: doc.relations.filter((relation) => relation.from !== id && relation.to !== id),
    positions,
  }
}

export function fileConcept(doc: AtlasDocument, id: string, view: AtlasView): AtlasDocument {
  return updateConcept(doc, id, {
    inbox: view === 'inbox',
    views: Array.from(new Set([view, 'whole-theory'])),
  })
}

export function ensurePositions(doc: AtlasDocument, view: AtlasView): AtlasDocument {
  return { ...doc, positions: packView(doc.concepts, doc.positions, view) }
}

export function cloneSeed(): AtlasDocument {
  return structuredClone(SEED)
}

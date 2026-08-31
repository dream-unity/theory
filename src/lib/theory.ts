import type {
  Provenance,
  TheoryDocument,
  TheoryEdge,
  TheoryNode,
  TheoryNodeType,
  TheoryView,
} from '../types'

export const now = () => new Date().toISOString()

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled'

export const makeId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const newProvenance = (derivedFrom: string[] = []): Provenance => {
  const timestamp = now()
  return {
    origin: 'human',
    createdBy: 'Dream Unity editor',
    createdAt: timestamp,
    updatedBy: 'Dream Unity editor',
    updatedAt: timestamp,
    derivedFrom,
  }
}

export const createNode = (
  title: string,
  type: TheoryNodeType = 'concept',
  derivedFrom: string[] = [],
): TheoryNode => ({
  id: makeId('node'),
  slug: slugify(title),
  type,
  title,
  essence: '',
  bodyMarkdown: '',
  aliases: [],
  facets: {
    portals: [],
    forms: [],
    phases: ['ether'],
    scales: ['self'],
    topics: [],
  },
  epistemics: {
    maturity: 'seed',
    stance: 'open',
    confidence: 'unknown',
    knowledgeModes: [],
  },
  sources: [],
  provenance: newProvenance(derivedFrom),
})

export const createEdge = (
  from: string,
  to: string,
  relation = 'relates to',
  family: TheoryEdge['family'] = 'correspondence',
): TheoryEdge => ({
  id: makeId('edge'),
  from,
  to,
  relation,
  rationale: '',
  family,
  status: 'proposed',
  evidenceIds: [],
  provenance: newProvenance(),
})

export function touchDocument(document: TheoryDocument): TheoryDocument {
  return {
    ...document,
    meta: {
      ...document.meta,
      revision: document.meta.revision + 1,
      updatedAt: now(),
    },
  }
}

export function withUpdatedNode(
  document: TheoryDocument,
  id: string,
  updater: (node: TheoryNode) => TheoryNode,
): TheoryDocument {
  const timestamp = now()
  return touchDocument({
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === id
        ? {
            ...updater(node),
            provenance: {
              ...node.provenance,
              updatedAt: timestamp,
              updatedBy: 'Dream Unity editor',
            },
          }
        : node,
    ),
  })
}

export function withUpdatedEdge(
  document: TheoryDocument,
  id: string,
  updater: (edge: TheoryEdge) => TheoryEdge,
): TheoryDocument {
  const timestamp = now()
  return touchDocument({
    ...document,
    edges: document.edges.map((edge) =>
      edge.id === id
        ? {
            ...updater(edge),
            provenance: { ...edge.provenance, updatedAt: timestamp },
          }
        : edge,
    ),
  })
}

export function addNodeToView(
  document: TheoryDocument,
  node: TheoryNode,
  viewId: string,
  position: { x: number; y: number },
): TheoryDocument {
  const timestamp = now()
  return touchDocument({
    ...document,
    nodes: [...document.nodes, node],
    views: document.views.map((view) =>
      view.id === viewId
        ? {
            ...view,
            includedNodeIds: [...view.includedNodeIds, node.id],
            positions: {
              ...view.positions,
              [node.id]: { ...position, updatedAt: timestamp },
            },
          }
        : view,
    ),
  })
}

export function addEdge(document: TheoryDocument, edge: TheoryEdge): TheoryDocument {
  return touchDocument({ ...document, edges: [...document.edges, edge] })
}

export function updateNodePosition(
  document: TheoryDocument,
  viewId: string,
  nodeId: string,
  position: { x: number; y: number },
): TheoryDocument {
  const timestamp = now()
  return touchDocument({
    ...document,
    views: document.views.map((view) =>
      view.id === viewId
        ? {
            ...view,
            positions: {
              ...view.positions,
              [nodeId]: { ...view.positions[nodeId], ...position, pinned: true, updatedAt: timestamp },
            },
          }
        : view,
    ),
  })
}

export function createView(
  title: string,
  focusQuestion: string,
  nodeIds: string[],
  sourceView?: TheoryView,
): TheoryView {
  const timestamp = now()
  const positions = Object.fromEntries(
    nodeIds.map((id, index) => {
      const source = sourceView?.positions[id]
      const fallback = {
        x: (index % 4) * 330,
        y: Math.floor(index / 4) * 230,
        updatedAt: timestamp,
      }
      return [id, source ? { ...source } : fallback]
    }),
  )
  return {
    id: makeId('view'),
    title,
    description: '',
    focusQuestion,
    includedNodeIds: nodeIds,
    positions,
    collapsedClusters: [],
    visibleEdgeFamilies: ['structure', 'dynamics', 'reasoning', 'correspondence', 'integration', 'provenance'],
  }
}

export function archiveNode(document: TheoryDocument, id: string): TheoryDocument {
  return withUpdatedNode(document, id, (node) => ({
    ...node,
    epistemics: { ...node.epistemics, stance: 'archived' },
    facets: {
      ...node.facets,
      phases: Array.from(new Set([...node.facets.phases, 'return'])),
    },
  }))
}

function latestByTimestamp<T extends { id: string }>(
  left: T[],
  right: T[],
  timestamp: (item: T) => string,
) {
  const result = new Map<string, T>()
  for (const item of [...left, ...right]) {
    const existing = result.get(item.id)
    if (!existing || timestamp(item) >= timestamp(existing)) result.set(item.id, item)
  }
  return [...result.values()]
}

export interface MergeResult {
  document: TheoryDocument
  conflicts: string[]
}

export function mergeDocuments(local: TheoryDocument, remote: TheoryDocument): MergeResult {
  const conflicts: string[] = []
  const remoteNodes = new Map(remote.nodes.map((node) => [node.id, node]))
  for (const node of local.nodes) {
    const other = remoteNodes.get(node.id)
    if (
      other &&
      node.provenance.updatedAt === other.provenance.updatedAt &&
      JSON.stringify(node) !== JSON.stringify(other)
    ) {
      conflicts.push(`Concept: ${node.title}`)
    }
  }

  const tombstones = latestByTimestamp(local.tombstones, remote.tombstones, (item) => item.deletedAt)
  const deletedNodes = new Set(tombstones.filter((item) => item.entity === 'node').map((item) => item.id))
  const deletedEdges = new Set(tombstones.filter((item) => item.entity === 'edge').map((item) => item.id))

  const nodes = latestByTimestamp(local.nodes, remote.nodes, (item) => item.provenance.updatedAt).filter(
    (item) => !deletedNodes.has(item.id),
  )
  const edges = latestByTimestamp(local.edges, remote.edges, (item) => item.provenance.updatedAt).filter(
    (item) => !deletedEdges.has(item.id),
  )
  const views = mergeViews(local.views, remote.views)
  const updatedAt = local.meta.updatedAt >= remote.meta.updatedAt ? local.meta.updatedAt : remote.meta.updatedAt

  return {
    document: {
      ...local,
      meta: {
        ...local.meta,
        revision: Math.max(local.meta.revision, remote.meta.revision) + 1,
        updatedAt,
      },
      nodes,
      edges,
      views,
      tombstones,
    },
    conflicts,
  }
}

function mergeViews(local: TheoryView[], remote: TheoryView[]): TheoryView[] {
  const merged = new Map<string, TheoryView>()
  for (const view of [...remote, ...local]) {
    const existing = merged.get(view.id)
    if (!existing) {
      merged.set(view.id, view)
      continue
    }
    const positions = { ...existing.positions }
    for (const [id, position] of Object.entries(view.positions)) {
      if (!positions[id] || position.updatedAt >= positions[id].updatedAt) positions[id] = position
    }
    merged.set(view.id, {
      ...existing,
      ...view,
      includedNodeIds: Array.from(new Set([...existing.includedNodeIds, ...view.includedNodeIds])),
      positions,
    })
  }
  return [...merged.values()]
}

export function validateDocument(value: unknown): value is TheoryDocument {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<TheoryDocument>
  return (
    candidate.schemaVersion === 1 &&
    !!candidate.meta &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.edges) &&
    Array.isArray(candidate.views) &&
    Array.isArray(candidate.tombstones)
  )
}

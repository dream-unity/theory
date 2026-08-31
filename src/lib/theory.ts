import {
  CONFIDENCE_LEVELS,
  FORMS,
  MATURITY_LEVELS,
  NODE_TYPES,
  PHASES,
  PORTALS,
  STANCES,
} from '../types'
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

export const newProvenance = (
  derivedFrom: string[] = [],
  actor = 'Local Dream Unity editor',
  origin: Provenance['origin'] = 'human',
): Provenance => {
  const timestamp = now()
  return {
    origin,
    createdBy: actor,
    createdAt: timestamp,
    updatedBy: actor,
    updatedAt: timestamp,
    derivedFrom,
  }
}

export const createNode = (
  title: string,
  type: TheoryNodeType = 'concept',
  derivedFrom: string[] = [],
  actor = 'Local Dream Unity editor',
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
    phases: [],
    scales: [],
    topics: [],
  },
  epistemics: {
    maturity: 'seed',
    stance: 'open',
    confidence: 'unknown',
    knowledgeModes: [],
  },
  sources: [],
  provenance: newProvenance(derivedFrom, actor),
})

export const createEdge = (
  from: string,
  to: string,
  relation = 'relates to',
  family: TheoryEdge['family'] = 'correspondence',
  actor = 'Local Dream Unity editor',
): TheoryEdge => ({
  id: makeId('edge'),
  from,
  to,
  relation,
  rationale: '',
  family,
  status: 'proposed',
  evidenceIds: [],
  provenance: newProvenance([], actor),
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
  actor = 'Local Dream Unity editor',
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
              updatedBy: actor,
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
  actor = 'Local Dream Unity editor',
): TheoryDocument {
  const timestamp = now()
  return touchDocument({
    ...document,
    edges: document.edges.map((edge) =>
      edge.id === id
        ? {
            ...updater(edge),
            provenance: { ...edge.provenance, updatedAt: timestamp, updatedBy: actor },
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

export function archiveNode(document: TheoryDocument, id: string, actor = 'Local Dream Unity editor'): TheoryDocument {
  return withUpdatedNode(document, id, (node) => ({
    ...node,
    epistemics: { ...node.epistemics, stance: node.epistemics.stance === 'archived' ? 'provisional' : 'archived' },
    facets: {
      ...node.facets,
      phases: node.epistemics.stance === 'archived'
        ? node.facets.phases.filter((phase) => phase !== 'return')
        : Array.from(new Set([...node.facets.phases, 'return'])),
    },
  }), actor)
}

export function deleteEdge(document: TheoryDocument, id: string): TheoryDocument {
  if (!document.edges.some((edge) => edge.id === id)) return document
  return touchDocument({
    ...document,
    edges: document.edges.filter((edge) => edge.id !== id),
    tombstones: [
      ...document.tombstones.filter((tombstone) => tombstone.id !== id),
      { id, entity: 'edge', deletedAt: now() },
    ],
  })
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
  if (!hasShape(value, ['schemaVersion', 'meta', 'nodes', 'edges', 'views', 'tombstones'])) return false
  if (value.schemaVersion !== 1 || !validateMeta(value.meta)) return false
  if (!Array.isArray(value.nodes) || !value.nodes.every(validateNode)) return false
  if (!Array.isArray(value.edges) || !value.edges.every(validateEdge)) return false
  if (!Array.isArray(value.views) || value.views.length === 0 || !value.views.every(validateViewShape)) return false
  if (!Array.isArray(value.tombstones) || !value.tombstones.every(validateTombstone)) return false

  const nodes = value.nodes as TheoryNode[]
  const edges = value.edges as TheoryEdge[]
  const views = value.views as TheoryView[]
  const tombstones = value.tombstones as TheoryDocument['tombstones']

  const nodeIds = new Set(nodes.map(({ id }) => id))
  const edgeIds = new Set(edges.map(({ id }) => id))
  const viewIds = new Set(views.map(({ id }) => id))
  const tombstoneIds = new Set(tombstones.map(({ id }) => id))
  const sourceReferenceIdList = nodes.flatMap(({ sources }) => sources.map(({ id }) => id))
  const sourceReferenceIds = new Set(sourceReferenceIdList)

  if (nodeIds.size !== nodes.length || edgeIds.size !== edges.length || viewIds.size !== views.length) return false
  if (tombstoneIds.size !== tombstones.length) return false
  if (sourceReferenceIds.size !== sourceReferenceIdList.length) return false

  const liveIds = [...nodeIds, ...edgeIds, ...viewIds]
  if (new Set(liveIds).size !== liveIds.length) return false
  if ([...tombstoneIds].some((id) => liveIds.includes(id))) return false
  if ([...sourceReferenceIds].some((id) => liveIds.includes(id) || tombstoneIds.has(id))) return false

  const evidenceNodeIds = new Set(nodes.filter(({ type }) => type === 'evidence').map(({ id }) => id))
  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) return false
    if (edge.evidenceIds.some((id) => !evidenceNodeIds.has(id))) return false
  }

  for (const view of views) {
    const included = new Set(view.includedNodeIds)
    const positionIds = Object.keys(view.positions)
    if (view.includedNodeIds.some((id) => !nodeIds.has(id))) return false
    if (positionIds.some((id) => !nodeIds.has(id) || !included.has(id))) return false
    if (view.includedNodeIds.some((id) => !Object.hasOwn(view.positions, id))) return false
    if (view.rootNodeId !== undefined && !included.has(view.rootNodeId)) return false
    if (view.collapsedClusters.some((id) => !included.has(id))) return false
    if (view.guidedPath?.some((id) => !included.has(id))) return false
  }

  for (const tombstone of tombstones) {
    if (tombstone.entity === 'node' && nodeIds.has(tombstone.id)) return false
    if (tombstone.entity === 'edge' && edgeIds.has(tombstone.id)) return false
    if (tombstone.entity === 'view' && viewIds.has(tombstone.id)) return false
  }

  const provenanceTargets = new Set([...liveIds, ...sourceReferenceIds, ...tombstoneIds])
  const provenances = [...nodes.map(({ provenance }) => provenance), ...edges.map(({ provenance }) => provenance)]
  if (provenances.some(({ derivedFrom }) => derivedFrom.some((id) => !provenanceTargets.has(id)))) return false

  return true
}

type UnknownRecord = Record<string, unknown>

const NODE_TYPE_SET = new Set<string>(NODE_TYPES)
const PORTAL_SET = new Set<string>(PORTALS)
const FORM_SET = new Set<string>(FORMS)
const PHASE_SET = new Set<string>(PHASES)
const MATURITY_SET = new Set<string>(MATURITY_LEVELS)
const STANCE_SET = new Set<string>(STANCES)
const CONFIDENCE_SET = new Set<string>(CONFIDENCE_LEVELS)
const KNOWLEDGE_MODE_SET = new Set([
  'empirical',
  'logical',
  'phenomenological',
  'interpretive',
  'normative',
  'symbolic',
  'speculative',
  'design',
])
const EDGE_FAMILY_SET = new Set(['structure', 'dynamics', 'reasoning', 'correspondence', 'integration', 'provenance'])
const RELATION_STATUS_SET = new Set(['proposed', 'accepted', 'contested', 'superseded'])
const ORIGIN_SET = new Set(['human', 'source', 'imported', 'ai-proposed'])
const TOMBSTONE_ENTITY_SET = new Set(['node', 'edge', 'view'])

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasShape(value: unknown, required: string[], optional: string[] = []): value is UnknownRecord {
  if (!isRecord(value)) return false
  const allowed = new Set([...required, ...optional])
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.has(key))
}

const isString = (value: unknown): value is string => typeof value === 'string'
const isNonEmptyString = (value: unknown): value is string => isString(value) && value.trim().length > 0
const isOptionalString = (value: unknown) => value === undefined || isString(value)
const isOptionalBoolean = (value: unknown) => value === undefined || typeof value === 'boolean'
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function isTimestamp(value: unknown): value is string {
  if (!isString(value)) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const canonical = date.toISOString()
  return value === canonical || (canonical.endsWith('.000Z') && value === canonical.replace('.000Z', 'Z'))
}

function isUniqueStringArray(value: unknown, allowed?: Set<string>): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => isNonEmptyString(item) && (!allowed || allowed.has(item))) &&
    new Set(value).size === value.length
}

function validateMeta(value: unknown) {
  if (!hasShape(value, ['id', 'title', 'subtitle', 'repository', 'branch', 'dataPath', 'revision', 'createdAt', 'updatedAt'])) return false
  return isNonEmptyString(value.id) &&
    isString(value.title) &&
    isString(value.subtitle) &&
    isNonEmptyString(value.repository) &&
    isNonEmptyString(value.branch) &&
    isNonEmptyString(value.dataPath) &&
    typeof value.revision === 'number' &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 0 &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    Date.parse(value.updatedAt) >= Date.parse(value.createdAt)
}

function validateProvenance(value: unknown): value is Provenance {
  if (!hasShape(value, ['origin', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt', 'derivedFrom'])) return false
  return isString(value.origin) && ORIGIN_SET.has(value.origin) &&
    isNonEmptyString(value.createdBy) &&
    isTimestamp(value.createdAt) &&
    isNonEmptyString(value.updatedBy) &&
    isTimestamp(value.updatedAt) &&
    Date.parse(value.updatedAt) >= Date.parse(value.createdAt) &&
    isUniqueStringArray(value.derivedFrom)
}

function validateSourceReference(value: unknown) {
  if (!hasShape(value, ['id', 'title'], ['url', 'locator', 'note'])) return false
  return isNonEmptyString(value.id) &&
    isString(value.title) &&
    isOptionalString(value.url) &&
    isOptionalString(value.locator) &&
    isOptionalString(value.note)
}

function validateFacets(value: unknown) {
  if (!hasShape(value, ['portals', 'forms', 'phases', 'scales', 'topics'])) return false
  return isUniqueStringArray(value.portals, PORTAL_SET) &&
    isUniqueStringArray(value.forms, FORM_SET) &&
    isUniqueStringArray(value.phases, PHASE_SET) &&
    isUniqueStringArray(value.scales) &&
    isUniqueStringArray(value.topics)
}

function validateEpistemics(value: unknown) {
  if (!hasShape(
    value,
    ['maturity', 'stance', 'confidence', 'knowledgeModes'],
    ['confidenceRationale', 'scope', 'lastReviewedAt'],
  )) return false
  return isString(value.maturity) && MATURITY_SET.has(value.maturity) &&
    isString(value.stance) && STANCE_SET.has(value.stance) &&
    isString(value.confidence) && CONFIDENCE_SET.has(value.confidence) &&
    isOptionalString(value.confidenceRationale) &&
    isUniqueStringArray(value.knowledgeModes, KNOWLEDGE_MODE_SET) &&
    isOptionalString(value.scope) &&
    (value.lastReviewedAt === undefined || isTimestamp(value.lastReviewedAt))
}

function validateMirror(value: unknown) {
  if (!hasShape(value, [], ['directExperience', 'representation', 'primalValue', 'inversionRisk', 'falsifier', 'restoringAction'])) return false
  return isOptionalString(value.directExperience) &&
    isOptionalString(value.representation) &&
    isOptionalString(value.primalValue) &&
    isOptionalString(value.inversionRisk) &&
    isOptionalString(value.falsifier) &&
    isOptionalString(value.restoringAction)
}

function validateNode(value: unknown): value is TheoryNode {
  if (!hasShape(
    value,
    ['id', 'slug', 'type', 'title', 'essence', 'bodyMarkdown', 'aliases', 'facets', 'epistemics', 'sources', 'provenance'],
    ['mirror'],
  )) return false
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.slug)) return false
  if (!isString(value.type) || !NODE_TYPE_SET.has(value.type)) return false
  if (!isString(value.title) || !isString(value.essence) || !isString(value.bodyMarkdown)) return false
  if (!isUniqueStringArray(value.aliases) || !validateFacets(value.facets) || !validateEpistemics(value.epistemics)) return false
  if (!Array.isArray(value.sources) || !value.sources.every(validateSourceReference)) return false
  const sourceIds = value.sources.map((source) => (source as { id: string }).id)
  if (new Set(sourceIds).size !== sourceIds.length) return false
  if (value.mirror !== undefined && !validateMirror(value.mirror)) return false
  return validateProvenance(value.provenance)
}

function validateEdge(value: unknown): value is TheoryEdge {
  if (!hasShape(
    value,
    ['id', 'from', 'to', 'relation', 'rationale', 'family', 'status', 'evidenceIds', 'provenance'],
    ['confidence'],
  )) return false
  return isNonEmptyString(value.id) &&
    isNonEmptyString(value.from) &&
    isNonEmptyString(value.to) &&
    isString(value.relation) &&
    isString(value.rationale) &&
    isString(value.family) && EDGE_FAMILY_SET.has(value.family) &&
    isString(value.status) && RELATION_STATUS_SET.has(value.status) &&
    (value.confidence === undefined || (isString(value.confidence) && value.confidence !== 'unknown' && CONFIDENCE_SET.has(value.confidence))) &&
    isUniqueStringArray(value.evidenceIds) &&
    validateProvenance(value.provenance)
}

function validateViewNodeState(value: unknown) {
  if (!hasShape(value, ['x', 'y', 'updatedAt'], ['pinned', 'hidden'])) return false
  return isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isTimestamp(value.updatedAt) &&
    isOptionalBoolean(value.pinned) &&
    isOptionalBoolean(value.hidden)
}

function validateViewShape(value: unknown): value is TheoryView {
  if (!hasShape(
    value,
    ['id', 'title', 'description', 'focusQuestion', 'includedNodeIds', 'positions', 'collapsedClusters', 'visibleEdgeFamilies'],
    ['rootNodeId', 'guidedPath'],
  )) return false
  if (!isNonEmptyString(value.id) || !isString(value.title) || !isString(value.description) || !isString(value.focusQuestion)) return false
  if (value.rootNodeId !== undefined && !isNonEmptyString(value.rootNodeId)) return false
  if (!isUniqueStringArray(value.includedNodeIds) || !isRecord(value.positions)) return false
  if (!Object.keys(value.positions).every(isNonEmptyString) || !Object.values(value.positions).every(validateViewNodeState)) return false
  if (!isUniqueStringArray(value.collapsedClusters) || !isUniqueStringArray(value.visibleEdgeFamilies, EDGE_FAMILY_SET)) return false
  return value.guidedPath === undefined || isUniqueStringArray(value.guidedPath)
}

function validateTombstone(value: unknown): value is TheoryDocument['tombstones'][number] {
  if (!hasShape(value, ['id', 'entity', 'deletedAt'])) return false
  return isNonEmptyString(value.id) &&
    isString(value.entity) && TOMBSTONE_ENTITY_SET.has(value.entity) &&
    isTimestamp(value.deletedAt)
}

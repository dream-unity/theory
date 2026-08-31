import { describe, expect, it } from 'vitest'
import { SEED_DOCUMENT } from '../seed'
import type { TheoryDocument, TheoryNode, TheoryView } from '../types'
import { createEdge, createNode, mergeDocuments, slugify, validateDocument } from './theory'

const TIMESTAMP = '2026-01-01T00:00:00.000Z'

const document = (updatedAt: string): TheoryDocument => ({
  schemaVersion: 1,
  meta: {
    id: 'dream-unity-theory',
    title: 'Dream Unity',
    subtitle: '',
    repository: 'dream-unity/theory',
    branch: 'main',
    dataPath: 'public/data/theory.json',
    revision: 1,
    createdAt: updatedAt,
    updatedAt,
  },
  nodes: [],
  edges: [],
  views: [{
    id: 'empty-view',
    title: 'Empty view',
    description: '',
    focusQuestion: '',
    includedNodeIds: [],
    positions: {},
    collapsedClusters: [],
    visibleEdgeFamilies: [],
  }],
  tombstones: [],
})

const viewFor = (node: TheoryNode): TheoryView => ({
  id: 'view-one',
  title: 'One node',
  description: '',
  focusQuestion: '',
  rootNodeId: node.id,
  includedNodeIds: [node.id],
  positions: { [node.id]: { x: 0, y: 0, updatedAt: TIMESTAMP } },
  collapsedClusters: [],
  visibleEdgeFamilies: ['structure', 'dynamics', 'reasoning', 'correspondence', 'integration', 'provenance'],
  guidedPath: [node.id],
})

describe('theory document helpers', () => {
  it('creates safe slugs and typed entities', () => {
    expect(slugify(' Ghost in the Mirror! ')).toBe('ghost-in-the-mirror')
    expect(createNode('Primality').type).toBe('concept')
    expect(createEdge('a', 'b', 'enables').relation).toBe('enables')
  })

  it('keeps the newest node during a merge', () => {
    const oldNode = createNode('Old title')
    oldNode.provenance.updatedAt = '2026-01-01T00:00:00.000Z'
    const newNode = { ...oldNode, title: 'New title', provenance: { ...oldNode.provenance, updatedAt: '2026-02-01T00:00:00.000Z' } }
    const local = { ...document('2026-02-01T00:00:00.000Z'), nodes: [newNode] }
    const remote = { ...document('2026-01-01T00:00:00.000Z'), nodes: [oldNode] }
    expect(mergeDocuments(local, remote).document.nodes[0].title).toBe('New title')
  })

  it('accepts the canonical seed and a valid empty document', () => {
    expect(validateDocument(SEED_DOCUMENT)).toBe(true)
    expect(validateDocument(document(TIMESTAMP))).toBe(true)
  })

  it('rejects missing top-level fields and null entities', () => {
    expect(validateDocument({ schemaVersion: 1 })).toBe(false)
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [null] })).toBe(false)
    expect(validateDocument({ ...document(TIMESTAMP), views: [] })).toBe(false)
  })

  it('rejects duplicate entity identifiers', () => {
    const first = createNode('First')
    const duplicate = { ...createNode('Second'), id: first.id }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [first, duplicate] })).toBe(false)

    const second = createNode('Second')
    const firstEdge = createEdge(first.id, second.id)
    const duplicateEdge = { ...createEdge(second.id, first.id), id: firstEdge.id }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [first, second], edges: [firstEdge, duplicateEdge] })).toBe(false)

    const view = viewFor(first)
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [first], views: [view, { ...view }] })).toBe(false)

    const firstWithSource = { ...createNode('First source owner'), sources: [{ id: 'source-ref-one', title: 'Source' }] }
    const secondWithSource = { ...createNode('Second source owner'), sources: [{ id: 'source-ref-one', title: 'Duplicate source' }] }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [firstWithSource, secondWithSource] })).toBe(false)
  })

  it('rejects dangling edge endpoints', () => {
    const source = createNode('Source')
    const edge = createEdge(source.id, 'missing-node', 'supports', 'reasoning')
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [source], edges: [edge] })).toBe(false)
  })

  it('rejects dangling view membership and inconsistent positions', () => {
    const node = createNode('Visible node')
    const danglingView = {
      ...viewFor(node),
      includedNodeIds: ['missing-node'],
      positions: { 'missing-node': { x: 0, y: 0, updatedAt: TIMESTAMP } },
      rootNodeId: 'missing-node',
      guidedPath: ['missing-node'],
    }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [node], views: [danglingView] })).toBe(false)

    const missingPosition = { ...viewFor(node), positions: {} }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [node], views: [missingPosition] })).toBe(false)

    const extraPosition = {
      ...viewFor(node),
      positions: {
        ...viewFor(node).positions,
        'missing-node': { x: 1, y: 1, updatedAt: TIMESTAMP },
      },
    }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [node], views: [extraPosition] })).toBe(false)
  })

  it('requires edge evidence references to resolve to Evidence nodes', () => {
    const claim = createNode('Claim', 'claim')
    const concept = createNode('Not evidence')
    const evidence = createNode('Observation', 'evidence')
    const edge = createEdge(evidence.id, claim.id, 'supports', 'reasoning')

    edge.evidenceIds = ['missing-evidence']
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [claim, concept, evidence], edges: [edge] })).toBe(false)

    edge.evidenceIds = [concept.id]
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [claim, concept, evidence], edges: [edge] })).toBe(false)

    edge.evidenceIds = [evidence.id]
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [claim, concept, evidence], edges: [edge] })).toBe(true)
  })

  it('rejects invalid enums, timestamps, lineage, and live tombstones', () => {
    const node = createNode('Node')
    const invalidType = { ...node, type: 'assertion' }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [invalidType] })).toBe(false)

    const invalidTimestamp = {
      ...node,
      provenance: { ...node.provenance, updatedAt: 'yesterday' },
    }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [invalidTimestamp] })).toBe(false)

    const danglingLineage = {
      ...node,
      provenance: { ...node.provenance, derivedFrom: ['missing-node'] },
    }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [danglingLineage] })).toBe(false)

    const liveTombstone = { id: node.id, entity: 'node' as const, deletedAt: TIMESTAMP }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [node], tombstones: [liveTombstone] })).toBe(false)
  })

  it('rejects unknown schema-v1 fields', () => {
    const node = { ...createNode('Node'), unrecognised: true }
    expect(validateDocument({ ...document(TIMESTAMP), nodes: [node] })).toBe(false)
  })
})

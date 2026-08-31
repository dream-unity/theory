import { describe, expect, it } from 'vitest'
import type { TheoryDocument } from '../types'
import { createEdge, createNode, mergeDocuments, slugify, validateDocument } from './theory'

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
  views: [],
  tombstones: [],
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

  it('rejects malformed data', () => {
    expect(validateDocument({ schemaVersion: 1 })).toBe(false)
    expect(validateDocument(document('2026-01-01T00:00:00.000Z'))).toBe(true)
  })
})

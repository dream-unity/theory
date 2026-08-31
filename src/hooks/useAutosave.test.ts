import { describe, expect, it } from 'vitest'
import { SEED_DOCUMENT } from '../seed'
import type { GithubSyncMarker } from '../lib/local-store'
import { classifyStartupSync, threeWayMergeDocuments } from './useAutosave'

const markerFor = (document: typeof SEED_DOCUMENT, sha = 'base-sha'): GithubSyncMarker => ({
  version: 1,
  target: 'dream-unity/theory\u0000theory-live\u0000public/data/theory.json',
  sha,
  documentRevision: document.meta.revision,
  documentUpdatedAt: document.meta.updatedAt,
  syncedAt: '2026-08-31T01:00:00.000Z',
  baseDocument: document,
})

describe('startup synchronization classification', () => {
  it('permits upload only when GitHub is still the persisted common ancestor', () => {
    const base = structuredClone(SEED_DOCUMENT)
    const local = structuredClone(base)
    local.nodes[0].title = 'Local refinement'
    expect(classifyStartupSync(local, { document: base, sha: 'base-sha' }, markerFor(base))).toBe('local-ahead')
  })

  it('requires explicit review whenever an unknown or changed remote differs', () => {
    const base = structuredClone(SEED_DOCUMENT)
    const local = structuredClone(base)
    const remote = structuredClone(base)
    local.nodes[0].title = 'Local refinement'
    remote.nodes[0].essence = 'Remote refinement'

    expect(classifyStartupSync(local, { document: remote, sha: 'new-sha' }, markerFor(base))).toBe('conflict')
    expect(classifyStartupSync(local, { document: remote, sha: 'new-sha' }, null)).toBe('conflict')
  })
})

describe('base-aware conflict merging', () => {
  it('combines changes to independent fields of the same concept', () => {
    const base = structuredClone(SEED_DOCUMENT)
    const local = structuredClone(base)
    const remote = structuredClone(base)
    local.nodes[0].title = 'Dream Unity — local refinement'
    local.nodes[0].provenance.updatedAt = '2026-08-31T01:00:00.000Z'
    remote.nodes[0].essence = 'A remote refinement of the central living model.'
    remote.nodes[0].provenance.updatedAt = '2026-08-31T01:01:00.000Z'

    const result = threeWayMergeDocuments(base, local, remote)
    expect(result.conflicts).toEqual([])
    expect(result.document?.nodes[0].title).toBe('Dream Unity — local refinement')
    expect(result.document?.nodes[0].essence).toBe('A remote refinement of the central living model.')
    expect(result.document?.nodes[0].provenance.updatedBy).toBe('Dream Unity merge')
  })

  it('stops when both sides independently change the same field', () => {
    const base = structuredClone(SEED_DOCUMENT)
    const local = structuredClone(base)
    const remote = structuredClone(base)
    local.nodes[0].title = 'Local title'
    local.nodes[0].provenance.updatedAt = '2026-08-31T01:00:00.000Z'
    remote.nodes[0].title = 'Remote title'
    remote.nodes[0].provenance.updatedAt = '2026-08-31T01:01:00.000Z'

    const result = threeWayMergeDocuments(base, local, remote)
    expect(result.document).toBeNull()
    expect(result.conflicts).toContain('nodes[unity-core].title')
  })
})

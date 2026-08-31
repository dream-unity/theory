import { describe, expect, it } from 'vitest'
import { SEED } from '../seed'
import { addConcept, addRelation, tagCounts, visibleConcepts, visibleRelations } from './document'

describe('atlas document', () => {
  it('keeps the whole-theory map fully populated', () => {
    const nodes = visibleConcepts(SEED, 'whole-theory')
    expect(nodes.find((node) => node.id === 'unity-core')).toBeTruthy()
    expect(nodes.length).toBeGreaterThanOrEqual(13)
    expect(visibleRelations(SEED, 'whole-theory').length).toBeGreaterThanOrEqual(12)
  })

  it('files a capture into inbox without dropping the core', () => {
    const next = addConcept(SEED, 'inbox', { title: 'New spark', x: 10, y: 10 })
    expect(visibleConcepts(next, 'inbox').some((node) => node.title === 'New spark')).toBe(true)
    expect(visibleConcepts(next, 'whole-theory').some((node) => node.id === 'unity-core')).toBe(true)
  })

  it('connects two concepts with a verb', () => {
    const next = addRelation(SEED, 'intention', 'model', 'informs')
    expect(next.relations.some((relation) => relation.verb === 'informs')).toBe(true)
  })

  it('counts filing tags', () => {
    const counts = tagCounts(SEED)
    expect(counts.portal).toBeGreaterThan(0)
    expect(counts.stance).toBeGreaterThan(0)
  })
})

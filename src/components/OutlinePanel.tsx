import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  GitMerge,
  Inbox,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import type { Portal, TheoryDocument, TheoryEdge, TheoryView } from '../types'

interface OutlinePanelProps {
  document: TheoryDocument
  currentView: TheoryView
  selectedNodeId: string | null
  onSelectNode: (id: string) => void
  onSelectView: (id: string) => void
  visiblePortals: Set<string>
  onTogglePortal: (portal: Portal) => void
  visibleEdgeFamilies: Set<TheoryEdge['family']>
  onToggleEdgeFamily: (family: TheoryEdge['family']) => void
  onRequestClose?: () => void
}

type ReviewMode = 'all' | 'seeds' | 'open' | 'gap' | 'returned'

const portalLabels: Record<Portal, string> = {
  maker: 'Dream Maker',
  machine: 'Dream Machine',
  world: 'Dream World',
  unity: 'Unity',
}

const portalIcons = { maker: Sparkles, machine: Layers3, world: FlaskConical, unity: GitMerge }

const edgeFamilyLabels: Record<TheoryEdge['family'], string> = {
  structure: 'Structure',
  dynamics: 'Dynamics',
  reasoning: 'Reasoning',
  correspondence: 'Mirror',
  integration: 'Integration',
  provenance: 'Origins',
}

const edgeFamilies = Object.keys(edgeFamilyLabels) as TheoryEdge['family'][]
const REALITY_RELATIONS = new Set(['tests', 'realises as', 'operationalises'])

export function OutlinePanel({
  document,
  currentView,
  selectedNodeId,
  onSelectNode,
  onSelectView,
  visiblePortals,
  onTogglePortal,
  visibleEdgeFamilies,
  onToggleEdgeFamily,
  onRequestClose,
}: OutlinePanelProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const [reviewMode, setReviewMode] = useState<ReviewMode>('all')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['unity']))
  const included = useMemo(() => new Set(currentView.includedNodeIds), [currentView.includedNodeIds])
  const outgoingReality = useMemo(() => {
    const ids = new Set<string>()
    for (const edge of document.edges) if (REALITY_RELATIONS.has(edge.relation)) ids.add(edge.from)
    return ids
  }, [document.edges])

  const reviewSets = useMemo(() => {
    const sets: Record<Exclude<ReviewMode, 'all'>, Set<string>> = {
      seeds: new Set(),
      open: new Set(),
      gap: new Set(),
      returned: new Set(),
    }
    for (const node of document.nodes) {
      if (node.epistemics.maturity === 'seed' && node.epistemics.stance !== 'archived') sets.seeds.add(node.id)
      if (node.type === 'question' || node.type === 'tension') sets.open.add(node.id)
      if (['claim', 'model', 'synthesis'].includes(node.type) && !outgoingReality.has(node.id)) sets.gap.add(node.id)
      if (node.epistemics.stance === 'archived') sets.returned.add(node.id)
    }
    return sets
  }, [document.nodes, outgoingReality])

  const filtered = useMemo(() => document.nodes.filter((node) => {
    if (!included.has(node.id)) return false
    if (reviewMode !== 'all' && !reviewSets[reviewMode].has(node.id)) return false
    if (!deferredQuery) return true
    return [node.title, node.essence, node.type, ...node.facets.topics, ...node.aliases]
      .join(' ')
      .toLowerCase()
      .includes(deferredQuery)
  }), [deferredQuery, document.nodes, included, reviewMode, reviewSets])

  const groups = useMemo(() => {
    const value: Record<string, typeof filtered> = { unity: [], maker: [], machine: [], world: [], ether: [] }
    for (const node of filtered) {
      const portal = node.facets.portals.length > 1 ? 'unity' : node.facets.portals[0] ?? 'ether'
      value[portal].push(node)
    }
    for (const nodes of Object.values(value)) nodes.sort((a, b) => a.title.localeCompare(b.title))
    return value
  }, [filtered])

  const selectedGroup = useMemo(() => {
    const node = document.nodes.find((candidate) => candidate.id === selectedNodeId)
    if (!node) return null
    return node.facets.portals.length > 1 ? 'unity' : node.facets.portals[0] ?? 'ether'
  }, [document.nodes, selectedNodeId])

  useEffect(() => {
    if (!selectedGroup) return
    setOpenGroups((current) => current.has(selectedGroup) ? current : new Set([...current, selectedGroup]))
  }, [selectedGroup])

  const edgeFamilyCounts = useMemo(() => {
    const counts = Object.fromEntries(edgeFamilies.map((family) => [family, 0])) as Record<TheoryEdge['family'], number>
    for (const edge of document.edges) {
      if (included.has(edge.from) && included.has(edge.to)) counts[edge.family] += 1
    }
    return counts
  }, [document.edges, included])

  const toggleGroup = (name: string) => {
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const selectNode = (id: string) => {
    onSelectNode(id)
    onRequestClose?.()
  }

  const healthItems: Array<{ id: Exclude<ReviewMode, 'all'>; label: string; icon: typeof Inbox }> = [
    { id: 'seeds', label: 'Inbox', icon: Inbox },
    { id: 'open', label: 'Open', icon: CircleHelp },
    { id: 'gap', label: 'Reality gaps', icon: FlaskConical },
    { id: 'returned', label: 'Archived', icon: Archive },
  ]

  return (
    <aside className="outline-panel" aria-label="Browse theory ideas">
      <div className="outline-scroll">
        <section className="rail-section browse-primary">
          <label className="field-label compact-field">View
            <select value={currentView.id} onChange={(event) => { onSelectView(event.target.value); onRequestClose?.() }}>
              {document.views.map((view) => <option key={view.id} value={view.id}>{view.title}</option>)}
            </select>
          </label>
          <p className="view-question">{currentView.focusQuestion}</p>
          <label className="rail-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search ideas in this view</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an idea…" />
          </label>
        </section>

        <section className="rail-section health-section">
          <div className="rail-heading-row"><p className="rail-label">Review</p>{reviewMode !== 'all' && <button type="button" className="clear-review" onClick={() => setReviewMode('all')}>Show all</button>}</div>
          <div className="health-strip" role="group" aria-label="Filter ideas that need attention">
            {healthItems.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" className={reviewMode === id ? 'active' : ''} onClick={() => setReviewMode((current) => current === id ? 'all' : id)} aria-pressed={reviewMode === id}>
                <Icon size={16} /><strong>{reviewSets[id].size}</strong><span>{label}</span>
              </button>
            ))}
          </div>
        </section>

        <details className="rail-section view-options">
          <summary><SlidersHorizontal size={16} /><span>View options</span><small>{visiblePortals.size}/4 portals · {visibleEdgeFamilies.size}/6 connections</small></summary>
          <div className="view-options-body">
            <div className="rail-heading-row"><p className="rail-label">Portals</p><span>{visiblePortals.size}/4</span></div>
            <div className="portal-filters">
              {(Object.keys(portalLabels) as Portal[]).map((portal) => {
                const Icon = portalIcons[portal]
                return (
                  <button type="button" key={portal} className={`portal-filter portal-${portal} ${visiblePortals.has(portal) ? 'active' : ''}`} onClick={() => onTogglePortal(portal)} aria-pressed={visiblePortals.has(portal)}>
                    <Icon size={15} /><span>{portalLabels[portal]}</span>
                  </button>
                )
              })}
            </div>
            <div className="rail-heading-row"><p className="rail-label">Connection types</p><span>{visibleEdgeFamilies.size}/6</span></div>
            <div className="relation-family-filters">
              {edgeFamilies.map((family) => (
                <button type="button" key={family} className={`relation-family-filter family-${family} ${visibleEdgeFamilies.has(family) ? 'active' : ''}`} onClick={() => onToggleEdgeFamily(family)} aria-pressed={visibleEdgeFamilies.has(family)}>
                  <span>{edgeFamilyLabels[family]}</span><small>{edgeFamilyCounts[family]}</small>
                </button>
              ))}
            </div>
          </div>
        </details>

        <section className="rail-section theory-spine-section">
          <div className="rail-heading-row"><p className="rail-label">{reviewMode === 'all' ? 'Ideas' : 'Review results'}</p><span>{filtered.length}</span></div>
          <span className="sr-only" role="status" aria-live="polite">{filtered.length} matching ideas</span>
          {(['unity', 'maker', 'machine', 'world', 'ether'] as const).map((group) => {
            const GroupIcon = group === 'ether' ? Inbox : portalIcons[group]
            const label = group === 'ether' ? 'Inbox / Unplaced' : group === 'unity' ? 'Unity / Bridges' : portalLabels[group]
            return (
              <div className="spine-group" key={group}>
                <button type="button" className="spine-group-heading" onClick={() => toggleGroup(group)} aria-expanded={openGroups.has(group)}>
                  {openGroups.has(group) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <GroupIcon size={16} />
                  <span>{label}</span>
                  <small>{groups[group].length}</small>
                </button>
                {openGroups.has(group) && (
                  <ul>
                    {groups[group].map((node) => (
                      <li key={node.id}>
                        <button type="button" className={node.id === selectedNodeId ? 'selected' : ''} onClick={() => selectNode(node.id)}>
                          <span className={`node-type-dot type-${node.type}`} aria-hidden="true" />
                          <span>{node.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && <p className="empty-note">No ideas match this view. Clear the review filter or search.</p>}
        </section>
      </div>
    </aside>
  )
}

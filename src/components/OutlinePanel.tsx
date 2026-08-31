import { useMemo, useState } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Eye,
  FlaskConical,
  GitMerge,
  Inbox,
  Layers3,
  Link2,
  Search,
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
  onNewSeed: () => void
  visibleEdgeFamilies?: Set<TheoryEdge['family']>
  onToggleEdgeFamily?: (family: TheoryEdge['family']) => void
  onStartRelation?: (sourceId: string) => void
  onRequestClose?: () => void
}

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

export function OutlinePanel({
  document,
  currentView,
  selectedNodeId,
  onSelectNode,
  onSelectView,
  visiblePortals,
  onTogglePortal,
  onNewSeed,
  visibleEdgeFamilies,
  onToggleEdgeFamily,
  onStartRelation,
  onRequestClose,
}: OutlinePanelProps) {
  const [query, setQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['unity', 'maker', 'machine', 'world', 'ether']))
  const included = useMemo(() => new Set(currentView.includedNodeIds), [currentView.includedNodeIds])
  const normalizedQuery = query.toLowerCase().trim()

  const filtered = useMemo(() => document.nodes.filter((node) => {
    if (!included.has(node.id)) return false
    if (!normalizedQuery) return true
    return [node.title, node.essence, node.type, ...node.facets.topics, ...node.aliases]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  }), [document.nodes, included, normalizedQuery])

  const groups = useMemo(() => {
    const value: Record<string, typeof filtered> = { unity: [], maker: [], machine: [], world: [], ether: [] }
    for (const node of filtered) {
      const portal = node.facets.portals.length > 1 ? 'unity' : node.facets.portals[0] ?? 'ether'
      value[portal].push(node)
    }
    for (const nodes of Object.values(value)) nodes.sort((a, b) => a.title.localeCompare(b.title))
    return value
  }, [filtered])

  const health = useMemo(() => ({
    seeds: document.nodes.filter((node) => node.epistemics.maturity === 'seed' && node.epistemics.stance !== 'archived').length,
    questions: document.nodes.filter((node) => node.type === 'question' || node.type === 'tension').length,
    realityGap: document.nodes.filter((node) =>
      ['claim', 'model', 'synthesis'].includes(node.type) &&
      !document.edges.some((edge) => edge.from === node.id && ['tests', 'realises as', 'operationalises'].includes(edge.relation)),
    ).length,
    returned: document.nodes.filter((node) => node.epistemics.stance === 'archived').length,
  }), [document.edges, document.nodes])

  const viewEdgeFamilies = useMemo(() => new Set(currentView.visibleEdgeFamilies), [currentView.visibleEdgeFamilies])
  const activeEdgeFamilies = visibleEdgeFamilies ?? viewEdgeFamilies
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

  const selectView = (id: string) => {
    onSelectView(id)
    onRequestClose?.()
  }

  const selectNode = (id: string) => {
    onSelectNode(id)
    onRequestClose?.()
  }

  const createSeed = () => {
    onNewSeed()
    onRequestClose?.()
  }

  const startRelation = () => {
    if (!selectedNodeId || !onStartRelation) return
    onStartRelation(selectedNodeId)
    onRequestClose?.()
  }

  return (
    <aside className="outline-panel" aria-label="Theory spine">
      <div className="outline-scroll">
        <section className="rail-section views-section">
          <p className="rail-label">Focus maps</p>
          <nav aria-label="Saved theory views">
            {document.views.map((view) => (
              <button
                key={view.id}
                type="button"
                className={`view-button ${view.id === currentView.id ? 'active' : ''}`}
                onClick={() => selectView(view.id)}
                title={view.focusQuestion}
                aria-current={view.id === currentView.id ? 'page' : undefined}
              >
                <Eye size={14} aria-hidden="true" />
                <span>{view.title}</span>
              </button>
            ))}
          </nav>
        </section>

        <section className="rail-section">
          <p className="rail-label">Theory health</p>
          <div className="health-grid">
            <div title="Ideas awaiting articulation"><Inbox size={14} /><strong>{health.seeds}</strong><span>Seeds</span></div>
            <div title="Open questions and tensions"><CircleHelp size={14} /><strong>{health.questions}</strong><span>Open</span></div>
            <div title="Abstract nodes without a realization path"><FlaskConical size={14} /><strong>{health.realityGap}</strong><span>Reality gap</span></div>
            <div title="Reversibly returned concepts"><Archive size={14} /><strong>{health.returned}</strong><span>Returned</span></div>
          </div>
        </section>

        <section className="rail-section">
          <div className="rail-heading-row">
            <p className="rail-label">Portals</p>
            <span>{visiblePortals.size}/4</span>
          </div>
          <div className="portal-filters">
            {(Object.keys(portalLabels) as Portal[]).map((portal) => {
              const Icon = portalIcons[portal]
              return (
                <button
                  type="button"
                  key={portal}
                  className={`portal-filter portal-${portal} ${visiblePortals.has(portal) ? 'active' : ''}`}
                  onClick={() => onTogglePortal(portal)}
                  aria-pressed={visiblePortals.has(portal)}
                >
                  <Icon size={14} /><span>{portalLabels[portal]}</span>
                </button>
              )
            })}
          </div>
        </section>

        {onToggleEdgeFamily && (
          <section className="rail-section">
            <div className="rail-heading-row">
              <p className="rail-label">Relation layers</p>
              <span>{activeEdgeFamilies.size}/6</span>
            </div>
            <div className="relation-family-filters" role="group" aria-label="Visible relationship families">
              {edgeFamilies.map((family) => {
                const active = activeEdgeFamilies.has(family)
                return (
                  <button
                    type="button"
                    key={family}
                    className={`relation-family-filter family-${family} ${active ? 'active' : ''}`}
                    onClick={() => onToggleEdgeFamily(family)}
                    aria-pressed={active}
                  >
                    <span>{edgeFamilyLabels[family]}</span><small>{edgeFamilyCounts[family]}</small>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <section className="rail-section theory-spine-section">
          <div className="rail-heading-row"><p className="rail-label">Theory spine</p><span>{filtered.length}</span></div>
          <span className="sr-only" role="status" aria-live="polite">{filtered.length} ideas in the current theory spine</span>
          <label className="rail-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Search current theory view</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an idea…" />
          </label>

          {(['unity', 'maker', 'machine', 'world', 'ether'] as const).map((group) => {
            const GroupIcon = group === 'ether' ? Inbox : portalIcons[group]
            const label = group === 'ether' ? 'Inbox / Unplaced' : group === 'unity' ? 'Unity / Bridge' : portalLabels[group]
            return (
              <div className="spine-group" key={group}>
                <button type="button" className="spine-group-heading" onClick={() => toggleGroup(group)} aria-expanded={openGroups.has(group)}>
                  {openGroups.has(group) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <GroupIcon size={14} />
                  <span>{label}</span>
                  <small>{groups[group].length}</small>
                </button>
                {openGroups.has(group) && (
                  <ul>
                    {groups[group].map((node) => (
                      <li key={node.id}>
                        <button
                          type="button"
                          className={node.id === selectedNodeId ? 'selected' : ''}
                          onClick={() => selectNode(node.id)}
                        >
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
        </section>
      </div>
      <div className="outline-actions">
        {selectedNodeId && onStartRelation && (
          <button type="button" className="rail-connect-button" onClick={startRelation}>
            <Link2 size={16} aria-hidden="true" /> Connect selected idea
          </button>
        )}
        <button type="button" className="new-seed-button" onClick={createSeed}>
          <Sparkles size={16} aria-hidden="true" /> New seed <kbd>N</kbd>
        </button>
      </div>
    </aside>
  )
}

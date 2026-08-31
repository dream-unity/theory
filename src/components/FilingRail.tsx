import { VIEWS, VIEW_META, type AtlasView } from '../types'

const LEGEND = [
  { mark: '+', label: 'Card / Node' },
  { mark: 'o', label: 'Quadrant' },
  { mark: '>', label: 'Connection' },
  { mark: '=', label: 'Dossier Tab' },
]

export function FilingRail({
  view,
  inboxCount,
  tagCounts,
  onView,
  onReset,
}: {
  view: AtlasView
  inboxCount: number
  tagCounts: Record<string, number>
  onView: (view: AtlasView) => void
  onReset: () => void
}) {
  return (
    <aside className="filing-rail">
      <div className="rail-brand">
        <span className="folder-mark">[]</span>
        <div>
          <strong>Atlas Filing Rail</strong>
          <em>Dream Unity · Observatory</em>
        </div>
      </div>
      <nav className="rail-views">
        {VIEWS.map((id) => {
          const meta = VIEW_META[id]
          return (
            <button key={id} type="button" className={id === view ? 'active' : ''} onClick={() => onView(id)}>
              <span className="view-icon">{id === 'inbox' ? '>' : '='}</span>
              <span className="view-copy">
                <b>{meta.title}</b>
                <i>{id === 'inbox' ? `${inboxCount} new` : meta.version}</i>
              </span>
              <span className="chev">›</span>
            </button>
          )
        })}
      </nav>
      <section className="rail-tags">
        <h4>Tags</h4>
        {['portal', 'maturity', 'stance', 'form'].map((tag) => (
          <div key={tag} className={`tag-row tag-${tag}`}>
            <span className="dot" />
            <span>{tag}</span>
            <em>{tagCounts[tag] ?? 0}</em>
          </div>
        ))}
      </section>
      <section className="rail-legend">
        <h4>Legend</h4>
        {LEGEND.map((item) => (
          <div key={item.label} className="legend-row">
            <span>{item.mark}</span>
            {item.label}
          </div>
        ))}
      </section>
      <button type="button" className="ghost-reset" onClick={onReset}>
        Restore seeded atlas
      </button>
    </aside>
  )
}

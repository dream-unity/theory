import type { PlexZones, Thought } from '../types'

export function ContentPane({
  thought,
  zones,
  pinned,
  onNotes,
  onRename,
  onActivate,
  onPin,
  onForget,
}: {
  thought: Thought
  zones: PlexZones
  pinned: boolean
  onNotes: (notes: string) => void
  onRename: (name: string) => void
  onActivate: (id: string) => void
  onPin: () => void
  onForget: () => void
}) {
  const words = thought.notes.trim() ? thought.notes.trim().split(/\s+/).length : 0
  return (
    <aside className="content-pane">
      <header className="content-head">
        <input className="thought-title" value={thought.name} onChange={(event) => onRename(event.target.value)} />
        <div className="content-actions">
          <button type="button" onClick={onPin}>{pinned ? 'Unpin' : 'Pin'}</button>
          <button type="button" onClick={onForget}>Forget</button>
        </div>
      </header>
      <p className="meta-line">
        <span style={{ color: thought.color }}>●</span>
        {thought.label ?? 'Thought'}
        {thought.tags.length ? ` · ${thought.tags.join(' · ')}` : ''}
        {' · '}
        {words} words
      </p>
      <textarea
        className="notes"
        value={thought.notes}
        placeholder="Notes for this thought…"
        onChange={(event) => onNotes(event.target.value)}
      />
      <section className="mapped">
        <h4>{countLinks(zones)} Mapped Links</h4>
        <Mapped label="Parents" mark="↑" items={zones.parents} onActivate={onActivate} />
        <Mapped label="Jumps" mark="↔" items={zones.jumps} onActivate={onActivate} />
        <Mapped label="Children" mark="↓" items={zones.children} onActivate={onActivate} />
        <Mapped label="Siblings" mark="→" items={zones.siblings} onActivate={onActivate} />
      </section>
      {thought.attachments.length > 0 ? (
        <section className="attachments">
          <h4>Attachments</h4>
          {thought.attachments.map((item) => (
            <div key={item.id}>{item.title}</div>
          ))}
        </section>
      ) : null}
    </aside>
  )
}

function Mapped({
  label,
  mark,
  items,
  onActivate,
}: {
  label: string
  mark: string
  items: Thought[]
  onActivate: (id: string) => void
}) {
  if (!items.length) return null
  return (
    <div className="mapped-group">
      <b>{label}</b>
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onActivate(item.id)}>
          {mark} {item.name}
        </button>
      ))}
    </div>
  )
}

function countLinks(zones: PlexZones): number {
  return zones.parents.length + zones.children.length + zones.jumps.length + zones.siblings.length
}

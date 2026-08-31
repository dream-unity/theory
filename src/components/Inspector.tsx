import type { Concept, Relation } from '../types'
import { QUADRANT_META, maturityLabel } from '../types'

export function Inspector({
  concept,
  relations,
  titles,
  onClose,
  onOpenDossier,
  onMaturity,
}: {
  concept: Concept | null
  relations: Relation[]
  titles: Record<string, string>
  onClose: () => void
  onOpenDossier: () => void
  onMaturity: (value: number) => void
}) {
  if (!concept) {
    return (
      <aside className="inspector empty">
        <h3>Inspector</h3>
        <p>Select a card to read its full note, maturity, sources, and filing path.</p>
      </aside>
    )
  }

  const accent = QUADRANT_META[concept.quadrant]
  const related = relations.filter((relation) => relation.from === concept.id || relation.to === concept.id)

  return (
    <aside className="inspector" style={{ ['--accent' as string]: accent.accent }}>
      <header>
        <div>
          <span className="kicker">Inspector · {concept.title}</span>
          <button type="button" onClick={onClose} aria-label="Close inspector">×</button>
        </div>
      </header>
      <section>
        <h4>Full note</h4>
        <p className="full-note">{concept.notes || concept.essence}</p>
      </section>
      <section className="maturity-block">
        <h4>Maturity</h4>
        <div className="meter">
          <input type="range" min={0} max={10} value={concept.maturity} onChange={(event) => onMaturity(Number(event.target.value))} />
          <strong>
            {concept.maturity} / 10 <em>{maturityLabel(concept.maturity)}</em>
          </strong>
        </div>
      </section>
      <section>
        <h4>Sources</h4>
        <ul className="source-list">
          {concept.sources.map((source) => (
            <li key={source.id}>
              <b>{source.title}</b>
              <i>{source.locator ?? source.kind}</i>
            </li>
          ))}
          {concept.sources.length === 0 ? <li>No sources filed yet.</li> : null}
        </ul>
      </section>
      <section>
        <h4>File under</h4>
        <p className="file-under">{concept.fileUnder}</p>
      </section>
      <section>
        <h4>Cross-references</h4>
        <ul className="xref">
          {related.map((relation) => {
            const other = relation.from === concept.id ? relation.to : relation.from
            return (
              <li key={relation.id}>
                <i>{relation.verb}</i> {titles[other] ?? other}
              </li>
            )
          })}
        </ul>
      </section>
      <section>
        <h4>Tags</h4>
        <div className="chip-row">
          {concept.portals.map((portal) => (
            <span key={portal} className="chip">{portal}</span>
          ))}
          {concept.tags.map((tag) => (
            <span key={tag} className="chip faint">{tag}</span>
          ))}
        </div>
      </section>
      <button type="button" className="open-dossier" onClick={onOpenDossier}>
        Open dossier
      </button>
    </aside>
  )
}

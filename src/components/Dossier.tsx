import { useMemo, useState } from 'react'
import type { Concept, Drawer, Form, Phase, Portal, Stance } from '../types'
import { DRAWERS, FORMS, PHASES, QUADRANT_META, STANCES, maturityLabel } from '../types'

const DRAWER_COPY: Record<Drawer, { title: string; tabs: string[] }> = {
  essence: { title: 'Essence', tabs: ['Identity', 'Intention', 'Core Paradox'] },
  relations: { title: 'Relations', tabs: ['Influences', 'Dialogues', 'Dependencies'] },
  grounding: { title: 'Grounding', tabs: ['Assumptions', 'Evidence', 'First Principles'] },
  mirror: { title: 'Mirror', tabs: ['Feedback', 'Reflections', 'Blind Spots'] },
  practice: { title: 'Practice', tabs: ['Methods', 'Experiments', 'Habits'] },
}

export function Dossier({
  concept,
  onClose,
  onChange,
}: {
  concept: Concept
  onClose: () => void
  onChange: (patch: Partial<Concept>) => void
}) {
  const [drawer, setDrawer] = useState<Drawer>('essence')
  const accent = QUADRANT_META[concept.quadrant]
  const words = useMemo(() => concept.notes.trim().split(/\s+/).filter(Boolean).length, [concept.notes])
  const drawerBody = drawerContent(concept, drawer)

  return (
    <div className="dossier-layer" onClick={onClose}>
      <div className="dossier" style={{ ['--accent' as string]: accent.accent }} onClick={(event) => event.stopPropagation()}>
        <div className="satellite-col left">
          <Satellite title="Expressive Constraints" line="Tension as structure" badge="PHASE 3" />
          <Satellite title="Generative Field" line="Coherence of maker, world, and work" badge="FORM" />
          <Satellite title="Sculptural Difficulty" line="Meaningful resistance" badge="MATURITY" />
        </div>
        <section className="dossier-stage">
          <header className="dossier-head">
            <span className="live-dot" />
            <em>Selected concept</em>
            <button type="button" onClick={onClose}>x</button>
          </header>
          <input className="dossier-title" value={concept.title} onChange={(event) => onChange({ title: event.target.value })} />
          <div className="facet-grid">
            <Facet label="Portal" value={concept.portals.map(pretty).join(' + ') || '-'} />
            <label className="facet">
              <span>Form</span>
              <select value={concept.forms[0]} onChange={(event) => onChange({ forms: [event.target.value as Form] })}>
                {FORMS.map((form) => <option key={form}>{form}</option>)}
              </select>
            </label>
            <label className="facet">
              <span>Phase</span>
              <select value={concept.phase} onChange={(event) => onChange({ phase: event.target.value as Phase })}>
                {PHASES.map((phase) => <option key={phase}>{phase}</option>)}
              </select>
            </label>
            <Facet label="Maturity" value={maturityLabel(concept.maturity)} />
            <label className="facet">
              <span>Stance</span>
              <select value={concept.stance} onChange={(event) => onChange({ stance: event.target.value as Stance })}>
                {STANCES.map((stance) => <option key={stance}>{stance}</option>)}
              </select>
            </label>
          </div>
          <div className="notes-toolbar">
            <b>Notes</b>
            <i>Last edit just now</i>
          </div>
          <textarea
            className="dossier-notes"
            value={concept.notes}
            onChange={(event) => onChange({ notes: event.target.value, essence: event.target.value.split('\n')[0] ?? '' })}
          />
          <footer className="dossier-sources">
            {concept.sources.map((source) => (
              <span key={source.id}>{source.kind}: {source.title}</span>
            ))}
            <em>{words} words · {concept.portals.map(prettyPortal).join(' · ')}</em>
          </footer>
        </section>
        <div className="satellite-col right">
          <Satellite title="Authorship without Control" line="Letting the work speak" badge="SYNTHESIS" />
          <Satellite title="Aligned Possibility" line="Freedom within form" badge="PHASE 3" />
          <Satellite title="Revelation through Making" line="What wants to be expressed" badge="STANCE" />
        </div>
        <div className="drawers">
          {DRAWERS.map((id) => (
            <button key={id} type="button" className={drawer === id ? 'open' : ''} onClick={() => setDrawer(id)}>
              <strong>{DRAWER_COPY[id].title}</strong>
              <ul>{DRAWER_COPY[id].tabs.map((tab) => <li key={tab}>{tab}</li>)}</ul>
            </button>
          ))}
        </div>
        <aside className="drawer-readout">
          <h4>{DRAWER_COPY[drawer].title}</h4>
          {drawerBody.map((item) => (
            <p key={item.label}><b>{item.label}</b>{item.body}</p>
          ))}
        </aside>
      </div>
    </div>
  )
}

function Satellite({ title, line, badge }: { title: string; line: string; badge: string }) {
  return (
    <article className="satellite">
      <h5>{title}</h5>
      <p>{line}</p>
      <span>{badge}</span>
    </article>
  )
}

function Facet({ label, value }: { label: string; value: string }) {
  return (
    <div className="facet">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function pretty(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function prettyPortal(portal: Portal): string {
  return portal === 'maker' ? 'Maker' : portal === 'machine' ? 'Machine' : portal === 'world' ? 'World' : 'Unity'
}

function drawerContent(concept: Concept, drawer: Drawer): { label: string; body: string }[] {
  if (drawer === 'essence') {
    return [
      { label: 'Identity', body: concept.mirror.identity || concept.title },
      { label: 'Intention', body: concept.mirror.intention || concept.essence },
      { label: 'Core Paradox', body: concept.mirror.coreParadox },
    ]
  }
  if (drawer === 'relations') {
    return [
      { label: 'Influences', body: concept.fileUnder },
      { label: 'Dialogues', body: concept.portals.map(prettyPortal).join(', ') },
      { label: 'Dependencies', body: concept.tags.join(', ') },
    ]
  }
  if (drawer === 'grounding') {
    return [
      { label: 'Assumptions', body: concept.essence },
      { label: 'Evidence', body: concept.sources.map((source) => source.title).join(' · ') || 'None filed' },
      { label: 'First Principles', body: concept.fileUnder },
    ]
  }
  if (drawer === 'mirror') {
    return [
      { label: 'Feedback', body: concept.mirror.inversionRisk },
      { label: 'Reflections', body: concept.mirror.falsifier },
      { label: 'Blind Spots', body: concept.mirror.restoringAction },
    ]
  }
  return [
    { label: 'Methods', body: concept.practice.methods },
    { label: 'Experiments', body: concept.practice.experiments },
    { label: 'Habits', body: concept.practice.habits },
  ]
}

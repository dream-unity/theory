import { useEffect, useMemo, useState } from 'react'
import type { CreateKind, ViewMode } from './types'
import { plexZones, searchThoughts, thoughtMap } from './lib/plex'
import {
  activate,
  addAttachment,
  createLinkedThought,
  forgetThought,
  goHistory,
  linkThoughts,
  removeAttachment,
  togglePin,
  updateThought,
} from './lib/mutate'
import { exportDocument, importDocument, loadDocument, resetDocument, saveDocument, seedDocument } from './lib/store'
import { Plex } from './components/Plex'
import { ContentArea } from './components/ContentArea'
import { CardView, MindMapView, OutlineView } from './components/AltViews'

export default function App() {
  const [doc, setDoc] = useState(() => seedDocument())
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewMode>('plex')
  const [expand, setExpand] = useState(false)
  const [composer, setComposer] = useState<{ kind: CreateKind; fromId: string; name: string } | null>(null)
  const [pane, setPane] = useState(400)

  useEffect(() => {
    setDoc(loadDocument())
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => saveDocument(doc), 180)
    return () => window.clearTimeout(handle)
  }, [doc])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event)) return
      if (event.key === 'Home') {
        event.preventDefault()
        setDoc((current) => activate(current, current.homeId))
      }
      if (event.key === 'F6') {
        event.preventDefault()
        setComposer({ kind: 'child', fromId: doc.activeId, name: '' })
      }
      if (event.key === 'F7') {
        event.preventDefault()
        setComposer({ kind: 'parent', fromId: doc.activeId, name: '' })
      }
      if (event.key === 'F8') {
        event.preventDefault()
        setComposer({ kind: 'jump', fromId: doc.activeId, name: '' })
      }
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        setDoc((current) => goHistory(current, -1))
      }
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        setDoc((current) => goHistory(current, 1))
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Delete') {
        event.preventDefault()
        setDoc((current) => forgetThought(current, current.activeId))
      }
      if (event.key === '/') {
        event.preventDefault()
        document.getElementById('instant-activate')?.focus()
      }
      if (event.key === 'Escape') setComposer(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc.activeId])

  const zones = useMemo(() => plexZones(doc), [doc])
  const hits = useMemo(() => (query.trim() ? searchThoughts(doc, query) : []), [doc, query])
  const map = useMemo(() => thoughtMap(doc), [doc])
  const active = map.get(doc.activeId) ?? doc.thoughts[0]
  const pins = doc.pins.map((id) => map.get(id)).filter(Boolean)
  const past = doc.history.slice().reverse().slice(0, 18).map((id) => map.get(id)).filter(Boolean)

  function go(id: string) {
    setDoc((current) => activate(current, id))
    setQuery('')
    setComposer(null)
  }

  if (!zones || !active) {
    return (
      <div className="boot">
        <p>Opening TheBrain</p>
      </div>
    )
  }

  return (
    <div className="brain-shell">
      <header className="brain-toolbar">
        <div className="brand">
          <strong>TheBrain</strong>
          <em>{doc.title}</em>
        </div>
        <div className="nav-btns">
          <button type="button" onClick={() => setDoc((current) => goHistory(current, -1))} title="Back">←</button>
          <button type="button" onClick={() => setDoc((current) => goHistory(current, 1))} title="Forward">→</button>
          <button type="button" onClick={() => go(doc.homeId)} title="Home thought">⌂</button>
          <button type="button" className={expand ? 'on' : undefined} onClick={() => setExpand((value) => !value)} title="Expand one generation">⊞</button>
        </div>
        <div className="view-switch">
          {(['plex', 'outline', 'mindmap', 'cards'] as ViewMode[]).map((mode) => (
            <button key={mode} type="button" className={view === mode ? 'on' : undefined} onClick={() => setView(mode)}>
              {mode === 'plex' ? 'Normal' : mode === 'mindmap' ? 'Mind Map' : mode === 'cards' ? 'Cards' : 'Outline'}
            </button>
          ))}
        </div>
        <div className="pin-rail">
          {pins.map((thought) =>
            thought ? (
              <button key={thought.id} type="button" className={thought.id === doc.activeId ? 'pin active' : 'pin'} style={{ borderColor: thought.color, color: thought.color }} onClick={() => go(thought.id)}>
                {thought.name}
              </button>
            ) : null,
          )}
        </div>
        <div className="search-wrap">
          <input
            id="instant-activate"
            value={query}
            placeholder="Search / Create"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && query.trim()) {
                if (hits[0]) go(hits[0].id)
                else setDoc((current) => createLinkedThought(current, current.activeId, 'child', query.trim()))
                setQuery('')
              }
            }}
          />
          {hits.length > 0 ? (
            <ul className="instant">
              {hits.slice(0, 8).map((thought) => (
                <li key={thought.id}>
                  <button type="button" onClick={() => go(thought.id)}>
                    <b>{thought.name}</b>
                    <i>{thought.label ?? thought.tags[0] ?? ''}</i>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button type="button" className="ghost" onClick={() => download(exportDocument(doc))}>Export</button>
        <label className="ghost file-btn">
          Import
          <input type="file" accept="application/json" hidden onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            const next = importDocument(await file.text())
            if (next) setDoc(next)
            event.target.value = ''
          }} />
        </label>
        <button type="button" className="ghost" onClick={() => setDoc(resetDocument())}>Reset</button>
      </header>

      <div className="brain-body" style={{ gridTemplateColumns: `minmax(0,1fr) 8px ${pane}px` }}>
        <section className="plex-col">
          {view === 'plex' ? (
            <Plex
              doc={doc}
              zones={zones}
              expand={expand}
              onActivate={go}
              onCreate={(kind, fromId) => setComposer({ kind, fromId, name: '' })}
              onLink={(fromId, toId, kind) => setDoc((current) => linkThoughts(current, fromId, toId, kind))}
              onForget={(id) => setDoc((current) => forgetThought(current, id))}
              onPin={(id) => setDoc((current) => togglePin(current, id))}
            />
          ) : null}
          {view === 'outline' ? <OutlineView doc={doc} onActivate={go} /> : null}
          {view === 'mindmap' ? <MindMapView doc={doc} onActivate={go} /> : null}
          {view === 'cards' ? <CardView doc={doc} onActivate={go} /> : null}
          <footer className="past-list">
            {past.map((thought) =>
              thought ? (
                <button key={`${thought.id}-past`} type="button" onClick={() => go(thought.id)}>
                  {thought.name}
                </button>
              ) : null,
            )}
          </footer>
        </section>
        <div className="splitter" onPointerDown={(event) => {
          const startX = event.clientX
          const start = pane
          const move = (next: PointerEvent) => setPane(Math.max(280, Math.min(560, start - (next.clientX - startX))))
          const up = () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
          }
          window.addEventListener('pointermove', move)
          window.addEventListener('pointerup', up)
        }} />
        <ContentArea
          thought={active}
          zones={zones}
          pinned={doc.pins.includes(active.id)}
          onNotes={(notes) => setDoc((current) => updateThought(current, active.id, { notes }))}
          onRename={(name) => setDoc((current) => updateThought(current, active.id, { name }))}
          onLabel={(label) => setDoc((current) => updateThought(current, active.id, { label }))}
          onTags={(tags) => setDoc((current) => updateThought(current, active.id, { tags }))}
          onColor={(color) => setDoc((current) => updateThought(current, active.id, { color }))}
          onActivate={go}
          onPin={() => setDoc((current) => togglePin(current, active.id))}
          onForget={() => setDoc((current) => forgetThought(current, active.id))}
          onAttach={(title, url) => setDoc((current) => addAttachment(current, active.id, { title, url }))}
          onDetach={(id) => setDoc((current) => removeAttachment(current, active.id, id))}
        />
      </div>

      {composer ? (
        <form className="composer" onSubmit={(event) => {
          event.preventDefault()
          setDoc((current) => createLinkedThought(current, composer.fromId, composer.kind, composer.name))
          setComposer(null)
        }}>
          <label>
            Create {composer.kind}
            <input autoFocus value={composer.name} onChange={(event) => setComposer({ ...composer, name: event.target.value })} placeholder="Thought name — existing names will be linked" />
          </label>
          <button type="submit">Create</button>
          <button type="button" onClick={() => setComposer(null)}>Cancel</button>
        </form>
      ) : null}
    </div>
  )
}

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

function download(text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'dream-unity-brain.json'
  link.click()
  URL.revokeObjectURL(url)
}

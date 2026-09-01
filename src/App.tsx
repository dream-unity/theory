import { useEffect, useMemo, useState } from 'react'
import type { BrainDocument, LinkKind } from './types'
import { plexZones, searchThoughts, thoughtMap } from './lib/plex'
import { activate, createLinkedThought, forgetThought, togglePin, updateThought } from './lib/mutate'
import { loadDocument, resetDocument, saveDocument, seedDocument } from './lib/store'
import { Plex } from './components/Plex'
import { ContentPane } from './components/ContentPane'

export default function App() {
  const [doc, setDoc] = useState<BrainDocument>(() => seedDocument())
  const [query, setQuery] = useState('')
  const [composer, setComposer] = useState<{ kind: LinkKind | 'parent'; name: string } | null>(null)

  useEffect(() => {
    setDoc(loadDocument())
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => saveDocument(doc), 200)
    return () => window.clearTimeout(handle)
  }, [doc])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = isTyping(event)
      if (event.key === 'Home' && !typing) {
        event.preventDefault()
        setDoc((current) => activate(current, current.homeId))
      }
      if (event.key === 'F6' && !typing) {
        event.preventDefault()
        setComposer({ kind: 'child', name: '' })
      }
      if (event.key === 'F7' && !typing) {
        event.preventDefault()
        setComposer({ kind: 'parent', name: '' })
      }
      if (event.key === 'F8' && !typing) {
        event.preventDefault()
        setComposer({ kind: 'jump', name: '' })
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Delete' && !typing) {
        event.preventDefault()
        setDoc((current) => forgetThought(current, current.activeId))
      }
      if (event.key === '/' && !typing) {
        event.preventDefault()
        document.getElementById('instant-activate')?.focus()
      }
      if (event.key === 'Escape') setComposer(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const zones = useMemo(() => plexZones(doc), [doc])
  const hits = useMemo(() => (query.trim() ? searchThoughts(doc, query) : []), [doc, query])
  const map = useMemo(() => thoughtMap(doc), [doc])
  const active = map.get(doc.activeId) ?? doc.thoughts[0]
  const pins = doc.pins.map((id) => map.get(id)).filter(Boolean)
  const past = doc.history.slice(0, 18).map((id) => map.get(id)).filter(Boolean)

  function go(id: string) {
    setDoc((current) => activate(current, id))
    setQuery('')
    setComposer(null)
  }

  function submitComposer() {
    if (!composer) return
    const kind = composer.kind === 'parent' ? 'parent' : composer.kind
    setDoc((current) => createLinkedThought(current, current.activeId, kind === 'parent' ? 'child' : kind, composer.name))
    // parent creation uses createLinkedThought with inverted child link via kind 'parent'
    if (composer.kind === 'parent') {
      setDoc((current) => createLinkedThought(current, current.activeId, 'child', composer.name))
    }
    setComposer(null)
  }

  if (!zones || !active) {
    return (
      <div className="boot">
        <p>Opening TheBrain…</p>
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
          <button type="button" onClick={() => go(doc.history[1] ?? doc.homeId)} title="Back">
            ←
          </button>
          <button type="button" onClick={() => go(doc.homeId)} title="Home thought">
            ⌂
          </button>
        </div>
        <div className="pin-rail">
          {pins.map((thought) =>
            thought ? (
              <button
                key={thought.id}
                type="button"
                className={thought.id === doc.activeId ? 'pin active' : 'pin'}
                style={{ borderColor: thought.color, color: thought.color }}
                onClick={() => go(thought.id)}
              >
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
        <button type="button" className="ghost" onClick={() => setDoc(resetDocument())}>
          Reset Brain
        </button>
      </header>

      <div className="brain-body">
        <section className="plex-col">
          <Plex
            zones={zones}
            activeId={doc.activeId}
            onActivate={go}
            onCreate={(kind) => setComposer({ kind, name: '' })}
          />
          <footer className="past-list">
            {past.map((thought) =>
              thought ? (
                <button key={thought.id + '-past'} type="button" onClick={() => go(thought.id)}>
                  {thought.name}
                </button>
              ) : null,
            )}
          </footer>
        </section>

        <ContentPane
          thought={active}
          zones={zones}
          pinned={doc.pins.includes(active.id)}
          onNotes={(notes) => setDoc((current) => updateThought(current, active.id, { notes }))}
          onRename={(name) => setDoc((current) => updateThought(current, active.id, { name }))}
          onActivate={go}
          onPin={() => setDoc((current) => togglePin(current, active.id))}
          onForget={() => setDoc((current) => forgetThought(current, active.id))}
        />
      </div>

      {composer ? (
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault()
            setDoc((current) =>
              createLinkedThought(
                current,
                current.activeId,
                composer.kind === 'parent' ? 'parent' : composer.kind,
                composer.name,
              ),
            )
            setComposer(null)
          }}
        >
          <label>
            Create {composer.kind === 'child' ? 'child' : composer.kind === 'jump' ? 'jump' : 'parent'}
            <input
              autoFocus
              value={composer.name}
              onChange={(event) => setComposer({ ...composer, name: event.target.value })}
              placeholder="Thought name"
            />
          </label>
          <button type="submit">Create</button>
          <button type="button" onClick={() => setComposer(null)}>
            Cancel
          </button>
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

void submitComposerPlaceholder
function submitComposerPlaceholder() {}

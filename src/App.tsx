import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AtlasDocument, AtlasView, Concept } from './types'
import { FilingRail } from './components/FilingRail'
import { Inspector } from './components/Inspector'
import { Dossier } from './components/Dossier'
import { AtlasCanvas } from './components/AtlasCanvas'
import { addConcept, addRelation, fileConcept, tagCounts, updateConcept, visibleConcepts, moveConcept } from './lib/document'
import { loadDocument, resetDocument, saveDocument } from './lib/store'

export default function App() {
  const [doc, setDoc] = useState<AtlasDocument | null>(null)
  const [view, setView] = useState<AtlasView>('whole-theory')
  const [selectedId, setSelectedId] = useState<string | null>('unity-core')
  const [editing, setEditing] = useState(true)
  const [dossierOpen, setDossierOpen] = useState(false)
  const [spaceHelp, setSpaceHelp] = useState(true)

  useEffect(() => {
    void loadDocument().then((loaded) => {
      setDoc(loaded)
      const preferred = loaded.concepts.find((concept) => concept.id === 'unity-core') ?? loaded.concepts[0]
      setSelectedId(preferred?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (!doc) return
    const handle = window.setTimeout(() => {
      void saveDocument(doc)
    }, 240)
    return () => window.clearTimeout(handle)
  }, [doc])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '?' ) setSpaceHelp((value) => !value)
      if (event.key === 'Escape') {
        setDossierOpen(false)
        setSelectedId(null)
      }
      if ((event.key === 'Enter' || event.key === ' ') && selectedId && !isTyping(event)) {
        if (event.key === 'Enter') setDossierOpen(true)
      }
      if (event.key === 'n' && !isTyping(event)) {
        event.preventDefault()
        setDoc((current) => (current ? addConcept(current, view, { title: 'Untitled card' }) : current))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, view])

  const selected = useMemo(
    () => doc?.concepts.find((concept) => concept.id === selectedId) ?? null,
    [doc, selectedId],
  )

  const patchSelected = useCallback(
    (patch: Partial<Concept>) => {
      if (!selectedId) return
      setDoc((current) => (current ? updateConcept(current, selectedId, patch) : current))
    },
    [selectedId],
  )

  if (!doc) {
    return (
      <div className="boot">
        <p>Opening the atlas…</p>
      </div>
    )
  }

  const titles = Object.fromEntries(doc.concepts.map((concept) => [concept.id, concept.title]))
  const inboxCount = visibleConcepts(doc, 'inbox').length

  return (
    <div className="atlas-shell">
      <FilingRail
        view={view}
        inboxCount={inboxCount}
        tagCounts={tagCounts(doc)}
        onView={(next) => {
          setView(next)
          setDossierOpen(false)
          const first = visibleConcepts(doc, next)[0]
          setSelectedId(first?.id ?? null)
        }}
        onReset={() => {
          void resetDocument().then((fresh) => {
            setDoc(fresh)
            setView('whole-theory')
            setSelectedId('unity-core')
          })
        }}
      />

      <main className="atlas-main">
        <header className="atlas-topbar">
          <div>
            <p className="eyebrow">Dream Unity · Theory Atlas</p>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className="top-actions">
            <label className="edit-toggle">
              <input type="checkbox" checked={editing} onChange={(event) => setEditing(event.target.checked)} />
              In-node notes
            </label>
            <button
              type="button"
              onClick={() => setDoc((current) => (current ? addConcept(current, view, { title: 'Untitled card' }) : current))}
            >
              + Card
            </button>
            {selected ? (
              <button type="button" onClick={() => setDoc((current) => (current ? fileConcept(current, selected.id, view) : current))}>
                File here
              </button>
            ) : null}
          </div>
        </header>

        <AtlasCanvas
          doc={doc}
          view={view}
          selectedId={selectedId}
          editing={editing}
          onSelect={setSelectedId}
          onMove={(id, x, y) => setDoc((current) => (current ? moveConcept(current, id, x, y) : current))}
          onConnectNodes={(from, to) => setDoc((current) => (current ? addRelation(current, from, to) : current))}
          onAddAt={(x, y) =>
            setDoc((current) => (current ? addConcept(current, view, { title: 'Untitled card', x, y }) : current))
          }
          onChangeNotes={(id, notes) =>
            setDoc((current) => (current ? updateConcept(current, id, { notes, essence: notes.split('\n')[0] ?? '' }) : current))
          }
          onChangeTitle={(id, title) => setDoc((current) => (current ? updateConcept(current, id, { title }) : current))}
          onOpenDossier={(id) => {
            setSelectedId(id)
            setDossierOpen(true)
          }}
        />
        {spaceHelp ? (
          <p className="hint-bar">
            Drag the desk to pan · drag a card to place it · drag a port to connect with a verb · double-click the desk to add ·
            double-click a card for the dossier · notes type inside the card.
          </p>
        ) : null}
      </main>

      <Inspector
        concept={selected}
        relations={doc.relations}
        titles={titles}
        onClose={() => setSelectedId(null)}
        onOpenDossier={() => selected && setDossierOpen(true)}
        onMaturity={(value) => patchSelected({ maturity: value })}
      />

      {dossierOpen && selected ? (
        <Dossier concept={selected} onClose={() => setDossierOpen(false)} onChange={patchSelected} />
      ) : null}
    </div>
  )
}

function viewTitle(view: AtlasView): string {
  if (view === 'whole-theory') return 'Whole Theory'
  if (view === 'mirror-freedom') return 'Mirror & Freedom'
  if (view === 'three-forms') return 'Three Forms'
  if (view === 'realisation-lab') return 'Realisation Lab'
  return 'Inbox'
}

function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

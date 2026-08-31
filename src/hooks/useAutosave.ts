import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { GithubSession, SyncState, TheoryDocument } from '../types'
import { fetchTheoryFile, saveTheoryFile } from '../lib/github'
import { saveLocalDocument } from '../lib/local-store'
import { mergeDocuments } from '../lib/theory'

const LOCAL_DELAY = 250
const REMOTE_IDLE_DELAY = 6_000
const MIN_REMOTE_INTERVAL = 15_000

export interface PendingConflict {
  remote: TheoryDocument
  sha: string
}

export function useAutosave(
  document: TheoryDocument | null,
  setDocument: Dispatch<SetStateAction<TheoryDocument | null>>,
  session: GithubSession | null,
) {
  const [syncState, setSyncState] = useState<SyncState>({ kind: 'loading', label: 'Opening the atlas…' })
  const [conflict, setConflict] = useState<PendingConflict | null>(null)
  const remoteSha = useRef<string | undefined>(undefined)
  const latestDocument = useRef<TheoryDocument | null>(document)
  const saving = useRef(false)
  const lastRemoteSave = useRef(0)
  const remoteTimer = useRef<number | undefined>(undefined)

  latestDocument.current = document

  const checkpoint = useCallback(async (snapshot?: TheoryDocument, bypassInterval = false) => {
    const value = snapshot ?? latestDocument.current
    if (!value || !session || saving.current || conflict) return
    if (!navigator.onLine) {
      setSyncState({ kind: 'offline', label: 'Offline · changes safe on this device' })
      return
    }
    if (!bypassInterval && Date.now() - lastRemoteSave.current < MIN_REMOTE_INTERVAL) return

    saving.current = true
    setSyncState({ kind: 'syncing', label: 'Checkpointing to GitHub…' })
    try {
      const result = await saveTheoryFile(session, value, remoteSha.current)
      if (result.kind === 'conflict') {
        setConflict({ remote: result.remote, sha: result.sha })
        setSyncState({ kind: 'conflict', label: 'GitHub changed elsewhere · review required' })
        return
      }
      remoteSha.current = result.sha
      lastRemoteSave.current = Date.now()
      const stillCurrent = latestDocument.current?.meta.revision === value.meta.revision
      setSyncState(
        stillCurrent
          ? { kind: 'synced', label: 'Saved to GitHub', at: new Date().toISOString() }
          : { kind: 'queued', label: 'New changes queued for GitHub' },
      )
    } catch (error) {
      const label = error instanceof Error ? error.message : 'GitHub checkpoint failed'
      setSyncState({ kind: 'error', label })
    } finally {
      saving.current = false
      const newerChangesExist = latestDocument.current && latestDocument.current.meta.revision !== value.meta.revision
      if (newerChangesExist && session && !conflict) {
        if (remoteTimer.current) window.clearTimeout(remoteTimer.current)
        remoteTimer.current = window.setTimeout(
          () => void checkpoint(latestDocument.current ?? undefined, true),
          REMOTE_IDLE_DELAY,
        )
      }
    }
  }, [conflict, session])

  useEffect(() => {
    remoteSha.current = undefined
    lastRemoteSave.current = 0
    if (!session) return
    let cancelled = false
    void fetchTheoryFile(session)
      .then((remote) => {
        if (cancelled) return
        remoteSha.current = remote.sha
        const local = latestDocument.current
        if (remote.document && local && remote.document.meta.updatedAt > local.meta.updatedAt) {
          setConflict({ remote: remote.document, sha: remote.sha as string })
          setSyncState({ kind: 'conflict', label: 'GitHub has newer theory · review required' })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setSyncState({ kind: 'error', label: error instanceof Error ? error.message : 'GitHub connection failed' })
      })
    return () => { cancelled = true }
  }, [session])

  useEffect(() => {
    if (!document) return
    const localTimer = window.setTimeout(() => {
      void saveLocalDocument(document)
      if (!session) setSyncState({ kind: 'local', label: 'Saved on this device' })
    }, LOCAL_DELAY)

    if (remoteTimer.current) window.clearTimeout(remoteTimer.current)
    if (session && !conflict) {
      setSyncState({ kind: 'queued', label: 'Saved locally · GitHub checkpoint queued' })
      const timeUntilAllowed = Math.max(0, MIN_REMOTE_INTERVAL - (Date.now() - lastRemoteSave.current))
      remoteTimer.current = window.setTimeout(
        () => void checkpoint(document, true),
        Math.max(REMOTE_IDLE_DELAY, timeUntilAllowed),
      )
    }

    return () => window.clearTimeout(localTimer)
  }, [checkpoint, conflict, document, session])

  useEffect(() => {
    const handleOffline = () => setSyncState({ kind: 'offline', label: 'Offline · changes safe on this device' })
    const handleOnline = () => {
      if (session && latestDocument.current) {
        setSyncState({ kind: 'queued', label: 'Back online · GitHub checkpoint queued' })
        void checkpoint(latestDocument.current, true)
      }
    }
    const handlePageHide = () => {
      if (latestDocument.current) void saveLocalDocument(latestDocument.current)
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [checkpoint, session])

  const resolveConflict = useCallback(async (choice: 'merge' | 'mine' | 'remote') => {
    const local = latestDocument.current
    if (!conflict || !local) return
    if (choice === 'remote') {
      setDocument(conflict.remote)
      await saveLocalDocument(conflict.remote)
      remoteSha.current = conflict.sha
      setConflict(null)
      setSyncState({ kind: 'synced', label: 'Loaded GitHub version', at: new Date().toISOString() })
      return
    }

    const next = choice === 'merge' ? mergeDocuments(local, conflict.remote).document : local
    setDocument(next)
    await saveLocalDocument(next)
    setSyncState({ kind: 'syncing', label: choice === 'merge' ? 'Saving reviewed merge…' : 'Saving this device over GitHub…' })
    try {
      const result = await saveTheoryFile(session as GithubSession, next, undefined, conflict.sha)
      if (result.kind === 'conflict') {
        setConflict({ remote: result.remote, sha: result.sha })
        setSyncState({ kind: 'conflict', label: 'GitHub changed again · review required' })
        return
      }
      remoteSha.current = result.sha
      lastRemoteSave.current = Date.now()
      setConflict(null)
      setSyncState({ kind: 'synced', label: 'Saved to GitHub', at: new Date().toISOString() })
    } catch (error) {
      setSyncState({ kind: 'error', label: error instanceof Error ? error.message : 'Conflict save failed' })
    }
  }, [conflict, session, setDocument])

  return {
    syncState,
    conflict,
    checkpointNow: () => checkpoint(undefined, true),
    resolveConflict,
  }
}

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { GithubSession, SyncState, TheoryDocument } from '../types'
import { fetchTheoryFile, GithubApiError, saveTheoryFile, type RemoteFile } from '../lib/github'
import { validateDocument } from '../lib/theory'
import {
  documentsEqual,
  flushLocalWrites,
  loadGithubSyncMarker,
  saveGithubSyncMarker,
  saveLocalBackup,
  saveLocalDocument,
  type GithubSyncMarker,
} from '../lib/local-store'

const LOCAL_IDLE_DELAY = 250
const LOCAL_MAX_WAIT = 2_000
const REMOTE_IDLE_DELAY = 6_000
const MIN_REMOTE_INTERVAL = 15_000
const REMOTE_MAX_WAIT = 30_000
const RETRY_BASE_DELAY = 5_000
const RETRY_MAX_DELAY = 60_000

export interface PendingConflict {
  remote: TheoryDocument
  sha: string
  base?: TheoryDocument
  reason: 'startup-divergence' | 'github-write-conflict' | 'overlapping-edits'
  conflictingPaths?: string[]
}

const MISSING = Symbol('missing')
type Missing = typeof MISSING

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    )
  }
  return value
}

function sameValue(left: unknown | Missing, right: unknown | Missing) {
  if (left === MISSING || right === MISSING) return left === right
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right))
}

function isRecord(value: unknown | Missing): value is Record<string, unknown> {
  return value !== MISSING && !!value && typeof value === 'object' && !Array.isArray(value)
}

function mergeValue(
  base: unknown | Missing,
  local: unknown | Missing,
  remote: unknown | Missing,
  path: string,
  conflicts: string[],
): unknown | Missing {
  if (sameValue(local, remote)) return local
  if (sameValue(local, base)) return remote
  if (sameValue(remote, base)) return local

  if (isRecord(local) && isRecord(remote) && (base === MISSING || isRecord(base))) {
    const baseRecord = base === MISSING ? {} : base
    const keys = new Set([...Object.keys(baseRecord), ...Object.keys(local), ...Object.keys(remote)])
    const merged: Record<string, unknown> = {}
    for (const key of keys) {
      const next = mergeValue(
        Object.prototype.hasOwnProperty.call(baseRecord, key) ? baseRecord[key] : MISSING,
        Object.prototype.hasOwnProperty.call(local, key) ? local[key] : MISSING,
        Object.prototype.hasOwnProperty.call(remote, key) ? remote[key] : MISSING,
        `${path}.${key}`,
        conflicts,
      )
      if (next !== MISSING) merged[key] = next
    }
    return merged
  }

  conflicts.push(path)
  return local
}

type Identified = { id: string }

function mergeCollection<T extends Identified>(
  base: T[],
  local: T[],
  remote: T[],
  path: string,
  conflicts: string[],
  keyOf: (item: T) => string = (item) => item.id,
): T[] {
  const baseMap = new Map(base.map((item) => [keyOf(item), item]))
  const localMap = new Map(local.map((item) => [keyOf(item), item]))
  const remoteMap = new Map(remote.map((item) => [keyOf(item), item]))
  const keys = Array.from(new Set([...localMap.keys(), ...remoteMap.keys(), ...baseMap.keys()]))

  return keys.flatMap((key) => {
    const baseItem = baseMap.get(key) ?? MISSING
    const localItem = localMap.get(key) ?? MISSING
    const remoteItem = remoteMap.get(key) ?? MISSING

    if (sameValue(localItem, remoteItem)) return localItem === MISSING ? [] : [localItem]
    if (sameValue(localItem, baseItem)) return remoteItem === MISSING ? [] : [remoteItem]
    if (sameValue(remoteItem, baseItem)) return localItem === MISSING ? [] : [localItem]

    if (isRecord(localItem) && isRecord(remoteItem) && (baseItem === MISSING || isRecord(baseItem))) {
      const localRecord = localItem as Record<string, unknown>
      const remoteRecord = remoteItem as Record<string, unknown>
      const stripVolatileProvenance = (item: Record<string, unknown> | Missing) => {
        if (item === MISSING || !isRecord(item.provenance)) return item
        const { updatedAt: _updatedAt, updatedBy: _updatedBy, ...provenance } = item.provenance
        return { ...item, provenance }
      }
      const merged = mergeValue(
        stripVolatileProvenance(baseItem),
        stripVolatileProvenance(localRecord),
        stripVolatileProvenance(remoteRecord),
        `${path}[${key}]`,
        conflicts,
      )
      if (merged === MISSING || !isRecord(merged)) return []
      if (isRecord(localRecord.provenance) || isRecord(remoteRecord.provenance)) {
        const provenance = isRecord(merged.provenance) ? merged.provenance : {}
        merged.provenance = {
          ...provenance,
          updatedBy: 'Dream Unity merge',
          updatedAt: new Date().toISOString(),
        }
      }
      return [merged as T]
    }

    conflicts.push(`${path}[${key}]`)
    return localItem === MISSING ? [] : [localItem]
  })
}

export interface ThreeWayMergeResult {
  document: TheoryDocument | null
  conflicts: string[]
}

export type StartupSyncDisposition = 'create-remote' | 'in-sync' | 'local-ahead' | 'conflict'

export function classifyStartupSync(
  local: TheoryDocument,
  remote: RemoteFile,
  marker: GithubSyncMarker | null,
): StartupSyncDisposition {
  if (!remote.document) return 'create-remote'
  if (documentsEqual(local, remote.document)) return 'in-sync'
  if (marker && marker.sha === remote.sha && documentsEqual(marker.baseDocument, remote.document)) {
    return 'local-ahead'
  }
  return 'conflict'
}

/**
 * A conservative, common-ancestor merge. Disjoint fields merge; overlapping fields
 * stop for review. Unlike timestamp LWW, this function never silently chooses one
 * independently edited value over another.
 */
export function threeWayMergeDocuments(
  base: TheoryDocument,
  local: TheoryDocument,
  remote: TheoryDocument,
): ThreeWayMergeResult {
  const conflicts: string[] = []
  const stripMetaClock = (document: TheoryDocument) => {
    const { revision: _revision, updatedAt: _updatedAt, ...meta } = document.meta
    return meta
  }
  const meta = mergeValue(stripMetaClock(base), stripMetaClock(local), stripMetaClock(remote), 'meta', conflicts)
  const nodes = mergeCollection(base.nodes, local.nodes, remote.nodes, 'nodes', conflicts)
  const edges = mergeCollection(base.edges, local.edges, remote.edges, 'edges', conflicts)
  const views = mergeCollection(base.views, local.views, remote.views, 'views', conflicts)
  const tombstones = mergeCollection(
    base.tombstones,
    local.tombstones,
    remote.tombstones,
    'tombstones',
    conflicts,
    (item) => `${item.entity}:${item.id}`,
  )

  if (conflicts.length || meta === MISSING || !isRecord(meta)) {
    return { document: null, conflicts: Array.from(new Set(conflicts)) }
  }

  const document: TheoryDocument = {
    schemaVersion: 1,
    meta: {
      ...(meta as Omit<TheoryDocument['meta'], 'revision' | 'updatedAt'>),
      revision: Math.max(base.meta.revision, local.meta.revision, remote.meta.revision) + 1,
      updatedAt: new Date().toISOString(),
    },
    nodes,
    edges,
    views,
    tombstones,
  }
  if (!validateDocument(document)) return { document: null, conflicts: ['document.integrity'] }
  return { document, conflicts: [] }
}

function sessionTarget(session: GithubSession | null) {
  return session ? `${session.repository}\u0000${session.branch}\u0000${session.dataPath}` : ''
}

function errorLabel(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function isRetryable(error: unknown) {
  return error instanceof GithubApiError ? error.retryable : error instanceof TypeError
}

export function useAutosave(
  document: TheoryDocument | null,
  setDocument: Dispatch<SetStateAction<TheoryDocument | null>>,
  session: GithubSession | null,
) {
  const [syncState, setSyncState] = useState<SyncState>({ kind: 'loading', label: 'Opening the atlas…' })
  const [conflict, setConflict] = useState<PendingConflict | null>(null)

  const latestDocument = useRef<TheoryDocument | null>(document)
  const sessionRef = useRef<GithubSession | null>(session)
  const conflictRef = useRef<PendingConflict | null>(conflict)
  latestDocument.current = document
  sessionRef.current = session
  conflictRef.current = conflict

  const localIdleTimer = useRef<number | undefined>(undefined)
  const localMaxTimer = useRef<number | undefined>(undefined)
  const localDirtySince = useRef<number | null>(null)
  const localGeneration = useRef(0)

  const remoteIdleTimer = useRef<number | undefined>(undefined)
  const remoteMaxTimer = useRef<number | undefined>(undefined)
  const retryTimer = useRef<number | undefined>(undefined)
  const remoteDirtySince = useRef<number | null>(null)
  const retryAttempt = useRef(0)
  const lastRemoteSave = useRef(0)
  const remoteSha = useRef<string | undefined>(undefined)
  const baseDocument = useRef<TheoryDocument | undefined>(undefined)
  const saving = useRef(false)
  const resolving = useRef(false)
  const remoteReady = useRef(false)
  const remoteLoaded = useRef(false)
  const startupReconciled = useRef(false)
  const startupReconciling = useRef(false)
  const initialRemote = useRef<RemoteFile | null>(null)
  const initialMarker = useRef<GithubSyncMarker | null>(null)
  const sessionEpoch = useRef(0)

  const checkpointRef = useRef<(snapshot?: TheoryDocument, bypassInterval?: boolean) => Promise<void>>(async () => undefined)
  const scheduleRemoteRef = useRef<(snapshot?: TheoryDocument) => void>(() => undefined)

  const clearLocalTimers = useCallback(() => {
    if (localIdleTimer.current !== undefined) window.clearTimeout(localIdleTimer.current)
    if (localMaxTimer.current !== undefined) window.clearTimeout(localMaxTimer.current)
    localIdleTimer.current = undefined
    localMaxTimer.current = undefined
    localDirtySince.current = null
  }, [])

  const clearRemoteTimers = useCallback(() => {
    if (remoteIdleTimer.current !== undefined) window.clearTimeout(remoteIdleTimer.current)
    if (remoteMaxTimer.current !== undefined) window.clearTimeout(remoteMaxTimer.current)
    if (retryTimer.current !== undefined) window.clearTimeout(retryTimer.current)
    remoteIdleTimer.current = undefined
    remoteMaxTimer.current = undefined
    retryTimer.current = undefined
    remoteDirtySince.current = null
  }, [])

  const flushLocal = useCallback(async () => {
    const value = latestDocument.current
    if (!value) return
    const generation = localGeneration.current
    clearLocalTimers()
    try {
      await saveLocalDocument(value)
      if (generation === localGeneration.current && !sessionRef.current && !conflictRef.current) {
        setSyncState({ kind: 'local', label: 'Saved on this device' })
      }
    } catch (error) {
      setSyncState({ kind: 'error', label: `Local save failed · ${errorLabel(error, 'browser storage unavailable')}` })
    }
  }, [clearLocalTimers])

  const enterConflict = useCallback((pending: PendingConflict, label: string) => {
    clearRemoteTimers()
    conflictRef.current = pending
    setConflict(pending)
    setSyncState({ kind: 'conflict', label })
  }, [clearRemoteTimers])

  const scheduleRetry = useCallback((error: unknown) => {
    if (!isRetryable(error) || !navigator.onLine || !sessionRef.current || conflictRef.current) return
    if (retryTimer.current !== undefined) window.clearTimeout(retryTimer.current)
    const delay = Math.min(RETRY_MAX_DELAY, RETRY_BASE_DELAY * 2 ** retryAttempt.current)
    retryAttempt.current += 1
    retryTimer.current = window.setTimeout(() => {
      retryTimer.current = undefined
      void checkpointRef.current(latestDocument.current ?? undefined, false)
    }, delay)
  }, [])

  const checkpoint = useCallback(async (snapshot?: TheoryDocument, bypassInterval = false) => {
    const value = snapshot ?? latestDocument.current
    const activeSession = sessionRef.current
    if (!value || !activeSession || !remoteReady.current || conflictRef.current) return
    if (!navigator.onLine) {
      setSyncState({ kind: 'offline', label: 'Offline · changes safe on this device' })
      return
    }
    if (saving.current || resolving.current) {
      scheduleRemoteRef.current(latestDocument.current ?? undefined)
      return
    }
    const intervalRemaining = MIN_REMOTE_INTERVAL - (Date.now() - lastRemoteSave.current)
    if (!bypassInterval && intervalRemaining > 0) {
      if (remoteIdleTimer.current !== undefined) window.clearTimeout(remoteIdleTimer.current)
      remoteIdleTimer.current = window.setTimeout(() => {
        remoteIdleTimer.current = undefined
        void checkpointRef.current(latestDocument.current ?? undefined, false)
      }, intervalRemaining)
      return
    }

    const activeTarget = sessionTarget(activeSession)
    saving.current = true
    clearRemoteTimers()
    setSyncState({ kind: 'syncing', label: 'Checkpointing to GitHub…' })
    try {
      const result = await saveTheoryFile(activeSession, value, remoteSha.current)
      if (result.kind === 'conflict') {
        enterConflict({
          remote: result.remote,
          sha: result.sha,
          base: baseDocument.current,
          reason: 'github-write-conflict',
        }, 'GitHub changed elsewhere · review required')
        return
      }

      // The GitHub write is already durable at this point. Persisting the exact
      // ancestor and SHA makes the next startup comparison causal, not clock-based.
      await saveGithubSyncMarker(activeSession, result.sha, value)
      if (sessionTarget(sessionRef.current) !== activeTarget) return
      remoteSha.current = result.sha
      baseDocument.current = value
      lastRemoteSave.current = Date.now()
      retryAttempt.current = 0
      const stillCurrent = latestDocument.current === value
      setSyncState(stillCurrent
        ? { kind: 'synced', label: 'Saved to GitHub', at: new Date().toISOString() }
        : { kind: 'queued', label: 'New changes queued for GitHub' })
    } catch (error) {
      setSyncState({ kind: 'error', label: errorLabel(error, 'GitHub checkpoint failed') })
      scheduleRetry(error)
    } finally {
      saving.current = false
      if (
        sessionTarget(sessionRef.current) === activeTarget &&
        latestDocument.current !== value &&
        !conflictRef.current
      ) {
        scheduleRemoteRef.current(latestDocument.current ?? undefined)
      }
    }
  }, [clearRemoteTimers, enterConflict, scheduleRetry])
  checkpointRef.current = checkpoint

  const scheduleRemote = useCallback((_snapshot?: TheoryDocument) => {
    if (!sessionRef.current || !remoteReady.current || conflictRef.current) return
    const currentTime = Date.now()
    if (remoteDirtySince.current === null) remoteDirtySince.current = currentTime
    if (remoteIdleTimer.current !== undefined) window.clearTimeout(remoteIdleTimer.current)
    const idleDelay = Math.max(REMOTE_IDLE_DELAY, MIN_REMOTE_INTERVAL - (currentTime - lastRemoteSave.current))
    remoteIdleTimer.current = window.setTimeout(() => {
      remoteIdleTimer.current = undefined
      void checkpointRef.current(latestDocument.current ?? undefined, false)
    }, idleDelay)

    if (remoteMaxTimer.current === undefined) {
      const maxDue = Math.max(
        (remoteDirtySince.current ?? currentTime) + REMOTE_MAX_WAIT,
        lastRemoteSave.current + MIN_REMOTE_INTERVAL,
      )
      remoteMaxTimer.current = window.setTimeout(() => {
        remoteMaxTimer.current = undefined
        void checkpointRef.current(latestDocument.current ?? undefined, false)
      }, Math.max(0, maxDue - currentTime))
    }
    setSyncState({ kind: 'queued', label: 'Saved locally · GitHub checkpoint queued' })
  }, [])
  scheduleRemoteRef.current = scheduleRemote

  const reconcileStartup = useCallback(async (value: TheoryDocument, activeSession: GithubSession, epoch: number) => {
    if (
      startupReconciled.current ||
      startupReconciling.current ||
      !remoteLoaded.current ||
      epoch !== sessionEpoch.current
    ) return
    startupReconciling.current = true
    const remote = initialRemote.current
    const marker = initialMarker.current
    try {
      if (!remote) return
      remoteSha.current = remote.sha
      baseDocument.current = marker?.baseDocument

      const disposition = classifyStartupSync(value, remote, marker)

      if (disposition === 'create-remote') {
        startupReconciled.current = true
        remoteReady.current = true
        scheduleRemoteRef.current(latestDocument.current ?? value)
        return
      }
      if (!remote.document) return

      if (disposition === 'in-sync') {
        await saveGithubSyncMarker(activeSession, remote.sha as string, remote.document)
        if (epoch !== sessionEpoch.current) return
        baseDocument.current = remote.document
        startupReconciled.current = true
        remoteReady.current = true
        if (latestDocument.current === value) {
          setSyncState({ kind: 'synced', label: 'In sync with GitHub', at: new Date().toISOString() })
        } else {
          scheduleRemoteRef.current(latestDocument.current ?? value)
        }
        return
      }

      if (disposition === 'local-ahead') {
        // Only this device changed since the persisted common ancestor.
        startupReconciled.current = true
        remoteReady.current = true
        scheduleRemoteRef.current(latestDocument.current ?? value)
        return
      }

      startupReconciled.current = true
      remoteReady.current = true
      enterConflict({
        remote: remote.document,
        sha: remote.sha as string,
        base: marker?.baseDocument,
        reason: 'startup-divergence',
      }, 'This device and GitHub differ · review required')
    } catch (error) {
      startupReconciled.current = true
      remoteReady.current = true
      setSyncState({ kind: 'error', label: errorLabel(error, 'Could not establish the GitHub sync base') })
      scheduleRetry(error)
    } finally {
      startupReconciling.current = false
    }
  }, [enterConflict, scheduleRetry])

  useEffect(() => {
    const epoch = sessionEpoch.current + 1
    sessionEpoch.current = epoch
    clearRemoteTimers()
    remoteSha.current = undefined
    baseDocument.current = undefined
    lastRemoteSave.current = 0
    retryAttempt.current = 0
    remoteReady.current = false
    remoteLoaded.current = false
    startupReconciled.current = false
    startupReconciling.current = false
    initialRemote.current = null
    initialMarker.current = null
    conflictRef.current = null
    setConflict(null)

    if (!session) return
    setSyncState({ kind: 'loading', label: 'Checking GitHub for changes…' })
    let cancelled = false
    void Promise.all([fetchTheoryFile(session), loadGithubSyncMarker(session)])
      .then(([remote, marker]) => {
        if (cancelled || epoch !== sessionEpoch.current) return
        initialRemote.current = remote
        initialMarker.current = marker
        remoteLoaded.current = true
        const value = latestDocument.current
        if (value) void reconcileStartup(value, session, epoch)
      })
      .catch((error: unknown) => {
        if (cancelled || epoch !== sessionEpoch.current) return
        // A later retry remains safe because saveTheoryFile performs a fresh read
        // and treats any unknown remote content as a conflict.
        remoteLoaded.current = true
        startupReconciled.current = true
        remoteReady.current = true
        setSyncState({ kind: 'error', label: errorLabel(error, 'GitHub connection failed') })
        scheduleRetry(error)
      })
    return () => { cancelled = true }
  }, [clearRemoteTimers, reconcileStartup, scheduleRetry, session])

  useEffect(() => {
    if (!document) return
    localGeneration.current += 1
    const currentTime = Date.now()
    if (localDirtySince.current === null) {
      localDirtySince.current = currentTime
      localMaxTimer.current = window.setTimeout(() => void flushLocal(), LOCAL_MAX_WAIT)
    }
    if (localIdleTimer.current !== undefined) window.clearTimeout(localIdleTimer.current)
    localIdleTimer.current = window.setTimeout(() => void flushLocal(), LOCAL_IDLE_DELAY)

    if (session) {
      if (remoteLoaded.current && !startupReconciled.current) {
        void reconcileStartup(document, session, sessionEpoch.current)
      } else if (remoteReady.current && startupReconciled.current && !conflictRef.current) {
        scheduleRemote(document)
      }
    }
  }, [document, flushLocal, reconcileStartup, scheduleRemote, session])

  useEffect(() => {
    const handleOffline = () => setSyncState({ kind: 'offline', label: 'Offline · changes safe on this device' })
    const handleOnline = () => {
      if (sessionRef.current && latestDocument.current && !conflictRef.current) {
        setSyncState({ kind: 'queued', label: 'Back online · GitHub checkpoint queued' })
        void checkpointRef.current(latestDocument.current, true)
      }
    }
    const flushForBackground = () => {
      if (window.document.visibilityState === 'hidden') void flushLocal()
    }
    const handlePageHide = () => {
      void flushLocal().then(flushLocalWrites).catch(() => undefined)
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    window.addEventListener('pagehide', handlePageHide)
    window.document.addEventListener('visibilitychange', flushForBackground)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('pagehide', handlePageHide)
      window.document.removeEventListener('visibilitychange', flushForBackground)
    }
  }, [flushLocal])

  useEffect(() => () => {
    clearLocalTimers()
    clearRemoteTimers()
  }, [clearLocalTimers, clearRemoteTimers])

  const resolveConflict = useCallback(async (choice: 'merge' | 'mine' | 'remote') => {
    const pending = conflictRef.current
    const local = latestDocument.current
    const activeSession = sessionRef.current
    if (!pending || !local || resolving.current) return
    resolving.current = true
    saving.current = true
    try {
      // Preserve both inputs before any choice can replace either working copy.
      await saveLocalBackup(local, `Before conflict resolution (${choice}) · this device`, activeSession)
      await saveLocalBackup(pending.remote, `Before conflict resolution (${choice}) · GitHub`, activeSession)

      if (choice === 'remote') {
        setDocument(pending.remote)
        await saveLocalDocument(pending.remote)
        if (activeSession) await saveGithubSyncMarker(activeSession, pending.sha, pending.remote)
        remoteSha.current = pending.sha
        baseDocument.current = pending.remote
        conflictRef.current = null
        setConflict(null)
        setSyncState({ kind: 'synced', label: 'Loaded GitHub version · local backup retained', at: new Date().toISOString() })
        return
      }

      let next = local
      if (choice === 'merge') {
        const base = pending.base ?? baseDocument.current
        if (!base) {
          const updated = { ...pending, reason: 'overlapping-edits' as const, conflictingPaths: ['No common sync base is available'] }
          conflictRef.current = updated
          setConflict(updated)
          setSyncState({ kind: 'conflict', label: 'Automatic merge stopped · choose an explicit version' })
          return
        }
        const merged = threeWayMergeDocuments(base, local, pending.remote)
        if (!merged.document) {
          const updated = { ...pending, reason: 'overlapping-edits' as const, conflictingPaths: merged.conflicts }
          conflictRef.current = updated
          setConflict(updated)
          setSyncState({
            kind: 'conflict',
            label: `Automatic merge stopped · ${merged.conflicts.length} overlapping field${merged.conflicts.length === 1 ? '' : 's'}`,
          })
          return
        }
        next = merged.document
      }

      if (!activeSession) {
        await saveLocalDocument(next)
        setDocument(next)
        conflictRef.current = null
        setConflict(null)
        setSyncState({ kind: 'local', label: 'Conflict choice saved on this device' })
        return
      }

      setSyncState({ kind: 'syncing', label: choice === 'merge' ? 'Saving reviewed merge…' : 'Saving this device over GitHub…' })
      const result = await saveTheoryFile(activeSession, next, undefined, pending.sha)
      if (result.kind === 'conflict') {
        enterConflict({
          remote: result.remote,
          sha: result.sha,
          base: pending.base ?? baseDocument.current,
          reason: 'github-write-conflict',
        }, 'GitHub changed again · review required')
        return
      }

      await saveGithubSyncMarker(activeSession, result.sha, next)
      await saveLocalDocument(next)
      remoteSha.current = result.sha
      baseDocument.current = next
      lastRemoteSave.current = Date.now()
      retryAttempt.current = 0

      if (latestDocument.current !== local) {
        // An edit occurred while the conflict request was in flight. Preserve it
        // and compare it explicitly with the version that just reached GitHub.
        enterConflict({
          remote: next,
          sha: result.sha,
          base: next,
          reason: 'github-write-conflict',
        }, 'A newer local edit is waiting · review required')
        return
      }

      setDocument(next)
      conflictRef.current = null
      setConflict(null)
      setSyncState({ kind: 'synced', label: 'Saved to GitHub · recovery backups retained', at: new Date().toISOString() })
    } catch (error) {
      setSyncState({ kind: 'error', label: errorLabel(error, 'Conflict save failed') })
      scheduleRetry(error)
    } finally {
      saving.current = false
      resolving.current = false
    }
  }, [enterConflict, scheduleRetry, setDocument])

  return {
    syncState,
    conflict,
    checkpointNow: () => checkpoint(undefined, true),
    resolveConflict,
  }
}

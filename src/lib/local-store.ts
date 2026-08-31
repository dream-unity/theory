import { del, get, set } from 'idb-keyval'
import type { GithubSession, TheoryDocument } from '../types'
import { validateDocument } from './theory'

const DOCUMENT_KEY = 'dream-unity:theory-document:v1'
const SESSION_KEY = 'dream-unity:github-session:v1'
const SYNC_MARKER_PREFIX = 'dream-unity:github-sync-marker:v1:'
const BACKUPS_KEY = 'dream-unity:theory-backups:v1'
const MAX_BACKUPS = 16

/**
 * IndexedDB starts transactions asynchronously. Keeping one explicit queue prevents
 * an older, slower write from landing after a newer theory snapshot or sync marker.
 * The queue tail always recovers, while the Promise returned to the caller still
 * rejects so the UI can tell the truth about local durability.
 */
let localWriteQueue: Promise<void> = Promise.resolve()

function enqueueLocalWrite(operation: () => Promise<void>): Promise<void> {
  const result = localWriteQueue.then(operation, operation)
  localWriteQueue = result.catch(() => undefined)
  return result
}

export function flushLocalWrites(): Promise<void> {
  return localWriteQueue
}

function targetId(target: Pick<GithubSession, 'repository' | 'branch' | 'dataPath'>) {
  return `${target.repository}\u0000${target.branch}\u0000${target.dataPath}`
}

function syncMarkerKey(target: Pick<GithubSession, 'repository' | 'branch' | 'dataPath'>) {
  return `${SYNC_MARKER_PREFIX}${targetId(target)}`
}

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

/** Semantic equality independent of JSON object key insertion order. */
export function documentsEqual(left: TheoryDocument, right: TheoryDocument) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right))
}

export interface GithubSyncMarker {
  version: 1
  target: string
  sha: string
  documentRevision: number
  documentUpdatedAt: string
  syncedAt: string
  /** The common ancestor required for a non-destructive three-way merge. */
  baseDocument: TheoryDocument
}

export interface TheoryBackup {
  id: string
  createdAt: string
  reason: string
  target?: string
  document: TheoryDocument
}

function isGithubSyncMarker(value: unknown): value is GithubSyncMarker {
  if (!value || typeof value !== 'object') return false
  const marker = value as Partial<GithubSyncMarker>
  return (
    marker.version === 1 &&
    typeof marker.target === 'string' &&
    typeof marker.sha === 'string' &&
    typeof marker.documentRevision === 'number' &&
    typeof marker.documentUpdatedAt === 'string' &&
    typeof marker.syncedAt === 'string' &&
    validateDocument(marker.baseDocument)
  )
}

export async function loadLocalDocument(): Promise<TheoryDocument | null> {
  try {
    await flushLocalWrites()
    const value = await get<unknown>(DOCUMENT_KEY)
    return validateDocument(value) ? value : null
  } catch {
    return null
  }
}

export function saveLocalDocument(document: TheoryDocument): Promise<void> {
  return enqueueLocalWrite(() => set(DOCUMENT_KEY, document))
}

export function clearLocalDocument(): Promise<void> {
  return enqueueLocalWrite(() => del(DOCUMENT_KEY))
}

export async function loadGithubSyncMarker(
  session: Pick<GithubSession, 'repository' | 'branch' | 'dataPath'>,
): Promise<GithubSyncMarker | null> {
  try {
    await flushLocalWrites()
    const value = await get<unknown>(syncMarkerKey(session))
    if (!isGithubSyncMarker(value) || value.target !== targetId(session)) return null
    return value
  } catch {
    return null
  }
}

export function saveGithubSyncMarker(
  session: Pick<GithubSession, 'repository' | 'branch' | 'dataPath'>,
  sha: string,
  document: TheoryDocument,
): Promise<void> {
  const marker: GithubSyncMarker = {
    version: 1,
    target: targetId(session),
    sha,
    documentRevision: document.meta.revision,
    documentUpdatedAt: document.meta.updatedAt,
    syncedAt: new Date().toISOString(),
    baseDocument: document,
  }
  return enqueueLocalWrite(() => set(syncMarkerKey(session), marker))
}

export function saveLocalBackup(
  document: TheoryDocument,
  reason: string,
  session?: Pick<GithubSession, 'repository' | 'branch' | 'dataPath'> | null,
): Promise<void> {
  const timestamp = new Date().toISOString()
  const backup: TheoryBackup = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: timestamp,
    reason,
    target: session ? targetId(session) : undefined,
    document,
  }
  return enqueueLocalWrite(async () => {
    const current = await get<unknown>(BACKUPS_KEY)
    const backups = Array.isArray(current) ? current.filter((item): item is TheoryBackup => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<TheoryBackup>
      return typeof candidate.id === 'string' && typeof candidate.createdAt === 'string' && validateDocument(candidate.document)
    }) : []
    await set(BACKUPS_KEY, [backup, ...backups].slice(0, MAX_BACKUPS))
  })
}

export async function listLocalBackups(): Promise<TheoryBackup[]> {
  try {
    await flushLocalWrites()
    const value = await get<unknown>(BACKUPS_KEY)
    if (!Array.isArray(value)) return []
    return value.filter((item): item is TheoryBackup => {
      if (!item || typeof item !== 'object') return false
      const candidate = item as Partial<TheoryBackup>
      return typeof candidate.id === 'string' && typeof candidate.createdAt === 'string' && validateDocument(candidate.document)
    })
  } catch {
    return []
  }
}

export function loadSession(): GithubSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GithubSession
    return parsed.token && parsed.repository ? parsed : null
  } catch {
    return null
  }
}

export function saveSession(session: GithubSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

async function fetchJson(url: string): Promise<TheoryDocument | null> {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) return null
    const value: unknown = await response.json()
    return validateDocument(value) ? value : null
  } catch {
    return null
  }
}

export async function loadPublishedDocument(): Promise<TheoryDocument | null> {
  const raw = `https://raw.githubusercontent.com/dream-unity/theory/theory-live/public/data/theory.json?at=${Date.now()}`
  const fromRepository = await fetchJson(raw)
  if (fromRepository) return fromRepository
  return fetchJson(`${import.meta.env.BASE_URL}data/theory.json?at=${Date.now()}`)
}

export async function resolveInitialDocument(seed: TheoryDocument): Promise<TheoryDocument> {
  const local = await loadLocalDocument()
  if (local) return local
  return (await loadPublishedDocument()) ?? seed
}

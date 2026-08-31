import { del, get, set } from 'idb-keyval'
import type { GithubSession, TheoryDocument } from '../types'
import { mergeDocuments, validateDocument } from './theory'

const DOCUMENT_KEY = 'dream-unity:theory-document:v1'
const SESSION_KEY = 'dream-unity:github-session:v1'

export async function loadLocalDocument(): Promise<TheoryDocument | null> {
  try {
    const value = await get<unknown>(DOCUMENT_KEY)
    return validateDocument(value) ? value : null
  } catch {
    return null
  }
}

export async function saveLocalDocument(document: TheoryDocument) {
  await set(DOCUMENT_KEY, document)
}

export async function clearLocalDocument() {
  await del(DOCUMENT_KEY)
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
  const [local, published] = await Promise.all([loadLocalDocument(), loadPublishedDocument()])
  if (local && published) return mergeDocuments(local, published).document
  return local ?? published ?? seed
}

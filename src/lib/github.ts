import type { GithubSession, RuntimeConfig, TheoryDocument } from '../types'
import { validateDocument } from './theory'

const API = 'https://api.github.com'

const headers = (token?: string) => ({
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

const encodeBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

const decodeBase64 = (value: string) => {
  const binary = atob(value.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  const fallback: RuntimeConfig = {
    repository: 'dream-unity/theory',
    branch: 'theory-live',
    dataPath: 'public/data/theory.json',
  }
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}runtime-config.json`, { cache: 'no-store' })
    if (!response.ok) return fallback
    return { ...fallback, ...(await response.json()) }
  } catch {
    return fallback
  }
}

export async function connectWithToken(token: string, config: RuntimeConfig): Promise<GithubSession> {
  const response = await fetch(`${API}/user`, { headers: headers(token) })
  if (!response.ok) throw new Error('GitHub rejected this token. Check that it is current and correctly copied.')
  const user = (await response.json()) as { login: string; avatar_url?: string }
  const repositoryResponse = await fetch(`${API}/repos/${config.repository}`, { headers: headers(token) })
  if (!repositoryResponse.ok) throw new Error(`The token cannot access ${config.repository}.`)
  const repository = (await repositoryResponse.json()) as { permissions?: { push?: boolean } }
  if (!repository.permissions?.push) {
    throw new Error('This token can read the repository but cannot write to it. Grant Contents: Read and write.')
  }
  return {
    token,
    login: user.login,
    avatarUrl: user.avatar_url,
    repository: config.repository,
    branch: config.branch,
    dataPath: config.dataPath,
  }
}

export interface RemoteFile {
  document: TheoryDocument | null
  sha?: string
}

export async function fetchTheoryFile(session: GithubSession): Promise<RemoteFile> {
  const url = `${API}/repos/${session.repository}/contents/${session.dataPath}?ref=${encodeURIComponent(session.branch)}`
  const response = await fetch(url, { headers: headers(session.token), cache: 'no-store' })
  if (response.status === 404) return { document: null }
  if (!response.ok) throw new Error(`GitHub could not load the theory file (${response.status}).`)
  const payload = (await response.json()) as { content?: string; sha?: string }
  if (!payload.content) return { document: null, sha: payload.sha }
  const parsed: unknown = JSON.parse(decodeBase64(payload.content))
  if (!validateDocument(parsed)) throw new Error('The repository theory file has an unsupported structure.')
  return { document: parsed, sha: payload.sha }
}

export type GithubSaveResult =
  | { kind: 'saved'; sha: string }
  | { kind: 'conflict'; remote: TheoryDocument; sha: string }

export async function saveTheoryFile(
  session: GithubSession,
  document: TheoryDocument,
  expectedSha?: string,
  forceAgainstSha?: string,
): Promise<GithubSaveResult> {
  let sha = forceAgainstSha ?? expectedSha
  if (sha === undefined) {
    const current = await fetchTheoryFile(session)
    sha = current.sha
    if (current.document && current.document.meta.updatedAt > document.meta.updatedAt) {
      return { kind: 'conflict', remote: current.document, sha: current.sha as string }
    }
  }

  const [owner, repository] = session.repository.split('/')
  const url = `${API}/repos/${owner}/${repository}/contents/${session.dataPath}`
  const body = {
    message: `theory: checkpoint ${new Date().toISOString().replace(/:\d{2}\.\d{3}Z$/, 'Z')}`,
    content: encodeBase64(`${JSON.stringify(document, null, 2)}\n`),
    branch: session.branch,
    ...(sha ? { sha } : {}),
  }
  const response = await fetch(url, {
    method: 'PUT',
    headers: { ...headers(session.token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (response.status === 409 || response.status === 422) {
    const remote = await fetchTheoryFile(session)
    if (!remote.document || !remote.sha) throw new Error('GitHub reported a conflict, but its current theory file could not be read.')
    return { kind: 'conflict', remote: remote.document, sha: remote.sha }
  }
  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(details?.message ?? `GitHub save failed (${response.status}).`)
  }
  const payload = (await response.json()) as { content?: { sha?: string } }
  const nextSha = payload.content?.sha
  if (!nextSha) throw new Error('GitHub saved the file but did not return its new revision identifier.')
  return { kind: 'saved', sha: nextSha }
}

const OAUTH_STATE_KEY = 'dream-unity:oauth-state'
const OAUTH_VERIFIER_KEY = 'dream-unity:oauth-verifier'

const randomUrlSafe = (size = 32) => {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function beginGithubOAuth(clientId: string) {
  const state = randomUrlSafe()
  const verifier = randomUrlSafe(48)
  sessionStorage.setItem(OAUTH_STATE_KEY, state)
  sessionStorage.setItem(OAUTH_VERIFIER_KEY, verifier)
  const redirectUri = `${location.origin}${import.meta.env.BASE_URL}`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'public_repo',
    state,
    code_challenge: await sha256(verifier),
    code_challenge_method: 'S256',
  })
  location.assign(`https://github.com/login/oauth/authorize?${params}`)
}

export async function completeGithubOAuth(clientId: string): Promise<string | null> {
  const params = new URLSearchParams(location.search)
  const code = params.get('code')
  if (!code) return null
  const returnedState = params.get('state')
  const state = sessionStorage.getItem(OAUTH_STATE_KEY)
  const verifier = sessionStorage.getItem(OAUTH_VERIFIER_KEY)
  if (!state || !verifier || returnedState !== state) throw new Error('GitHub sign-in state did not match. Please reconnect.')
  const redirectUri = `${location.origin}${import.meta.env.BASE_URL}`
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, code, redirect_uri: redirectUri, code_verifier: verifier }),
  })
  if (!response.ok) throw new Error('GitHub could not complete sign-in.')
  const payload = (await response.json()) as { access_token?: string; error_description?: string }
  if (!payload.access_token) throw new Error(payload.error_description ?? 'GitHub did not return an access token.')
  sessionStorage.removeItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(OAUTH_VERIFIER_KEY)
  history.replaceState({}, '', `${location.origin}${import.meta.env.BASE_URL}`)
  return payload.access_token
}

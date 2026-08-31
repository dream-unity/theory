import { afterEach, describe, expect, it, vi } from 'vitest'
import { SEED_DOCUMENT } from '../seed'
import type { GithubSession, RuntimeConfig, TheoryDocument } from '../types'
import { connectWithToken, GithubApiError, loadRuntimeConfig, saveTheoryFile } from './github'

const session: GithubSession = {
  token: 'test-token',
  login: 'dreamer',
  repository: 'dream-unity/theory',
  branch: 'theory-live',
  dataPath: 'public/data/theory.json',
}

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const encodedFile = (document: TheoryDocument, sha = 'remote-sha') => ({
  type: 'file',
  encoding: 'base64',
  content: btoa(unescape(encodeURIComponent(JSON.stringify(document)))),
  sha,
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('GitHub configuration', () => {
  it('exports the runtime configuration loader', () => {
    expect(typeof loadRuntimeConfig).toBe('function')
  })

  it('stops an unknown-base save when GitHub content differs, even with the same timestamp', async () => {
    const remote = structuredClone(SEED_DOCUMENT)
    remote.nodes[0].title = 'Remote title'
    const local = structuredClone(SEED_DOCUMENT)
    local.nodes[0].title = 'Local title'
    expect(remote.meta.updatedAt).toBe(local.meta.updatedAt)

    const fetchMock = vi.fn().mockResolvedValue(response(encodedFile(remote)))
    vi.stubGlobal('fetch', fetchMock)

    const result = await saveTheoryFile(session, local)
    expect(result).toEqual({ kind: 'conflict', remote, sha: 'remote-sha' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBeUndefined()
  })

  it('does not create a redundant commit when the unknown-base file is already identical', async () => {
    const document = structuredClone(SEED_DOCUMENT)
    const fetchMock = vi.fn().mockResolvedValue(response(encodedFile(document)))
    vi.stubGlobal('fetch', fetchMock)

    await expect(saveTheoryFile(session, document)).resolves.toEqual({ kind: 'saved', sha: 'remote-sha' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports validation failures instead of disguising every 422 as a content conflict', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ message: 'Invalid request' }, 422)))
    const result = saveTheoryFile(session, structuredClone(SEED_DOCUMENT), 'known-sha')
    await expect(result).rejects.toMatchObject({
      name: 'GithubApiError',
      status: 422,
      retryable: false,
    } satisfies Partial<GithubApiError>)
    await expect(result).rejects.toThrow('Verify that the branch exists')
  })

  it('refuses to claim a connection when the configured data branch is missing', async () => {
    const config: RuntimeConfig = {
      repository: 'dream-unity/theory',
      branch: 'missing-live-branch',
      dataPath: 'public/data/theory.json',
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ login: 'dreamer' }))
      .mockResolvedValueOnce(response({ permissions: { push: true } }))
      .mockResolvedValueOnce(response({ message: 'Not Found' }, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(connectWithToken('test-token', config)).rejects.toThrow(
      'branch "missing-live-branch" does not exist',
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SEED_DOCUMENT } from '../seed'
import type { GithubSession } from '../types'

const fake = vi.hoisted(() => ({
  values: new Map<IDBValidKey, unknown>(),
  get: vi.fn(async (key: IDBValidKey) => fake.values.get(key)),
  set: vi.fn(async (key: IDBValidKey, value: unknown) => { fake.values.set(key, structuredClone(value)) }),
  del: vi.fn(async (key: IDBValidKey) => { fake.values.delete(key) }),
}))

vi.mock('idb-keyval', () => ({ get: fake.get, set: fake.set, del: fake.del }))

import {
  flushLocalWrites,
  listLocalBackups,
  loadGithubSyncMarker,
  loadLocalDocument,
  saveGithubSyncMarker,
  saveLocalBackup,
  saveLocalDocument,
} from './local-store'

const session: GithubSession = {
  token: 'never-persist-this-token',
  login: 'dreamer',
  repository: 'dream-unity/theory',
  branch: 'theory-live',
  dataPath: 'public/data/theory.json',
}

beforeEach(async () => {
  await flushLocalWrites()
  fake.values.clear()
  fake.get.mockClear()
  fake.set.mockClear()
  fake.del.mockClear()
})

describe('local durability', () => {
  it('serializes competing document writes and retains the newest snapshot', async () => {
    let activeWrites = 0
    let maximumConcurrentWrites = 0
    fake.set.mockImplementation(async (key: IDBValidKey, value: unknown) => {
      activeWrites += 1
      maximumConcurrentWrites = Math.max(maximumConcurrentWrites, activeWrites)
      await new Promise((resolve) => setTimeout(resolve, 5))
      fake.values.set(key, structuredClone(value))
      activeWrites -= 1
    })

    const first = structuredClone(SEED_DOCUMENT)
    first.meta.revision = 2
    const second = structuredClone(SEED_DOCUMENT)
    second.meta.revision = 3
    await Promise.all([saveLocalDocument(first), saveLocalDocument(second)])

    expect(maximumConcurrentWrites).toBe(1)
    expect((await loadLocalDocument())?.meta.revision).toBe(3)
  })

  it('persists a token-free common ancestor marker and recovery backups', async () => {
    const document = structuredClone(SEED_DOCUMENT)
    await saveGithubSyncMarker(session, 'base-sha', document)
    await saveLocalBackup(document, 'before conflict resolution', session)

    const marker = await loadGithubSyncMarker(session)
    expect(marker?.sha).toBe('base-sha')
    expect(marker?.documentRevision).toBe(document.meta.revision)
    expect(JSON.stringify(marker)).not.toContain(session.token)

    const backups = await listLocalBackups()
    expect(backups).toHaveLength(1)
    expect(backups[0].reason).toContain('before conflict')
    expect(JSON.stringify(backups)).not.toContain(session.token)
  })
})

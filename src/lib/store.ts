import { get, set } from 'idb-keyval'
import type { AtlasDocument } from '../types'
import { cloneSeed } from './document'

const KEY = 'dream-unity-atlas-v2'

export function seedDocument(): AtlasDocument {
  return cloneSeed()
}

export async function loadDocument(): Promise<AtlasDocument> {
  try {
    const stored = await get<AtlasDocument>(KEY)
    if (stored && stored.schemaVersion === 2 && Array.isArray(stored.concepts) && stored.concepts.length > 0) {
      return stored
    }
  } catch {
    /* use seed */
  }
  const seed = cloneSeed()
  try {
    await saveDocument(seed)
  } catch {
    /* private mode / blocked IDB must not block first paint */
  }
  return seed
}

export async function saveDocument(doc: AtlasDocument): Promise<void> {
  try {
    await set(KEY, doc)
  } catch {
    /* ignore quota / private-mode failures */
  }
}

export async function resetDocument(): Promise<AtlasDocument> {
  const seed = cloneSeed()
  await saveDocument(seed)
  return seed
}

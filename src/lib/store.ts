import { get, set } from 'idb-keyval'
import type { AtlasDocument } from '../types'
import { cloneSeed } from './document'

const KEY = 'dream-unity-atlas-v2'

export async function loadDocument(): Promise<AtlasDocument> {
  try {
    const stored = await get<AtlasDocument>(KEY)
    if (stored && stored.schemaVersion === 2 && Array.isArray(stored.concepts)) return stored
  } catch {
    /* fall through to seed */
  }
  const seed = cloneSeed()
  await saveDocument(seed)
  return seed
}

export async function saveDocument(doc: AtlasDocument): Promise<void> {
  await set(KEY, doc)
}

export async function resetDocument(): Promise<AtlasDocument> {
  const seed = cloneSeed()
  await saveDocument(seed)
  return seed
}

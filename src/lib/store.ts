import type { BrainDocument } from '../types'
import { cloneSeed } from './mutate'

const KEY = 'dream-unity-brain-v3'

export function seedDocument(): BrainDocument {
  return cloneSeed()
}

export function loadDocument(): BrainDocument {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return cloneSeed()
    const parsed = JSON.parse(raw) as BrainDocument
    if (parsed?.schemaVersion === 3 && Array.isArray(parsed.thoughts) && parsed.thoughts.length) return parsed
  } catch {
    /* ignore */
  }
  return cloneSeed()
}

export function saveDocument(doc: BrainDocument): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(doc))
  } catch {
    /* private mode */
  }
}

export function resetDocument(): BrainDocument {
  const seed = cloneSeed()
  saveDocument(seed)
  return seed
}

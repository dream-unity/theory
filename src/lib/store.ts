import type { BrainDocument } from '../types'
import { cloneSeed } from './mutate'

const KEY = 'dream-unity-brain-v4'

export function seedDocument(): BrainDocument {
  return cloneSeed()
}

export function loadDocument(): BrainDocument {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return cloneSeed()
    const parsed = JSON.parse(raw) as BrainDocument
    if (parsed?.schemaVersion === 4 && Array.isArray(parsed.thoughts) && parsed.thoughts.length) {
      return {
        ...parsed,
        history: parsed.history?.length ? parsed.history : [parsed.activeId],
        historyIndex: Number.isInteger(parsed.historyIndex) ? parsed.historyIndex : Math.max(0, (parsed.history?.length ?? 1) - 1),
      }
    }
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

export function exportDocument(doc: BrainDocument): string {
  return JSON.stringify(doc, null, 2)
}

export function importDocument(raw: string): BrainDocument | null {
  try {
    const parsed = JSON.parse(raw) as BrainDocument
    if (!parsed?.thoughts?.length || !parsed.links) return null
    return {
      ...cloneSeed(),
      ...parsed,
      schemaVersion: 4,
      history: parsed.history?.length ? parsed.history : [parsed.activeId ?? parsed.homeId],
      historyIndex: parsed.historyIndex ?? 0,
    }
  } catch {
    return null
  }
}

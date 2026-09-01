export type LinkKind = 'child' | 'jump'

export interface Thought {
  id: string
  name: string
  label?: string
  notes: string
  color: string
  icon?: string
  tags: string[]
  attachments: { id: string; title: string; url?: string }[]
  forgotten?: boolean
}

export interface Link {
  id: string
  kind: LinkKind
  from: string
  to: string
}

export interface BrainDocument {
  schemaVersion: 3
  title: string
  homeId: string
  activeId: string
  pins: string[]
  thoughts: Thought[]
  links: Link[]
  history: string[]
  updatedAt: string
}

export interface PlexZones {
  active: Thought
  parents: Thought[]
  children: Thought[]
  jumps: Thought[]
  siblings: Thought[]
}

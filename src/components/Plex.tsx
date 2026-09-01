import type { PlexZones } from '../types'
import type { CreateKind } from '../lib/mutate'
import { childrenOf, jumpsOf, parentsOf } from '../lib/plex'
import { SEED } from '../seed'

export function Plex({
  zones,
  activeId,
  onActivate,
  onCreate,
}: {
  zones: PlexZones
  activeId: string
  onActivate: (id: string) => void
  onCreate: (kind: CreateKind) => void
}) {
  const { active, parents, children, jumps, siblings } = zones
  return (
    <div className="plex">
      <svg className="plex-lines" viewBox="0 0 1000 700" preserveAspectRatio="none">
        {parents.map((_, index) => (
          <path key={`p${index}`} d={curve(500, 310, slotX(parents.length, index), 120)} />
        ))}
        {children.map((_, index) => (
          <path key={`c${index}`} d={curve(500, 390, slotX(children.length, index), 560)} />
        ))}
        {jumps.map((_, index) => (
          <path key={`j${index}`} d={curve(430, 350, 160, stackY(jumps.length, index))} />
        ))}
        {siblings.map((_, index) => (
          <path key={`s${index}`} d={curve(570, 350, 840, stackY(siblings.length, index))} />
        ))}
      </svg>

      <div className="zone parents">
        {parents.map((thought) => (
          <ThoughtChip key={thought.id} name={thought.name} color={thought.color} label={thought.label} onClick={() => onActivate(thought.id)} />
        ))}
      </div>

      <div className="zone jumps">
        {jumps.map((thought) => (
          <ThoughtChip key={thought.id} name={thought.name} color={thought.color} label={thought.label} onClick={() => onActivate(thought.id)} />
        ))}
      </div>

      <div className="zone active-wrap">
        <div className="thought active-thought" style={{ borderColor: active.color, boxShadow: `0 0 0 1px ${active.color}55, 0 18px 50px rgba(0,0,0,.45)` }}>
          <button type="button" className="gate parent-gate" title="Create parent (F7)" onClick={() => onCreate('parent')} data-filled={parents.length > 0} />
          <button type="button" className="gate jump-gate" title="Create jump (F8)" onClick={() => onCreate('jump')} data-filled={jumps.length > 0} />
          <div className="thought-body">
            {active.label ? <em>{active.label}</em> : null}
            <strong>{active.name}</strong>
          </div>
          <button type="button" className="gate child-gate" title="Create child (F6)" onClick={() => onCreate('child')} data-filled={children.length > 0} />
        </div>
      </div>

      <div className="zone siblings">
        {siblings.map((thought) => (
          <ThoughtChip key={thought.id} name={thought.name} color={thought.color} label={thought.label} onClick={() => onActivate(thought.id)} />
        ))}
      </div>

      <div className="zone children">
        {children.map((thought) => (
          <ThoughtChip
            key={thought.id}
            name={thought.name}
            color={thought.color}
            label={thought.label}
            filledChild={looksFilled(thought.id)}
            onClick={() => onActivate(thought.id)}
          />
        ))}
      </div>

      <p className="plex-hint">Click a thought to activate it · Gates create parent / jump / child · F6 F7 F8</p>
      <span className="sr-only">{activeId}</span>
    </div>
  )
}

function ThoughtChip({
  name,
  color,
  label,
  onClick,
}: {
  name: string
  color: string
  label?: string
  filledChild?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className="thought" style={{ borderColor: color }} onClick={onClick}>
      {label ? <em>{label}</em> : null}
      <strong>{name}</strong>
    </button>
  )
}

function slotX(count: number, index: number): number {
  if (count <= 1) return 500
  const span = Math.min(760, count * 130)
  const start = 500 - span / 2
  return start + (span / (count - 1)) * index
}

function stackY(count: number, index: number): number {
  const start = 350 - ((count - 1) * 48) / 2
  return start + index * 48
}

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return `M ${x1} ${y1} Q ${mx} ${y1} ${mx} ${my} T ${x2} ${y2}`
}

function looksFilled(id: string): boolean {
  return childrenOf(SEED, id).length + jumpsOf(SEED, id).length + parentsOf(SEED, id).length > 1
}

import type { CSSProperties } from 'react'

type CellKind = 'empty' | 'done' | 'pending' | 'parcial' | 'parcial-done'

interface GridRow {
  id: string
  label: string
  color: string
  cells: CellKind[]
}

interface ActivityGridProps {
  days: number[]
  rows: GridRow[]
  title?: string
  subtitle?: string
}

export function ActivityGrid({
  days,
  rows,
  title = 'Grilla por materia',
  subtitle = 'Semanas 1–20 · punto = actividad · rombo = parcial',
}: ActivityGridProps) {
  return (
    <section className="grid-panel">
      <header className="section-head">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </header>
      <div className="habit-scroll">
        <div
          className="habit-grid"
          style={{ '--cols': days.length } as CSSProperties}
        >
          <div className="habit-corner" />
          {days.map((d) => (
            <div key={d} className="habit-day">
              {d}
            </div>
          ))}
          {rows.map((row) => (
            <div key={row.id} className="habit-row-contents">
              <div className="habit-label" title={row.label}>
                {row.label}
              </div>
              {row.cells.map((kind, i) => (
                <div key={i} className="habit-cell">
                  <span
                    className={`habit-dot kind-${kind}`}
                    style={
                      kind === 'done' || kind === 'parcial-done'
                        ? { background: row.color, borderColor: 'transparent' }
                        : kind === 'parcial'
                          ? { borderColor: row.color, color: row.color }
                          : kind === 'pending'
                            ? { borderColor: row.color }
                            : undefined
                    }
                    title={
                      kind === 'parcial' || kind === 'parcial-done'
                        ? `Semana ${days[i]} · parcial`
                        : kind === 'done'
                          ? `Semana ${days[i]} · completado`
                          : kind === 'pending'
                            ? `Semana ${days[i]} · pendiente`
                            : `Semana ${days[i]}`
                    }
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

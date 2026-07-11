import { BookOpen, CalendarRange, Target, Archive } from 'lucide-react'
import { useStore } from '../lib/store'
import {
  formatLongDate,
  gridPorMaterias,
  semanaActualCiclo,
  statsCiclo,
  tiempoCiclo,
  weeklyProgressCiclo,
} from '../lib/stats'
import { ProgressChart } from '../components/ProgressChart'
import { ActivityGrid } from '../components/ActivityGrid'
import { CycleTimePanel } from '../components/CycleTimePanel'
import type { ViewId } from '../types'

interface PanelProps {
  onNavigate: (v: ViewId) => void
  onOpenMateria: (id: string) => void
}

export function PanelView({ onNavigate, onOpenMateria }: PanelProps) {
  const { data, activeCiclo, materiasActivas } = useStore()
  const stats = statsCiclo(data)
  const progress = weeklyProgressCiclo(data)
  const grid = gridPorMaterias(data)
  const tiempo = tiempoCiclo(data)
  const semanaNow = semanaActualCiclo(activeCiclo.inicio, activeCiclo.fin)
  const today = formatLongDate()

  return (
    <div className="view panel-view">
      <header className="view-header">
        <div>
          <h2>Panel de control</h2>
          <p>
            {activeCiclo.nombre} · control por materia · 20 semanas
            {activeCiclo.archivado ? ' · vista de respaldo' : ''}
          </p>
        </div>
        <div className="day-chip">
          <span className="day-label">Semana {semanaNow}/20</span>
          <span className="day-value">{today}</span>
        </div>
      </header>

      {activeCiclo.archivado && (
        <div className="banner warn">
          <Archive size={16} />
          Estás viendo un ciclo archivado (respaldo). Puedes consultarlo sin perder el
          ciclo activo.
        </div>
      )}

      <CycleTimePanel
        tiempo={tiempo}
        avanceAcademico={stats.pct}
        onNavigateFestivos={() => onNavigate('festivos')}
      />

      <div className="stat-row">
        <button type="button" className="stat-card" onClick={() => onNavigate('materias')}>
          <BookOpen size={18} />
          <div>
            <strong>{stats.materias}</strong>
            <span>Materias</span>
          </div>
        </button>
        <div className="stat-card">
          <Target size={18} />
          <div>
            <strong>
              {stats.tDone + stats.fDone}/{stats.tTotal + stats.fTotal}
            </strong>
            <span>Foros + tareas</span>
          </div>
        </div>
        <div className="stat-card">
          <CalendarRange size={18} />
          <div>
            <strong>
              {stats.pDone}/{stats.pTotal}
            </strong>
            <span>Parciales</span>
          </div>
        </div>
        <div className="stat-card accent">
          <Target size={18} />
          <div>
            <strong>{tiempo.pctTemporal}%</strong>
            <span>Tiempo de estudio</span>
          </div>
        </div>
      </div>

      <ProgressChart data={progress} />
      <ActivityGrid days={grid.days} rows={grid.rows} />

      <section className="upcoming-panel">
        <header className="section-head">
          <h3>Materias del ciclo</h3>
          <p>Entrá a cada materia para foros, tareas y parciales</p>
        </header>
        {materiasActivas.length === 0 ? (
          <p className="empty-hint">
            No hay materias. Agregá una en la sección Materias.
          </p>
        ) : (
          <ul className="upcoming-list">
            {materiasActivas.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="upcoming-item"
                  onClick={() => onOpenMateria(m.id)}
                >
                  <span className="dot" style={{ background: m.color }} />
                  <div className="upcoming-body">
                    <strong>{m.nombre}</strong>
                    <span>{m.codigo || 'Sin código'}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

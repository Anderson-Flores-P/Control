import { ChevronRight, ListTodo } from 'lucide-react'
import { StatusBadge, ParcialBadge } from './StatusBadge'
import {
  PENDING_TIPO_LABEL,
  type PendingItem,
  type PendingTipo,
} from '../lib/stats'
import type { ActivityStatus } from '../types'

interface Props {
  items: PendingItem[]
  semanaActual: number
  onOpenMateria: (id: string) => void
}

function isActivityStatus(s: PendingItem['status']): s is ActivityStatus {
  return (
    s === 'pendiente' ||
    s === 'en_progreso' ||
    s === 'completada' ||
    s === 'vencida' ||
    s === 'desactivada' ||
    s === 'no_hubo'
  )
}

function tipoClass(tipo: PendingTipo): string {
  return `pending-tipo pending-tipo-${tipo}`
}

export function PendingTasksPanel({
  items,
  semanaActual,
  onOpenMateria,
}: Props) {
  const estaSemana = items.filter((i) => i.semana === semanaActual).length
  const vencidas = items.filter((i) => i.status === 'vencida').length

  return (
    <section className="upcoming-panel pending-panel">
      <header className="section-head row">
        <div>
          <h3>
            <ListTodo size={16} className="section-head-icon" />
            Pendientes
          </h3>
          <p>
            Tareas, foros, cortos y demás sin completar · tocá una para abrir la
            materia
          </p>
        </div>
        {items.length > 0 && (
          <div className="pending-summary">
            <span className="pending-count">{items.length}</span>
            {estaSemana > 0 && (
              <span className="pending-meta">
                {estaSemana} esta semana
              </span>
            )}
            {vencidas > 0 && (
              <span className="pending-meta warn">{vencidas} vencida{vencidas === 1 ? '' : 's'}</span>
            )}
          </div>
        )}
      </header>

      {items.length === 0 ? (
        <p className="empty-hint">No hay actividades pendientes en este ciclo.</p>
      ) : (
        <ul className="upcoming-list pending-list">
          {items.map((item) => {
            const isCurrent = item.semana === semanaActual
            const isOverdue = item.status === 'vencida' || item.semana < semanaActual
            return (
              <li key={`${item.tipo}-${item.id}`}>
                <button
                  type="button"
                  className={`upcoming-item pending-item${isCurrent ? ' is-current' : ''}${isOverdue && item.tipo !== 'parcial' ? ' is-overdue' : ''}`}
                  onClick={() => onOpenMateria(item.materiaId)}
                >
                  <span
                    className="dot"
                    style={{ background: item.materiaColor }}
                  />
                  <div className="upcoming-body">
                    <strong>{item.titulo}</strong>
                    <span>
                      {item.materiaNombre}
                      {item.origen ? ` · ${item.origen}` : ''}
                    </span>
                  </div>
                  <div className="pending-meta-row">
                    <span className={tipoClass(item.tipo)}>
                      {PENDING_TIPO_LABEL[item.tipo]}
                    </span>
                    <span className={`pending-week${isCurrent ? ' current' : ''}`}>
                      S{item.semana}
                    </span>
                    {item.tipo === 'parcial' && !isActivityStatus(item.status) ? (
                      <ParcialBadge status={item.status} />
                    ) : (
                      <StatusBadge status={item.status as ActivityStatus} />
                    )}
                  </div>
                  <ChevronRight size={16} className="upcoming-go" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

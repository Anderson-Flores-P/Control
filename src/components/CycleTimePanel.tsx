import type { TiempoCiclo } from '../lib/stats'
import { formatShortDate } from '../lib/stats'
import { CalendarOff, Clock3 } from 'lucide-react'

interface CycleTimePanelProps {
  tiempo: TiempoCiclo
  avanceAcademico: number
  onNavigateFestivos: () => void
}

const estadoLabel = {
  antes: 'Aún no inicia',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
} as const

export function CycleTimePanel({
  tiempo,
  avanceAcademico,
  onNavigateFestivos,
}: CycleTimePanelProps) {
  return (
    <section className="time-panel">
      <header className="section-head row">
        <div>
          <h3>Tiempo del ciclo</h3>
          <p>
            {formatShortDate(tiempo.inicio)} → {formatShortDate(tiempo.fin)} ·{' '}
            {estadoLabel[tiempo.estado]}
          </p>
        </div>
        <button type="button" className="btn ghost sm" onClick={onNavigateFestivos}>
          <CalendarOff size={14} /> Festivos
        </button>
      </header>

      <div className="time-bars">
        <div className="time-bar-block">
          <div className="time-bar-labels">
            <span>
              <Clock3 size={14} /> Avance temporal (días de clase)
            </span>
            <strong>{tiempo.pctTemporal}%</strong>
          </div>
          <div className="time-track">
            <div
              className="time-fill temporal"
              style={{ width: `${tiempo.pctTemporal}%` }}
            />
          </div>
          <p className="time-caption">
            {tiempo.diasLectivosTranscurridos} de {tiempo.diasLectivos} días de clase
            (horario de materias − festivos)
          </p>
        </div>

        <div className="time-bar-block">
          <div className="time-bar-labels">
            <span>Avance calendario</span>
            <strong>{tiempo.pctCalendario}%</strong>
          </div>
          <div className="time-track">
            <div
              className="time-fill calendar"
              style={{ width: `${tiempo.pctCalendario}%` }}
            />
          </div>
          <p className="time-caption">
            {tiempo.diasCalendarioTranscurridos} de {tiempo.diasTotales} días del ciclo
          </p>
        </div>

        <div className="time-bar-block">
          <div className="time-bar-labels">
            <span>Avance académico</span>
            <strong>{avanceAcademico}%</strong>
          </div>
          <div className="time-track">
            <div
              className="time-fill academic"
              style={{ width: `${avanceAcademico}%` }}
            />
          </div>
          <p className="time-caption">
            Promedio del avance de cada semana (no salta a 100% con una sola
            actividad)
          </p>
        </div>
      </div>

      <div className="time-stats">
        <div>
          <strong>{tiempo.diasLectivosTranscurridos}</strong>
          <span>Días de clase llevados</span>
        </div>
        <div>
          <strong>{tiempo.diasLectivosRestantes}</strong>
          <span>Días de clase restantes</span>
        </div>
        <div>
          <strong>{tiempo.diasFestivos}</strong>
          <span>Festivos en días de clase</span>
        </div>
        <div>
          <strong>
            {tiempo.diasHorario.length > 0
              ? tiempo.diasHorario
                  .map(
                    (d) =>
                      ({ 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom' } as const)[
                        d
                      ],
                  )
                  .join(' · ')
              : '—'}
          </strong>
          <span>Días con materias</span>
        </div>
      </div>
    </section>
  )
}

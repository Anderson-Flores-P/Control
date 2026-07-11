import { Lock, Palmtree } from 'lucide-react'
import { useStore } from '../lib/store'
import {
  formatRangoSemana,
  semanaActualCiclo,
  semanaTieneParcial,
  materiasDelCiclo,
  semanasConFestivo,
} from '../lib/stats'
import { SEMANAS_POR_CICLO } from '../types'

interface SemanasViewProps {
  onOpenMateria: (id: string) => void
}

export function SemanasView({ onOpenMateria }: SemanasViewProps) {
  const { data, activeCiclo } = useStore()
  const mats = materiasDelCiclo(data)
  const current = semanaActualCiclo(activeCiclo.inicio, activeCiclo.fin)
  const festivoWeeks = semanasConFestivo(data)

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <h2>20 Semanas</h2>
          <p>
            {activeCiclo.nombre} · semana actual {current}/20 · vista cruzada por materia
          </p>
        </div>
      </header>

      {festivoWeeks.size > 0 && (
        <div className="banner rest">
          <Palmtree size={16} />
          Semanas con descanso:{' '}
          {[...festivoWeeks]
            .sort((a, b) => a - b)
            .map((s) => `S${s}`)
            .join(', ')}
        </div>
      )}

      <div className="semanas-matrix-wrap">
        <table className="semanas-matrix">
          <thead>
            <tr>
              <th className="sticky-col">Materia</th>
              {Array.from({ length: SEMANAS_POR_CICLO }, (_, i) => (
                <th
                  key={i}
                  className={`${i + 1 === current ? 'current-week' : ''}${
                    festivoWeeks.has(i + 1) ? ' festivo-week' : ''
                  }`}
                  title={
                    festivoWeeks.has(i + 1)
                      ? `Semana ${i + 1} · hay festivo`
                      : `Semana ${i + 1}`
                  }
                >
                  {i + 1}
                  {festivoWeeks.has(i + 1) && (
                    <Palmtree size={9} className="th-palm" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mats.map((m) => (
              <tr key={m.id}>
                <td className="sticky-col">
                  <button
                    type="button"
                    className="mat-pill linkish-row"
                    onClick={() => onOpenMateria(m.id)}
                  >
                    <i style={{ background: m.color }} />
                    {m.nombre}
                  </button>
                </td>
                {Array.from({ length: SEMANAS_POR_CICLO }, (_, i) => {
                  const semana = i + 1
                  const parcial = semanaTieneParcial(data, m.id, semana)
                  const tCount = data.tareas.filter(
                    (t) => t.materiaId === m.id && t.semana === semana,
                  ).length
                  const fCount = data.foros.filter(
                    (f) => f.materiaId === m.id && f.semana === semana,
                  ).length
                  const tDone = data.tareas.filter(
                    (t) =>
                      t.materiaId === m.id &&
                      t.semana === semana &&
                      t.status === 'completada',
                  ).length
                  const fDone = data.foros.filter(
                    (f) =>
                      f.materiaId === m.id &&
                      f.semana === semana &&
                      f.status === 'completada',
                  ).length

                  if (parcial) {
                    return (
                      <td
                        key={semana}
                        className="cell-parcial"
                        title={`${parcial.titulo} · ${formatRangoSemana(activeCiclo.inicio, semana)}`}
                      >
                        <Lock size={12} />
                        <span>P</span>
                      </td>
                    )
                  }

                  const total = tCount + fCount
                  const done = tDone + fDone
                  return (
                    <td
                      key={semana}
                      className={`${
                        total === 0
                          ? 'cell-empty'
                          : done === total
                            ? 'cell-done'
                            : 'cell-pending'
                      }${festivoWeeks.has(semana) ? ' cell-festivo' : ''}`}
                      title={`Tareas ${tDone}/${tCount} · Foros ${fDone}/${fCount}`}
                    >
                      {total === 0 ? '·' : `${done}/${total}`}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mats.length === 0 && (
        <p className="empty-hint">Agregá materias para ver el tablero de 20 semanas.</p>
      )}

      <div className="legend-row">
        <span>
          <i className="lg parcial" /> Semana con parcial (foros/tareas off)
        </span>
        <span>
          <i className="lg festivo" /> Semana con festivo
        </span>
        <span>
          <i className="lg done" /> Completada
        </span>
        <span>
          <i className="lg pending" /> Pendiente
        </span>
      </div>
    </div>
  )
}

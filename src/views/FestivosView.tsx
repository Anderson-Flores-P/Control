import { useState, type FormEvent } from 'react'
import { Plus, Trash2, Palmtree } from 'lucide-react'
import { useStore } from '../lib/store'
import {
  festividadesDelCiclo,
  formatShortDate,
  tiempoCiclo,
} from '../lib/stats'
import { Field, FormActions, Modal } from '../components/Modal'
import type { Festividad } from '../types'

export function FestivosView() {
  const {
    data,
    activeCiclo,
    addFestividad,
    updateFestividad,
    removeFestividad,
  } = useStore()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Festividad | null>(null)
  const [error, setError] = useState('')

  const list = festividadesDelCiclo(data)
  const tiempo = tiempoCiclo(data)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const inicio = String(fd.get('inicio'))
    let fin = String(fd.get('fin'))
    if (!fin) fin = inicio
    const payload = {
      cicloId: activeCiclo.id,
      nombre: String(fd.get('nombre')).trim(),
      inicio,
      fin: fin < inicio ? inicio : fin,
    }
    if (!payload.nombre || !payload.inicio) {
      setError('Completá nombre y fechas.')
      return
    }
    if (payload.inicio < activeCiclo.inicio || payload.fin > activeCiclo.fin) {
      setError(
        `Las fechas deben estar dentro del ciclo (${activeCiclo.inicio} → ${activeCiclo.fin}).`,
      )
      return
    }
    const res = edit
      ? updateFestividad(edit.id, payload)
      : addFestividad(payload)
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    setOpen(false)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <h2>Festividades</h2>
          <p>
            Días sin clases en {activeCiclo.nombre}. Se restan del tiempo de estudio del
            ciclo.
          </p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            setEdit(null)
            setError('')
            setOpen(true)
          }}
        >
          <Plus size={16} /> Nueva festividad
        </button>
      </header>

      <div className="stat-row festivo-stats">
        <div className="stat-card">
          <Palmtree size={18} />
          <div>
            <strong>{tiempo.diasFestivos}</strong>
            <span>Días de descanso</span>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <strong>{tiempo.diasFestivosYaPasados}</strong>
            <span>Ya disfrutados</span>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <strong>{tiempo.diasFestivosPorVenir}</strong>
            <span>Por venir</span>
          </div>
        </div>
        <div className="stat-card accent">
          <div>
            <strong>{tiempo.diasLectivos}</strong>
            <span>Días de clase del ciclo</span>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="empty-hint">
          No hay festividades. Agregá asuetos o feriados para marcar descanso sin clases.
        </p>
      ) : (
        <div className="festivo-list">
          {list.map((f) => {
            const sameDay = f.inicio === f.fin
            const pasado = f.fin < tiempo.hoy
            const vigente = f.inicio <= tiempo.hoy && f.fin >= tiempo.hoy
            return (
              <article
                key={f.id}
                className={`festivo-card${vigente ? ' now' : ''}${pasado ? ' past' : ''}`}
              >
                <div className="festivo-card-body">
                  <span className="festivo-status">
                    {vigente ? 'Ahora' : pasado ? 'Pasado' : 'Próximo'}
                  </span>
                  <h3>{f.nombre}</h3>
                  <p>
                    {sameDay
                      ? formatShortDate(f.inicio)
                      : `${formatShortDate(f.inicio)} → ${formatShortDate(f.fin)}`}
                  </p>
                </div>
                <div className="festivo-actions">
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      setEdit(f)
                      setError('')
                      setOpen(true)
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => removeFestividad(f.id)}
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={open}
        title={edit ? 'Editar festividad' : 'Nueva festividad'}
        onClose={() => setOpen(false)}
      >
        <form className="form" onSubmit={onSubmit}>
          {error && <p className="form-error">{error}</p>}
          <Field label="Nombre">
            <input
              name="nombre"
              required
              defaultValue={edit?.nombre ?? ''}
              placeholder="Ej. Semana Santa, Día de la Independencia"
            />
          </Field>
          <div className="field-row">
            <Field label="Desde">
              <input
                name="inicio"
                type="date"
                required
                min={activeCiclo.inicio}
                max={activeCiclo.fin}
                defaultValue={edit?.inicio ?? ''}
              />
            </Field>
            <Field label="Hasta (mismo día si es uno solo)">
              <input
                name="fin"
                type="date"
                min={activeCiclo.inicio}
                max={activeCiclo.fin}
                defaultValue={edit?.fin ?? edit?.inicio ?? ''}
              />
            </Field>
          </div>
          <p className="hint-inline">
            Ciclo activo: {activeCiclo.inicio} → {activeCiclo.fin}. Esos días no cuentan
            como tiempo de estudio.
          </p>
          <FormActions onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </div>
  )
}

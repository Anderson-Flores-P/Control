import { useState, type FormEvent } from 'react'
import { Archive, Copy, Download, Plus, Check } from 'lucide-react'
import { useStore } from '../lib/store'
import { exportCicloJson } from '../lib/storage'
import { Field, FormActions, Modal } from '../components/Modal'
import { materiasDelCiclo, statsCiclo } from '../lib/stats'
import { SEMANAS_POR_CICLO, type Ciclo } from '../types'

export function CiclosView() {
  const {
    data,
    activeCiclo,
    setActiveCiclo,
    updateCiclo,
    addCiclo,
    archiveCiclo,
    duplicateCicloAsBackup,
  } = useStore()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Ciclo | null>(null)

  const year = new Date().getFullYear()

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      nombre: String(fd.get('nombre')).trim(),
      año: Number(fd.get('año')) || year,
      numero: Number(fd.get('numero')) as 1 | 2,
      inicio: String(fd.get('inicio')),
      fin: String(fd.get('fin')),
      archivado: edit?.archivado ?? false,
    }
    if (!payload.nombre || !payload.inicio || !payload.fin) return
    if (edit) updateCiclo(edit.id, payload)
    else addCiclo(payload)
    setOpen(false)
  }

  const downloadBackup = (cicloId: string) => {
    const json = exportCicloJson(data, cicloId)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const c = data.ciclos.find((x) => x.id === cicloId)
    a.href = url
    a.download = `respaldo-${c?.nombre.replace(/\s+/g, '-').toLowerCase() ?? 'ciclo'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sorted = [...data.ciclos].sort((a, b) => {
    if (a.año !== b.año) return b.año - a.año
    return a.numero - b.numero
  })

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <h2>Ciclos del año</h2>
          <p>
            Cada ciclo tiene {SEMANAS_POR_CICLO} semanas. Archivá el Ciclo 1 como respaldo si
            surge un problema con la universidad.
          </p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            setEdit(null)
            setOpen(true)
          }}
        >
          <Plus size={16} /> Nuevo ciclo
        </button>
      </header>

      <div className="ciclos-list">
        {sorted.map((c) => {
          const stats = statsCiclo(data, c.id)
          const mats = materiasDelCiclo(data, c.id).length
          const active = c.id === activeCiclo.id
          return (
            <article
              key={c.id}
              className={`ciclo-card${active ? ' active' : ''}${c.archivado ? ' archived' : ''}`}
            >
              <header className="ciclo-card-head">
                <div>
                  <span className="ciclo-tags">
                    {c.año} · Ciclo {c.numero}
                    {c.archivado && (
                      <span className="arch-pill">
                        <Archive size={12} /> Respaldo
                      </span>
                    )}
                    {active && (
                      <span className="active-pill">
                        <Check size={12} /> Activo
                      </span>
                    )}
                  </span>
                  <h3>{c.nombre}</h3>
                  <p>
                    {c.inicio} → {c.fin} · {SEMANAS_POR_CICLO} semanas
                  </p>
                </div>
                <strong className="ciclo-pct">{stats.pct}%</strong>
              </header>

              <ul className="materia-stats">
                <li>
                  <strong>{mats}</strong> materias
                </li>
                <li>
                  <strong>
                    {stats.tDone}/{stats.tTotal}
                  </strong>{' '}
                  tareas
                </li>
                <li>
                  <strong>
                    {stats.fDone}/{stats.fTotal}
                  </strong>{' '}
                  foros
                </li>
                <li>
                  <strong>
                    {stats.pDone}/{stats.pTotal}
                  </strong>{' '}
                  parciales
                </li>
              </ul>

              <div className="ciclo-actions">
                {!active && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setActiveCiclo(c.id)}
                  >
                    Usar este ciclo
                  </button>
                )}
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    setEdit(c)
                    setOpen(true)
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => duplicateCicloAsBackup(c.id)}
                  title="Copia completa archivada"
                >
                  <Copy size={14} /> Respaldo
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => downloadBackup(c.id)}
                >
                  <Download size={14} /> JSON
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => archiveCiclo(c.id, !c.archivado)}
                >
                  <Archive size={14} />
                  {c.archivado ? 'Desarchivar' : 'Archivar'}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <Modal
        open={open}
        title={edit ? 'Editar ciclo' : 'Nuevo ciclo'}
        onClose={() => setOpen(false)}
      >
        <form className="form" onSubmit={onSubmit}>
          <Field label="Nombre">
            <input
              name="nombre"
              required
              defaultValue={edit?.nombre ?? `Ciclo 1 · ${year}`}
            />
          </Field>
          <div className="field-row">
            <Field label="Año">
              <input
                name="año"
                type="number"
                required
                defaultValue={edit?.año ?? year}
              />
            </Field>
            <Field label="Número de ciclo">
              <select name="numero" defaultValue={edit?.numero ?? 1}>
                <option value={1}>Ciclo 1</option>
                <option value={2}>Ciclo 2</option>
              </select>
            </Field>
          </div>
          <div className="field-row">
            <Field label="Inicio">
              <input
                name="inicio"
                type="date"
                required
                defaultValue={edit?.inicio ?? `${year}-01-20`}
              />
            </Field>
            <Field label="Fin (≈ 20 semanas)">
              <input
                name="fin"
                type="date"
                required
                defaultValue={edit?.fin ?? `${year}-06-08`}
              />
            </Field>
          </div>
          <FormActions onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </div>
  )
}

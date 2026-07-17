import { useState, type FormEvent } from 'react'
import {
  Plus,
  Trash2,
  ArrowLeft,
  Lock,
  CheckSquare,
  MessageSquare,
  GraduationCap,
  CalendarRange,
  Zap,
  Layers2,
} from 'lucide-react'
import { useStore } from '../lib/store'
import {
  actividadesDeMateria,
  actividadCuentaEnAvance,
  diasClaseDe,
  diasClaseMateriaEnCiclo,
  formatDiasClase,
  formatRangoSemana,
  resumenSemanasMateria,
  statsMateria,
  statusEfectivo,
  semanasBloqueadas,
} from '../lib/stats'
import { StatusBadge, ParcialBadge } from '../components/StatusBadge'
import { Field, FormActions, Modal, SemanaSelect } from '../components/Modal'
import {
  ActivityStatusSelect,
  CuentaEnAvanceField,
  GradeFields,
  parseCuentaEnAvance,
  parseGradeFromForm,
} from '../components/ActivityFields'
import { DiasClasePicker } from '../components/DiasClasePicker'
import { parseDueFromForm, formatDueLabel } from '../lib/taskDue'
import { requestNotificationPermission } from '../lib/notifications'
import {
  DIAS_CLASE_DEFAULT,
  MATERIA_COLORS,
  type ActivityStatus,
  type Corto,
  type DiaSemana,
  type Foro,
  type Materia,
  type Otro,
  type Parcial,
  type Tarea,
} from '../types'

type Tab = 'semanas' | 'tareas' | 'foros' | 'cortos' | 'otros' | 'parciales'

interface MateriasViewProps {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function MateriasView({ selectedId, onSelect }: MateriasViewProps) {
  const { materiasActivas, getMateria } = useStore()
  const materia = selectedId ? getMateria(selectedId) : null

  if (materia) {
    return <MateriaDetail materia={materia} onBack={() => onSelect(null)} />
  }

  return <MateriasList onSelect={onSelect} materias={materiasActivas} />
}

function MateriasList({
  onSelect,
  materias,
}: {
  onSelect: (id: string) => void
  materias: Materia[]
}) {
  const { data, addMateria, updateMateria, removeMateria, activeCiclo } = useStore()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Materia | null>(null)
  const [color, setColor] = useState(MATERIA_COLORS[0])
  const [diasClase, setDiasClase] = useState<DiaSemana[]>([...DIAS_CLASE_DEFAULT])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = {
      nombre: String(fd.get('nombre')).trim(),
      codigo: String(fd.get('codigo')).trim(),
      color,
      diasClase,
    }
    if (!payload.nombre) return
    if (edit) updateMateria(edit.id, payload)
    else addMateria(payload)
    setOpen(false)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <h2>Materias</h2>
          <p>
            {activeCiclo.nombre} — foros, tareas y parciales se gestionan dentro de cada
            materia
          </p>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            setEdit(null)
            setColor(MATERIA_COLORS[materias.length % MATERIA_COLORS.length])
            setDiasClase([...DIAS_CLASE_DEFAULT])
            setOpen(true)
          }}
        >
          <Plus size={16} /> Nueva materia
        </button>
      </header>

      <div className="materias-grid">
        {materias.map((m) => {
          const s = statsMateria(data, m.id)
          return (
            <article
              key={m.id}
              className="materia-card clickable"
              style={{ ['--accent' as string]: m.color }}
              onClick={() => onSelect(m.id)}
            >
              <div className="materia-card-bar" />
              <div className="materia-card-body">
                <span className="codigo">{m.codigo || 'SIN CÓDIGO'}</span>
                <h3>{m.nombre}</h3>
                <p className="materia-dias">{formatDiasClase(diasClaseDe(m))}</p>
                <ul className="materia-stats">
                  <li>
                    <strong>
                      {s.tDone}/{s.tTotal}
                    </strong>{' '}
                    tareas
                  </li>
                  <li>
                    <strong>
                      {s.fDone}/{s.fTotal}
                    </strong>{' '}
                    foros
                  </li>
                  <li>
                    <strong>
                      {s.cDone}/{s.cTotal}
                    </strong>{' '}
                    cortos
                  </li>
                  <li>
                    <strong>{s.pct}%</strong> avance
                  </li>
                </ul>
                {s.blockedWeeks > 0 && (
                  <p className="mini-lock">
                    <Lock size={12} /> {s.blockedWeeks} semana
                    {s.blockedWeeks > 1 ? 's' : ''} con parcial
                  </p>
                )}
                <div className="materia-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => {
                      setEdit(m)
                      setColor(m.color)
                      setDiasClase(diasClaseDe(m))
                      setOpen(true)
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => {
                      if (confirm(`¿Eliminar ${m.nombre} y todo lo asociado?`)) {
                        removeMateria(m.id)
                      }
                    }}
                    aria-label="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {materias.length === 0 && (
        <p className="empty-hint">Creá tu primera materia para este ciclo.</p>
      )}

      <Modal
        open={open}
        title={edit ? 'Editar materia' : 'Nueva materia'}
        onClose={() => setOpen(false)}
      >
        <form className="form" onSubmit={onSubmit}>
          <Field label="Nombre">
            <input
              name="nombre"
              required
              defaultValue={edit?.nombre ?? ''}
              placeholder="Nombre de la materia"
            />
          </Field>
          <Field label="Código">
            <input
              name="codigo"
              defaultValue={edit?.codigo ?? ''}
              placeholder="Ej. ISW-401"
            />
          </Field>
          <Field label="Días de clase">
            <DiasClasePicker value={diasClase} onChange={setDiasClase} />
            <span className="hint-inline" style={{ marginTop: '0.35rem', display: 'block' }}>
              Solo estos días cuentan como estudio en el ciclo (además se restan festivos).
            </span>
          </Field>
          <Field label="Color">
            <div className="color-row">
              {MATERIA_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch${color === c ? ' on' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </Field>
          <FormActions onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </div>
  )
}

function MateriaDetail({
  materia,
  onBack,
}: {
  materia: Materia
  onBack: () => void
}) {
  const {
    data,
    activeCiclo,
    semanasActivas,
    addTarea,
    updateTarea,
    removeTarea,
    toggleTareaStatus,
    addForo,
    updateForo,
    removeForo,
    toggleForoStatus,
    addCorto,
    updateCorto,
    removeCorto,
    toggleCortoStatus,
    addOtro,
    updateOtro,
    removeOtro,
    toggleOtroStatus,
    addParcial,
    updateParcial,
    removeParcial,
  } = useStore()

  const [tab, setTab] = useState<Tab>('semanas')
  const [tareaOpen, setTareaOpen] = useState(false)
  const [foroOpen, setForoOpen] = useState(false)
  const [cortoOpen, setCortoOpen] = useState(false)
  const [otroOpen, setOtroOpen] = useState(false)
  const [parcialOpen, setParcialOpen] = useState(false)
  const [editTarea, setEditTarea] = useState<Tarea | null>(null)
  const [editForo, setEditForo] = useState<Foro | null>(null)
  const [editCorto, setEditCorto] = useState<Corto | null>(null)
  const [editOtro, setEditOtro] = useState<Otro | null>(null)
  const [editParcial, setEditParcial] = useState<Parcial | null>(null)
  const [error, setError] = useState('')

  const blocked = [...semanasBloqueadas(data, materia.id)]
  const { tareas, foros, cortos, otros, parciales } = actividadesDeMateria(
    data,
    materia.id,
  )
  const semanas = resumenSemanasMateria(data, materia.id)
  const s = statsMateria(data, materia.id)
  const dias = diasClaseDe(materia)
  const claseCiclo = diasClaseMateriaEnCiclo(data, materia.id)

  const submitTarea = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { nota, notaMaxima } = parseGradeFromForm(fd)
    const due = parseDueFromForm(fd)
    const payload = {
      materiaId: materia.id,
      titulo: String(fd.get('titulo')).trim(),
      descripcion: String(fd.get('descripcion')).trim(),
      semana: Number(fd.get('semana')),
      status: String(fd.get('status')) as ActivityStatus,
      nota,
      notaMaxima,
      cuentaEnAvance: parseCuentaEnAvance(fd),
      ...due,
    }
    if (!payload.titulo) return
    if (payload.notificar && payload.fechaVencimiento) {
      void requestNotificationPermission()
    }
    const res = editTarea
      ? updateTarea(editTarea.id, payload)
      : addTarea(payload)
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    setTareaOpen(false)
  }

  const submitForo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { nota, notaMaxima } = parseGradeFromForm(fd)
    const payload = {
      materiaId: materia.id,
      titulo: String(fd.get('titulo')).trim(),
      descripcion: String(fd.get('descripcion')).trim(),
      semana: Number(fd.get('semana')),
      status: String(fd.get('status')) as ActivityStatus,
      nota,
      notaMaxima,
      cuentaEnAvance: parseCuentaEnAvance(fd),
    }
    if (!payload.titulo) return
    const res = editForo ? updateForo(editForo.id, payload) : addForo(payload)
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    setForoOpen(false)
  }

  const submitCorto = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { nota, notaMaxima } = parseGradeFromForm(fd)
    const payload = {
      materiaId: materia.id,
      titulo: String(fd.get('titulo')).trim(),
      descripcion: String(fd.get('descripcion')).trim(),
      semana: Number(fd.get('semana')),
      status: String(fd.get('status')) as ActivityStatus,
      nota,
      notaMaxima,
      cuentaEnAvance: parseCuentaEnAvance(fd),
    }
    if (!payload.titulo) return
    const res = editCorto
      ? updateCorto(editCorto.id, payload)
      : addCorto(payload)
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    setCortoOpen(false)
  }

  const submitOtro = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const { nota, notaMaxima } = parseGradeFromForm(fd)
    const payload = {
      materiaId: materia.id,
      titulo: String(fd.get('titulo')).trim(),
      descripcion: String(fd.get('descripcion')).trim(),
      origen: String(fd.get('origen')).trim(),
      semana: Number(fd.get('semana')),
      status: String(fd.get('status')) as ActivityStatus,
      nota,
      notaMaxima,
      cuentaEnAvance: parseCuentaEnAvance(fd),
    }
    if (!payload.titulo) return
    const res = editOtro ? updateOtro(editOtro.id, payload) : addOtro(payload)
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    setOtroOpen(false)
  }

  const submitParcial = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const notaRaw = String(fd.get('nota')).trim()
    const status = String(fd.get('status')) as Parcial['status']
    const notaMaxima = Number(fd.get('notaMaxima')) || 10
    const nota =
      notaRaw === '' ? null : Math.min(notaMaxima, Math.max(0, Number(notaRaw)))
    const payload = {
      materiaId: materia.id,
      titulo: String(fd.get('titulo')).trim(),
      semana: Number(fd.get('semana')),
      nota,
      notaMaxima,
      status: status === 'rendido' || nota !== null ? ('rendido' as const) : status,
    }
    if (!payload.titulo) return
    const res = editParcial
      ? updateParcial(editParcial.id, payload)
      : addParcial(payload)
    if (!res.ok) {
      setError(res.reason)
      return
    }
    setError('')
    setParcialOpen(false)
  }

  return (
    <div className="view">
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Materias
      </button>

      <header className="view-header">
        <div>
          <span className="mat-pill">
            <i style={{ background: materia.color }} />
            {materia.codigo || 'Sin código'}
          </span>
          <h2 style={{ marginTop: '0.4rem' }}>{materia.nombre}</h2>
          <p>
            {formatDiasClase(dias)} · {claseCiclo.transcurridos}/{claseCiclo.total} días de
            clase · {s.pct}% avance (promedio semanal)
          </p>
        </div>
      </header>

      <div className="filter-bar tabs">
        {(
          [
            ['semanas', `${semanasActivas} Semanas`, CalendarRange],
            ['tareas', 'Tareas', CheckSquare],
            ['foros', 'Foros', MessageSquare],
            ['cortos', 'Cortos', Zap],
            ['otros', 'Otros', Layers2],
            ['parciales', 'Parciales', GraduationCap],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={`chip${tab === id ? ' on' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'semanas' && (
        <div className="week-board">
          {semanas.map((w) => (
            <div
              key={w.semana}
              className={`week-cell${w.bloqueada ? ' blocked' : ''}${
                w.tareas + w.foros + w.parciales > 0 ? ' has' : ''
              }`}
            >
              <header>
                <strong>S{w.semana}</strong>
                {w.bloqueada && (
                  <span className="lock-tag" title="Tareas y foros desactivados">
                    <Lock size={11} /> Parcial
                  </span>
                )}
              </header>
              <p className="week-range">
                {formatRangoSemana(activeCiclo.inicio, w.semana)}
              </p>
              {w.bloqueada ? (
                <p className="week-note">Foros y tareas desactivados</p>
              ) : (
                <ul>
                  <li>
                    Tareas {w.tareasDone}/{w.tareas}
                  </li>
                  <li>
                    Foros {w.forosDone}/{w.foros}
                  </li>
                  <li>
                    Cortos {w.cortosDone}/{w.cortos}
                  </li>
                  <li>
                    Otros {w.otrosDone}/{w.otros}
                  </li>
                </ul>
              )}
              <p className="week-avance">{Math.round(w.avance * 100)}% semana</p>
              {w.parciales > 0 && (
                <p className="week-parcial-count">{w.parciales} parcial</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'tareas' && (
        <>
          <div className="inline-actions">
            <p className="hint-inline">
              Las semanas con parcial no admiten tareas en esta materia.
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setEditTarea(null)
                setError('')
                setTareaOpen(true)
              }}
            >
              <Plus size={16} /> Nueva tarea
            </button>
          </div>
          {tareas.length === 0 ? (
            <p className="empty-hint">Sin tareas en esta materia.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Semana</th>
                    <th>Vence</th>
                    <th>Nota</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tareas
                    .slice()
                    .sort((a, b) => {
                      if (a.semana !== b.semana) return a.semana - b.semana
                      const da = a.fechaVencimiento ?? ''
                      const db = b.fechaVencimiento ?? ''
                      if (da !== db) return da.localeCompare(db)
                      return (a.horaVencimiento ?? '').localeCompare(
                        b.horaVencimiento ?? '',
                      )
                    })
                    .map((t) => {
                      const bloqueada = blocked.includes(t.semana)
                      const st = statusEfectivo(t.status, bloqueada)
                      const dueLabel = formatDueLabel(t)
                      return (
                        <tr key={t.id} className={bloqueada ? 'row-blocked' : ''}>
                          <td>
                            <button
                              type="button"
                              className="linkish"
                              disabled={bloqueada}
                              onClick={() => {
                                if (bloqueada) return
                                setEditTarea(t)
                                setError('')
                                setTareaOpen(true)
                              }}
                            >
                              <strong>{t.titulo}</strong>
                              {t.descripcion && <span>{t.descripcion}</span>}
                            </button>
                          </td>
                          <td>
                            <span className="mono">S{t.semana}</span>
                            {bloqueada && (
                              <span className="lock-inline">
                                <Lock size={12} />
                              </span>
                            )}
                          </td>
                          <td className="due-cell">
                            {dueLabel ? (
                              <span className="due-label">
                                {dueLabel}
                                {t.notificar && (
                                  <span className="chip-muted" title="Notificación activa">
                                    {' '}
                                    · aviso
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="chip-muted">—</span>
                            )}
                          </td>
                          <td className="mono">
                            {t.nota !== null ? `${t.nota}/${t.notaMaxima}` : '—'}
                            {!t.cuentaEnAvance && (
                              <span className="chip-muted"> · Sin avance</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="badge-btn"
                              disabled={bloqueada}
                              onClick={() => toggleTareaStatus(t.id)}
                            >
                              <StatusBadge status={st} />
                            </button>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="icon-btn danger"
                              onClick={() => removeTarea(t.id)}
                              aria-label="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'foros' && (
        <>
          <div className="inline-actions">
            <p className="hint-inline">
              Si hay parcial esa semana, el foro queda desactivado.
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setEditForo(null)
                setError('')
                setForoOpen(true)
              }}
            >
              <Plus size={16} /> Nuevo foro
            </button>
          </div>
          {foros.length === 0 ? (
            <p className="empty-hint">Sin foros en esta materia.</p>
          ) : (
            <div className="card-list">
              {foros
                .slice()
                .sort((a, b) => a.semana - b.semana)
                .map((f) => {
                  const bloqueada = blocked.includes(f.semana)
                  const st = statusEfectivo(f.status, bloqueada)
                  return (
                    <article
                      key={f.id}
                      className={`activity-card${bloqueada ? ' blocked' : ''}`}
                    >
                      <div className="activity-card-top">
                        <span className="mono">Semana {f.semana}</span>
                        <button
                          type="button"
                          className="badge-btn"
                          disabled={bloqueada}
                          onClick={() => toggleForoStatus(f.id)}
                        >
                          <StatusBadge status={st} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="linkish"
                        disabled={bloqueada}
                        onClick={() => {
                          if (bloqueada) return
                          setEditForo(f)
                          setError('')
                          setForoOpen(true)
                        }}
                      >
                        <strong>{f.titulo}</strong>
                        {f.descripcion && <span>{f.descripcion}</span>}
                      </button>
                      <footer className="activity-card-foot">
                        {bloqueada ? (
                          <span className="lock-tag">
                            <Lock size={12} /> Desactivado por parcial
                          </span>
                        ) : (
                          <span>
                            {f.nota !== null
                              ? `Nota ${f.nota}/${f.notaMaxima}`
                              : 'Sin nota'}
                            {!f.cuentaEnAvance && (
                              <span className="chip-muted"> · Sin avance</span>
                            )}
                          </span>
                        )}
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => removeForo(f.id)}
                          aria-label="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </footer>
                    </article>
                  )
                })}
            </div>
          )}
        </>
      )}

      {tab === 'cortos' && (
        <>
          <div className="inline-actions">
            <p className="hint-inline">
              Llamados cortos: se mantienen registrados con nota. No cuentan en el
              avance académico si ya hay tarea esa semana; si no hay tarea, sí
              cuentan. Podés forzar el conteo al registrarlos.
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setEditCorto(null)
                setError('')
                setCortoOpen(true)
              }}
            >
              <Plus size={16} /> Nuevo corto
            </button>
          </div>
          {cortos.length === 0 ? (
            <p className="empty-hint">Sin cortos. Son opcionales semana a semana.</p>
          ) : (
            <div className="card-list">
              {cortos
                .slice()
                .sort((a, b) => a.semana - b.semana)
                .map((c) => {
                  const bloqueada = blocked.includes(c.semana)
                  const st = statusEfectivo(c.status, bloqueada)
                  const hayTarea = tareas.some((t) => t.semana === c.semana)
                  const cuenta = actividadCuentaEnAvance(c, {
                    esCorto: true,
                    hayTareaEnSemana: hayTarea,
                  })
                  return (
                    <article
                      key={c.id}
                      className={`activity-card${bloqueada ? ' blocked' : ''}`}
                    >
                      <div className="activity-card-top">
                        <span className="mono">Semana {c.semana}</span>
                        <button
                          type="button"
                          className="badge-btn"
                          disabled={bloqueada}
                          onClick={() => toggleCortoStatus(c.id)}
                        >
                          <StatusBadge status={st} />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="linkish"
                        disabled={bloqueada}
                        onClick={() => {
                          if (bloqueada) return
                          setEditCorto(c)
                          setError('')
                          setCortoOpen(true)
                        }}
                      >
                        <strong>{c.titulo}</strong>
                        {c.descripcion && <span>{c.descripcion}</span>}
                      </button>
                      <footer className="activity-card-foot">
                        <span>
                          {c.nota !== null
                            ? `Nota ${c.nota}/${c.notaMaxima}`
                            : 'Sin nota'}
                          {!cuenta && (
                            <span className="chip-muted"> · Solo nota</span>
                          )}
                          {cuenta && !c.cuentaEnAvance && (
                            <span className="chip-muted"> · Cuenta (sin tarea)</span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => removeCorto(c.id)}
                          aria-label="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </footer>
                    </article>
                  )
                })}
            </div>
          )}
        </>
      )}

      {tab === 'otros' && (
        <>
          <div className="inline-actions">
            <p className="hint-inline">
              Actividades extras (otra universidad u otro curso). No se bloquean por
              parcial. Elegí si cuentan para el avance académico.
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setEditOtro(null)
                setError('')
                setOtroOpen(true)
              }}
            >
              <Plus size={16} /> Nueva actividad
            </button>
          </div>
          {otros.length === 0 ? (
            <p className="empty-hint">Sin actividades extra.</p>
          ) : (
            <div className="card-list">
              {otros
                .slice()
                .sort((a, b) => a.semana - b.semana)
                .map((o) => (
                  <article key={o.id} className="activity-card">
                    <div className="activity-card-top">
                      <span className="mono">Semana {o.semana}</span>
                      <button
                        type="button"
                        className="badge-btn"
                        onClick={() => toggleOtroStatus(o.id)}
                      >
                        <StatusBadge status={o.status} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => {
                        setEditOtro(o)
                        setError('')
                        setOtroOpen(true)
                      }}
                    >
                      <strong>{o.titulo}</strong>
                      {o.descripcion && <span>{o.descripcion}</span>}
                    </button>
                    <footer className="activity-card-foot">
                      <span>
                        {o.origen || 'Sin origen'}
                        {o.nota !== null
                          ? ` · ${o.nota}/${o.notaMaxima}`
                          : ''}
                        {!o.cuentaEnAvance && (
                          <span className="chip-muted"> · Sin avance</span>
                        )}
                      </span>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => removeOtro(o.id)}
                        aria-label="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </footer>
                  </article>
                ))}
            </div>
          )}
        </>
      )}

      {tab === 'parciales' && (
        <>
          <div className="inline-actions">
            <p className="hint-inline">
              Agregá parciales manualmente. Al asignar una semana, se desactivan foros,
              tareas y cortos de esa semana (otros no).
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setEditParcial(null)
                setError('')
                setParcialOpen(true)
              }}
            >
              <Plus size={16} /> Nuevo parcial
            </button>
          </div>
          {parciales.length === 0 ? (
            <p className="empty-hint">
              Sin parciales. Crealos cuando la universidad los programe.
            </p>
          ) : (
            <div className="parcial-manual-list">
              {parciales.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="parcial-manual-card"
                  style={{ borderColor: materia.color }}
                  onClick={() => {
                    setEditParcial(p)
                    setError('')
                    setParcialOpen(true)
                  }}
                >
                  <div className="parcial-manual-top">
                    <span className="mono">Semana {p.semana}</span>
                    <ParcialBadge status={p.status} />
                  </div>
                  <strong>{p.titulo}</strong>
                  <span className="week-range">
                    {formatRangoSemana(activeCiclo.inicio, p.semana)}
                  </span>
                  {p.nota !== null ? (
                    <span className="slot-nota" style={{ color: materia.color }}>
                      {p.nota}/{p.notaMaxima}
                    </span>
                  ) : (
                    <span className="hint-inline">Sin nota</span>
                  )}
                  <span
                    className="delete-partial"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('¿Eliminar este parcial? Se reactivarán foros/tareas de esa semana.')) {
                        removeParcial(p.id)
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={tareaOpen}
        title={editTarea ? 'Editar tarea' : 'Nueva tarea'}
        onClose={() => setTareaOpen(false)}
      >
        <form className="form" onSubmit={submitTarea}>
          {error && <p className="form-error">{error}</p>}
          <Field label="Título">
            <input
              name="titulo"
              required
              defaultValue={editTarea?.titulo ?? ''}
              placeholder="Nombre de la tarea"
            />
          </Field>
          <SemanaSelect
            defaultValue={editTarea?.semana ?? 1}
            disabledWeeks={blocked}
            totalSemanas={semanasActivas}
          />
          <div className="field-row">
            <Field label="Día de vencimiento">
              <input
                name="fechaVencimiento"
                type="date"
                defaultValue={editTarea?.fechaVencimiento ?? ''}
                key={(editTarea?.id ?? 'new') + '-fecha'}
              />
            </Field>
            <Field label="Hora">
              <input
                name="horaVencimiento"
                type="time"
                defaultValue={editTarea?.horaVencimiento ?? ''}
                key={(editTarea?.id ?? 'new') + '-hora'}
              />
            </Field>
          </div>
          <label className="field-check">
            <input
              type="checkbox"
              name="notificar"
              value="1"
              defaultChecked={editTarea?.notificar ?? true}
              key={(editTarea?.id ?? 'new') + '-notif'}
            />
            <span>
              <strong>Avisar con notificación</strong>
              <small>
                Alerta 24 h antes, 1 h antes y al vencer (app abierta en el
                navegador)
              </small>
            </span>
          </label>
          <ActivityStatusSelect defaultValue={editTarea?.status ?? 'pendiente'} />
          <GradeFields nota={editTarea?.nota} notaMaxima={editTarea?.notaMaxima ?? 10} />
          <CuentaEnAvanceField
            defaultChecked={editTarea?.cuentaEnAvance ?? true}
          />
          <Field label="Descripción">
            <textarea
              name="descripcion"
              rows={3}
              defaultValue={editTarea?.descripcion ?? ''}
            />
          </Field>
          <FormActions onCancel={() => setTareaOpen(false)} />
        </form>
      </Modal>

      <Modal
        open={foroOpen}
        title={editForo ? 'Editar foro' : 'Nuevo foro'}
        onClose={() => setForoOpen(false)}
      >
        <form className="form" onSubmit={submitForo}>
          {error && <p className="form-error">{error}</p>}
          <Field label="Título">
            <input
              name="titulo"
              required
              defaultValue={editForo?.titulo ?? ''}
              placeholder="Tema del foro"
            />
          </Field>
          <SemanaSelect
            defaultValue={editForo?.semana ?? 1}
            disabledWeeks={blocked}
            totalSemanas={semanasActivas}
          />
          <ActivityStatusSelect defaultValue={editForo?.status ?? 'pendiente'} />
          <GradeFields nota={editForo?.nota} notaMaxima={editForo?.notaMaxima ?? 10} />
          <CuentaEnAvanceField
            defaultChecked={editForo?.cuentaEnAvance ?? true}
          />
          <Field label="Descripción">
            <textarea
              name="descripcion"
              rows={3}
              defaultValue={editForo?.descripcion ?? ''}
            />
          </Field>
          <FormActions onCancel={() => setForoOpen(false)} />
        </form>
      </Modal>

      <Modal
        open={cortoOpen}
        title={editCorto ? 'Editar corto' : 'Nuevo corto'}
        onClose={() => setCortoOpen(false)}
      >
        <form className="form" onSubmit={submitCorto}>
          {error && <p className="form-error">{error}</p>}
          <Field label="Título">
            <input
              name="titulo"
              required
              defaultValue={editCorto?.titulo ?? ''}
              placeholder="Ej. Corto unidad 2"
            />
          </Field>
          <SemanaSelect
            defaultValue={editCorto?.semana ?? 1}
            disabledWeeks={blocked}
            totalSemanas={semanasActivas}
          />
          <ActivityStatusSelect defaultValue={editCorto?.status ?? 'pendiente'} />
          <GradeFields nota={editCorto?.nota} notaMaxima={editCorto?.notaMaxima ?? 10} />
          <CuentaEnAvanceField
            defaultChecked={editCorto?.cuentaEnAvance ?? false}
            hint="Por defecto no. Si no hay tarea esa semana, cuenta igual aunque esté desmarcado."
          />
          <Field label="Descripción">
            <textarea
              name="descripcion"
              rows={2}
              defaultValue={editCorto?.descripcion ?? ''}
            />
          </Field>
          <FormActions onCancel={() => setCortoOpen(false)} />
        </form>
      </Modal>

      <Modal
        open={otroOpen}
        title={editOtro ? 'Editar actividad' : 'Nueva actividad (otros)'}
        onClose={() => setOtroOpen(false)}
      >
        <form className="form" onSubmit={submitOtro}>
          {error && <p className="form-error">{error}</p>}
          <Field label="Título">
            <input
              name="titulo"
              required
              defaultValue={editOtro?.titulo ?? ''}
              placeholder="Actividad extra"
            />
          </Field>
          <Field label="Origen (opc.)">
            <input
              name="origen"
              defaultValue={editOtro?.origen ?? ''}
              placeholder="Otra universidad / curso"
            />
          </Field>
          <SemanaSelect
            defaultValue={editOtro?.semana ?? 1}
            disabledWeeks={[]}
            totalSemanas={semanasActivas}
          />
          <ActivityStatusSelect defaultValue={editOtro?.status ?? 'pendiente'} />
          <GradeFields nota={editOtro?.nota} notaMaxima={editOtro?.notaMaxima ?? 10} />
          <CuentaEnAvanceField
            defaultChecked={editOtro?.cuentaEnAvance ?? true}
          />
          <Field label="Descripción">
            <textarea
              name="descripcion"
              rows={2}
              defaultValue={editOtro?.descripcion ?? ''}
            />
          </Field>
          <FormActions onCancel={() => setOtroOpen(false)} />
        </form>
      </Modal>

      <Modal
        open={parcialOpen}
        title={editParcial ? 'Editar parcial' : 'Nuevo parcial (manual)'}
        onClose={() => setParcialOpen(false)}
      >
        <form className="form" onSubmit={submitParcial}>
          {error && <p className="form-error">{error}</p>}
          <Field label="Título">
            <input
              name="titulo"
              required
              defaultValue={editParcial?.titulo ?? ''}
              placeholder="Ej. Parcial 1 — Unidad 1 y 2"
            />
          </Field>
          <Field label={`Semana (1–${semanasActivas})`}>
            <select
              name="semana"
              required
              defaultValue={editParcial?.semana ?? 1}
            >
              {Array.from({ length: semanasActivas }, (_, i) => {
                const n = i + 1
                const taken =
                  blocked.includes(n) && editParcial?.semana !== n
                return (
                  <option key={n} value={n} disabled={taken}>
                    Semana {n}
                    {taken ? ' (ocupada)' : ''}
                  </option>
                )
              })}
            </select>
          </Field>
          <div className="field-row">
            <Field label="Nota">
              <input
                name="nota"
                type="number"
                step="0.1"
                min="0"
                defaultValue={editParcial?.nota ?? ''}
                placeholder="Sin nota"
              />
            </Field>
            <Field label="Nota máxima">
              <input
                name="notaMaxima"
                type="number"
                step="0.1"
                min="1"
                defaultValue={editParcial?.notaMaxima ?? 10}
              />
            </Field>
          </div>
          <Field label="Estado">
            <select name="status" defaultValue={editParcial?.status ?? 'programado'}>
              <option value="programado">Programado</option>
              <option value="pendiente">Pendiente</option>
              <option value="rendido">Rendido</option>
            </select>
          </Field>
          <p className="hint-inline">
            Al guardar, foros y tareas de esa semana quedan desactivados en esta materia.
          </p>
          <FormActions onCancel={() => setParcialOpen(false)} />
        </form>
      </Modal>
    </div>
  )
}

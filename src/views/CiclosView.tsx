import { useRef, useState, type FormEvent } from 'react'
import {
  Archive,
  ChevronDown,
  Copy,
  Download,
  Plus,
  Check,
  Trash2,
  Upload,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { exportCicloJson } from '../lib/storage'
import { Field, FormActions, Modal } from '../components/Modal'
import { materiasDelCiclo, statsCiclo, semanasDeCiclo } from '../lib/stats'
import { SEMANAS_POR_DEFECTO, type Ciclo } from '../types'

function sortCiclos(list: Ciclo[]) {
  return [...list].sort((a, b) => {
    if (a.año !== b.año) return b.año - a.año
    return a.numero - b.numero
  })
}

export function CiclosView() {
  const {
    data,
    activeCiclo,
    setActiveCiclo,
    updateCiclo,
    addCiclo,
    archiveCiclo,
    deleteCiclo,
    duplicateCicloAsBackup,
    importCicloJson,
  } = useStore()
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<Ciclo | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Ciclo | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const showNotice = (msg: string, ms = 3200) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    setNotice(msg)
    noticeTimer.current = setTimeout(() => setNotice(''), ms)
  }

  const year = new Date().getFullYear()
  const activos = sortCiclos(data.ciclos.filter((c) => !c.archivado))
  const archivados = sortCiclos(data.ciclos.filter((c) => c.archivado))

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const inicio = String(fd.get('inicio'))
    const fin = String(fd.get('fin'))
    const payload = {
      nombre: String(fd.get('nombre')).trim(),
      año: Number(fd.get('año')) || year,
      numero: Number(fd.get('numero')) as 1 | 2,
      inicio,
      fin,
      archivado: edit?.archivado ?? false,
    }
    if (!payload.nombre || !payload.inicio || !payload.fin) return
    if (payload.fin < payload.inicio) {
      alert('La fecha de fin debe ser posterior al inicio.')
      return
    }
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

  const onImportFile = async (file: File) => {
    const text = await file.text()
    const res = importCicloJson(text)
    if (!res.ok) {
      showNotice(res.reason, 4500)
      return
    }
    showNotice(`Importado y activado: ${res.nombre}`)
  }

  const closeDelete = () => {
    setDeleteTarget(null)
    setDeleteConfirm('')
    setDeleteError('')
  }

  const onDeleteSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!deleteTarget) return
    if (deleteConfirm !== deleteTarget.nombre) {
      setDeleteError('El texto no coincide con el nombre del ciclo.')
      return
    }
    const nombre = deleteTarget.nombre
    const res = deleteCiclo(deleteTarget.id)
    if (!res.ok) {
      setDeleteError(res.reason)
      return
    }
    closeDelete()
    showNotice(`Ciclo borrado: ${nombre}`)
  }

  const canDelete = data.ciclos.length > 1
  const nameMatches =
    deleteTarget !== null && deleteConfirm === deleteTarget.nombre

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <h2>Ciclos del año</h2>
          <p>
            Las semanas se calculan con inicio y fin (por defecto ~{SEMANAS_POR_DEFECTO}{' '}
            semanas). Exportá o importá JSON para respaldar el estado.
          </p>
        </div>
        <div className="header-actions">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onImportFile(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="btn ghost"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={16} /> Importar JSON
          </button>
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
        </div>
      </header>

      {notice && <div className="banner rest">{notice}</div>}

      <div className="ciclos-list">
        {activos.length === 0 ? (
          <p className="empty-hint">
            No hay ciclos activos. Desarchivá uno o creá un ciclo nuevo.
          </p>
        ) : (
          activos.map((c) => (
            <CicloCard
              key={c.id}
              ciclo={c}
              data={data}
              active={c.id === activeCiclo.id}
              canDelete={canDelete}
              onUse={() => setActiveCiclo(c.id)}
              onEdit={() => {
                setEdit(c)
                setOpen(true)
              }}
              onBackup={() => duplicateCicloAsBackup(c.id)}
              onJson={() => downloadBackup(c.id)}
              onArchive={() => archiveCiclo(c.id, true)}
              onDelete={() => {
                setDeleteTarget(c)
                setDeleteConfirm('')
                setDeleteError('')
              }}
            />
          ))
        )}
      </div>

      {archivados.length > 0 && (
        <section className="archived-section">
          <button
            type="button"
            className={`archived-toggle${showArchived ? ' open' : ''}`}
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
          >
            <span className="archived-toggle-main">
              <Archive size={15} />
              Archivados
              <span className="archived-count">{archivados.length}</span>
            </span>
            <ChevronDown size={16} className="archived-chevron" />
          </button>

          {showArchived && (
            <div className="ciclos-list archived-list">
              {archivados.map((c) => (
                <CicloCard
                  key={c.id}
                  ciclo={c}
                  data={data}
                  active={c.id === activeCiclo.id}
                  canDelete={canDelete}
                  onUse={() => setActiveCiclo(c.id)}
                  onEdit={() => {
                    setEdit(c)
                    setOpen(true)
                  }}
                  onBackup={() => duplicateCicloAsBackup(c.id)}
                  onJson={() => downloadBackup(c.id)}
                  onArchive={() => archiveCiclo(c.id, false)}
                  onDelete={() => {
                    setDeleteTarget(c)
                    setDeleteConfirm('')
                    setDeleteError('')
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <Modal
        open={open}
        title={edit ? 'Editar ciclo' : 'Nuevo ciclo'}
        onClose={() => setOpen(false)}
      >
        <CicloForm
          key={edit?.id ?? 'new'}
          edit={edit}
          year={year}
          onSubmit={onSubmit}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title="Borrar ciclo"
        onClose={closeDelete}
      >
        {deleteTarget && (
          <form className="form delete-ciclo-form" onSubmit={onDeleteSubmit}>
            <div className="delete-warning">
              <p>
                Esta acción es <strong>permanente</strong>. Se borrarán las materias,
                tareas, foros, cortos, otros, parciales y festivos de{' '}
                <strong>{deleteTarget.nombre}</strong>.
              </p>
              <p>
                Para confirmar, escribí el nombre del ciclo exactamente:
              </p>
              <p className="delete-confirm-name">{deleteTarget.nombre}</p>
            </div>
            <Field label="Nombre del ciclo">
              <input
                value={deleteConfirm}
                onChange={(e) => {
                  setDeleteConfirm(e.target.value)
                  setDeleteError('')
                }}
                placeholder={deleteTarget.nombre}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={deleteError ? true : undefined}
              />
            </Field>
            {deleteError && <p className="form-error">{deleteError}</p>}
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={closeDelete}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn danger"
                disabled={!nameMatches}
              >
                <Trash2 size={15} /> Borrar ciclo
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function CicloCard({
  ciclo: c,
  data,
  active,
  canDelete,
  onUse,
  onEdit,
  onBackup,
  onJson,
  onArchive,
  onDelete,
}: {
  ciclo: Ciclo
  data: ReturnType<typeof useStore>['data']
  active: boolean
  canDelete: boolean
  onUse: () => void
  onEdit: () => void
  onBackup: () => void
  onJson: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const stats = statsCiclo(data, c.id)
  const mats = materiasDelCiclo(data, c.id).length
  const weeks = semanasDeCiclo(c)

  return (
    <article
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
            {c.inicio} → {c.fin} · {weeks} semana{weeks === 1 ? '' : 's'}
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
          <button type="button" className="btn ghost sm" onClick={onUse}>
            Usar este ciclo
          </button>
        )}
        <button type="button" className="btn ghost sm" onClick={onEdit}>
          Editar
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={onBackup}
          title="Copia completa archivada"
        >
          <Copy size={14} /> Respaldo
        </button>
        <button type="button" className="btn ghost sm" onClick={onJson}>
          <Download size={14} /> JSON
        </button>
        <button type="button" className="btn ghost sm" onClick={onArchive}>
          <Archive size={14} />
          {c.archivado ? 'Desarchivar' : 'Archivar'}
        </button>
        <button
          type="button"
          className="btn ghost sm danger-text"
          onClick={onDelete}
          disabled={!canDelete}
          title={
            canDelete
              ? 'Borrar ciclo permanentemente'
              : 'No podés borrar el único ciclo'
          }
        >
          <Trash2 size={14} /> Borrar
        </button>
      </div>
    </article>
  )
}

function CicloForm({
  edit,
  year,
  onSubmit,
  onCancel,
}: {
  edit: Ciclo | null
  year: number
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}) {
  const [inicio, setInicio] = useState(edit?.inicio ?? `${year}-01-20`)
  const [fin, setFin] = useState(
    edit?.fin ??
      (() => {
        const d = new Date(`${year}-01-20T12:00:00`)
        d.setDate(d.getDate() + SEMANAS_POR_DEFECTO * 7 - 1)
        return d.toISOString().slice(0, 10)
      })(),
  )
  const weeks = semanasDeCiclo({ inicio, fin })

  return (
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
          <input name="año" type="number" required defaultValue={edit?.año ?? year} />
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
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </Field>
        <Field label="Fin">
          <input
            name="fin"
            type="date"
            required
            value={fin}
            onChange={(e) => setFin(e.target.value)}
          />
        </Field>
      </div>
      <p className="hint-inline">
        Este rango equivale a <strong>{weeks}</strong> semana{weeks === 1 ? '' : 's'} de
        control.
      </p>
      <FormActions onCancel={onCancel} />
    </form>
  )
}

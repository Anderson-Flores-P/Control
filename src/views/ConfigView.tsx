import { useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import { Field } from '../components/Modal'
import { SEMANAS_POR_CICLO } from '../types'

export function ConfigView() {
  const { activeCiclo, updateCiclo, resetData, setActiveCiclo, data } = useStore()
  const [saved, setSaved] = useState(false)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    updateCiclo(activeCiclo.id, {
      nombre: String(fd.get('nombre')).trim(),
      inicio: String(fd.get('inicio')),
      fin: String(fd.get('fin')),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <h2>Configuración</h2>
          <p>Ciclo activo y datos locales ({SEMANAS_POR_CICLO} semanas por ciclo)</p>
        </div>
      </header>

      <section className="config-card">
        <h3>Ciclo en uso</h3>
        <Field label="Cambiar ciclo activo">
          <select
            value={activeCiclo.id}
            onChange={(e) => setActiveCiclo(e.target.value)}
          >
            {data.ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.archivado ? ' (respaldo)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <form className="form" onSubmit={onSubmit} style={{ marginTop: '1rem' }}>
          <Field label="Nombre">
            <input name="nombre" required defaultValue={activeCiclo.nombre} key={activeCiclo.id} />
          </Field>
          <div className="field-row">
            <Field label="Inicio">
              <input
                name="inicio"
                type="date"
                required
                defaultValue={activeCiclo.inicio}
                key={activeCiclo.id + '-i'}
              />
            </Field>
            <Field label="Fin">
              <input
                name="fin"
                type="date"
                required
                defaultValue={activeCiclo.fin}
                key={activeCiclo.id + '-f'}
              />
            </Field>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary">
              {saved ? 'Guardado ✓' : 'Guardar ciclo activo'}
            </button>
          </div>
        </form>
      </section>

      <section className="config-card danger-zone">
        <h3>Datos</h3>
        <p>
          Todo se guarda en este navegador. En Ciclos podés archivar o exportar JSON del
          Ciclo 1 como respaldo ante problemas con la universidad.
        </p>
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (confirm('¿Restablecer todos los datos? Se perderán respaldos locales.')) {
              resetData()
            }
          }}
        >
          Restablecer datos de ejemplo
        </button>
      </section>
    </div>
  )
}

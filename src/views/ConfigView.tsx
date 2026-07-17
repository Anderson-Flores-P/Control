import { useEffect, useState, type FormEvent } from 'react'
import { useStore } from '../lib/store'
import { Field } from '../components/Modal'
import { semanasDeCiclo } from '../lib/stats'
import {
  notificationPermission,
  requestNotificationPermission,
} from '../lib/notifications'

export function ConfigView() {
  const { activeCiclo, updateCiclo, resetData, setActiveCiclo, data } = useStore()
  const [saved, setSaved] = useState(false)
  const [notifPerm, setNotifPerm] = useState(notificationPermission())
  const weeks = semanasDeCiclo(activeCiclo)

  useEffect(() => {
    setNotifPerm(notificationPermission())
  }, [])

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

  const enableNotifs = async () => {
    const result = await requestNotificationPermission()
    setNotifPerm(result)
  }

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <h2>Configuración</h2>
          <p>
            Ciclo activo: {weeks} semana{weeks === 1 ? '' : 's'} según fechas de inicio/fin
          </p>
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

      <section className="config-card">
        <h3>Notificaciones de tareas</h3>
        <p>
          Avisos del navegador 24 h antes, 1 h antes y al vencer. La app debe
          estar abierta en una pestaña.
        </p>
        <p className="hint-inline" style={{ marginBottom: '0.75rem' }}>
          Estado:{' '}
          {notifPerm === 'granted'
            ? 'Permitidas'
            : notifPerm === 'denied'
              ? 'Bloqueadas (revisá el candado del sitio en el navegador)'
              : notifPerm === 'unsupported'
                ? 'No soportadas en este navegador'
                : 'Sin pedir aún'}
        </p>
        {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
          <button type="button" className="btn primary" onClick={() => void enableNotifs()}>
            Activar notificaciones
          </button>
        )}
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

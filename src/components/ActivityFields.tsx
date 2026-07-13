import { Field } from './Modal'
import { ACTIVITY_STATUS_OPTIONS, type ActivityStatus } from '../types'

export function ActivityStatusSelect({
  name = 'status',
  defaultValue = 'pendiente',
}: {
  name?: string
  defaultValue?: ActivityStatus
}) {
  const value =
    defaultValue === 'desactivada' || defaultValue === 'vencida'
      ? 'pendiente'
      : defaultValue
  return (
    <Field label="Estado">
      <select name={name} defaultValue={value}>
        {ACTIVITY_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function GradeFields({
  nota,
  notaMaxima = 10,
}: {
  nota?: number | null
  notaMaxima?: number
}) {
  return (
    <div className="field-row">
      <Field label="Calificación">
        <input
          name="nota"
          type="number"
          step="0.1"
          min="0"
          defaultValue={nota ?? ''}
          placeholder="Sin nota"
        />
      </Field>
      <Field label="Nota máxima">
        <input
          name="notaMaxima"
          type="number"
          step="0.1"
          min="1"
          defaultValue={notaMaxima}
        />
      </Field>
    </div>
  )
}

export function CuentaEnAvanceField({
  defaultChecked = true,
  hint,
}: {
  defaultChecked?: boolean
  hint?: string
}) {
  return (
    <label className="field-check">
      <input
        type="checkbox"
        name="cuentaEnAvance"
        value="1"
        defaultChecked={defaultChecked}
      />
      <span>
        <strong>Cuenta para avance académico</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  )
}

export function parseGradeFromForm(fd: FormData): {
  nota: number | null
  notaMaxima: number
} {
  const notaRaw = String(fd.get('nota') ?? '').trim()
  const notaMaxima = Number(fd.get('notaMaxima')) || 10
  const nota =
    notaRaw === ''
      ? null
      : Math.min(notaMaxima, Math.max(0, Number(notaRaw)))
  return { nota, notaMaxima }
}

export function parseCuentaEnAvance(fd: FormData): boolean {
  return fd.get('cuentaEnAvance') === '1'
}

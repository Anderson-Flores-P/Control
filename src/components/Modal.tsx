import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { SEMANAS_POR_DEFECTO } from '../types'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    const focusTarget =
      panel?.querySelector<HTMLElement>(
        'input:not([type="hidden"]),select,textarea',
      ) ?? panel?.querySelector<HTMLElement>('button')
    focusTarget?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function FormActions({
  onCancel,
  submitLabel = 'Guardar',
}: {
  onCancel: () => void
  submitLabel?: string
}) {
  return (
    <div className="form-actions">
      <button type="button" className="btn ghost" onClick={onCancel}>
        Cancelar
      </button>
      <button type="submit" className="btn primary">
        {submitLabel}
      </button>
    </div>
  )
}

export function SemanaSelect({
  name = 'semana',
  defaultValue = 1,
  disabledWeeks = [],
  totalSemanas = SEMANAS_POR_DEFECTO,
  label,
}: {
  name?: string
  defaultValue?: number
  disabledWeeks?: number[]
  totalSemanas?: number
  label?: string
}) {
  const blocked = new Set(disabledWeeks)
  const title = label ?? `Semana (1–${totalSemanas})`
  return (
    <Field label={title}>
      <select name={name} defaultValue={defaultValue} required>
        {Array.from({ length: totalSemanas }, (_, i) => {
          const n = i + 1
          const isBlocked = blocked.has(n)
          return (
            <option key={n} value={n} disabled={isBlocked}>
              Semana {n}
              {isBlocked ? ' (parcial)' : ''}
            </option>
          )
        })}
      </select>
    </Field>
  )
}

export type FormSubmit = (e: FormEvent<HTMLFormElement>) => void

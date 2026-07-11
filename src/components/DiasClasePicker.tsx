import { DIAS_SEMANA, type DiaSemana } from '../types'

interface DiasClasePickerProps {
  value: DiaSemana[]
  onChange: (dias: DiaSemana[]) => void
}

export function DiasClasePicker({ value, onChange }: DiasClasePickerProps) {
  const selected = new Set(value)

  const toggle = (day: DiaSemana) => {
    const next = new Set(selected)
    if (next.has(day)) next.delete(day)
    else next.add(day)
    onChange([...next].sort((a, b) => a - b) as DiaSemana[])
  }

  return (
    <div className="dias-picker" role="group" aria-label="Días de clase">
      {DIAS_SEMANA.map((d) => (
        <button
          key={d.value}
          type="button"
          className={`dia-chip${selected.has(d.value) ? ' on' : ''}`}
          onClick={() => toggle(d.value)}
          aria-pressed={selected.has(d.value)}
          title={d.label}
        >
          {d.corto}
        </button>
      ))}
    </div>
  )
}

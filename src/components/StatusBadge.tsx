import type { ActivityStatus } from '../types'
import { statusLabel } from '../lib/stats'

export function StatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <span className={`badge badge-${status}`}>{statusLabel(status)}</span>
  )
}

export function ParcialBadge({
  status,
}: {
  status: 'programado' | 'rendido' | 'pendiente'
}) {
  const labels = {
    programado: 'Programado',
    rendido: 'Rendido',
    pendiente: 'Pendiente',
  }
  return (
    <span className={`badge badge-parcial-${status}`}>{labels[status]}</span>
  )
}

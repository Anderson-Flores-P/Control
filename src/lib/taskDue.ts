import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Tarea } from '../types'

/** Instantánea de vencimiento; null si no hay fecha. */
export function dueAt(tarea: Pick<Tarea, 'fechaVencimiento' | 'horaVencimiento'>): Date | null {
  if (!tarea.fechaVencimiento) return null
  const time = tarea.horaVencimiento?.trim() || '23:59'
  const [hh, mm] = time.split(':').map(Number)
  const d = parseISO(tarea.fechaVencimiento)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(hh || 0, mm || 0, 0, 0)
  return d
}

export function isPastDue(
  tarea: Pick<Tarea, 'fechaVencimiento' | 'horaVencimiento'>,
  now = new Date(),
): boolean {
  const at = dueAt(tarea)
  return at !== null && at.getTime() <= now.getTime()
}

/** Estados que aún pueden pasar a vencida automáticamente */
export function canAutoVencer(status: Tarea['status']): boolean {
  return status === 'pendiente' || status === 'en_progreso'
}

export function formatDueLabel(
  tarea: Pick<Tarea, 'fechaVencimiento' | 'horaVencimiento'>,
): string | null {
  if (!tarea.fechaVencimiento) return null
  try {
    const day = format(parseISO(tarea.fechaVencimiento), "d MMM yyyy", {
      locale: es,
    })
    if (tarea.horaVencimiento) return `${day} · ${tarea.horaVencimiento}`
    return day
  } catch {
    return tarea.fechaVencimiento
  }
}

export function parseDueFromForm(fd: FormData): {
  fechaVencimiento: string | null
  horaVencimiento: string | null
  notificar: boolean
} {
  const fecha = String(fd.get('fechaVencimiento') ?? '').trim()
  const hora = String(fd.get('horaVencimiento') ?? '').trim()
  return {
    fechaVencimiento: fecha || null,
    horaVencimiento: fecha && hora ? hora : null,
    notificar: fd.get('notificar') === '1',
  }
}

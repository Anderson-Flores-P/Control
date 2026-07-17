import type { Materia, Tarea } from '../types'
import { dueAt, formatDueLabel, isPastDue } from './taskDue'

const NOTIFIED_KEY = 'uni-control-notified-v1'

type NotifiedMap = Record<string, true>

function loadNotified(): NotifiedMap {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as NotifiedMap
  } catch {
    return {}
  }
}

function saveNotified(map: NotifiedMap): void {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map))
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

function notify(title: string, body: string, tag: string): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      tag,
      silent: false,
    })
  } catch {
    /* algunos navegadores bloquean sin service worker en móvil */
  }
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/**
 * Revisa tareas con notificar=true y dispara avisos (24h, 1h, vencida).
 * Solo funciona con la app abierta en el navegador.
 */
export function checkTaskNotifications(
  tareas: Tarea[],
  materias: Materia[],
  now = new Date(),
): void {
  if (notificationPermission() !== 'granted') return

  const byId = new Map(materias.map((m) => [m.id, m]))
  const notified = loadNotified()
  let dirty = false
  const nowMs = now.getTime()

  for (const t of tareas) {
    if (!t.notificar || !t.fechaVencimiento) continue
    if (
      t.status === 'completada' ||
      t.status === 'no_hubo' ||
      t.status === 'desactivada'
    ) {
      continue
    }

    const at = dueAt(t)
    if (!at) continue

    const materia = byId.get(t.materiaId)?.nombre ?? 'Materia'
    const when = formatDueLabel(t) ?? ''
    const msLeft = at.getTime() - nowMs

    const mark = (key: string, title: string, body: string) => {
      if (notified[key]) return
      notify(title, body, key)
      notified[key] = true
      dirty = true
    }

    if (msLeft <= 0) {
      mark(
        `${t.id}:overdue`,
        `Tarea vencida: ${t.titulo}`,
        `${materia}${when ? ` · Venció ${when}` : ''}`,
      )
    } else if (msLeft <= HOUR) {
      mark(
        `${t.id}:1h`,
        `Vence en menos de 1 h: ${t.titulo}`,
        `${materia}${when ? ` · ${when}` : ''}`,
      )
    } else if (msLeft <= DAY) {
      mark(
        `${t.id}:24h`,
        `Vence mañana / hoy: ${t.titulo}`,
        `${materia}${when ? ` · ${when}` : ''}`,
      )
    }
  }

  if (dirty) saveNotified(notified)
}

export function clearNotificationMarksForTask(taskId: string): void {
  const notified = loadNotified()
  const keys = Object.keys(notified).filter((k) => k.startsWith(`${taskId}:`))
  if (keys.length === 0) return
  for (const k of keys) delete notified[k]
  saveNotified(notified)
}

export { isPastDue, dueAt }

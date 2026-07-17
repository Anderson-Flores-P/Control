import { useEffect, useRef } from 'react'
import { useStore } from './store'
import { checkTaskNotifications } from './notifications'

const INTERVAL_MS = 30_000

/** Marca vencidas + dispara notificaciones del navegador mientras la app está abierta. */
export function useTaskReminders() {
  const { data, syncTareasVencidas } = useStore()
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    const tick = () => {
      const d = dataRef.current
      checkTaskNotifications(d.tareas, d.materias)
      syncTareasVencidas()
    }

    tick()
    const id = window.setInterval(tick, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [syncTareasVencidas])
}

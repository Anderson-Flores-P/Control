import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createDefaultData, loadData, mergeCicloExport, parseCicloExport, saveData, uid, type CicloExport } from './storage'
import type {
  ActivityStatus,
  AppData,
  Ciclo,
  Corto,
  Festividad,
  Foro,
  Materia,
  Otro,
  Parcial,
  Tarea,
} from '../types'
import { clampSemana, getActiveCiclo, materiasDelCiclo, semanasBloqueadas, semanasDeCiclo } from './stats'
import { canAutoVencer, isPastDue } from './taskDue'
import { clearNotificationMarksForTask } from './notifications'

interface StoreContextValue {
  data: AppData
  activeCiclo: Ciclo
  materiasActivas: Materia[]
  setActiveCiclo: (id: string) => void
  updateCiclo: (id: string, patch: Partial<Ciclo>) => void
  addCiclo: (c: Omit<Ciclo, 'id'>) => void
  archiveCiclo: (id: string, archivado?: boolean) => void
  deleteCiclo: (id: string) => { ok: true } | { ok: false; reason: string }
  duplicateCicloAsBackup: (id: string) => void
  addMateria: (m: Omit<Materia, 'id' | 'cicloId'> & { cicloId?: string }) => void
  updateMateria: (id: string, patch: Partial<Materia>) => void
  removeMateria: (id: string) => void
  addTarea: (t: Omit<Tarea, 'id' | 'createdAt'>) => { ok: true } | { ok: false; reason: string }
  updateTarea: (id: string, patch: Partial<Tarea>) => { ok: true } | { ok: false; reason: string }
  removeTarea: (id: string) => void
  toggleTareaStatus: (id: string) => void
  /** Marca pendientes/en progreso vencidas según fecha+hora */
  syncTareasVencidas: () => void
  addForo: (f: Omit<Foro, 'id' | 'createdAt'>) => { ok: true } | { ok: false; reason: string }
  updateForo: (id: string, patch: Partial<Foro>) => { ok: true } | { ok: false; reason: string }
  removeForo: (id: string) => void
  toggleForoStatus: (id: string) => void
  addCorto: (c: Omit<Corto, 'id' | 'createdAt'>) => { ok: true } | { ok: false; reason: string }
  updateCorto: (id: string, patch: Partial<Corto>) => { ok: true } | { ok: false; reason: string }
  removeCorto: (id: string) => void
  toggleCortoStatus: (id: string) => void
  addOtro: (o: Omit<Otro, 'id' | 'createdAt'>) => { ok: true } | { ok: false; reason: string }
  updateOtro: (id: string, patch: Partial<Otro>) => { ok: true } | { ok: false; reason: string }
  removeOtro: (id: string) => void
  toggleOtroStatus: (id: string) => void
  addParcial: (p: Omit<Parcial, 'id' | 'createdAt'>) => { ok: true } | { ok: false; reason: string }
  updateParcial: (id: string, patch: Partial<Parcial>) => { ok: true } | { ok: false; reason: string }
  removeParcial: (id: string) => void
  addFestividad: (f: Omit<Festividad, 'id'>) => { ok: true } | { ok: false; reason: string }
  updateFestividad: (id: string, patch: Partial<Festividad>) => { ok: true } | { ok: false; reason: string }
  removeFestividad: (id: string) => void
  importCicloJson: (raw: string) => { ok: true; nombre: string } | { ok: false; reason: string }
  isSemanaBloqueada: (materiaId: string, semana: number) => boolean
  resetData: () => void
  getMateria: (id: string) => Materia | undefined
  semanasActivas: number
}

const StoreContext = createContext<StoreContextValue | null>(null)

function maxSemanasForMateria(data: AppData, materiaId: string): number {
  const mat = data.materias.find((m) => m.id === materiaId)
  const ciclo = data.ciclos.find((c) => c.id === mat?.cicloId) ?? getActiveCiclo(data)
  return semanasDeCiclo(ciclo)
}

function cycleStatus(current: ActivityStatus): ActivityStatus {
  if (current === 'completada' || current === 'no_hubo') return 'pendiente'
  if (current === 'pendiente' || current === 'desactivada' || current === 'vencida') {
    return 'en_progreso'
  }
  return 'completada'
}

function blockedFail(semana: number) {
  return {
    ok: false as const,
    reason: `La semana ${semana} está bloqueada por un parcial en esta materia.`,
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const activeCiclo = getActiveCiclo(data)
  const materiasActivas = materiasDelCiclo(data)
  const semanasActivas = semanasDeCiclo(activeCiclo)

  const isSemanaBloqueada = useCallback(
    (materiaId: string, semana: number) => semanasBloqueadas(data, materiaId).has(semana),
    [data],
  )

  const setActiveCiclo = useCallback((id: string) => {
    setData((d) => ({ ...d, activeCicloId: id }))
  }, [])

  const updateCiclo = useCallback((id: string, patch: Partial<Ciclo>) => {
    setData((d) => ({
      ...d,
      ciclos: d.ciclos.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }))
  }, [])

  const addCiclo = useCallback((c: Omit<Ciclo, 'id'>) => {
    setData((d) => {
      const ciclo: Ciclo = { ...c, id: uid() }
      return {
        ...d,
        ciclos: [...d.ciclos, ciclo],
        activeCicloId: ciclo.id,
      }
    })
  }, [])

  const archiveCiclo = useCallback((id: string, archivado = true) => {
    setData((d) => {
      const ciclos = d.ciclos.map((c) => (c.id === id ? { ...c, archivado } : c))
      let activeCicloId = d.activeCicloId
      if (archivado && activeCicloId === id) {
        const next =
          ciclos.find((c) => !c.archivado && c.id !== id) ??
          ciclos.find((c) => c.id !== id)
        if (next) activeCicloId = next.id
      }
      return { ...d, ciclos, activeCicloId }
    })
  }, [])

  const deleteCiclo = useCallback((id: string) => {
    let result: { ok: true } | { ok: false; reason: string } = { ok: true }
    setData((d) => {
      if (d.ciclos.length <= 1) {
        result = {
          ok: false,
          reason: 'No podés borrar el único ciclo. Creá otro antes de eliminar este.',
        }
        return d
      }
      if (!d.ciclos.some((c) => c.id === id)) {
        result = { ok: false, reason: 'El ciclo no existe.' }
        return d
      }
      const matIds = new Set(
        d.materias.filter((m) => m.cicloId === id).map((m) => m.id),
      )
      const ciclos = d.ciclos.filter((c) => c.id !== id)
      let activeCicloId = d.activeCicloId
      if (activeCicloId === id) {
        activeCicloId =
          ciclos.find((c) => !c.archivado)?.id ?? ciclos[0]?.id ?? activeCicloId
      }
      return {
        ...d,
        activeCicloId,
        ciclos,
        materias: d.materias.filter((m) => m.cicloId !== id),
        tareas: d.tareas.filter((t) => !matIds.has(t.materiaId)),
        foros: d.foros.filter((f) => !matIds.has(f.materiaId)),
        cortos: (d.cortos ?? []).filter((c) => !matIds.has(c.materiaId)),
        otros: (d.otros ?? []).filter((o) => !matIds.has(o.materiaId)),
        parciales: d.parciales.filter((p) => !matIds.has(p.materiaId)),
        festividades: (d.festividades ?? []).filter((f) => f.cicloId !== id),
      }
    })
    return result
  }, [])

  const duplicateCicloAsBackup = useCallback((id: string) => {
    setData((d) => {
      const src = d.ciclos.find((c) => c.id === id)
      if (!src) return d
      const newCicloId = uid()
      const matMap = new Map<string, string>()
      const materias = d.materias
        .filter((m) => m.cicloId === id)
        .map((m) => {
          const nid = uid()
          matMap.set(m.id, nid)
          return { ...m, id: nid, cicloId: newCicloId }
        })
      const tareas = d.tareas
        .filter((t) => matMap.has(t.materiaId))
        .map((t) => ({
          ...t,
          id: uid(),
          materiaId: matMap.get(t.materiaId)!,
          createdAt: new Date().toISOString(),
        }))
      const foros = d.foros
        .filter((f) => matMap.has(f.materiaId))
        .map((f) => ({
          ...f,
          id: uid(),
          materiaId: matMap.get(f.materiaId)!,
          createdAt: new Date().toISOString(),
        }))
      const parciales = d.parciales
        .filter((p) => matMap.has(p.materiaId))
        .map((p) => ({
          ...p,
          id: uid(),
          materiaId: matMap.get(p.materiaId)!,
          createdAt: new Date().toISOString(),
        }))
      const cortos = (d.cortos ?? [])
        .filter((c) => matMap.has(c.materiaId))
        .map((c) => ({
          ...c,
          id: uid(),
          materiaId: matMap.get(c.materiaId)!,
          createdAt: new Date().toISOString(),
        }))
      const otros = (d.otros ?? [])
        .filter((o) => matMap.has(o.materiaId))
        .map((o) => ({
          ...o,
          id: uid(),
          materiaId: matMap.get(o.materiaId)!,
          createdAt: new Date().toISOString(),
        }))
      const festividades = (d.festividades ?? [])
        .filter((f) => f.cicloId === id)
        .map((f) => ({
          ...f,
          id: uid(),
          cicloId: newCicloId,
        }))
      const backup: Ciclo = {
        ...src,
        id: newCicloId,
        nombre: `${src.nombre} (respaldo)`,
        archivado: true,
      }
      return {
        ...d,
        ciclos: [...d.ciclos, backup],
        materias: [...d.materias, ...materias],
        tareas: [...d.tareas, ...tareas],
        foros: [...d.foros, ...foros],
        cortos: [...(d.cortos ?? []), ...cortos],
        otros: [...(d.otros ?? []), ...otros],
        parciales: [...d.parciales, ...parciales],
        festividades: [...(d.festividades ?? []), ...festividades],
      }
    })
  }, [])

  const addMateria = useCallback(
    (m: Omit<Materia, 'id' | 'cicloId'> & { cicloId?: string }) => {
      setData((d) => ({
        ...d,
        materias: [
          ...d.materias,
          { ...m, id: uid(), cicloId: m.cicloId ?? d.activeCicloId },
        ],
      }))
    },
    [],
  )

  const updateMateria = useCallback((id: string, patch: Partial<Materia>) => {
    setData((d) => ({
      ...d,
      materias: d.materias.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }))
  }, [])

  const removeMateria = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      materias: d.materias.filter((m) => m.id !== id),
      tareas: d.tareas.filter((t) => t.materiaId !== id),
      foros: d.foros.filter((f) => f.materiaId !== id),
      cortos: (d.cortos ?? []).filter((c) => c.materiaId !== id),
      otros: (d.otros ?? []).filter((o) => o.materiaId !== id),
      parciales: d.parciales.filter((p) => p.materiaId !== id),
    }))
  }, [])

  const addTarea = useCallback(
    (t: Omit<Tarea, 'id' | 'createdAt'>) => {
      const semana = clampSemana(t.semana, maxSemanasForMateria(data, t.materiaId))
      if (semanasBloqueadas(data, t.materiaId).has(semana)) {
        return {
          ok: false as const,
          reason: `La semana ${semana} está bloqueada por un parcial en esta materia.`,
        }
      }
      setData((d) => ({
        ...d,
        tareas: [
          ...d.tareas,
          {
            ...t,
            semana,
            nota: t.nota ?? null,
            notaMaxima: t.notaMaxima ?? 10,
            fechaVencimiento: t.fechaVencimiento ?? null,
            horaVencimiento: t.horaVencimiento ?? null,
            notificar: t.notificar ?? Boolean(t.fechaVencimiento),
            id: uid(),
            createdAt: new Date().toISOString(),
          },
        ],
      }))
      return { ok: true as const }
    },
    [data],
  )

  const updateTarea = useCallback(
    (id: string, patch: Partial<Tarea>) => {
      const current = data.tareas.find((t) => t.id === id)
      if (!current) return { ok: false as const, reason: 'Tarea no encontrada.' }
      const materiaId = patch.materiaId ?? current.materiaId
      const semana = clampSemana(
        patch.semana ?? current.semana,
        maxSemanasForMateria(data, materiaId),
      )
      if (semanasBloqueadas(data, materiaId).has(semana)) {
        return {
          ok: false as const,
          reason: `La semana ${semana} está bloqueada por un parcial.`,
        }
      }
      if (
        patch.fechaVencimiento !== undefined ||
        patch.horaVencimiento !== undefined
      ) {
        clearNotificationMarksForTask(id)
      }
      setData((d) => ({
        ...d,
        tareas: d.tareas.map((t) =>
          t.id === id ? { ...t, ...patch, semana } : t,
        ),
      }))
      return { ok: true as const }
    },
    [data],
  )

  const removeTarea = useCallback((id: string) => {
    clearNotificationMarksForTask(id)
    setData((d) => ({ ...d, tareas: d.tareas.filter((t) => t.id !== id) }))
  }, [])

  const toggleTareaStatus = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      tareas: d.tareas.map((t) => {
        if (t.id !== id) return t
        if (semanasBloqueadas(d, t.materiaId).has(t.semana)) return t
        return { ...t, status: cycleStatus(t.status) }
      }),
    }))
  }, [])

  const syncTareasVencidas = useCallback(() => {
    setData((d) => {
      let changed = false
      const tareas = d.tareas.map((t) => {
        if (!canAutoVencer(t.status)) return t
        if (!isPastDue(t)) return t
        changed = true
        return { ...t, status: 'vencida' as const }
      })
      return changed ? { ...d, tareas } : d
    })
  }, [])

  const addForo = useCallback(
    (f: Omit<Foro, 'id' | 'createdAt'>) => {
      const semana = clampSemana(f.semana, maxSemanasForMateria(data, f.materiaId))
      if (semanasBloqueadas(data, f.materiaId).has(semana)) {
        return {
          ok: false as const,
          reason: `La semana ${semana} está bloqueada por un parcial en esta materia.`,
        }
      }
      setData((d) => ({
        ...d,
        foros: [
          ...d.foros,
          {
            ...f,
            semana,
            nota: f.nota ?? null,
            notaMaxima: f.notaMaxima ?? 10,
            id: uid(),
            createdAt: new Date().toISOString(),
          },
        ],
      }))
      return { ok: true as const }
    },
    [data],
  )

  const updateForo = useCallback(
    (id: string, patch: Partial<Foro>) => {
      const current = data.foros.find((f) => f.id === id)
      if (!current) return { ok: false as const, reason: 'Foro no encontrado.' }
      const materiaId = patch.materiaId ?? current.materiaId
      const semana = clampSemana(
        patch.semana ?? current.semana,
        maxSemanasForMateria(data, materiaId),
      )
      if (semanasBloqueadas(data, materiaId).has(semana)) {
        return {
          ok: false as const,
          reason: `La semana ${semana} está bloqueada por un parcial.`,
        }
      }
      setData((d) => ({
        ...d,
        foros: d.foros.map((f) =>
          f.id === id ? { ...f, ...patch, semana } : f,
        ),
      }))
      return { ok: true as const }
    },
    [data],
  )

  const removeForo = useCallback((id: string) => {
    setData((d) => ({ ...d, foros: d.foros.filter((f) => f.id !== id) }))
  }, [])

  const toggleForoStatus = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      foros: d.foros.map((f) => {
        if (f.id !== id) return f
        if (semanasBloqueadas(d, f.materiaId).has(f.semana)) return f
        return { ...f, status: cycleStatus(f.status) }
      }),
    }))
  }, [])

  const addCorto = useCallback(
    (c: Omit<Corto, 'id' | 'createdAt'>) => {
      const semana = clampSemana(c.semana, maxSemanasForMateria(data, c.materiaId))
      if (semanasBloqueadas(data, c.materiaId).has(semana)) return blockedFail(semana)
      setData((d) => ({
        ...d,
        cortos: [
          ...(d.cortos ?? []),
          {
            ...c,
            semana,
            nota: c.nota ?? null,
            notaMaxima: c.notaMaxima ?? 10,
            id: uid(),
            createdAt: new Date().toISOString(),
          },
        ],
      }))
      return { ok: true as const }
    },
    [data],
  )

  const updateCorto = useCallback(
    (id: string, patch: Partial<Corto>) => {
      const current = (data.cortos ?? []).find((c) => c.id === id)
      if (!current) return { ok: false as const, reason: 'Corto no encontrado.' }
      const materiaId = patch.materiaId ?? current.materiaId
      const semana = clampSemana(
        patch.semana ?? current.semana,
        maxSemanasForMateria(data, materiaId),
      )
      if (semanasBloqueadas(data, materiaId).has(semana)) return blockedFail(semana)
      setData((d) => ({
        ...d,
        cortos: (d.cortos ?? []).map((c) =>
          c.id === id ? { ...c, ...patch, semana } : c,
        ),
      }))
      return { ok: true as const }
    },
    [data],
  )

  const removeCorto = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      cortos: (d.cortos ?? []).filter((c) => c.id !== id),
    }))
  }, [])

  const toggleCortoStatus = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      cortos: (d.cortos ?? []).map((c) => {
        if (c.id !== id) return c
        if (semanasBloqueadas(d, c.materiaId).has(c.semana)) return c
        return { ...c, status: cycleStatus(c.status) }
      }),
    }))
  }, [])

  const addOtro = useCallback(
    (o: Omit<Otro, 'id' | 'createdAt'>) => {
      const semana = clampSemana(o.semana, maxSemanasForMateria(data, o.materiaId))
      // Otros no se bloquean por parcial (actividad externa)
      setData((d) => ({
        ...d,
        otros: [
          ...(d.otros ?? []),
          {
            ...o,
            semana,
            origen: o.origen ?? '',
            nota: o.nota ?? null,
            notaMaxima: o.notaMaxima ?? 10,
            id: uid(),
            createdAt: new Date().toISOString(),
          },
        ],
      }))
      return { ok: true as const }
    },
    [data],
  )

  const updateOtro = useCallback(
    (id: string, patch: Partial<Otro>) => {
      const current = (data.otros ?? []).find((o) => o.id === id)
      if (!current) return { ok: false as const, reason: 'Actividad no encontrada.' }
      const materiaId = patch.materiaId ?? current.materiaId
      const semana = clampSemana(
        patch.semana ?? current.semana,
        maxSemanasForMateria(data, materiaId),
      )
      setData((d) => ({
        ...d,
        otros: (d.otros ?? []).map((o) =>
          o.id === id ? { ...o, ...patch, semana } : o,
        ),
      }))
      return { ok: true as const }
    },
    [data],
  )

  const removeOtro = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      otros: (d.otros ?? []).filter((o) => o.id !== id),
    }))
  }, [])

  const toggleOtroStatus = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      otros: (d.otros ?? []).map((o) =>
        o.id === id ? { ...o, status: cycleStatus(o.status) } : o,
      ),
    }))
  }, [])

  const addParcial = useCallback(
    (p: Omit<Parcial, 'id' | 'createdAt'>) => {
      const max = maxSemanasForMateria(data, p.materiaId)
      const semana = clampSemana(p.semana, max)
      if (semana < 1 || semana > max) {
        return {
          ok: false as const,
          reason: `La semana debe estar entre 1 y ${max}.`,
        }
      }
      if (
        data.parciales.some(
          (x) => x.materiaId === p.materiaId && x.semana === semana,
        )
      ) {
        return {
          ok: false as const,
          reason: `Ya hay un parcial en la semana ${semana} para esta materia.`,
        }
      }
      setData((d) => ({
        ...d,
        parciales: [
          ...d.parciales,
          { ...p, semana, id: uid(), createdAt: new Date().toISOString() },
        ],
      }))
      return { ok: true as const }
    },
    [data],
  )

  const updateParcial = useCallback(
    (id: string, patch: Partial<Parcial>) => {
      const current = data.parciales.find((p) => p.id === id)
      if (!current) return { ok: false as const, reason: 'Parcial no encontrado.' }
      const materiaId = patch.materiaId ?? current.materiaId
      const max = maxSemanasForMateria(data, materiaId)
      const semana = clampSemana(patch.semana ?? current.semana, max)
      if (
        data.parciales.some(
          (x) => x.id !== id && x.materiaId === materiaId && x.semana === semana,
        )
      ) {
        return {
          ok: false as const,
          reason: `Ya hay un parcial en la semana ${semana}.`,
        }
      }
      setData((d) => ({
        ...d,
        parciales: d.parciales.map((p) =>
          p.id === id ? { ...p, ...patch, semana } : p,
        ),
      }))
      return { ok: true as const }
    },
    [data],
  )

  const removeParcial = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      parciales: d.parciales.filter((p) => p.id !== id),
    }))
  }, [])

  const addFestividad = useCallback(
    (f: Omit<Festividad, 'id'>) => {
      const inicio = f.inicio
      const fin = f.fin < f.inicio ? f.inicio : f.fin
      if (!f.nombre.trim() || !inicio) {
        return { ok: false as const, reason: 'Nombre y fechas son obligatorios.' }
      }
      setData((d) => ({
        ...d,
        festividades: [
          ...(d.festividades ?? []),
          { ...f, inicio, fin, id: uid() },
        ],
      }))
      return { ok: true as const }
    },
    [],
  )

  const updateFestividad = useCallback(
    (id: string, patch: Partial<Festividad>) => {
      setData((d) => ({
        ...d,
        festividades: (d.festividades ?? []).map((f) => {
          if (f.id !== id) return f
          const next = { ...f, ...patch }
          if (next.fin < next.inicio) next.fin = next.inicio
          return next
        }),
      }))
      return { ok: true as const }
    },
    [],
  )

  const removeFestividad = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      festividades: (d.festividades ?? []).filter((f) => f.id !== id),
    }))
  }, [])

  const importCicloJson = useCallback((raw: string) => {
    const parsed = parseCicloExport(raw)
    if (!parsed.ok) return parsed
    const imported: CicloExport = parsed.data
    setData((d) => mergeCicloExport(d, imported))
    return { ok: true as const, nombre: imported.ciclo.nombre }
  }, [])

  const resetData = useCallback(() => {
    localStorage.removeItem('uni-control-v2')
    setData(createDefaultData())
  }, [])

  const getMateria = useCallback(
    (id: string) => data.materias.find((m) => m.id === id),
    [data.materias],
  )

  const value = useMemo(
    () => ({
      data,
      activeCiclo,
      materiasActivas,
      semanasActivas,
      setActiveCiclo,
      updateCiclo,
      addCiclo,
      archiveCiclo,
      deleteCiclo,
      duplicateCicloAsBackup,
      addMateria,
      updateMateria,
      removeMateria,
      addTarea,
      updateTarea,
      removeTarea,
      toggleTareaStatus,
      syncTareasVencidas,
      addForo,
      updateForo,
      removeForo,
      toggleForoStatus,
      addCorto,
      updateCorto,
      removeCorto,
      toggleCortoStatus,
      addOtro,
      updateOtro,
      removeOtro,
      toggleOtroStatus,
      addParcial,
      updateParcial,
      removeParcial,
      addFestividad,
      updateFestividad,
      removeFestividad,
      importCicloJson,
      isSemanaBloqueada,
      resetData,
      getMateria,
    }),
    [
      data,
      activeCiclo,
      materiasActivas,
      semanasActivas,
      setActiveCiclo,
      updateCiclo,
      addCiclo,
      archiveCiclo,
      deleteCiclo,
      duplicateCicloAsBackup,
      addMateria,
      updateMateria,
      removeMateria,
      addTarea,
      updateTarea,
      removeTarea,
      toggleTareaStatus,
      syncTareasVencidas,
      addForo,
      updateForo,
      removeForo,
      toggleForoStatus,
      addCorto,
      updateCorto,
      removeCorto,
      toggleCortoStatus,
      addOtro,
      updateOtro,
      removeOtro,
      toggleOtroStatus,
      addParcial,
      updateParcial,
      removeParcial,
      addFestividad,
      updateFestividad,
      removeFestividad,
      importCicloJson,
      isSemanaBloqueada,
      resetData,
      getMateria,
    ],
  )

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

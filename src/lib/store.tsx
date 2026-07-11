import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createDefaultData, loadData, saveData, uid } from './storage'
import type {
  ActivityStatus,
  AppData,
  Ciclo,
  Festividad,
  Foro,
  Materia,
  Parcial,
  Tarea,
} from '../types'
import { SEMANAS_POR_CICLO } from '../types'
import { clampSemana, getActiveCiclo, materiasDelCiclo, semanasBloqueadas } from './stats'

interface StoreContextValue {
  data: AppData
  activeCiclo: Ciclo
  materiasActivas: Materia[]
  setActiveCiclo: (id: string) => void
  updateCiclo: (id: string, patch: Partial<Ciclo>) => void
  addCiclo: (c: Omit<Ciclo, 'id'>) => void
  archiveCiclo: (id: string, archivado?: boolean) => void
  duplicateCicloAsBackup: (id: string) => void
  addMateria: (m: Omit<Materia, 'id' | 'cicloId'> & { cicloId?: string }) => void
  updateMateria: (id: string, patch: Partial<Materia>) => void
  removeMateria: (id: string) => void
  addTarea: (t: Omit<Tarea, 'id' | 'createdAt'>) => { ok: true } | { ok: false; reason: string }
  updateTarea: (id: string, patch: Partial<Tarea>) => { ok: true } | { ok: false; reason: string }
  removeTarea: (id: string) => void
  toggleTareaStatus: (id: string) => void
  addForo: (f: Omit<Foro, 'id' | 'createdAt'>) => { ok: true } | { ok: false; reason: string }
  updateForo: (id: string, patch: Partial<Foro>) => { ok: true } | { ok: false; reason: string }
  removeForo: (id: string) => void
  toggleForoStatus: (id: string) => void
  addParcial: (p: Omit<Parcial, 'id' | 'createdAt'>) => { ok: true } | { ok: false; reason: string }
  updateParcial: (id: string, patch: Partial<Parcial>) => { ok: true } | { ok: false; reason: string }
  removeParcial: (id: string) => void
  addFestividad: (f: Omit<Festividad, 'id'>) => { ok: true } | { ok: false; reason: string }
  updateFestividad: (id: string, patch: Partial<Festividad>) => { ok: true } | { ok: false; reason: string }
  removeFestividad: (id: string) => void
  isSemanaBloqueada: (materiaId: string, semana: number) => boolean
  resetData: () => void
  getMateria: (id: string) => Materia | undefined
}

const StoreContext = createContext<StoreContextValue | null>(null)

function cycleStatus(current: ActivityStatus): ActivityStatus {
  if (current === 'completada') return 'pendiente'
  if (current === 'pendiente' || current === 'desactivada' || current === 'vencida') {
    return 'en_progreso'
  }
  return 'completada'
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const activeCiclo = getActiveCiclo(data)
  const materiasActivas = materiasDelCiclo(data)

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
    setData((d) => ({
      ...d,
      ciclos: d.ciclos.map((c) => (c.id === id ? { ...c, archivado } : c)),
    }))
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
      parciales: d.parciales.filter((p) => p.materiaId !== id),
    }))
  }, [])

  const addTarea = useCallback(
    (t: Omit<Tarea, 'id' | 'createdAt'>) => {
      const semana = clampSemana(t.semana)
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
          { ...t, semana, id: uid(), createdAt: new Date().toISOString() },
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
      const semana = clampSemana(patch.semana ?? current.semana)
      const materiaId = patch.materiaId ?? current.materiaId
      if (semanasBloqueadas(data, materiaId).has(semana)) {
        return {
          ok: false as const,
          reason: `La semana ${semana} está bloqueada por un parcial.`,
        }
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

  const addForo = useCallback(
    (f: Omit<Foro, 'id' | 'createdAt'>) => {
      const semana = clampSemana(f.semana)
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
          { ...f, semana, id: uid(), createdAt: new Date().toISOString() },
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
      const semana = clampSemana(patch.semana ?? current.semana)
      const materiaId = patch.materiaId ?? current.materiaId
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

  const addParcial = useCallback(
    (p: Omit<Parcial, 'id' | 'createdAt'>) => {
      const semana = clampSemana(p.semana)
      if (semana < 1 || semana > SEMANAS_POR_CICLO) {
        return {
          ok: false as const,
          reason: `La semana debe estar entre 1 y ${SEMANAS_POR_CICLO}.`,
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
      const semana = clampSemana(patch.semana ?? current.semana)
      const materiaId = patch.materiaId ?? current.materiaId
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
      setActiveCiclo,
      updateCiclo,
      addCiclo,
      archiveCiclo,
      duplicateCicloAsBackup,
      addMateria,
      updateMateria,
      removeMateria,
      addTarea,
      updateTarea,
      removeTarea,
      toggleTareaStatus,
      addForo,
      updateForo,
      removeForo,
      toggleForoStatus,
      addParcial,
      updateParcial,
      removeParcial,
      addFestividad,
      updateFestividad,
      removeFestividad,
      isSemanaBloqueada,
      resetData,
      getMateria,
    }),
    [
      data,
      activeCiclo,
      materiasActivas,
      setActiveCiclo,
      updateCiclo,
      addCiclo,
      archiveCiclo,
      duplicateCicloAsBackup,
      addMateria,
      updateMateria,
      removeMateria,
      addTarea,
      updateTarea,
      removeTarea,
      toggleTareaStatus,
      addForo,
      updateForo,
      removeForo,
      toggleForoStatus,
      addParcial,
      updateParcial,
      removeParcial,
      addFestividad,
      updateFestividad,
      removeFestividad,
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

import type {
  AppData,
  Ciclo,
  Festividad,
  Foro,
  Materia,
  Parcial,
  Tarea,
} from '../types'
import { MATERIA_COLORS, DIAS_CLASE_DEFAULT, SEMANAS_POR_CICLO } from '../types'

const STORAGE_KEY = 'uni-control-v2'

export function uid(): string {
  return crypto.randomUUID()
}

function dateOffset(base: string, days: number): string {
  const d = new Date(base + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function createDefaultData(): AppData {
  const year = new Date().getFullYear()
  const c1: Ciclo = {
    id: uid(),
    nombre: `Ciclo 1 · ${year}`,
    año: year,
    numero: 1,
    inicio: `${year}-01-20`,
    fin: dateOffset(`${year}-01-20`, SEMANAS_POR_CICLO * 7 - 1),
    archivado: false,
  }
  const c2: Ciclo = {
    id: uid(),
    nombre: `Ciclo 2 · ${year}`,
    año: year,
    numero: 2,
    inicio: `${year}-07-21`,
    fin: dateOffset(`${year}-07-21`, SEMANAS_POR_CICLO * 7 - 1),
    archivado: false,
  }

  const m1 = uid()
  const m2 = uid()
  const m3 = uid()

  const materias: Materia[] = [
    {
      id: m1,
      cicloId: c1.id,
      nombre: 'Ingeniería de Software',
      codigo: 'ISW-401',
      color: MATERIA_COLORS[0],
      diasClase: [1, 3, 5],
    },
    {
      id: m2,
      cicloId: c1.id,
      nombre: 'Bases de Datos',
      codigo: 'BDD-302',
      color: MATERIA_COLORS[3],
      diasClase: [2, 4],
    },
    {
      id: m3,
      cicloId: c1.id,
      nombre: 'Cálculo III',
      codigo: 'MAT-303',
      color: MATERIA_COLORS[4],
      diasClase: [1, 2, 4],
    },
  ]

  const tareas: Tarea[] = [
    {
      id: uid(),
      materiaId: m1,
      semana: 2,
      titulo: 'Diagrama UML',
      descripcion: 'Casos de uso y secuencia',
      status: 'pendiente',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      materiaId: m1,
      semana: 4,
      titulo: 'Sprint backlog',
      descripcion: 'Historias de usuario',
      status: 'en_progreso',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      materiaId: m2,
      semana: 3,
      titulo: 'Normalización 3FN',
      descripcion: 'Ejercicios cap. 5',
      status: 'completada',
      createdAt: new Date().toISOString(),
    },
  ]

  const foros: Foro[] = [
    {
      id: uid(),
      materiaId: m1,
      semana: 2,
      titulo: 'Metodologías ágiles',
      descripcion: 'Mínimo 2 respuestas',
      status: 'pendiente',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      materiaId: m2,
      semana: 5,
      titulo: 'Transacciones ACID',
      descripcion: 'Debate aislamiento',
      status: 'en_progreso',
      createdAt: new Date().toISOString(),
    },
  ]

  const parciales: Parcial[] = [
    {
      id: uid(),
      materiaId: m1,
      semana: 6,
      titulo: 'Parcial 1 — UML y Scrum',
      nota: null,
      notaMaxima: 10,
      status: 'programado',
      createdAt: new Date().toISOString(),
    },
  ]

  const festividades: Festividad[] = [
    {
      id: uid(),
      cicloId: c1.id,
      nombre: 'Semana Santa',
      inicio: `${year}-04-13`,
      fin: `${year}-04-17`,
    },
    {
      id: uid(),
      cicloId: c1.id,
      nombre: 'Día del Trabajo',
      inicio: `${year}-05-01`,
      fin: `${year}-05-01`,
    },
  ]

  return {
    activeCicloId: c1.id,
    ciclos: [c1, c2],
    materias,
    tareas,
    foros,
    parciales,
    festividades,
  }
}

function normalize(data: AppData): AppData {
  return {
    ...data,
    festividades: data.festividades ?? [],
    materias: (data.materias ?? []).map((m) => ({
      ...m,
      diasClase:
        m.diasClase && m.diasClase.length > 0
          ? m.diasClase
          : [...DIAS_CLASE_DEFAULT],
    })),
  }
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.removeItem('uni-control-v1')
      return createDefaultData()
    }
    return normalize(JSON.parse(raw) as AppData)
  } catch {
    return createDefaultData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function exportCicloJson(data: AppData, cicloId: string): string {
  const ciclo = data.ciclos.find((c) => c.id === cicloId)
  const materias = data.materias.filter((m) => m.cicloId === cicloId)
  const matIds = new Set(materias.map((m) => m.id))
  return JSON.stringify(
    {
      ciclo,
      materias,
      tareas: data.tareas.filter((t) => matIds.has(t.materiaId)),
      foros: data.foros.filter((f) => matIds.has(f.materiaId)),
      parciales: data.parciales.filter((p) => matIds.has(p.materiaId)),
      festividades: (data.festividades ?? []).filter((f) => f.cicloId === cicloId),
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  )
}

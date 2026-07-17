import type {
  ActividadSemanal,
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
import { MATERIA_COLORS, SEMANAS_POR_DEFECTO } from '../types'

const STORAGE_KEY = 'uni-control-v2'

export function uid(): string {
  return crypto.randomUUID()
}

function dateOffset(base: string, days: number): string {
  const d = new Date(base + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function withGrade<T extends Partial<ActividadSemanal>>(
  item: T,
  defaultCuentaEnAvance = true,
): T & {
  nota: number | null
  notaMaxima: number
  cuentaEnAvance: boolean
} {
  return {
    ...item,
    nota: item.nota ?? null,
    notaMaxima: item.notaMaxima ?? 10,
    cuentaEnAvance: item.cuentaEnAvance ?? defaultCuentaEnAvance,
  }
}

export function createDefaultData(): AppData {
  const year = new Date().getFullYear()
  const c1: Ciclo = {
    id: uid(),
    nombre: `Ciclo 1 · ${year}`,
    año: year,
    numero: 1,
    inicio: `${year}-01-20`,
    fin: dateOffset(`${year}-01-20`, SEMANAS_POR_DEFECTO * 7 - 1),
    archivado: false,
  }
  const c2: Ciclo = {
    id: uid(),
    nombre: `Ciclo 2 · ${year}`,
    año: year,
    numero: 2,
    inicio: `${year}-07-21`,
    fin: dateOffset(`${year}-07-21`, SEMANAS_POR_DEFECTO * 7 - 1),
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

  const now = new Date().toISOString()
  const tareas: Tarea[] = [
    withGrade({
      id: uid(),
      materiaId: m1,
      semana: 2,
      titulo: 'Diagrama UML',
      descripcion: 'Casos de uso y secuencia',
      status: 'pendiente',
      createdAt: now,
      fechaVencimiento: dateOffset(`${year}-01-20`, 10),
      horaVencimiento: '23:59',
      notificar: true,
    }),
    withGrade({
      id: uid(),
      materiaId: m1,
      semana: 4,
      titulo: 'Sprint backlog',
      descripcion: 'Historias de usuario',
      status: 'en_progreso',
      createdAt: now,
      fechaVencimiento: dateOffset(`${year}-01-20`, 24),
      horaVencimiento: '18:00',
      notificar: true,
    }),
    withGrade({
      id: uid(),
      materiaId: m2,
      semana: 3,
      titulo: 'Normalización 3FN',
      descripcion: 'Ejercicios cap. 5',
      status: 'completada',
      nota: 9,
      createdAt: now,
      fechaVencimiento: null,
      horaVencimiento: null,
      notificar: false,
    }),
  ]

  const foros: Foro[] = [
    withGrade({
      id: uid(),
      materiaId: m1,
      semana: 2,
      titulo: 'Metodologías ágiles',
      descripcion: 'Mínimo 2 respuestas',
      status: 'pendiente',
      createdAt: now,
    }),
    withGrade({
      id: uid(),
      materiaId: m2,
      semana: 5,
      titulo: 'Transacciones ACID',
      descripcion: 'Debate aislamiento',
      status: 'en_progreso',
      createdAt: now,
    }),
  ]

  const cortos: Corto[] = [
    withGrade(
      {
        id: uid(),
        materiaId: m1,
        semana: 3,
        titulo: 'Corto UML',
        descripcion: '10 min',
        status: 'completada',
        nota: 8,
        createdAt: now,
      },
      false,
    ),
  ]

  const otros: Otro[] = [
    {
      ...withGrade({
        id: uid(),
        materiaId: m3,
        semana: 2,
        titulo: 'Taller extracurricular',
        descripcion: 'Actividad de otra universidad',
        status: 'pendiente',
        createdAt: now,
      }),
      origen: 'Otra universidad',
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
      createdAt: now,
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
    cortos,
    otros,
    parciales,
    festividades,
  }
}

function normalizeActividad<T extends ActividadSemanal>(
  list: T[] | undefined,
  defaultCuentaEnAvance = true,
): T[] {
  return (list ?? []).map((item) => withGrade(item, defaultCuentaEnAvance) as T)
}

function normalizeTareas(list: Tarea[] | undefined): Tarea[] {
  return (list ?? []).map((item) => ({
    ...withGrade(item, true),
    fechaVencimiento: item.fechaVencimiento ?? null,
    horaVencimiento: item.horaVencimiento ?? null,
    notificar: item.notificar ?? Boolean(item.fechaVencimiento),
  }))
}

function normalize(data: AppData): AppData {
  return {
    ...data,
    festividades: data.festividades ?? [],
    cortos: normalizeActividad(data.cortos, false),
    otros: (data.otros ?? []).map((o) => ({
      ...withGrade(o, true),
      origen: o.origen ?? '',
    })),
    tareas: normalizeTareas(data.tareas),
    foros: normalizeActividad(data.foros, true),
    materias: (data.materias ?? []).map((m) => ({
      ...m,
      diasClase: Array.isArray(m.diasClase) ? m.diasClase : [],
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

export interface CicloExport {
  ciclo: Ciclo
  materias: Materia[]
  tareas: Tarea[]
  foros: Foro[]
  cortos: Corto[]
  otros: Otro[]
  parciales: Parcial[]
  festividades: Festividad[]
  exportedAt?: string
}

export function exportCicloJson(data: AppData, cicloId: string): string {
  const ciclo = data.ciclos.find((c) => c.id === cicloId)
  if (!ciclo) throw new Error('Ciclo no encontrado')
  const materias = data.materias.filter((m) => m.cicloId === cicloId)
  const matIds = new Set(materias.map((m) => m.id))
  const payload: CicloExport & { exportedAt: string } = {
    ciclo,
    materias,
    tareas: data.tareas.filter((t) => matIds.has(t.materiaId)),
    foros: data.foros.filter((f) => matIds.has(f.materiaId)),
    cortos: (data.cortos ?? []).filter((c) => matIds.has(c.materiaId)),
    otros: (data.otros ?? []).filter((o) => matIds.has(o.materiaId)),
    parciales: data.parciales.filter((p) => matIds.has(p.materiaId)),
    festividades: (data.festividades ?? []).filter((f) => f.cicloId === cicloId),
    exportedAt: new Date().toISOString(),
  }
  return JSON.stringify(payload, null, 2)
}

export function parseCicloExport(
  raw: string,
): { ok: true; data: CicloExport } | { ok: false; reason: string } {
  try {
    const parsed = JSON.parse(raw) as Partial<CicloExport>
    if (!parsed.ciclo || !parsed.ciclo.id || !parsed.ciclo.inicio || !parsed.ciclo.fin) {
      return { ok: false, reason: 'El JSON no tiene un ciclo válido (faltan id, inicio o fin).' }
    }
    if (!Array.isArray(parsed.materias)) {
      return { ok: false, reason: 'El JSON debe incluir un arreglo "materias".' }
    }
    return {
      ok: true,
      data: {
        ciclo: parsed.ciclo,
        materias: parsed.materias.map((m) => ({
          ...m,
          diasClase: Array.isArray(m.diasClase) ? m.diasClase : [],
        })),
        tareas: normalizeTareas(parsed.tareas as Tarea[]),
        foros: normalizeActividad(parsed.foros as Foro[], true),
        cortos: normalizeActividad(parsed.cortos as Corto[], false),
        otros: (parsed.otros ?? []).map((o) => ({
          ...withGrade(o, true),
          origen: o.origen ?? '',
        })),
        parciales: Array.isArray(parsed.parciales) ? parsed.parciales : [],
        festividades: Array.isArray(parsed.festividades) ? parsed.festividades : [],
        exportedAt: parsed.exportedAt,
      },
    }
  } catch {
    return { ok: false, reason: 'No se pudo leer el archivo. Verificá que sea un JSON válido.' }
  }
}

/** Integra un ciclo exportado: reemplaza si el id existe, activa ese ciclo. */
export function mergeCicloExport(current: AppData, imported: CicloExport): AppData {
  const cicloId = imported.ciclo.id
  const oldMatIds = new Set(
    current.materias.filter((m) => m.cicloId === cicloId).map((m) => m.id),
  )

  return {
    ...current,
    activeCicloId: cicloId,
    ciclos: [...current.ciclos.filter((c) => c.id !== cicloId), imported.ciclo],
    materias: [
      ...current.materias.filter((m) => m.cicloId !== cicloId),
      ...imported.materias.map((m) => ({
        ...m,
        cicloId,
        diasClase: Array.isArray(m.diasClase) ? m.diasClase : [],
      })),
    ],
    tareas: [
      ...current.tareas.filter((t) => !oldMatIds.has(t.materiaId)),
      ...imported.tareas,
    ],
    foros: [
      ...current.foros.filter((f) => !oldMatIds.has(f.materiaId)),
      ...imported.foros,
    ],
    cortos: [
      ...(current.cortos ?? []).filter((c) => !oldMatIds.has(c.materiaId)),
      ...(imported.cortos ?? []),
    ],
    otros: [
      ...(current.otros ?? []).filter((o) => !oldMatIds.has(o.materiaId)),
      ...(imported.otros ?? []),
    ],
    parciales: [
      ...current.parciales.filter((p) => !oldMatIds.has(p.materiaId)),
      ...imported.parciales,
    ],
    festividades: [
      ...(current.festividades ?? []).filter((f) => f.cicloId !== cicloId),
      ...imported.festividades.map((f) => ({ ...f, cicloId })),
    ],
  }
}

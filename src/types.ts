export type ViewId =
  | 'panel'
  | 'materias'
  | 'semanas'
  | 'festivos'
  | 'ciclos'
  | 'config'

export type ActivityStatus = 'pendiente' | 'en_progreso' | 'completada' | 'vencida' | 'desactivada'

export const SEMANAS_POR_CICLO = 20

export interface Ciclo {
  id: string
  nombre: string
  año: number
  numero: 1 | 2
  inicio: string
  fin: string
  /** Respaldo conservado si hay problemas con la universidad */
  archivado: boolean
}

/** Día(s) sin clases — descanso por festividad o asueto */
export interface Festividad {
  id: string
  cicloId: string
  nombre: string
  /** Fecha inicio (yyyy-MM-dd) */
  inicio: string
  /** Fecha fin inclusive; igual a inicio si es un solo día */
  fin: string
}

export interface Materia {
  id: string
  cicloId: string
  nombre: string
  codigo: string
  color: string
  /** Días de la semana con clase (ISO: 1=Lun … 7=Dom) */
  diasClase: DiaSemana[]
}

/** ISO weekday: lunes=1 … domingo=7 */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const DIAS_SEMANA: { value: DiaSemana; label: string; corto: string }[] = [
  { value: 1, label: 'Lunes', corto: 'Lun' },
  { value: 2, label: 'Martes', corto: 'Mar' },
  { value: 3, label: 'Miércoles', corto: 'Mié' },
  { value: 4, label: 'Jueves', corto: 'Jue' },
  { value: 5, label: 'Viernes', corto: 'Vie' },
  { value: 6, label: 'Sábado', corto: 'Sáb' },
  { value: 7, label: 'Domingo', corto: 'Dom' },
]

/** Por defecto Lun–Vie si la materia no tiene horario cargado */
export const DIAS_CLASE_DEFAULT: DiaSemana[] = [1, 2, 3, 4, 5]

export interface Tarea {
  id: string
  materiaId: string
  semana: number
  titulo: string
  descripcion: string
  status: ActivityStatus
  createdAt: string
}

export interface Foro {
  id: string
  materiaId: string
  semana: number
  titulo: string
  descripcion: string
  status: ActivityStatus
  createdAt: string
}

export interface Parcial {
  id: string
  materiaId: string
  /** Semana del ciclo (1–20) en la que corre el parcial */
  semana: number
  titulo: string
  nota: number | null
  notaMaxima: number
  status: 'programado' | 'rendido' | 'pendiente'
  createdAt: string
}

export interface AppData {
  activeCicloId: string
  ciclos: Ciclo[]
  materias: Materia[]
  tareas: Tarea[]
  foros: Foro[]
  parciales: Parcial[]
  festividades: Festividad[]
}

export const MATERIA_COLORS = [
  '#e10600',
  '#ff6b35',
  '#f7c948',
  '#2dd4bf',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#84cc16',
]

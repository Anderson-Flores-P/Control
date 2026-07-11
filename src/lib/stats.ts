import type {
  ActivityStatus,
  AppData,
  Ciclo,
  DiaSemana,
  Festividad,
  Foro,
  Materia,
  Parcial,
  Tarea,
} from '../types'
import { DIAS_CLASE_DEFAULT, DIAS_SEMANA, SEMANAS_POR_CICLO } from '../types'
import {
  addDays,
  eachDayOfInterval,
  differenceInCalendarDays,
  format,
  getISODay,
  isWithinInterval,
  max as maxDate,
  min as minDate,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'

export function getActiveCiclo(data: AppData) {
  return data.ciclos.find((c) => c.id === data.activeCicloId) ?? data.ciclos[0]
}

export function materiasDelCiclo(data: AppData, cicloId = data.activeCicloId) {
  return data.materias.filter((m) => m.cicloId === cicloId)
}

export function actividadesDeMateria(data: AppData, materiaId: string) {
  return {
    tareas: data.tareas.filter((t) => t.materiaId === materiaId),
    foros: data.foros.filter((f) => f.materiaId === materiaId),
    parciales: data.parciales
      .filter((p) => p.materiaId === materiaId)
      .sort((a, b) => a.semana - b.semana),
  }
}

/** Semanas bloqueadas por parciales en esa materia */
export function semanasBloqueadas(data: AppData, materiaId: string): Set<number> {
  return new Set(
    data.parciales.filter((p) => p.materiaId === materiaId).map((p) => p.semana),
  )
}

export function semanaTieneParcial(
  data: AppData,
  materiaId: string,
  semana: number,
): Parcial | undefined {
  return data.parciales.find(
    (p) => p.materiaId === materiaId && p.semana === semana,
  )
}

export function statusEfectivo(
  status: ActivityStatus,
  bloqueada: boolean,
): ActivityStatus {
  if (bloqueada && status !== 'completada') return 'desactivada'
  return status
}

export function statusLabel(s: ActivityStatus): string {
  const map: Record<ActivityStatus, string> = {
    pendiente: 'Pendiente',
    en_progreso: 'En progreso',
    completada: 'Completada',
    vencida: 'Vencida',
    desactivada: 'Desactivada (parcial)',
  }
  return map[s]
}

export function clampSemana(n: number): number {
  return Math.min(SEMANAS_POR_CICLO, Math.max(1, Math.round(n)))
}

/** Semana actual del ciclo según fechas de inicio/fin (1–20) */
export function semanaActualCiclo(inicio: string, fin: string, hoy = new Date()): number {
  try {
    const start = parseISO(inicio)
    const end = parseISO(fin)
    if (hoy < start) return 1
    if (hoy > end) return SEMANAS_POR_CICLO
    const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1)
    const elapsed = differenceInCalendarDays(hoy, start)
    const week = Math.floor((elapsed / totalDays) * SEMANAS_POR_CICLO) + 1
    return clampSemana(week)
  } catch {
    return 1
  }
}

export function rangoSemana(
  inicioCiclo: string,
  semana: number,
): { inicio: string; fin: string } {
  const start = addDays(parseISO(inicioCiclo), (semana - 1) * 7)
  const end = addDays(start, 6)
  return {
    inicio: format(start, 'yyyy-MM-dd'),
    fin: format(end, 'yyyy-MM-dd'),
  }
}

export function formatRangoSemana(inicioCiclo: string, semana: number): string {
  const r = rangoSemana(inicioCiclo, semana)
  try {
    const a = format(parseISO(r.inicio), 'd MMM', { locale: es })
    const b = format(parseISO(r.fin), 'd MMM', { locale: es })
    return `${a} – ${b}`
  } catch {
    return `Semana ${semana}`
  }
}

export function formatLongDate(date: Date = new Date()): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: es })
}

export function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "d MMM yyyy", { locale: es })
  } catch {
    return dateStr
  }
}

export function diasClaseDe(materia: Materia): DiaSemana[] {
  const dias = materia.diasClase?.filter((d) => d >= 1 && d <= 7) ?? []
  return dias.length > 0 ? ([...new Set(dias)].sort((a, b) => a - b) as DiaSemana[]) : [...DIAS_CLASE_DEFAULT]
}

export function formatDiasClase(dias: DiaSemana[]): string {
  if (dias.length === 0) return 'Sin días'
  return dias
    .map((d) => DIAS_SEMANA.find((x) => x.value === d)?.corto ?? String(d))
    .join(' · ')
}

/** Unión de días de clase de todas las materias del ciclo */
export function diasClaseDelCiclo(
  data: AppData,
  cicloId = data.activeCicloId,
): Set<DiaSemana> {
  const mats = materiasDelCiclo(data, cicloId)
  const set = new Set<DiaSemana>()
  for (const m of mats) {
    for (const d of diasClaseDe(m)) set.add(d)
  }
  if (set.size === 0) {
    for (const d of DIAS_CLASE_DEFAULT) set.add(d)
  }
  return set
}

export function esDiaDeClase(
  data: AppData,
  fecha: Date | string,
  cicloId = data.activeCicloId,
): boolean {
  const day = typeof fecha === 'string' ? parseISO(fecha) : fecha
  return diasClaseDelCiclo(data, cicloId).has(getISODay(day) as DiaSemana)
}

/** Días de clase programados de una materia en el ciclo (sin festivos) */
export function diasClaseMateriaEnCiclo(
  data: AppData,
  materiaId: string,
): { total: number; transcurridos: number; restantes: number } {
  const materia = data.materias.find((m) => m.id === materiaId)
  if (!materia) return { total: 0, transcurridos: 0, restantes: 0 }
  const ciclo = data.ciclos.find((c) => c.id === materia.cicloId)
  if (!ciclo) return { total: 0, transcurridos: 0, restantes: 0 }

  const schedule = new Set(diasClaseDe(materia))
  const festivos = diasFestivosSet(data, ciclo.id)
  const start = parseISO(ciclo.inicio)
  const end = parseISO(ciclo.fin)
  const hoy = parseISO(format(new Date(), 'yyyy-MM-dd'))

  let total = 0
  let transcurridos = 0
  for (const d of eachDayOfInterval({ start, end })) {
    const key = format(d, 'yyyy-MM-dd')
    if (festivos.has(key)) continue
    if (!schedule.has(getISODay(d) as DiaSemana)) continue
    total += 1
    if (d <= hoy) transcurridos += 1
  }
  return {
    total,
    transcurridos,
    restantes: Math.max(0, total - transcurridos),
  }
}

export function festividadesDelCiclo(
  data: AppData,
  cicloId = data.activeCicloId,
): Festividad[] {
  return (data.festividades ?? [])
    .filter((f) => f.cicloId === cicloId)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
}

/** Set de fechas (yyyy-MM-dd) sin clases por festividades del ciclo */
export function diasFestivosSet(
  data: AppData,
  cicloId = data.activeCicloId,
): Set<string> {
  const ciclo = data.ciclos.find((c) => c.id === cicloId)
  const set = new Set<string>()
  if (!ciclo) return set

  const cicloStart = parseISO(ciclo.inicio)
  const cicloEnd = parseISO(ciclo.fin)

  for (const f of festividadesDelCiclo(data, cicloId)) {
    try {
      const a = parseISO(f.inicio)
      const b = parseISO(f.fin < f.inicio ? f.inicio : f.fin)
      const from = maxDate([a, cicloStart])
      const to = minDate([b, cicloEnd])
      if (from > to) continue
      for (const d of eachDayOfInterval({ start: from, end: to })) {
        set.add(format(d, 'yyyy-MM-dd'))
      }
    } catch {
      /* skip bad ranges */
    }
  }
  return set
}

export function esDiaFestivo(
  data: AppData,
  fecha: string,
  cicloId = data.activeCicloId,
): boolean {
  return diasFestivosSet(data, cicloId).has(fecha)
}

export function festivoEnFecha(
  data: AppData,
  fecha: string,
  cicloId = data.activeCicloId,
): Festividad | undefined {
  return festividadesDelCiclo(data, cicloId).find((f) => {
    try {
      const day = parseISO(fecha)
      const start = parseISO(f.inicio)
      const end = parseISO(f.fin < f.inicio ? f.inicio : f.fin)
      return isWithinInterval(day, { start, end })
    } catch {
      return false
    }
  })
}

/** Semanas (1–20) que contienen al menos un día festivo */
export function semanasConFestivo(
  data: AppData,
  cicloId = data.activeCicloId,
): Set<number> {
  const ciclo = data.ciclos.find((c) => c.id === cicloId)
  const weeks = new Set<number>()
  if (!ciclo) return weeks
  const festivos = diasFestivosSet(data, cicloId)
  for (const fecha of festivos) {
    const day = parseISO(fecha)
    const start = parseISO(ciclo.inicio)
    const end = parseISO(ciclo.fin)
    if (day < start || day > end) continue
    const elapsed = differenceInCalendarDays(day, start)
    const semana = clampSemana(Math.floor(elapsed / 7) + 1)
    weeks.add(semana)
  }
  return weeks
}

export interface TiempoCiclo {
  inicio: string
  fin: string
  hoy: string
  estado: 'antes' | 'en_curso' | 'finalizado'
  diasTotales: number
  /** Festivos que caen en un día con horario de materias */
  diasFestivos: number
  /** Días con clase según horario de materias, menos festivos */
  diasLectivos: number
  /** Días del calendario que coinciden con horario (antes de quitar festivos) */
  diasConHorario: number
  diasCalendarioTranscurridos: number
  diasLectivosTranscurridos: number
  diasLectivosRestantes: number
  diasFestivosYaPasados: number
  diasFestivosPorVenir: number
  diasHorario: DiaSemana[]
  /** Avance temporal sobre días lectivos reales */
  pctTemporal: number
  /** Avance calendario puro inicio→fin */
  pctCalendario: number
  semanasConDescanso: number[]
}

/**
 * Avance del ciclo según fechas + días de clase de las materias,
 * descontando festividades que caen en esos días.
 */
export function tiempoCiclo(
  data: AppData,
  cicloId = data.activeCicloId,
  hoy = new Date(),
): TiempoCiclo {
  const ciclo = data.ciclos.find((c) => c.id === cicloId) as Ciclo
  const hoyStr = format(hoy, 'yyyy-MM-dd')
  const start = parseISO(ciclo.inicio)
  const end = parseISO(ciclo.fin)
  const today = parseISO(hoyStr)

  const diasTotales = Math.max(1, differenceInCalendarDays(end, start) + 1)
  const festivos = diasFestivosSet(data, cicloId)
  const horario = diasClaseDelCiclo(data, cicloId)
  const diasHorario = [...horario].sort((a, b) => a - b)

  let diasConHorario = 0
  let diasFestivos = 0
  let diasLectivos = 0
  let diasCalendarioTranscurridos = 0
  let diasLectivosTranscurridos = 0
  let diasFestivosYaPasados = 0

  let estado: TiempoCiclo['estado'] = 'en_curso'
  if (today < start) estado = 'antes'
  else if (today > end) estado = 'finalizado'

  for (const d of eachDayOfInterval({ start, end })) {
    const key = format(d, 'yyyy-MM-dd')
    const esHorario = horario.has(getISODay(d) as DiaSemana)
    const esFestivo = festivos.has(key)
    const pasadoOHoy = estado !== 'antes' && d <= (estado === 'finalizado' ? end : today)

    if (pasadoOHoy) diasCalendarioTranscurridos += 1

    if (!esHorario) continue

    diasConHorario += 1
    if (esFestivo) {
      diasFestivos += 1
      if (pasadoOHoy) diasFestivosYaPasados += 1
      continue
    }

    diasLectivos += 1
    if (pasadoOHoy) diasLectivosTranscurridos += 1
  }

  if (estado === 'antes') {
    diasCalendarioTranscurridos = 0
    diasLectivosTranscurridos = 0
    diasFestivosYaPasados = 0
  }

  const diasFestivosPorVenir = Math.max(0, diasFestivos - diasFestivosYaPasados)
  const diasLectivosRestantes = Math.max(0, diasLectivos - diasLectivosTranscurridos)

  const pctTemporal =
    diasLectivos === 0
      ? estado === 'finalizado'
        ? 100
        : 0
      : Math.min(
          100,
          Math.round((diasLectivosTranscurridos / diasLectivos) * 100),
        )

  const pctCalendario =
    estado === 'antes'
      ? 0
      : estado === 'finalizado'
        ? 100
        : Math.min(
            100,
            Math.round((diasCalendarioTranscurridos / diasTotales) * 100),
          )

  return {
    inicio: ciclo.inicio,
    fin: ciclo.fin,
    hoy: hoyStr,
    estado,
    diasTotales,
    diasFestivos,
    diasLectivos,
    diasConHorario,
    diasCalendarioTranscurridos,
    diasLectivosTranscurridos,
    diasLectivosRestantes,
    diasFestivosYaPasados,
    diasFestivosPorVenir,
    diasHorario,
    pctTemporal,
    pctCalendario,
    semanasConDescanso: [...semanasConFestivo(data, cicloId)].sort((a, b) => a - b),
  }
}

export interface SemanaResumen {
  semana: number
  tareas: number
  tareasDone: number
  foros: number
  forosDone: number
  parciales: number
  bloqueada: boolean
}

export function resumenSemanasMateria(
  data: AppData,
  materiaId: string,
): SemanaResumen[] {
  const blocked = semanasBloqueadas(data, materiaId)
  const { tareas, foros, parciales } = actividadesDeMateria(data, materiaId)

  return Array.from({ length: SEMANAS_POR_CICLO }, (_, i) => {
    const semana = i + 1
    const ts = tareas.filter((t) => t.semana === semana)
    const fs = foros.filter((f) => f.semana === semana)
    return {
      semana,
      tareas: ts.length,
      tareasDone: ts.filter((t) => t.status === 'completada').length,
      foros: fs.length,
      forosDone: fs.filter((f) => f.status === 'completada').length,
      parciales: parciales.filter((p) => p.semana === semana).length,
      bloqueada: blocked.has(semana),
    }
  })
}

export function statsMateria(data: AppData, materiaId: string) {
  const { tareas, foros, parciales } = actividadesDeMateria(data, materiaId)
  const blocked = semanasBloqueadas(data, materiaId)
  const activasT = tareas.filter((t) => !blocked.has(t.semana))
  const activasF = foros.filter((f) => !blocked.has(f.semana))
  const tDone = activasT.filter((t) => t.status === 'completada').length
  const fDone = activasF.filter((f) => f.status === 'completada').length
  const pDone = parciales.filter((p) => p.status === 'rendido').length
  const total = activasT.length + activasF.length + parciales.length
  const done = tDone + fDone + pDone
  return {
    tDone,
    tTotal: activasT.length,
    fDone,
    fTotal: activasF.length,
    pDone,
    pTotal: parciales.length,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    blockedWeeks: blocked.size,
  }
}

export function statsCiclo(data: AppData, cicloId = data.activeCicloId) {
  const mats = materiasDelCiclo(data, cicloId)
  let tDone = 0
  let tTotal = 0
  let fDone = 0
  let fTotal = 0
  let pDone = 0
  let pTotal = 0
  for (const m of mats) {
    const s = statsMateria(data, m.id)
    tDone += s.tDone
    tTotal += s.tTotal
    fDone += s.fDone
    fTotal += s.fTotal
    pDone += s.pDone
    pTotal += s.pTotal
  }
  const total = tTotal + fTotal + pTotal
  const done = tDone + fDone + pDone
  return {
    materias: mats.length,
    tDone,
    tTotal,
    fDone,
    fTotal,
    pDone,
    pTotal,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
  }
}

export function weeklyProgressCiclo(data: AppData, cicloId = data.activeCicloId) {
  const mats = materiasDelCiclo(data, cicloId)
  return Array.from({ length: SEMANAS_POR_CICLO }, (_, i) => {
    const semana = i + 1
    let due = 0
    let done = 0
    for (const m of mats) {
      const blocked = semanaTieneParcial(data, m.id, semana)
      if (blocked) {
        const p = blocked
        due += 1
        if (p.status === 'rendido') done += 1
        continue
      }
      const ts = data.tareas.filter((t) => t.materiaId === m.id && t.semana === semana)
      const fs = data.foros.filter((f) => f.materiaId === m.id && f.semana === semana)
      due += ts.length + fs.length
      done +=
        ts.filter((t) => t.status === 'completada').length +
        fs.filter((f) => f.status === 'completada').length
    }
    return {
      semana,
      pct: due === 0 ? 0 : Math.round((done / due) * 100),
      due,
      done,
    }
  })
}

export function gridPorMaterias(data: AppData, cicloId = data.activeCicloId) {
  const mats = materiasDelCiclo(data, cicloId)
  const days = Array.from({ length: SEMANAS_POR_CICLO }, (_, i) => i + 1)
  const rows = mats.map((m) => ({
    id: m.id,
    label: m.nombre,
    color: m.color,
    cells: days.map((semana) => {
      if (semanaTieneParcial(data, m.id, semana)) {
        const p = semanaTieneParcial(data, m.id, semana)!
        return p.status === 'rendido' ? 'parcial-done' : 'parcial'
      }
      const hasDone =
        data.tareas.some(
          (t) => t.materiaId === m.id && t.semana === semana && t.status === 'completada',
        ) ||
        data.foros.some(
          (f) => f.materiaId === m.id && f.semana === semana && f.status === 'completada',
        )
      const hasAny =
        data.tareas.some((t) => t.materiaId === m.id && t.semana === semana) ||
        data.foros.some((f) => f.materiaId === m.id && f.semana === semana)
      if (hasDone) return 'done'
      if (hasAny) return 'pending'
      return 'empty'
    }),
  }))
  return { days, rows }
}

export type { Tarea, Foro, Parcial, Materia }

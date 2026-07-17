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
import { DIAS_SEMANA, SEMANAS_POR_DEFECTO } from '../types'
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

/** Semanas del ciclo según inicio/fin (mín. 1). Si fechas inválidas → 20 por defecto. */
export function calcularSemanasCiclo(inicio: string, fin: string): number {
  try {
    const days = differenceInCalendarDays(parseISO(fin), parseISO(inicio)) + 1
    if (days <= 0) return SEMANAS_POR_DEFECTO
    return Math.max(1, Math.ceil(days / 7))
  } catch {
    return SEMANAS_POR_DEFECTO
  }
}

export function semanasDeCiclo(ciclo: { inicio: string; fin: string }): number {
  return calcularSemanasCiclo(ciclo.inicio, ciclo.fin)
}

export function actividadesDeMateria(data: AppData, materiaId: string) {
  return {
    tareas: data.tareas.filter((t) => t.materiaId === materiaId),
    foros: data.foros.filter((f) => f.materiaId === materiaId),
    cortos: (data.cortos ?? []).filter((c) => c.materiaId === materiaId),
    otros: (data.otros ?? []).filter((o) => o.materiaId === materiaId),
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
  if (status === 'no_hubo' || status === 'completada') return status
  if (bloqueada) return 'desactivada'
  return status
}

export function statusLabel(s: ActivityStatus): string {
  const map: Record<ActivityStatus, string> = {
    pendiente: 'Pendiente',
    en_progreso: 'En progreso',
    completada: 'Completada',
    vencida: 'Vencida',
    desactivada: 'Desactivada (parcial)',
    no_hubo: 'No hubo',
  }
  return map[s]
}

/** Resuelta = completada o no hubo (cuenta para el avance de la semana) */
export function actividadResuelta(status: ActivityStatus): boolean {
  return status === 'completada' || status === 'no_hubo'
}

/**
 * Si la actividad entra en el cálculo de avance académico.
 * Cortos: cuentan si el usuario lo marcó, o automáticamente si no hay tarea en esa semana.
 * Resto: según cuentaEnAvance (por defecto sí).
 */
export function actividadCuentaEnAvance(
  item: { cuentaEnAvance?: boolean },
  opts: { esCorto?: boolean; hayTareaEnSemana?: boolean } = {},
): boolean {
  if (opts.esCorto) {
    if (item.cuentaEnAvance === true) return true
    return !opts.hayTareaEnSemana
  }
  return item.cuentaEnAvance !== false
}

export function clampSemana(n: number, totalSemanas = SEMANAS_POR_DEFECTO): number {
  return Math.min(totalSemanas, Math.max(1, Math.round(n)))
}

/** Semana actual del ciclo según fechas de inicio/fin */
export function semanaActualCiclo(inicio: string, fin: string, hoy = new Date()): number {
  const total = calcularSemanasCiclo(inicio, fin)
  try {
    const start = parseISO(inicio)
    const end = parseISO(fin)
    if (hoy < start) return 1
    if (hoy > end) return total
    const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1)
    const elapsed = differenceInCalendarDays(hoy, start)
    const week = Math.floor((elapsed / totalDays) * total) + 1
    return clampSemana(week, total)
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
  return [...new Set(dias)].sort((a, b) => a - b) as DiaSemana[]
}

export function formatDiasClase(dias: DiaSemana[]): string {
  if (dias.length === 0) return 'Sin días asignados'
  return dias
    .map((d) => DIAS_SEMANA.find((x) => x.value === d)?.corto ?? String(d))
    .join(' · ')
}

/** Unión de días de clase de todas las materias del ciclo (sin relleno automático) */
export function diasClaseDelCiclo(
  data: AppData,
  cicloId = data.activeCicloId,
): Set<DiaSemana> {
  const mats = materiasDelCiclo(data, cicloId)
  const set = new Set<DiaSemana>()
  for (const m of mats) {
    for (const d of diasClaseDe(m)) set.add(d)
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

/** Semanas que contienen al menos un día festivo */
export function semanasConFestivo(
  data: AppData,
  cicloId = data.activeCicloId,
): Set<number> {
  const ciclo = data.ciclos.find((c) => c.id === cicloId)
  const weeks = new Set<number>()
  if (!ciclo) return weeks
  const total = semanasDeCiclo(ciclo)
  const festivos = diasFestivosSet(data, cicloId)
  for (const fecha of festivos) {
    const day = parseISO(fecha)
    const start = parseISO(ciclo.inicio)
    const end = parseISO(ciclo.fin)
    if (day < start || day > end) continue
    const elapsed = differenceInCalendarDays(day, start)
    const semana = clampSemana(Math.floor(elapsed / 7) + 1, total)
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
  cortos: number
  cortosDone: number
  otros: number
  otrosDone: number
  parciales: number
  bloqueada: boolean
  /** 0–1 avance de esa semana */
  avance: number
}

/**
 * Avance de una semana (0–1).
 * Cada semana pesa igual en el ciclo; sin actividades = 0.
 * Con parcial: 1 si rendido, 0 si no.
 * Cortos solo cuentan si se marcó “cuenta en avance” o si no hay tarea esa semana.
 */
export function avanceSemanaMateria(
  data: AppData,
  materiaId: string,
  semana: number,
): number {
  const parcial = semanaTieneParcial(data, materiaId, semana)
  if (parcial) return parcial.status === 'rendido' ? 1 : 0

  const { tareas, foros, cortos, otros } = actividadesDeMateria(data, materiaId)
  const ts = tareas.filter((t) => t.semana === semana)
  const hayTarea = ts.length > 0
  const items = [
    ...ts.filter((t) => actividadCuentaEnAvance(t)),
    ...foros
      .filter((f) => f.semana === semana)
      .filter((f) => actividadCuentaEnAvance(f)),
    ...cortos
      .filter((c) => c.semana === semana)
      .filter((c) =>
        actividadCuentaEnAvance(c, { esCorto: true, hayTareaEnSemana: hayTarea }),
      ),
    ...otros
      .filter((o) => o.semana === semana)
      .filter((o) => actividadCuentaEnAvance(o)),
  ]
  if (items.length === 0) return 0
  const done = items.filter((i) => actividadResuelta(i.status)).length
  return done / items.length
}

export function resumenSemanasMateria(
  data: AppData,
  materiaId: string,
): SemanaResumen[] {
  const blocked = semanasBloqueadas(data, materiaId)
  const { tareas, foros, cortos, otros, parciales } = actividadesDeMateria(
    data,
    materiaId,
  )
  const materia = data.materias.find((m) => m.id === materiaId)
  const ciclo = data.ciclos.find((c) => c.id === materia?.cicloId)
  const total = ciclo ? semanasDeCiclo(ciclo) : SEMANAS_POR_DEFECTO

  return Array.from({ length: total }, (_, i) => {
    const semana = i + 1
    const ts = tareas.filter((t) => t.semana === semana)
    const fs = foros.filter((f) => f.semana === semana)
    const cs = cortos.filter((c) => c.semana === semana)
    const os = otros.filter((o) => o.semana === semana)
    return {
      semana,
      tareas: ts.length,
      tareasDone: ts.filter((t) => actividadResuelta(t.status)).length,
      foros: fs.length,
      forosDone: fs.filter((f) => actividadResuelta(f.status)).length,
      cortos: cs.length,
      cortosDone: cs.filter((c) => actividadResuelta(c.status)).length,
      otros: os.length,
      otrosDone: os.filter((o) => actividadResuelta(o.status)).length,
      parciales: parciales.filter((p) => p.semana === semana).length,
      bloqueada: blocked.has(semana),
      avance: avanceSemanaMateria(data, materiaId, semana),
    }
  })
}

export function statsMateria(data: AppData, materiaId: string) {
  const { tareas, foros, cortos, otros, parciales } = actividadesDeMateria(
    data,
    materiaId,
  )
  const blocked = semanasBloqueadas(data, materiaId)
  const materia = data.materias.find((m) => m.id === materiaId)
  const ciclo = data.ciclos.find((c) => c.id === materia?.cicloId)
  const totalWeeks = ciclo ? semanasDeCiclo(ciclo) : SEMANAS_POR_DEFECTO

  const sum = Array.from({ length: totalWeeks }, (_, i) =>
    avanceSemanaMateria(data, materiaId, i + 1),
  ).reduce((a, b) => a + b, 0)
  const pct = totalWeeks === 0 ? 0 : Math.round((sum / totalWeeks) * 100)

  const countResolved = (list: { semana: number; status: ActivityStatus }[]) => {
    const activas = list.filter((x) => !blocked.has(x.semana))
    return {
      done: activas.filter((x) => actividadResuelta(x.status)).length,
      total: activas.length,
    }
  }
  const t = countResolved(tareas)
  const f = countResolved(foros)
  const c = countResolved(cortos)
  const o = countResolved(otros)
  const pDone = parciales.filter((p) => p.status === 'rendido').length

  return {
    tDone: t.done,
    tTotal: t.total,
    fDone: f.done,
    fTotal: f.total,
    cDone: c.done,
    cTotal: c.total,
    oDone: o.done,
    oTotal: o.total,
    pDone,
    pTotal: parciales.length,
    pct,
    blockedWeeks: blocked.size,
    totalWeeks,
  }
}

export function statsCiclo(data: AppData, cicloId = data.activeCicloId) {
  const mats = materiasDelCiclo(data, cicloId)
  let tDone = 0
  let tTotal = 0
  let fDone = 0
  let fTotal = 0
  let cDone = 0
  let cTotal = 0
  let oDone = 0
  let oTotal = 0
  let pDone = 0
  let pTotal = 0
  let pctSum = 0
  for (const m of mats) {
    const s = statsMateria(data, m.id)
    tDone += s.tDone
    tTotal += s.tTotal
    fDone += s.fDone
    fTotal += s.fTotal
    cDone += s.cDone
    cTotal += s.cTotal
    oDone += s.oDone
    oTotal += s.oTotal
    pDone += s.pDone
    pTotal += s.pTotal
    pctSum += s.pct
  }
  return {
    materias: mats.length,
    tDone,
    tTotal,
    fDone,
    fTotal,
    cDone,
    cTotal,
    oDone,
    oTotal,
    pDone,
    pTotal,
    pct: mats.length === 0 ? 0 : Math.round(pctSum / mats.length),
  }
}

export function weeklyProgressCiclo(data: AppData, cicloId = data.activeCicloId) {
  const mats = materiasDelCiclo(data, cicloId)
  const ciclo = data.ciclos.find((c) => c.id === cicloId)
  const total = ciclo ? semanasDeCiclo(ciclo) : SEMANAS_POR_DEFECTO
  return Array.from({ length: total }, (_, i) => {
    const semana = i + 1
    if (mats.length === 0) return { semana, pct: 0, due: 0, done: 0 }
    const scores = mats.map((m) => avanceSemanaMateria(data, m.id, semana))
    const pct = Math.round(
      (scores.reduce((a, b) => a + b, 0) / mats.length) * 100,
    )
    return { semana, pct, due: mats.length, done: scores.filter((s) => s >= 1).length }
  })
}

export function gridPorMaterias(data: AppData, cicloId = data.activeCicloId) {
  const mats = materiasDelCiclo(data, cicloId)
  const ciclo = data.ciclos.find((c) => c.id === cicloId)
  const total = ciclo ? semanasDeCiclo(ciclo) : SEMANAS_POR_DEFECTO
  const days = Array.from({ length: total }, (_, i) => i + 1)
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
          (t) => t.materiaId === m.id && t.semana === semana && actividadResuelta(t.status),
        ) ||
        data.foros.some(
          (f) => f.materiaId === m.id && f.semana === semana && actividadResuelta(f.status),
        ) ||
        (data.cortos ?? []).some(
          (c) => c.materiaId === m.id && c.semana === semana && actividadResuelta(c.status),
        ) ||
        (data.otros ?? []).some(
          (o) => o.materiaId === m.id && o.semana === semana && actividadResuelta(o.status),
        )
      const hasAny =
        data.tareas.some((t) => t.materiaId === m.id && t.semana === semana) ||
        data.foros.some((f) => f.materiaId === m.id && f.semana === semana) ||
        (data.cortos ?? []).some((c) => c.materiaId === m.id && c.semana === semana) ||
        (data.otros ?? []).some((o) => o.materiaId === m.id && o.semana === semana)
      if (hasDone) return 'done'
      if (hasAny) return 'pending'
      return 'empty'
    }),
  }))
  return { days, rows }
}

export type PendingTipo = 'tarea' | 'foro' | 'corto' | 'otro' | 'parcial'

export interface PendingItem {
  id: string
  tipo: PendingTipo
  titulo: string
  semana: number
  status: ActivityStatus | Parcial['status']
  materiaId: string
  materiaNombre: string
  materiaColor: string
  origen?: string
  fechaVencimiento?: string | null
  horaVencimiento?: string | null
}

export const PENDING_TIPO_LABEL: Record<PendingTipo, string> = {
  tarea: 'Tarea',
  foro: 'Foro',
  corto: 'Corto',
  otro: 'Otro',
  parcial: 'Parcial',
}

const TIPO_ORDER: Record<PendingTipo, number> = {
  tarea: 0,
  foro: 1,
  corto: 2,
  otro: 3,
  parcial: 4,
}

/**
 * Actividades y parciales sin resolver del ciclo.
 * Omite semanas bloqueadas por parcial (las actividades quedan desactivadas).
 */
export function pendientesCiclo(
  data: AppData,
  cicloId = data.activeCicloId,
): PendingItem[] {
  const mats = materiasDelCiclo(data, cicloId)
  const byId = new Map(mats.map((m) => [m.id, m]))
  const items: PendingItem[] = []

  const pushActividad = (
    tipo: Exclude<PendingTipo, 'parcial'>,
    list: {
      id: string
      materiaId: string
      semana: number
      titulo: string
      status: ActivityStatus
      origen?: string
      fechaVencimiento?: string | null
      horaVencimiento?: string | null
    }[],
  ) => {
    for (const a of list) {
      const m = byId.get(a.materiaId)
      if (!m) continue
      if (actividadResuelta(a.status)) continue
      if (semanaTieneParcial(data, a.materiaId, a.semana)) continue
      items.push({
        id: a.id,
        tipo,
        titulo: a.titulo || PENDING_TIPO_LABEL[tipo],
        semana: a.semana,
        status: a.status,
        materiaId: m.id,
        materiaNombre: m.nombre,
        materiaColor: m.color,
        origen: a.origen,
        fechaVencimiento: a.fechaVencimiento ?? null,
        horaVencimiento: a.horaVencimiento ?? null,
      })
    }
  }

  pushActividad('tarea', data.tareas)
  pushActividad('foro', data.foros)
  pushActividad('corto', data.cortos ?? [])
  pushActividad('otro', data.otros ?? [])

  for (const p of data.parciales) {
    const m = byId.get(p.materiaId)
    if (!m) continue
    if (p.status === 'rendido') continue
    items.push({
      id: p.id,
      tipo: 'parcial',
      titulo: p.titulo || 'Parcial',
      semana: p.semana,
      status: p.status,
      materiaId: m.id,
      materiaNombre: m.nombre,
      materiaColor: m.color,
    })
  }

  items.sort((a, b) => {
    const da = a.fechaVencimiento
      ? `${a.fechaVencimiento}T${a.horaVencimiento ?? '23:59'}`
      : ''
    const db = b.fechaVencimiento
      ? `${b.fechaVencimiento}T${b.horaVencimiento ?? '23:59'}`
      : ''
    if (da && db && da !== db) return da.localeCompare(db)
    if (da && !db) return -1
    if (!da && db) return 1
    if (a.semana !== b.semana) return a.semana - b.semana
    const mat = a.materiaNombre.localeCompare(b.materiaNombre, 'es')
    if (mat !== 0) return mat
    if (TIPO_ORDER[a.tipo] !== TIPO_ORDER[b.tipo]) {
      return TIPO_ORDER[a.tipo] - TIPO_ORDER[b.tipo]
    }
    return a.titulo.localeCompare(b.titulo, 'es')
  })

  return items
}

export type { Tarea, Foro, Parcial, Materia }

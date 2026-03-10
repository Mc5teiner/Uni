// ─── FernUni WiWi B.Sc. Notenrechner ─────────────────────────────────────────
// Based on: https://github.com/uberwach/wiwi-bsc-notenrechner
// Prüfungsordnung 2023 & 2025

export type PO = '2023' | '2025'

// ── Module lists ─────────────────────────────────────────────────────────────

export const PFLICHT_MODULES = [
  { number: '31001', name: 'Einführung in die Wirtschaftswissenschaft', short: 'eWiWi' },
  { number: '31011', name: 'Externes Rechnungswesen',                   short: 'ExtRewe' },
  { number: '31021', name: 'Investition und Finanzierung',              short: 'InvFin' },
  { number: '31031', name: 'Internes Rechnungswesen',                   short: 'IntRewe' },
  { number: '31041', name: 'Mikroökonomik',                             short: 'Mikro' },
  { number: '31051', name: 'Makroökonomik',                             short: 'Makro' },
  { number: '31061', name: 'Priv.- & Wirtschaftsrecht',                 short: 'Recht' },
  { number: '31071', name: 'Einf. Wirtschaftsinformatik',               short: 'WInfo' },
  { number: '31101', name: 'Wirtschaftsmathematik & Statistik',         short: 'Mathe' },
  { number: '31102', name: 'Unternehmensführung',                       short: 'UF' },
] as const

export type PflichtNumber = typeof PFLICHT_MODULES[number]['number']

// ── Grade parsing & formatting ────────────────────────────────────────────────

/** Parse "2,3" or "2.3" → 2.3. Returns null if empty or invalid. */
export function parseGrade(input: string): number | null {
  if (!input.trim()) return null
  const n = parseFloat(input.trim().replace(',', '.'))
  if (isNaN(n)) return null
  // Clamp to valid range
  if (n < 1.0 || n > 5.0) return null
  return n
}

/** 2.3 → "2,3" */
export function fmtGrade(n: number): string {
  return n.toFixed(2).replace('.', ',').replace(/,?0+$/, '').replace(',', ',')
    || n.toFixed(1).replace('.', ',')
}

/** Format to exactly 1 decimal: 2.3 → "2,3", 2.0 → "2,0" */
export function fmtGrade1(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

/** Format to 2 decimals: 2.31 → "2,31" */
export function fmtGrade2(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

/** Round to nearest valid German grade step (1.0, 1.3, 1.7 … 4.0) */
export function roundToStep(avg: number): number {
  if (avg >= 4.85) return 5.0
  const steps = [1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0]
  return steps.reduce((prev, curr) =>
    Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev
  )
}

/** Validate a grade string as the user types */
export function gradeInputValid(s: string): boolean {
  if (!s.trim()) return true // empty is ok
  const n = parseFloat(s.trim().replace(',', '.'))
  return !isNaN(n) && n >= 1.0 && n <= 5.0
}

// ── Data model ────────────────────────────────────────────────────────────────

export interface GradeEntry {
  /** German grade string e.g. "2,3" (empty = not entered) */
  grade: string
  /** Recognized/transferred credit — counts for passing, excluded from avg */
  anerkannt: boolean
}

export interface WahlSlot extends GradeEntry {
  /** User-entered module name for this slot */
  name: string
  /** User-entered module number — used to detect a linked AppContext module */
  number: string
}

export interface GradeConfig {
  po: PO
  /** key = PFLICHT_MODULES[].number */
  pflicht: Record<string, GradeEntry>
  /** 6 elective slots */
  wahl: [WahlSlot, WahlSlot, WahlSlot, WahlSlot, WahlSlot, WahlSlot]
  seminar: GradeEntry
  thesis: GradeEntry
}

const emptyEntry = (): GradeEntry => ({ grade: '', anerkannt: false })
const emptyWahl  = (): WahlSlot  => ({ grade: '', anerkannt: false, name: '', number: '' })

export function defaultGradeConfig(): GradeConfig {
  return {
    po: '2025',
    pflicht: Object.fromEntries(PFLICHT_MODULES.map(m => [m.number, emptyEntry()])),
    wahl: [emptyWahl(), emptyWahl(), emptyWahl(), emptyWahl(), emptyWahl(), emptyWahl()],
    seminar: emptyEntry(),
    thesis: emptyEntry(),
  }
}

// ── Calculation ───────────────────────────────────────────────────────────────

export interface PflichtStats {
  /** Parsed grade per module (null = anerkannt or not entered) */
  grades: (number | null)[]
  anerkannt: boolean[]
  /** Average of entered, non-anerkannt, non-5.0 grades */
  avg: number | null
  /** Number of entered (incl. anerkannt) modules */
  enteredCount: number
  /** Validation issues */
  issues: string[]
  /** All passing conditions met */
  passingMet: boolean
}

export function calcPflichtStats(config: GradeConfig): PflichtStats {
  const grades: (number | null)[] = PFLICHT_MODULES.map(m => {
    const e = config.pflicht[m.number]
    if (!e || e.anerkannt) return null
    return parseGrade(e.grade)
  })
  const anerkannt = PFLICHT_MODULES.map(m => !!(config.pflicht[m.number]?.anerkannt))

  // Grades that count toward average: entered, not anerkannt, not 5.0
  const forAvg = grades.filter((g): g is number => g !== null && g < 5.0)
  const avg = forAvg.length > 0 ? forAvg.reduce((s, g) => s + g, 0) / forAvg.length : null

  const enteredCount = grades.filter(g => g !== null).length + anerkannt.filter(Boolean).length

  const issues: string[] = []
  const failedModules = grades.filter(g => g !== null && g >= 5.0).length
  const badModules    = grades.filter(g => g !== null && g === 4.0).length

  if (failedModules > 0) issues.push(`${failedModules} Modul${failedModules > 1 ? 'e' : ''} nicht bestanden`)
  if (badModules > 2)    issues.push(`Mehr als 2 Module mit 4,0`)

  const passingMet = enteredCount === 10 && failedModules === 0 && badModules <= 2

  return { grades, anerkannt, avg, enteredCount, issues, passingMet }
}

export interface WahlStats {
  /** Parsed grade per wahl slot (null = anerkannt or not entered) */
  wahlGrades: (number | null)[]
  seminarGrade: number | null
  thesisGrade: number | null
  /** Weighted average (thesis 2x in PO2025) */
  avg: number | null
  enteredCount: number
}

export function calcWahlStats(config: GradeConfig): WahlStats {
  const wahlGrades: (number | null)[] = config.wahl.map(e => {
    if (e.anerkannt) return null
    return parseGrade(e.grade)
  })
  const seminarGrade = parseGrade(config.seminar.grade)
  const thesisGrade  = parseGrade(config.thesis.grade)

  const pool: number[] = []
  wahlGrades.forEach(g => { if (g !== null && g < 5.0) pool.push(g) })
  if (seminarGrade !== null && seminarGrade < 5.0) pool.push(seminarGrade)
  if (thesisGrade  !== null && thesisGrade  < 5.0) {
    pool.push(thesisGrade)
    if (config.po === '2025') pool.push(thesisGrade) // double weight PO2025
  }

  const avg = pool.length > 0 ? pool.reduce((s, g) => s + g, 0) / pool.length : null

  const wahlEntered    = wahlGrades.filter(g => g !== null).length
                       + config.wahl.filter(e => e.anerkannt).length
  const seminarEntered = seminarGrade !== null || config.seminar.anerkannt ? 1 : 0
  const thesisEntered  = thesisGrade  !== null ? 1 : 0
  const enteredCount   = wahlEntered + seminarEntered + thesisEntered

  return { wahlGrades, seminarGrade, thesisGrade, avg, enteredCount }
}

export function calcGesamtnote(config: GradeConfig): number | null {
  const { avg: pflichtAvg } = calcPflichtStats(config)
  const { avg: wahlAvg }    = calcWahlStats(config)

  if (pflichtAvg === null && wahlAvg === null) return null

  const wP = config.po === '2025' ? 0.25 : 0.20
  const wW = config.po === '2025' ? 0.75 : 0.80

  if (pflichtAvg !== null && wahlAvg !== null) return pflichtAvg * wP + wahlAvg * wW
  if (pflichtAvg !== null) return pflichtAvg
  return wahlAvg
}

/** Grade quality for coloring: "sehr gut" | "gut" | "befriedigend" | "ausreichend" | "nicht bestanden" */
export function gradeLabel(g: number): string {
  if (g < 1.5)  return 'Sehr gut'
  if (g < 2.5)  return 'Gut'
  if (g < 3.5)  return 'Befriedigend'
  if (g <= 4.0) return 'Ausreichend'
  return 'Nicht bestanden'
}

export function gradeColor(g: number): string {
  if (g < 1.5)  return '#16a34a'  // green
  if (g < 2.5)  return '#2563eb'  // blue
  if (g < 3.5)  return '#d97706'  // amber
  if (g <= 4.0) return '#ea580c'  // orange
  return '#dc2626'                // red
}

// ── localStorage hook helper (no React dep here, used by the page) ────────────
export const GRADE_CONFIG_KEY = 'grade-config-v1'

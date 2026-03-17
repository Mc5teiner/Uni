import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  GraduationCap, Link2, Link2Off, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, Info, Pencil,
} from 'lucide-react'
import {
  PFLICHT_MODULES, type GradeConfig, type GradeEntry, type WahlSlot, type PO,
  defaultGradeConfig, parseGrade, fmtGrade1, fmtGrade2, roundToStep,
  calcPflichtStats, calcWahlStats, calcGesamtnote,
  gradeLabel, gradeColor, gradeInputValid,
} from '../utils/gradeCalculations'

// ─── AppContext-backed grade config hook ──────────────────────────────────────

function useGradeConfig(): [GradeConfig, (fn: (prev: GradeConfig) => GradeConfig) => void] {
  const { data, updateGrades } = useApp()

  // Merge server data with defaults to handle missing fields after app updates
  const config = useMemo<GradeConfig>(() => {
    const stored = data.grades
    if (!stored) return defaultGradeConfig()
    const def = defaultGradeConfig()
    return {
      ...def,
      ...stored,
      pflicht: { ...def.pflicht, ...(stored.pflicht ?? {}) },
      wahl: stored.wahl
        ? stored.wahl.map((w, i) => ({ ...def.wahl[i], ...w })) as GradeConfig['wahl']
        : def.wahl,
      seminar: { ...def.seminar, ...(stored.seminar ?? {}) },
      thesis:  { ...def.thesis,  ...(stored.thesis  ?? {}) },
    }
  }, [data.grades])

  const update = useCallback((fn: (prev: GradeConfig) => GradeConfig) => {
    updateGrades(fn(config))
  }, [config, updateGrades])

  return [config, update]
}

// ─── Grade input cell ─────────────────────────────────────────────────────────

function GradeInput({
  value,
  onChange,
  disabled,
  placeholder = '–',
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const valid = gradeInputValid(value)
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className="w-16 text-center text-sm font-semibold rounded-lg px-2 py-1.5 border transition-colors outline-none focus:ring-2"
      style={{
        borderColor: !valid ? 'var(--th-danger)' : 'var(--th-border)',
        background: disabled ? 'var(--th-bg-secondary)' : 'var(--th-card)',
        color: disabled ? 'var(--th-text-3)' : 'var(--th-text)',
        '--tw-ring-color': 'var(--th-accent)',
      } as React.CSSProperties}
      aria-invalid={!valid}
    />
  )
}

// ─── Link badge showing the module connected from AppContext ──────────────────

function LinkedBadge({ moduleName, overridden }: { moduleName: string; overridden?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
      style={{
        background: overridden ? 'rgba(245,158,11,0.12)' : 'rgba(22,163,74,0.12)',
        color:      overridden ? '#b45309' : '#16a34a',
      }}
      title={overridden ? `Manuell überschrieben (Modul: ${moduleName})` : `Verknüpft mit: ${moduleName}`}
    >
      {overridden ? <Pencil size={9} /> : <Link2 size={9} />}
      {overridden ? 'Überschrieben' : moduleName}
    </span>
  )
}

// ─── Pflicht module row ───────────────────────────────────────────────────────

function PflichtRow({
  moduleNum,
  moduleName,
  entry,
  linkedGrade,
  linkedName,
  onChange,
}: {
  moduleNum: string
  moduleName: string
  entry: GradeEntry
  /** Grade pulled from AppContext module (if exists) */
  linkedGrade: string | null
  /** Name of linked AppContext module */
  linkedName: string | null
  onChange: (patch: Partial<GradeEntry>) => void
}) {
  const isLinked       = !!linkedGrade && !entry.anerkannt
  const isOverridden   = isLinked && !!entry.grade && entry.grade !== linkedGrade
  const displayGrade   = entry.anerkannt ? '' : (entry.grade || linkedGrade || '')
  const parsed         = parseGrade(displayGrade)

  return (
    <li className="flex items-center gap-2 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--th-border)' }}>
      {/* Module number */}
      <code className="text-[10px] font-mono shrink-0 w-10" style={{ color: 'var(--th-text-3)' }}>
        {moduleNum}
      </code>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium" style={{ color: 'var(--th-text)' }}>{moduleName}</span>
        {isLinked && linkedName && (
          <div className="mt-0.5">
            <LinkedBadge moduleName={linkedName} overridden={isOverridden} />
          </div>
        )}
      </div>

      {/* Anerkannt toggle */}
      <label
        className="flex items-center gap-1 text-xs shrink-0 cursor-pointer select-none"
        title="Modul anerkannt (zählt nicht in Notendurchschnitt)"
        style={{ color: 'var(--th-text-3)' }}
      >
        <input
          type="checkbox"
          checked={entry.anerkannt}
          onChange={e => onChange({ anerkannt: e.target.checked, grade: entry.grade })}
          className="rounded"
        />
        <span className="hidden sm:inline">Anerk.</span>
      </label>

      {/* Grade badge when anerkannt */}
      {entry.anerkannt ? (
        <span className="w-16 text-center text-xs font-medium rounded-lg px-2 py-1.5"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
          A
        </span>
      ) : (
        <GradeInput
          value={entry.grade}
          onChange={grade => onChange({ grade })}
          placeholder={linkedGrade ?? '–'}
        />
      )}

      {/* Grade quality dot */}
      {parsed !== null && !entry.anerkannt && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: gradeColor(parsed) }}
          title={gradeLabel(parsed)}
          aria-hidden="true"
        />
      )}
    </li>
  )
}

// ─── Wahl slot row ────────────────────────────────────────────────────────────

function WahlRow({
  slot,
  index,
  linkedGrade,
  linkedName,
  onChange,
}: {
  slot: WahlSlot
  index: number
  linkedGrade: string | null
  linkedName: string | null
  onChange: (patch: Partial<WahlSlot>) => void
}) {
  const isLinked     = !!linkedGrade && !slot.anerkannt
  const isOverridden = isLinked && !!slot.grade && slot.grade !== linkedGrade
  const displayGrade = slot.anerkannt ? '' : (slot.grade || linkedGrade || '')
  const parsed       = parseGrade(displayGrade)

  return (
    <li className="flex items-center gap-2 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--th-border)' }}>
      <span className="text-[10px] font-mono shrink-0 w-5 text-center" style={{ color: 'var(--th-text-3)' }}>
        {index + 1}
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={slot.number}
            onChange={e => onChange({ number: e.target.value })}
            placeholder="Nr."
            className="w-14 text-xs border rounded-md px-1.5 py-1 outline-none focus:ring-1 focus:ring-[var(--th-accent)]"
            style={{ borderColor: 'var(--th-border)', background: 'var(--th-card)', color: 'var(--th-text)' }}
          />
          <input
            type="text"
            value={slot.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="Modulname (optional)"
            className="flex-1 text-xs border rounded-md px-1.5 py-1 outline-none focus:ring-1 focus:ring-[var(--th-accent)]"
            style={{ borderColor: 'var(--th-border)', background: 'var(--th-card)', color: 'var(--th-text)' }}
          />
        </div>
        {isLinked && linkedName && (
          <LinkedBadge moduleName={linkedName} overridden={isOverridden} />
        )}
      </div>

      <label
        className="flex items-center gap-1 text-xs shrink-0 cursor-pointer select-none"
        style={{ color: 'var(--th-text-3)' }}
        title="Anerkannt"
      >
        <input
          type="checkbox"
          checked={slot.anerkannt}
          onChange={e => onChange({ anerkannt: e.target.checked })}
          className="rounded"
        />
        <span className="hidden sm:inline">Anerk.</span>
      </label>

      {slot.anerkannt ? (
        <span className="w-16 text-center text-xs font-medium rounded-lg px-2 py-1.5"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
          A
        </span>
      ) : (
        <GradeInput
          value={slot.grade}
          onChange={grade => onChange({ grade })}
          placeholder={linkedGrade ?? '–'}
        />
      )}

      {parsed !== null && !slot.anerkannt && (
        <span className="w-2 h-2 rounded-full shrink-0"
          style={{ background: gradeColor(parsed) }}
          title={gradeLabel(parsed)} aria-hidden="true" />
      )}
    </li>
  )
}

// ─── Simple grade row (seminar, thesis) ──────────────────────────────────────

function SimpleRow({
  label,
  sub,
  entry,
  onChange,
}: {
  label: string
  sub?: string
  entry: GradeEntry
  onChange: (patch: Partial<GradeEntry>) => void
}) {
  const parsed = parseGrade(entry.grade)
  return (
    <li className="flex items-center gap-2 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--th-border)' }}>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium" style={{ color: 'var(--th-text)' }}>{label}</span>
        {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--th-text-3)' }}>{sub}</div>}
      </div>
      <GradeInput value={entry.grade} onChange={grade => onChange({ grade })} />
      {parsed !== null && (
        <span className="w-2 h-2 rounded-full shrink-0"
          style={{ background: gradeColor(parsed) }} aria-hidden="true" />
      )}
    </li>
  )
}

// ─── Summary panel ────────────────────────────────────────────────────────────

function SummaryPanel({ config }: { config: GradeConfig }) {
  const pflicht  = calcPflichtStats(config)
  const wahl     = calcWahlStats(config)
  const gesamt   = calcGesamtnote(config)
  const pflichtWeight = config.po === '2025' ? 25 : 20
  const wahlWeight    = config.po === '2025' ? 75 : 80

  return (
    <div className="th-card p-4 md:p-5 mb-6">
      <div className="flex flex-wrap gap-3 md:gap-6 items-center justify-between">

        {/* Pflicht block */}
        <div className="flex flex-col gap-0.5 min-w-[7rem]">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-3)' }}>
            Pflicht ({pflichtWeight}%)
          </div>
          {pflicht.avg !== null ? (
            <div className="text-xl font-bold" style={{ color: gradeColor(pflicht.avg), letterSpacing: '-0.04em' }}>
              {fmtGrade1(pflicht.avg)}
            </div>
          ) : (
            <div className="text-xl font-bold" style={{ color: 'var(--th-text-3)' }}>–</div>
          )}
          <div className="text-xs" style={{ color: 'var(--th-text-3)' }}>
            {pflicht.enteredCount}/10 eingetragen
          </div>
          {pflicht.issues.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] mt-0.5" style={{ color: 'var(--th-danger)' }}>
              <AlertCircle size={10} />
              {pflicht.issues[0]}
            </div>
          )}
        </div>

        <div className="w-px h-10 self-center" style={{ background: 'var(--th-border)' }} aria-hidden="true" />

        {/* Wahl block */}
        <div className="flex flex-col gap-0.5 min-w-[7rem]">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-3)' }}>
            Wahl/Abschluss ({wahlWeight}%)
          </div>
          {wahl.avg !== null ? (
            <div className="text-xl font-bold" style={{ color: gradeColor(wahl.avg), letterSpacing: '-0.04em' }}>
              {fmtGrade1(wahl.avg)}
            </div>
          ) : (
            <div className="text-xl font-bold" style={{ color: 'var(--th-text-3)' }}>–</div>
          )}
          <div className="text-xs" style={{ color: 'var(--th-text-3)' }}>
            {wahl.enteredCount}/8 eingetragen
          </div>
        </div>

        <div className="w-px h-10 self-center hidden md:block" style={{ background: 'var(--th-border)' }} aria-hidden="true" />

        {/* Gesamtnote — main result */}
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-3)' }}>
            Gesamtnote
          </div>
          {gesamt !== null ? (
            <>
              <div
                className="text-4xl font-black"
                style={{ color: gradeColor(gesamt), letterSpacing: '-0.06em' }}
              >
                {fmtGrade2(gesamt)}
              </div>
              <div className="text-xs font-medium" style={{ color: gradeColor(gesamt) }}>
                {gradeLabel(gesamt)} · gerundet: {fmtGrade1(roundToStep(gesamt))}
              </div>
            </>
          ) : (
            <div className="text-4xl font-black" style={{ color: 'var(--th-text-3)', letterSpacing: '-0.06em' }}>–</div>
          )}
        </div>

        {/* Passing status */}
        {pflicht.enteredCount === 10 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
            style={pflicht.passingMet
              ? { background: 'rgba(22,163,74,0.1)', color: '#16a34a' }
              : { background: 'rgba(220,38,38,0.1)', color: 'var(--th-danger)' }
            }
          >
            {pflicht.passingMet
              ? <><CheckCircle2 size={16} /> Pflichtbereich bestanden</>
              : <><AlertCircle size={16} /> Pflichtbereich nicht bestanden</>
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NotenrechnerPage() {
  const { data } = useApp()
  const [config, update] = useGradeConfig()
  const [pflichtOpen, setPflichtOpen] = useState(true)
  const [wahlOpen, setWahlOpen] = useState(true)

  // ── Build a lookup: moduleNumber → { linkedGrade, linkedName } ────────────
  const moduleByNumber = useMemo(() => {
    const map: Record<string, { grade: string | null; name: string }> = {}
    for (const m of data.modules) {
      if (!m.moduleNumber) continue
      // Find the best exam: passed = true and grade is set
      const passedExam = (m.exams ?? [])
        .filter(e => e.passed === true && !!e.grade)
        .at(-1)
      map[m.moduleNumber.trim()] = {
        grade: passedExam?.grade?.replace('.', ',') ?? null,
        name:  m.name,
      }
    }
    return map
  }, [data.modules])

  // ── Setters ───────────────────────────────────────────────────────────────

  const setPflicht = (num: string, patch: Partial<GradeEntry>) =>
    update(c => ({ ...c, pflicht: { ...c.pflicht, [num]: { ...c.pflicht[num], ...patch } } }))

  const setWahl = (i: number, patch: Partial<WahlSlot>) =>
    update(c => {
      const wahl = [...c.wahl] as GradeConfig['wahl']
      wahl[i] = { ...wahl[i], ...patch }
      return { ...c, wahl }
    })

  const setSeminar = (patch: Partial<GradeEntry>) =>
    update(c => ({ ...c, seminar: { ...c.seminar, ...patch } }))

  const setThesis = (patch: Partial<GradeEntry>) =>
    update(c => ({ ...c, thesis: { ...c.thesis, ...patch } }))

  const setPO = (po: PO) => update(c => ({ ...c, po }))

  // ── Conflict detection (module grade ≠ manual grade) ─────────────────────
  const conflictsExist = useMemo(() => {
    for (const m of PFLICHT_MODULES) {
      const linked = moduleByNumber[m.number]?.grade
      const manual = config.pflicht[m.number]?.grade
      if (linked && manual && linked !== manual) return true
    }
    for (const slot of config.wahl) {
      if (!slot.number.trim()) continue
      const linked = moduleByNumber[slot.number.trim()]?.grade
      if (linked && slot.grade && linked !== slot.grade) return true
    }
    return false
  }, [config, moduleByNumber])

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="md-icon-box-sm md-gradient-primary">
              <GraduationCap size={20} />
            </div>
            <h1 className="th-page-title" style={{ margin: 0 }}>Notenrechner</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--th-text-2)' }}>
            Gesamtnote für den B.Sc. Wirtschaftswissenschaft · FernUniversität Hagen
          </p>
        </div>

        {/* PO selector */}
        <div
          className="flex gap-1 p-1 rounded-xl shrink-0"
          style={{ background: 'var(--th-bg-secondary)' }}
          role="radiogroup"
          aria-label="Prüfungsordnung"
        >
          {(['2023', '2025'] as PO[]).map(po => (
            <button
              key={po}
              onClick={() => setPO(po)}
              role="radio"
              aria-checked={config.po === po}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg transition-all"
              style={config.po === po
                ? { background: 'var(--th-accent)', color: 'white' }
                : { color: 'var(--th-text-2)' }
              }
            >
              PO {po}
            </button>
          ))}
        </div>
      </header>

      {/* ── Info banner (PO weights) ─────────────────────────────── */}
      <div
        className="flex items-start gap-2 text-xs px-3 py-2 rounded-xl mb-5"
        style={{ background: 'var(--th-accent-soft)', color: 'var(--th-accent-soft-text)' }}
      >
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>
          <strong>PO {config.po}:</strong>{' '}
          Pflichtbereich {config.po === '2025' ? '25' : '20'}% ·
          Wahl- &amp; Abschlussbereich {config.po === '2025' ? '75' : '80'}%
          {config.po === '2025' ? ' · Bachelorarbeit zählt 2×' : ''}
          {' '}· Noten aus verknüpften Modulen werden automatisch übernommen.
        </span>
      </div>

      {/* ── Conflict warning ─────────────────────────────────────── */}
      {conflictsExist && (
        <div
          className="flex items-start gap-2 text-xs px-3 py-2 rounded-xl mb-5"
          style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309' }}
        >
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>
            Einige manuelle Noten weichen von den Prüfungsergebnissen in den Modulen ab.
            Die <strong>manuellen Einträge</strong> haben Vorrang.
            <button
              className="ml-1 underline underline-offset-2 hover:opacity-80"
              onClick={() => {
                // Clear all manual overrides that differ from linked grades
                update(c => {
                  const pflicht = { ...c.pflicht }
                  for (const m of PFLICHT_MODULES) {
                    const linked = moduleByNumber[m.number]?.grade
                    if (linked && pflicht[m.number]?.grade && pflicht[m.number].grade !== linked) {
                      pflicht[m.number] = { ...pflicht[m.number], grade: '' }
                    }
                  }
                  const wahl = c.wahl.map(slot => {
                    if (!slot.number.trim()) return slot
                    const linked = moduleByNumber[slot.number.trim()]?.grade
                    if (linked && slot.grade && linked !== slot.grade) return { ...slot, grade: '' }
                    return slot
                  }) as GradeConfig['wahl']
                  return { ...c, pflicht, wahl }
                })
              }}
            >
              Überschreibungen zurücksetzen
            </button>
          </span>
        </div>
      )}

      {/* ── Summary card ─────────────────────────────────────────── */}
      <SummaryPanel config={config} />

      {/* ── Main grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Pflichtbereich ──────────────────────────────────────── */}
        <section className="th-card overflow-hidden">
          <button
            onClick={() => setPflichtOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--th-bg-secondary)]"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: 'var(--th-text)' }}>
                Pflichtbereich
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'var(--th-accent-soft)', color: 'var(--th-accent-soft-text)' }}
              >
                {config.po === '2025' ? '25%' : '20%'} · 10 Module
              </span>
            </div>
            {pflichtOpen ? <ChevronUp size={16} style={{ color: 'var(--th-text-3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--th-text-3)' }} />}
          </button>

          {pflichtOpen && (
            <ul className="px-5 pb-4">
              {PFLICHT_MODULES.map(m => {
                const linked = moduleByNumber[m.number] ?? null
                return (
                  <PflichtRow
                    key={m.number}
                    moduleNum={m.number}
                    moduleName={m.name}
                    entry={config.pflicht[m.number] ?? { grade: '', anerkannt: false }}
                    linkedGrade={linked?.grade ?? null}
                    linkedName={linked ? linked.name : null}
                    onChange={patch => setPflicht(m.number, patch)}
                  />
                )
              })}
            </ul>
          )}

          {/* Passing requirements info */}
          {pflichtOpen && (
            <div
              className="flex items-start gap-2 text-xs px-5 py-3"
              style={{ background: 'var(--th-bg-secondary)', color: 'var(--th-text-3)' }}
            >
              <Info size={11} className="mt-0.5 shrink-0" />
              <span>
                Bestanden wenn: kein Modul 5,0 · max. 2 Module mit 4,0 · anerkannte Module zählen nicht in den Durchschnitt
              </span>
            </div>
          )}
        </section>

        {/* ── Wahl- & Abschlussbereich ────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <section className="th-card overflow-hidden">
            <button
              onClick={() => setWahlOpen(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-[var(--th-bg-secondary)]"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: 'var(--th-text)' }}>
                  Wahlpflichtbereich
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'var(--th-accent-soft)', color: 'var(--th-accent-soft-text)' }}
                >
                  6 Module
                </span>
              </div>
              {wahlOpen ? <ChevronUp size={16} style={{ color: 'var(--th-text-3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--th-text-3)' }} />}
            </button>

            {wahlOpen && (
              <ul className="px-5 pb-4">
                {config.wahl.map((slot, i) => {
                  const linked = slot.number.trim() ? (moduleByNumber[slot.number.trim()] ?? null) : null
                  return (
                    <WahlRow
                      key={i}
                      slot={slot}
                      index={i}
                      linkedGrade={linked?.grade ?? null}
                      linkedName={linked ? linked.name : null}
                      onChange={patch => setWahl(i, patch)}
                    />
                  )
                })}
              </ul>
            )}

            {wahlOpen && (
              <div
                className="flex items-start gap-2 text-xs px-5 py-3"
                style={{ background: 'var(--th-bg-secondary)', color: 'var(--th-text-3)' }}
              >
                <Info size={11} className="mt-0.5 shrink-0" />
                <span>
                  PO2023: min. 1× BWL, 1× VWL/Quanti, max. 1× Recht ·
                  PO2025: min. 1× BWL, 1× VWL/Quanti · Modulnummer eingeben für Auto-Verknüpfung
                </span>
              </div>
            )}
          </section>

          {/* Abschlussbereich */}
          <section className="th-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--th-border)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--th-text)' }}>Abschlussbereich</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'var(--th-accent-soft)', color: 'var(--th-accent-soft-text)' }}
              >
                Seminar + Thesis
              </span>
            </div>
            <ul className="px-5 py-2">
              <SimpleRow
                label="Seminar (Wahlseminar)"
                entry={config.seminar}
                onChange={setSeminar}
              />
              <SimpleRow
                label="Bachelorarbeit"
                sub={config.po === '2025' ? 'Zählt 2× in PO 2025' : undefined}
                entry={config.thesis}
                onChange={setThesis}
              />
            </ul>
          </section>

          {/* Module links hint */}
          {data.modules.length > 0 && (
            <div
              className="flex items-start gap-2 text-xs px-4 py-3 rounded-xl"
              style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a' }}
            >
              <Link2 size={12} className="mt-0.5 shrink-0" />
              <span>
                {Object.values(moduleByNumber).filter(m => m.grade).length} Modul
                {Object.values(moduleByNumber).filter(m => m.grade).length !== 1 ? 'e' : ''} mit
                Prüfungsnote verknüpft.{' '}
                <Link to="/module" className="underline underline-offset-2 hover:opacity-80">
                  Module öffnen →
                </Link>
              </span>
            </div>
          )}

          {data.modules.length === 0 && (
            <div
              className="flex items-start gap-2 text-xs px-4 py-3 rounded-xl"
              style={{ background: 'var(--th-bg-secondary)', color: 'var(--th-text-3)' }}
            >
              <Link2Off size={12} className="mt-0.5 shrink-0" />
              <span>
                Lege Module mit Prüfungsergebnissen an, um Noten automatisch zu übernehmen.{' '}
                <Link to="/module" className="underline underline-offset-2 hover:opacity-80">
                  Modul anlegen →
                </Link>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

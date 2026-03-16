import { useState, useRef, useEffect } from 'react'
import { useApp, useModuleStats } from '../context/AppContext'
import type { StudyModule, ModuleStatus, ModuleExam, ModuleAssignment } from '../types'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Plus, Pencil, Trash2, BookOpen, Clock, X, Check, Search,
  ArrowLeft, ExternalLink, BrainCircuit, FileText,
  CheckCircle2, XCircle, Minus, GraduationCap, ClipboardList,
  Upload, AlertCircle,
} from 'lucide-react'
import { FERNUNI_MODULES, getNextSemesters } from '../data/fernuniModules'
import { generateId } from '../utils/storage'
import { parseGrade, gradeColor } from '../utils/gradeCalculations'
import { getDueCards } from '../utils/spaceRepetition'
import { format as fmtDate } from 'date-fns'

const SEMESTER_OPTIONS = getNextSemesters(10)

const MODULE_COLORS = [
  '#0052A5', '#0077CC', '#059669', '#D97706', '#7C3AED',
  '#DC2626', '#0891B2', '#65A30D', '#CA8A04', '#4F46E5',
]

const STATUS_LABELS: Record<ModuleStatus, string> = {
  aktiv:         'Aktiv',
  abgeschlossen: 'Abgeschlossen',
  geplant:       'Geplant',
  pausiert:      'Pausiert',
}

const STATUS_STYLES: Record<ModuleStatus, { bg: string; color: string }> = {
  aktiv:         { bg: 'rgba(5,150,105,0.12)',  color: '#059669' },
  abgeschlossen: { bg: 'var(--th-bg-secondary)', color: 'var(--th-text-2)' },
  geplant:       { bg: 'rgba(79,70,229,0.12)',  color: '#6366F1' },
  pausiert:      { bg: 'rgba(245,158,11,0.12)', color: '#D97706' },
}

/* ─── PassedToggle (3-state) ─────────────────────────────────────────────── */

function PassedToggle({ value, onChange }: { value?: boolean; onChange: (v: boolean | undefined) => void }) {
  const cycle = () => {
    if (value === undefined) onChange(true)
    else if (value === true) onChange(false)
    else onChange(undefined)
  }

  const label = value === true ? 'Bestanden' : value === false ? 'Nicht bestanden' : 'Ergebnis'
  const style = value === true
    ? { background: 'rgba(5,150,105,0.12)', color: '#059669' }
    : value === false
    ? { background: 'rgba(220,38,38,0.12)', color: '#EF4444' }
    : { background: 'var(--th-bg-secondary)', color: 'var(--th-text-3)' }

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
      style={style}
      aria-label={`Prüfungsergebnis: ${label}`}
      aria-pressed={value !== undefined}
    >
      {value === true  ? <CheckCircle2 size={12} aria-hidden="true" /> : null}
      {value === false ? <XCircle      size={12} aria-hidden="true" /> : null}
      {value === undefined ? <Minus   size={12} aria-hidden="true" /> : null}
      {label}
    </button>
  )
}

/* ─── DoneToggle ─────────────────────────────────────────────────────────── */

function DoneToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
      style={
        value
          ? { background: 'rgba(79,70,229,0.12)', color: '#6366F1' }
          : { background: 'var(--th-bg-secondary)', color: 'var(--th-text-3)' }
      }
      aria-pressed={value}
      aria-label={value ? 'Als offen markieren' : 'Als erledigt markieren'}
    >
      {value ? <Check size={12} aria-hidden="true" /> : <Minus size={12} aria-hidden="true" />}
      {value ? 'Erledigt' : 'Offen'}
    </button>
  )
}

/* ─── Module Detail ──────────────────────────────────────────────────────── */

function ModuleDetail({
  module, onBack, onEdit, onDelete,
}: {
  module: StudyModule
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { data, updateModule } = useApp()
  const stats = useModuleStats(module.id)

  const initExams = (): [ModuleExam, ModuleExam] => {
    const saved = module.exams ?? (module.examDate ? [{ id: generateId(), date: module.examDate }] : [])
    return [saved[0] ?? { id: generateId() }, saved[1] ?? { id: generateId() }]
  }

  const [exams, setExams]           = useState<[ModuleExam, ModuleExam]>(initExams)
  const [assignments, setAssignments] = useState<ModuleAssignment[]>(
    module.assignments ?? [{ id: generateId(), title: 'Einsendearbeit 1', done: false }]
  )

  useEffect(() => {
    setExams(initExams())
    setAssignments(module.assignments ?? [{ id: generateId(), title: 'Einsendearbeit 1', done: false }])
  }, [module.id])

  const save = (e: [ModuleExam, ModuleExam], a: ModuleAssignment[]) =>
    updateModule({ ...module, exams: e, assignments: a })

  const updateExam = (idx: 0 | 1, changes: Partial<ModuleExam>) => {
    const updated: [ModuleExam, ModuleExam] = [{ ...exams[0] }, { ...exams[1] }]
    updated[idx] = { ...updated[idx], ...changes }
    setExams(updated)
    save(updated, assignments)
  }

  const updateAssignment = (id: string, changes: Partial<ModuleAssignment>) => {
    const updated = assignments.map(a => a.id === id ? { ...a, ...changes } : a)
    setAssignments(updated)
    save(exams, updated)
  }

  const addAssignment = () => {
    const newA: ModuleAssignment = { id: generateId(), title: `Einsendearbeit ${assignments.length + 1}`, done: false }
    const updated = [...assignments, newA]
    setAssignments(updated)
    save(exams, updated)
  }

  const removeAssignment = (id: string) => {
    const updated = assignments.filter(a => a.id !== id)
    setAssignments(updated)
    save(exams, updated)
  }

  const docs      = data.documents.filter(d => d.moduleId === module.id)
  const cards     = data.flashcards.filter(c => c.moduleId === module.id)
  const dueCount  = getDueCards(data.flashcards, module.id).length

  return (
    <div className="min-h-screen" style={{ background: 'var(--th-bg)' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3 flex-wrap"
        style={{
          background: 'var(--th-card)',
          borderBottom: '1px solid var(--th-border)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <button
          onClick={onBack}
          className="th-btn th-btn-ghost px-3 py-2 text-sm gap-1.5"
          style={{ minHeight: 'auto' }}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Zur Übersicht
        </button>
        <div aria-hidden="true" className="w-px h-5" style={{ background: 'var(--th-border)' }} />
        <code className="text-xs font-mono" style={{ color: 'var(--th-text-3)' }}>
          {module.moduleNumber}
        </code>
        <span
          className="text-sm font-semibold flex-1 truncate"
          style={{ color: 'var(--th-text)' }}
        >
          {module.name}
        </span>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
          style={STATUS_STYLES[module.status]}
        >
          {STATUS_LABELS[module.status]}
        </span>
        <button
          onClick={onEdit}
          className="th-btn th-btn-secondary text-sm gap-1.5 shrink-0"
          style={{ minHeight: 'auto', padding: '0.375rem 0.875rem' }}
        >
          <Pencil size={13} aria-hidden="true" />
          Bearbeiten
        </button>
        <button
          onClick={onDelete}
          className="th-icon-btn hover:bg-red-50"
          aria-label={`Modul "${module.name}" löschen`}
          style={{ color: 'var(--th-text-3)' }}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Color accent strip */}
      <div className="h-1" style={{ backgroundColor: module.color }} aria-hidden="true" />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Module header card */}
        <div className="th-card p-6 mb-6">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="flex-1 min-w-60">
              <h1
                className="text-2xl font-bold mb-2"
                style={{ color: 'var(--th-text)', letterSpacing: '-0.03em' }}
              >
                {module.name}
              </h1>
              <div className="flex items-center gap-4 text-sm flex-wrap mb-3" style={{ color: 'var(--th-text-2)' }}>
                <span>{module.semester}</span>
                <span
                  className="font-semibold px-2 py-0.5 rounded-full text-xs"
                  style={{ background: 'var(--th-accent-soft)', color: 'var(--th-accent-soft-text)' }}
                >
                  {module.credits} ECTS
                </span>
                {module.moodleUrl && (
                  <a
                    href={module.moodleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm font-medium hover:underline focus-visible:underline"
                    style={{ color: 'var(--th-accent)' }}
                  >
                    <ExternalLink size={13} aria-hidden="true" />
                    Moodle öffnen
                  </a>
                )}
              </div>
              {module.description && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--th-text-2)' }}>
                  {module.description}
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex gap-2 shrink-0" role="list" aria-label="Modulstatistiken">
              {[
                { label: 'Studienbriefe', value: docs.length,   icon: <FileText   size={20} aria-hidden="true" />, alert: false },
                { label: 'Karteikarten', value: cards.length,   icon: <BrainCircuit size={20} aria-hidden="true" />, alert: false },
                { label: 'Fällig',       value: dueCount,        icon: <Clock     size={20} aria-hidden="true" />, alert: dueCount > 0 },
              ].map(s => (
                <div
                  key={s.label}
                  className="text-center px-4 py-3 rounded-xl"
                  style={{ background: 'var(--th-bg-secondary)', minWidth: '5rem' }}
                  role="listitem"
                >
                  <div
                    className="flex justify-center mb-1.5"
                    style={{ color: s.alert ? 'var(--th-danger)' : 'var(--th-text-3)' }}
                  >
                    {s.icon}
                  </div>
                  <div
                    className="text-2xl font-bold leading-none mb-1"
                    style={{
                      color: s.alert ? 'var(--th-danger)' : 'var(--th-text)',
                      letterSpacing: '-0.04em',
                    }}
                  >
                    {s.value}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--th-text-3)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Exams + Assignments */}
          <div className="lg:col-span-2 space-y-6">

            {/* Prüfungstermine */}
            <section aria-labelledby="exams-heading" className="th-card p-6">
              <h2 id="exams-heading" className="flex items-center gap-2 th-section-title mb-5">
                <GraduationCap size={18} aria-hidden="true" style={{ color: 'var(--th-text-3)' }} />
                Prüfungstermine
              </h2>
              <div className="space-y-4">
                {([0, 1] as const).map(idx => {
                  const exam  = exams[idx]
                  const label = idx === 0 ? '1. Prüfungsversuch' : '2. Prüfungsversuch'
                  return (
                    <fieldset
                      key={idx}
                      className="rounded-xl p-4"
                      style={{
                        border: '1px solid var(--th-border)',
                        background: 'var(--th-card-secondary)',
                      }}
                    >
                      <legend className="text-sm font-semibold px-1" style={{ color: 'var(--th-text-2)' }}>
                        {label}
                      </legend>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] items-end gap-3 mt-3">
                        <div>
                          <label className="th-label" htmlFor={`exam-date-${idx}`}>Datum</label>
                          <input
                            id={`exam-date-${idx}`}
                            type="date"
                            className="th-input"
                            value={exam.date ?? ''}
                            onChange={e => updateExam(idx, { date: e.target.value || undefined })}
                          />
                        </div>
                        <div>
                          <label className="th-label" htmlFor={`exam-grade-${idx}`}>Note</label>
                          <input
                            id={`exam-grade-${idx}`}
                            type="text"
                            placeholder="z.B. 2,3"
                            className="th-input"
                            value={exam.grade ?? ''}
                            onChange={e => updateExam(idx, { grade: e.target.value || undefined })}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="th-label">Ergebnis</span>
                          <PassedToggle value={exam.passed} onChange={v => updateExam(idx, { passed: v })} />
                        </div>
                      </div>
                    </fieldset>
                  )
                })}
              </div>
            </section>

            {/* Einsendearbeiten */}
            <section aria-labelledby="assignments-heading" className="th-card p-6">
              <h2 id="assignments-heading" className="flex items-center gap-2 th-section-title mb-5">
                <ClipboardList size={18} aria-hidden="true" style={{ color: 'var(--th-text-3)' }} />
                Einsendearbeiten
              </h2>

              {assignments.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: 'var(--th-text-3)' }}>
                  Noch keine Einsendearbeiten
                </p>
              ) : (
                <>
                  {/* Progress summary */}
                  {(() => {
                    const total     = assignments.length
                    const done      = assignments.filter(a => a.done).length
                    const passed    = assignments.filter(a => a.passed === true).length
                    const donePct   = Math.round((done   / total) * 100)
                    const passedPct = Math.round((passed / total) * 100)
                    return (
                      <div
                        className="rounded-xl p-4 mb-5"
                        style={{ background: 'var(--th-bg-secondary)', border: '1px solid var(--th-border)' }}
                      >
                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="font-medium" style={{ color: 'var(--th-text)' }}>
                            Fortschritt
                          </span>
                          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--th-text-3)' }}>
                            <span>
                              <span className="font-semibold" style={{ color: 'var(--th-text)' }}>{done}</span>
                              /{total} erledigt
                            </span>
                            <span>
                              <span className="font-semibold" style={{ color: 'var(--th-success)' }}>{passed}</span>
                              /{total} bestanden
                            </span>
                          </div>
                        </div>
                        <div
                          className="h-2.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--th-border)' }}
                          role="progressbar"
                          aria-valuenow={donePct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${done} von ${total} Einsendearbeiten erledigt, ${passed} bestanden`}
                        >
                          {passedPct > 0 && (
                            <div
                              className="h-full float-left rounded-l-full"
                              style={{
                                width: `${passedPct}%`,
                                background: 'var(--th-success)',
                                transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)',
                              }}
                            />
                          )}
                          {donePct > passedPct && (
                            <div
                              className="h-full float-left"
                              style={{
                                width: `${donePct - passedPct}%`,
                                background: 'var(--th-accent)',
                                transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)',
                                borderRadius: passedPct === 0 ? '9999px 0 0 9999px' : '0',
                              }}
                            />
                          )}
                        </div>
                        {total > 0 && (
                          <div className="flex justify-between mt-2 text-xs" style={{ color: 'var(--th-text-3)' }}>
                            <span style={{ color: 'var(--th-accent)' }}>{donePct}% erledigt</span>
                            <span>{passedPct}% bestanden</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                <ul className="space-y-3" role="list">
                  {assignments.map(ea => {
                    const parsedGrade = ea.grade ? parseGrade(ea.grade) : null
                    const gColor      = parsedGrade !== null ? gradeColor(parsedGrade) : null
                    const bgStyle = ea.passed === true
                      ? { border: '1px solid rgba(5,150,105,0.3)',  background: 'rgba(5,150,105,0.06)' }
                      : ea.done
                      ? { border: '1px solid var(--th-accent-30,rgba(99,102,241,0.3))', background: 'var(--th-accent-soft)' }
                      : { border: '1px solid var(--th-border)',       background: 'var(--th-card-secondary)' }
                    return (
                    <li
                      key={ea.id}
                      className="rounded-xl p-4"
                      style={bgStyle}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <input
                          type="text"
                          className="th-input text-sm font-semibold flex-1"
                          value={ea.title}
                          onChange={e => updateAssignment(ea.id, { title: e.target.value })}
                          aria-label="Titel der Einsendearbeit"
                        />
                        {/* Grade badge — shown when a valid grade is present */}
                        {gColor && (
                          <span
                            className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums"
                            style={{
                              background: `${gColor}18`,
                              color: gColor,
                              border: `1px solid ${gColor}44`,
                            }}
                            aria-label={`Note ${ea.grade}`}
                          >
                            {ea.grade}
                          </span>
                        )}
                        <DoneToggle   value={ea.done}   onChange={v => updateAssignment(ea.id, { done: v })} />
                        <PassedToggle value={ea.passed} onChange={v => updateAssignment(ea.id, { passed: v })} />
                        <button
                          type="button"
                          onClick={() => removeAssignment(ea.id)}
                          className="th-icon-btn hover:bg-red-50"
                          aria-label={`Einsendearbeit "${ea.title}" entfernen`}
                          style={{ color: 'var(--th-text-3)', alignSelf: 'flex-start' }}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="th-label" htmlFor={`ea-date-${ea.id}`}>Abgabedatum</label>
                          <input
                            id={`ea-date-${ea.id}`}
                            type="date"
                            className="th-input text-sm"
                            value={ea.date ?? ''}
                            onChange={e => updateAssignment(ea.id, { date: e.target.value || undefined })}
                          />
                        </div>
                        <div>
                          <label className="th-label" htmlFor={`ea-grade-${ea.id}`}>Note</label>
                          <input
                            id={`ea-grade-${ea.id}`}
                            type="text"
                            placeholder="z.B. 2,3"
                            className="th-input text-sm"
                            value={ea.grade ?? ''}
                            onChange={e => updateAssignment(ea.id, { grade: e.target.value || undefined })}
                          />
                        </div>
                      </div>
                    </li>
                    )
                  })}
                </ul>
                </>
              )}

              <button
                type="button"
                onClick={addAssignment}
                className="mt-4 th-btn th-btn-ghost text-sm gap-2"
                style={{ color: 'var(--th-accent)', paddingLeft: '0.5rem' }}
              >
                <Plus size={15} aria-hidden="true" />
                Einsendearbeit hinzufügen
              </button>
            </section>
          </div>

          {/* Right: Docs + Stats */}
          <div className="space-y-6">
            {/* Studienbriefe */}
            <section aria-labelledby="docs-heading" className="th-card p-5">
              <h2 id="docs-heading" className="flex items-center gap-2 th-section-title mb-4" style={{ fontSize: '0.9rem' }}>
                <FileText size={15} aria-hidden="true" style={{ color: 'var(--th-text-3)' }} />
                Studienbriefe
              </h2>
              {docs.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--th-text-3)' }}>
                  Keine Studienbriefe
                </p>
              ) : (
                <ul className="space-y-3" role="list">
                  {docs.map(doc => {
                    const progress = doc.totalPages > 0
                      ? Math.round((doc.currentPage / doc.totalPages) * 100)
                      : 0
                    return (
                      <li key={doc.id}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="truncate flex-1 mr-2 font-medium" style={{ color: 'var(--th-text-2)' }}>
                            {doc.name}
                          </span>
                          <span className="shrink-0 font-semibold" style={{ color: 'var(--th-text-3)' }}>
                            {progress}%
                          </span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--th-border)' }}
                          role="progressbar"
                          aria-valuenow={progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Lesefortschritt ${doc.name}: ${progress}%`}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${progress}%`,
                              background: 'var(--th-accent)',
                              transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)',
                            }}
                          />
                        </div>
                        {doc.lastReadAt && (
                          <div className="text-xs mt-1" style={{ color: 'var(--th-text-3)' }}>
                            Zuletzt: {format(parseISO(doc.lastReadAt), 'dd.MM.yyyy', { locale: de })}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Lernstatistik */}
            <section aria-labelledby="stats-heading" className="th-card p-5">
              <h2 id="stats-heading" className="flex items-center gap-2 th-section-title mb-4" style={{ fontSize: '0.9rem' }}>
                <BrainCircuit size={15} aria-hidden="true" style={{ color: 'var(--th-text-3)' }} />
                Lernstatistik
              </h2>
              <dl className="space-y-2.5">
                {[
                  { label: 'Karteikarten gesamt', value: stats.totalCards, className: '' },
                  { label: 'Heute fällig',         value: stats.dueCards,  className: stats.dueCards > 0 ? '' : '' },
                  { label: 'Gut bekannt (≥14d)',   value: cards.filter(c => c.interval >= 14).length, className: 'text-green-600' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <dt className="text-sm" style={{ color: 'var(--th-text-2)' }}>{row.label}</dt>
                    <dd
                      className="text-sm font-semibold"
                      style={{
                        color: row.label === 'Heute fällig'
                          ? stats.dueCards > 0 ? 'var(--th-danger)' : 'var(--th-success)'
                          : row.label === 'Gut bekannt (≥14d)'
                          ? 'var(--th-success)'
                          : 'var(--th-text)',
                      }}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
                <div
                  className="border-t pt-2.5 mt-2.5 flex items-center justify-between"
                  style={{ borderColor: 'var(--th-border)' }}
                >
                  <dt className="text-sm" style={{ color: 'var(--th-text-2)' }}>Lernzeit diese Woche</dt>
                  <dd className="text-sm font-semibold" style={{ color: 'var(--th-text)' }}>
                    {stats.weekMinutes} min
                  </dd>
                </div>
              </dl>
            </section>

            {/* Prüfungsübersicht */}
            {(exams[0].date || exams[0].grade || exams[1].date || exams[1].grade) && (
              <section aria-labelledby="exam-overview-heading" className="th-card p-5">
                <h2 id="exam-overview-heading" className="flex items-center gap-2 th-section-title mb-4" style={{ fontSize: '0.9rem' }}>
                  <GraduationCap size={15} aria-hidden="true" style={{ color: 'var(--th-text-3)' }} />
                  Prüfungsübersicht
                </h2>
                <dl className="space-y-2">
                  {exams.map((exam, idx) => {
                    if (!exam.date && !exam.grade && exam.passed === undefined) return null
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <dt style={{ color: 'var(--th-text-2)' }}>{idx + 1}. Versuch</dt>
                        <dd className="flex items-center gap-2">
                          {exam.date && (
                            <span style={{ color: 'var(--th-text-2)' }}>
                              {format(parseISO(exam.date), 'dd.MM.yy')}
                            </span>
                          )}
                          {exam.grade && (
                            <span className="font-semibold" style={{ color: 'var(--th-text)' }}>
                              {exam.grade}
                            </span>
                          )}
                          {exam.passed === true  && <Check  size={13} aria-label="Bestanden"      style={{ color: 'var(--th-success)' }} />}
                          {exam.passed === false && <X      size={13} aria-label="Nicht bestanden" style={{ color: 'var(--th-danger)' }} />}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Module Card ────────────────────────────────────────────────────────── */

function ModuleCard({
  module, onClick, onEdit, onDelete,
}: {
  module: StudyModule
  onClick: () => void
  onEdit: (m: StudyModule) => void
  onDelete: (id: string) => void
}) {
  const stats    = useModuleStats(module.id)
  const today    = fmtDate(new Date(), 'yyyy-MM-dd')
  const exams    = module.exams ?? []
  const passed   = exams.find(e => e.passed === true)
  const nextExam = exams.find(e => e.date && e.date >= today)

  return (
    <article
      className="th-card overflow-hidden group"
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      tabIndex={0}
      role="button"
      aria-label={`Modul ${module.name} öffnen`}
    >
      {/* Color top strip */}
      <div className="h-1.5" style={{ backgroundColor: module.color }} aria-hidden="true" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <code className="text-xs font-mono block mb-1" style={{ color: 'var(--th-text-3)' }}>
              {module.moduleNumber}
            </code>
            <h3
              className="font-semibold leading-tight"
              style={{ color: 'var(--th-text)', letterSpacing: '-0.01em' }}
            >
              {module.name}
            </h3>
            <div className="text-xs mt-1" style={{ color: 'var(--th-text-2)' }}>
              {module.semester}
            </div>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
            style={STATUS_STYLES[module.status]}
          >
            {STATUS_LABELS[module.status]}
          </span>
        </div>

        {module.description && (
          <p
            className="text-xs mb-3 line-clamp-2 leading-relaxed"
            style={{ color: 'var(--th-text-2)' }}
          >
            {module.description}
          </p>
        )}

        {/* Stats row */}
        <div
          className="grid grid-cols-3 gap-2 mb-4 py-3 rounded-xl text-center"
          style={{ background: 'var(--th-bg-secondary)' }}
          role="list"
          aria-label="Modulstatistiken"
        >
          {[
            { value: module.credits,          sub: 'ECTS',   alert: false },
            { value: stats.docs.length,        sub: 'Briefe', alert: false },
            { value: stats.dueCards,            sub: 'Fällig', alert: stats.dueCards > 0 },
          ].map(item => (
            <div key={item.sub} role="listitem">
              <div
                className="text-lg font-bold leading-none"
                style={{
                  color: item.alert ? 'var(--th-danger)' : 'var(--th-text)',
                  letterSpacing: '-0.04em',
                }}
              >
                {item.value}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--th-text-2)' }}>
                {item.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Assignment progress */}
        {(module.assignments?.length ?? 0) > 0 && (() => {
          const total    = module.assignments!.length
          const done     = module.assignments!.filter(a => a.done).length
          const passed   = module.assignments!.filter(a => a.passed === true).length
          const donePct   = Math.round((done   / total) * 100)
          const passedPct = Math.round((passed / total) * 100)
          return (
            <div className="mb-3">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="flex items-center gap-1" style={{ color: 'var(--th-text-3)' }}>
                  <ClipboardList size={11} aria-hidden="true" />
                  Einsendearbeiten
                </span>
                <span style={{ color: 'var(--th-text-3)' }}>
                  {done}/{total} erledigt
                  {passed > 0 && <span style={{ color: 'var(--th-success)' }}> · {passed} bestanden</span>}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--th-border)' }}
                role="progressbar"
                aria-valuenow={donePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Einsendearbeiten: ${done} von ${total} erledigt, ${passed} bestanden`}
              >
                {/* passed portion (green) */}
                {passedPct > 0 && (
                  <div
                    className="h-full float-left rounded-l-full"
                    style={{
                      width: `${passedPct}%`,
                      background: 'var(--th-success)',
                      transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)',
                    }}
                  />
                )}
                {/* done-but-not-yet-passed portion (accent) */}
                {donePct > passedPct && (
                  <div
                    className="h-full float-left"
                    style={{
                      width: `${donePct - passedPct}%`,
                      background: 'var(--th-accent)',
                      transition: 'width 600ms cubic-bezier(0.4,0,0.2,1)',
                      borderRadius: passedPct === 0 ? '9999px 0 0 9999px' : '0',
                    }}
                  />
                )}
              </div>
            </div>
          )
        })()}

        {/* Exam badges */}
        {nextExam?.date && (
          <div
            className="flex items-center gap-2 text-xs rounded-xl px-3 py-2 mb-3"
            style={{
              background: 'rgba(245,158,11,0.10)',
              border:     '1px solid rgba(245,158,11,0.22)',
              color:      '#D97706',
            }}
          >
            <GraduationCap size={12} aria-hidden="true" />
            <span>Prüfung: {format(parseISO(nextExam.date), 'dd.MM.yyyy', { locale: de })}</span>
          </div>
        )}
        {passed && (
          <div
            className="flex items-center gap-2 text-xs rounded-xl px-3 py-2 mb-3"
            style={{
              background: 'rgba(5,150,105,0.10)',
              border:     '1px solid rgba(5,150,105,0.22)',
              color:      '#059669',
            }}
          >
            <CheckCircle2 size={12} aria-hidden="true" />
            <span>Bestanden{passed.grade ? ` (${passed.grade})` : ''}</span>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs mb-1" style={{ color: 'var(--th-text-3)' }}>
          {stats.weekMinutes} min diese Woche
        </div>
      </div>

      {/* Touch-friendly action bar */}
      <div
        className="th-card-actions"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onEdit(module)}
          className="th-card-action-btn th-card-action-edit"
          aria-label={`Modul "${module.name}" bearbeiten`}
        >
          <Pencil size={15} aria-hidden="true" />
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={() => onDelete(module.id)}
          className="th-card-action-btn th-card-action-delete"
          aria-label={`Modul "${module.name}" löschen`}
        >
          <Trash2 size={15} aria-hidden="true" />
          Löschen
        </button>
      </div>
    </article>
  )
}

/* ─── Module Form (modal) ────────────────────────────────────────────────── */

type FormData = Omit<StudyModule, 'id' | 'createdAt'>

const defaultForm: FormData = {
  name: '', moduleNumber: '', credits: 5,
  semester: SEMESTER_OPTIONS[0], status: 'aktiv',
  color: MODULE_COLORS[0], examDate: '',
  description: '', moodleUrl: '',
  exams: [], assignments: [],
}

function ModuleForm({
  initial, onSave, onCancel,
}: {
  initial?: StudyModule
  onSave: (data: FormData) => void
  onCancel: () => void
}) {
  const [form, setForm]           = useState<FormData>(initial ? { ...initial } : { ...defaultForm })
  const [search, setSearch]       = useState('')
  const [showDropdown, setDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const set = (key: keyof FormData, value: string | number | boolean) =>
    setForm(f => ({ ...f, [key]: value }))

  const filteredModules = search.trim().length > 0
    ? FERNUNI_MODULES.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) || m.number.includes(search)
      ).slice(0, 8)
    : []

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectModule(m: typeof FERNUNI_MODULES[0]) {
    setForm(f => ({ ...f, name: m.name, moduleNumber: m.number, credits: m.ects }))
    setSearch('')
    setDropdown(false)
  }

  return (
    <div
      className="th-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="th-modal w-full max-w-lg">
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--th-border)' }}
        >
          <h2 id="modal-title" className="text-base font-bold" style={{ color: 'var(--th-text)', letterSpacing: '-0.02em' }}>
            {initial ? 'Modul bearbeiten' : 'Neues Modul anlegen'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="th-icon-btn"
            aria-label="Formular schließen"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* FernUni catalog search */}
          {!initial && (
            <div ref={searchRef} className="relative">
              <label className="th-label" htmlFor="module-search">
                Aus FernUni-Katalog wählen
              </label>
              <div className="relative">
                <Search
                  size={15}
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--th-text-3)' }}
                />
                <input
                  id="module-search"
                  className="th-input"
                  style={{ paddingLeft: '2.25rem' }}
                  placeholder="Modulname oder -nummer suchen…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setDropdown(true) }}
                  onFocus={() => search.trim() && setDropdown(true)}
                  role="combobox"
                  aria-expanded={showDropdown && filteredModules.length > 0}
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                />
              </div>
              {showDropdown && filteredModules.length > 0 && (
                <ul
                  className="absolute z-50 mt-1 w-full rounded-xl shadow-xl overflow-hidden"
                  style={{
                    background: 'var(--th-card)',
                    border: '1px solid var(--th-border)',
                    maxHeight: '14rem',
                    overflowY: 'auto',
                  }}
                  role="listbox"
                  aria-label="Modulvorschläge"
                >
                  {filteredModules.map(m => (
                    <li key={m.number} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm transition-colors"
                        style={{ color: 'var(--th-text)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--th-card-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                        onClick={() => selectModule(m)}
                      >
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono shrink-0 w-12" style={{ color: 'var(--th-text-3)' }}>
                            {m.number}
                          </code>
                          <span className="flex-1 truncate font-medium">{m.name}</span>
                          <span className="text-xs shrink-0" style={{ color: 'var(--th-text-3)' }}>
                            {m.ects} ECTS
                          </span>
                        </div>
                        <div className="text-xs mt-0.5 ml-14" style={{ color: 'var(--th-text-3)' }}>
                          {m.faculty}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showDropdown && search.trim() && filteredModules.length === 0 && (
                <div
                  className="absolute z-50 mt-1 w-full rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: 'var(--th-card)',
                    border: '1px solid var(--th-border)',
                    color: 'var(--th-text-3)',
                  }}
                >
                  Kein Modul gefunden — bitte manuell eingeben
                </div>
              )}
            </div>
          )}

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="mod-name" className="th-label">
                Modulname <span aria-label="Pflichtfeld">*</span>
              </label>
              <input
                id="mod-name"
                className="th-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="z.B. Einführung in die Betriebswirtschaftslehre"
                required
                aria-required="true"
              />
            </div>
            <div>
              <label htmlFor="mod-number" className="th-label">Modulnummer</label>
              <input
                id="mod-number"
                className="th-input font-mono"
                value={form.moduleNumber}
                onChange={e => set('moduleNumber', e.target.value)}
                placeholder="31101"
              />
            </div>
            <div>
              <label htmlFor="mod-ects" className="th-label">ECTS</label>
              <input
                id="mod-ects"
                type="number"
                min={1}
                max={30}
                className="th-input"
                value={form.credits}
                onChange={e => set('credits', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label htmlFor="mod-semester" className="th-label">Semester</label>
              <select
                id="mod-semester"
                className="th-select"
                value={form.semester}
                onChange={e => set('semester', e.target.value)}
              >
                {SEMESTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                {!SEMESTER_OPTIONS.includes(form.semester) && form.semester && (
                  <option value={form.semester}>{form.semester}</option>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="mod-status" className="th-label">Status</label>
              <select
                id="mod-status"
                className="th-select"
                value={form.status}
                onChange={e => set('status', e.target.value as ModuleStatus)}
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label htmlFor="mod-moodle" className="th-label">Moodle-Link</label>
              <input
                id="mod-moodle"
                type="url"
                className="th-input"
                value={form.moodleUrl ?? ''}
                onChange={e => set('moodleUrl', e.target.value)}
                placeholder="https://moodle.fernuni-hagen.de/course/view.php?id=…"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="mod-desc" className="th-label">Beschreibung</label>
              <textarea
                id="mod-desc"
                className="th-input"
                rows={3}
                value={form.description || ''}
                onChange={e => set('description', e.target.value)}
                placeholder="Kurze Beschreibung, Lernziele, Inhalte…"
              />
            </div>
            <div className="col-span-2">
              <span className="th-label" id="color-label">Farbe</span>
              <div
                className="flex gap-2 flex-wrap mt-2"
                role="radiogroup"
                aria-labelledby="color-label"
              >
                {MODULE_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('color', c)}
                    className="w-9 h-9 rounded-full transition-transform hover:scale-110 focus-visible:scale-110"
                    style={{
                      backgroundColor: c,
                      outline:      form.color === c ? `3px solid var(--th-border-focus)` : '3px solid transparent',
                      outlineOffset: '2px',
                    }}
                    role="radio"
                    aria-checked={form.color === c}
                    aria-label={`Farbe ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div
          className="flex justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid var(--th-border)' }}
        >
          <button type="button" onClick={onCancel} className="th-btn th-btn-secondary">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => { if (form.name) onSave(form) }}
            disabled={!form.name}
            className="th-btn th-btn-primary gap-2"
          >
            <Check size={15} aria-hidden="true" />
            {initial ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Bulk Import Modal ──────────────────────────────────────────────────── */

interface BulkImportCandidate {
  number: string
  name: string
  ects: number
  faculty: string
  selected: boolean
  alreadyExists: boolean
}

function BulkImportModal({
  existingNumbers,
  onImport,
  onCancel,
}: {
  existingNumbers: Set<string>
  onImport: (modules: { name: string; moduleNumber: string; credits: number; semester: string; status: ModuleStatus; color: string }[]) => void
  onCancel: () => void
}) {
  const [text, setText]           = useState('')
  const [candidates, setCandidates] = useState<BulkImportCandidate[]>([])
  const [parsed, setParsed]       = useState(false)
  const [semester, setSemester]   = useState(SEMESTER_OPTIONS[0])
  const [status, setStatus]       = useState<ModuleStatus>('aktiv')

  function parseText() {
    // Extract all 5-digit numbers that look like FernUni module numbers (3xxxx or 4xxxx)
    const matches = [...new Set(text.match(/\b[34]\d{4}\b/g) ?? [])]
    const found: BulkImportCandidate[] = []

    for (const num of matches) {
      const catalog = FERNUNI_MODULES.find(m => m.number === num)
      if (catalog) {
        found.push({
          number:        catalog.number,
          name:          catalog.name,
          ects:          catalog.ects,
          faculty:       catalog.faculty,
          selected:      !existingNumbers.has(catalog.number),
          alreadyExists: existingNumbers.has(catalog.number),
        })
      } else {
        // Unknown number — still show it so user can skip or confirm
        found.push({
          number:        num,
          name:          `Unbekanntes Modul ${num}`,
          ects:          10,
          faculty:       'Unbekannte Fakultät',
          selected:      false,
          alreadyExists: false,
        })
      }
    }

    setCandidates(found)
    setParsed(true)
  }

  function toggleAll(val: boolean) {
    setCandidates(cs => cs.map(c => c.alreadyExists ? c : { ...c, selected: val }))
  }

  function toggleOne(num: string) {
    setCandidates(cs => cs.map(c => c.number === num ? { ...c, selected: !c.selected } : c))
  }

  const selectedCount = candidates.filter(c => c.selected).length
  const colorList     = MODULE_COLORS

  function handleImport() {
    const mods = candidates
      .filter(c => c.selected)
      .map((c, i) => ({
        name:         c.name,
        moduleNumber: c.number,
        credits:      c.ects,
        semester,
        status,
        color:        colorList[i % colorList.length],
      }))
    onImport(mods)
  }

  return (
    <div
      className="th-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-modal-title"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="th-modal w-full max-w-xl">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--th-border)' }}
        >
          <h2 id="bulk-modal-title" className="text-base font-bold" style={{ color: 'var(--th-text)', letterSpacing: '-0.02em' }}>
            Module aus Text importieren
          </h2>
          <button type="button" onClick={onCancel} className="th-icon-btn" aria-label="Schließen">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>

          {!parsed ? (
            <>
              <p className="text-sm" style={{ color: 'var(--th-text-2)' }}>
                Füge beliebigen Text ein — z.B. aus Moodle, einer E-Mail oder deinem Studienplan.
                Modulnummern (5-stellig) werden automatisch erkannt und mit dem FernUni-Katalog abgeglichen.
              </p>
              <div>
                <label className="th-label" htmlFor="bulk-text">Dein Text</label>
                <textarea
                  id="bulk-text"
                  className="th-input font-mono"
                  rows={10}
                  placeholder={'Beispiel:\n31101 Wirtschaftsmathematik und Statistik\n31621 Grundlagen des Marketing\n...'}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button
                type="button"
                onClick={parseText}
                disabled={!text.trim()}
                className="th-btn th-btn-primary gap-2 w-full"
              >
                <Search size={15} aria-hidden="true" />
                Modulnummern erkennen
              </button>
            </>
          ) : (
            <>
              {/* Back link */}
              <button
                type="button"
                onClick={() => { setParsed(false); setCandidates([]) }}
                className="flex items-center gap-1.5 text-sm"
                style={{ color: 'var(--th-text-3)' }}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Anderen Text eingeben
              </button>

              {candidates.length === 0 ? (
                <div
                  className="flex flex-col items-center gap-3 py-10 text-center"
                  style={{ color: 'var(--th-text-3)' }}
                >
                  <AlertCircle size={36} aria-hidden="true" style={{ opacity: 0.5 }} />
                  <p className="text-sm">Keine FernUni-Modulnummern gefunden.</p>
                  <p className="text-xs">Achte darauf, dass der Text 5-stellige Nummern enthält (z.B. 31101).</p>
                </div>
              ) : (
                <>
                  {/* Select all / deselect all */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: 'var(--th-text)' }}>
                      {candidates.length} Modul{candidates.length !== 1 ? 'e' : ''} gefunden
                    </span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => toggleAll(true)}
                        className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--th-accent)' }}>
                        Alle wählen
                      </button>
                      <button type="button" onClick={() => toggleAll(false)}
                        className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--th-text-3)' }}>
                        Alle abwählen
                      </button>
                    </div>
                  </div>

                  {/* Candidate list */}
                  <ul className="space-y-2" role="list">
                    {candidates.map(c => (
                      <li key={c.number}>
                        <label
                          className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                          style={{
                            background: c.selected
                              ? 'rgba(0,82,165,0.08)'
                              : 'var(--th-bg-secondary)',
                            border: `1px solid ${c.selected ? 'rgba(0,82,165,0.2)' : 'var(--th-border)'}`,
                            opacity: c.alreadyExists ? 0.6 : 1,
                            cursor: c.alreadyExists ? 'default' : 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={c.selected}
                            onChange={() => !c.alreadyExists && toggleOne(c.number)}
                            disabled={c.alreadyExists}
                            className="mt-0.5 shrink-0"
                            aria-label={c.name}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="text-xs font-mono shrink-0" style={{ color: 'var(--th-text-3)' }}>
                                {c.number}
                              </code>
                              <span className="text-sm font-medium truncate" style={{ color: 'var(--th-text)' }}>
                                {c.name}
                              </span>
                              {c.alreadyExists && (
                                <span className="text-xs px-1.5 py-0.5 rounded-md shrink-0"
                                  style={{ background: 'var(--th-bg-secondary)', color: 'var(--th-text-3)' }}>
                                  bereits vorhanden
                                </span>
                              )}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--th-text-3)' }}>
                              {c.faculty} · {c.ects} ECTS
                            </div>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>

                  {/* Default semester + status for import */}
                  <div className="grid grid-cols-2 gap-4 pt-2" style={{ borderTop: '1px solid var(--th-border)' }}>
                    <div>
                      <label className="th-label" htmlFor="bulk-semester">Semester</label>
                      <select
                        id="bulk-semester"
                        className="th-input"
                        value={semester}
                        onChange={e => setSemester(e.target.value)}
                      >
                        {SEMESTER_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="th-label" htmlFor="bulk-status">Status</label>
                      <select
                        id="bulk-status"
                        className="th-input"
                        value={status}
                        onChange={e => setStatus(e.target.value as ModuleStatus)}
                      >
                        {(Object.entries(STATUS_LABELS) as [ModuleStatus, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {parsed && candidates.length > 0 && (
          <div
            className="flex items-center justify-between gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--th-border)' }}
          >
            <span className="text-sm" style={{ color: 'var(--th-text-2)' }}>
              {selectedCount} Modul{selectedCount !== 1 ? 'e' : ''} ausgewählt
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={onCancel} className="th-btn th-btn-secondary">
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="th-btn th-btn-primary gap-2"
              >
                <Upload size={15} aria-hidden="true" />
                {selectedCount} Modul{selectedCount !== 1 ? 'e' : ''} importieren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function ModulePage() {
  const { data, createModule, updateModule, removeModule } = useApp()
  const [showForm,       setShowForm]       = useState(false)
  const [editTarget,     setEditTarget]     = useState<StudyModule | undefined>()
  const [filterStatus,   setFilterStatus]   = useState<ModuleStatus | 'alle'>('alle')
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)

  const existingModuleNumbers = new Set(data.modules.map(m => m.moduleNumber).filter(Boolean))

  const filtered     = data.modules.filter(m => filterStatus === 'alle' || m.status === filterStatus)
  const activeModule = activeModuleId ? data.modules.find(m => m.id === activeModuleId) : null

  const handleSave = (form: FormData) => {
    if (editTarget) {
      updateModule({ ...editTarget, ...form })
    } else {
      createModule({ ...form, exams: [], assignments: [] })
    }
    setShowForm(false)
    setEditTarget(undefined)
  }

  const handleBulkImport = (mods: { name: string; moduleNumber: string; credits: number; semester: string; status: ModuleStatus; color: string }[]) => {
    mods.forEach(m => createModule({ ...m, exams: [], assignments: [], description: '', moodleUrl: '' }))
    setShowBulkImport(false)
  }

  const handleEdit   = (m: StudyModule) => { setEditTarget(m); setShowForm(true) }
  const handleDelete = (id: string) => {
    if (confirm('Modul und alle zugehörigen Daten unwiderruflich löschen?')) {
      removeModule(id)
      if (activeModuleId === id) setActiveModuleId(null)
    }
  }

  if (activeModule) {
    return (
      <ModuleDetail
        module={activeModule}
        onBack={() => setActiveModuleId(null)}
        onEdit={() => handleEdit(activeModule)}
        onDelete={() => handleDelete(activeModule.id)}
      />
    )
  }

  return (
    <div className="p-5 md:p-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="th-page-title">Meine Module</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--th-text-2)' }}>
            {data.modules.length} Module gesamt
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowBulkImport(true)}
            className="th-btn th-btn-secondary gap-2"
            title="Module aus Text importieren"
          >
            <Upload size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Importieren</span>
          </button>
          <button
            type="button"
            onClick={() => { setEditTarget(undefined); setShowForm(true) }}
            className="th-btn th-btn-primary gap-2"
          >
            <Plus size={16} aria-hidden="true" />
            Neues Modul
          </button>
        </div>
      </div>

      {/* Status filter */}
      <div
        className="flex gap-2 mb-6 flex-wrap"
        role="group"
        aria-label="Nach Status filtern"
      >
        {(['alle', ...Object.keys(STATUS_LABELS)] as const).map(status => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status as ModuleStatus | 'alle')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              filterStatus === status ? 'th-btn th-btn-primary' : 'th-btn th-btn-secondary'
            }`}
            style={{ minHeight: 'auto' }}
            aria-pressed={filterStatus === status}
          >
            {status === 'alle' ? 'Alle' : STATUS_LABELS[status as ModuleStatus]}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center py-24"
          style={{ color: 'var(--th-text-3)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--th-bg-secondary)' }}
          >
            <BookOpen size={32} aria-hidden="true" style={{ opacity: 0.4 }} />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--th-text-2)' }}>
            Keine Module gefunden
          </p>
          <p className="text-sm mt-1">
            Klicke auf „Neues Modul" um zu beginnen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(m => (
            <ModuleCard
              key={m.id}
              module={m}
              onClick={() => setActiveModuleId(m.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showForm && (
        <ModuleForm
          initial={editTarget}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTarget(undefined) }}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          existingNumbers={existingModuleNumbers}
          onImport={handleBulkImport}
          onCancel={() => setShowBulkImport(false)}
        />
      )}
    </div>
  )
}

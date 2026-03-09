import { useState, useRef, useEffect } from 'react'
import { useApp, useModuleStats } from '../context/AppContext'
import type { StudyModule, ModuleStatus, ModuleExam, ModuleAssignment } from '../types'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Plus, Pencil, Trash2, BookOpen, Clock, X, Check, Search,
  ArrowLeft, ExternalLink, BrainCircuit, FileText,
  CheckCircle2, XCircle, Minus, GraduationCap, ClipboardList,
} from 'lucide-react'
import { FERNUNI_MODULES, getNextSemesters } from '../data/fernuniModules'
import { generateId } from '../utils/storage'
import { getDueCards } from '../utils/spaceRepetition'
import { format as fmtDate } from 'date-fns'

const SEMESTER_OPTIONS = getNextSemesters(10)

const MODULE_COLORS = [
  '#003366', '#0066cc', '#339966', '#cc6600', '#9933cc',
  '#cc3333', '#006699', '#669900', '#996600', '#336699',
]

const STATUS_LABELS: Record<ModuleStatus, string> = {
  aktiv: 'Aktiv',
  abgeschlossen: 'Abgeschlossen',
  geplant: 'Geplant',
  pausiert: 'Pausiert',
}

const STATUS_COLORS: Record<ModuleStatus, { bg: string; color: string }> = {
  aktiv:         { bg: 'rgba(22,163,74,0.15)',   color: '#22c55e'  },
  abgeschlossen: { bg: 'var(--th-card-secondary)', color: 'var(--th-text-2)' },
  geplant:       { bg: 'rgba(59,130,246,0.15)',   color: '#60a5fa'  },
  pausiert:      { bg: 'rgba(234,179,8,0.15)',    color: '#d97706'  },
}

// ─── Passed Toggle (3-state: undefined / true / false) ───────────────────────

function PassedToggle({ value, onChange }: { value?: boolean; onChange: (v: boolean | undefined) => void }) {
  const cycle = () => {
    if (value === undefined) onChange(true)
    else if (value === true) onChange(false)
    else onChange(undefined)
  }
  if (value === true) return (
    <button onClick={cycle} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
      style={{ background: 'rgba(22,163,74,0.15)', color: '#22c55e' }}>
      <CheckCircle2 size={12} /> Bestanden
    </button>
  )
  if (value === false) return (
    <button onClick={cycle} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
      style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171' }}>
      <XCircle size={12} /> Nicht bestanden
    </button>
  )
  return (
    <button onClick={cycle} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs th-text-3 transition-colors whitespace-nowrap"
      style={{ background: 'var(--th-card-secondary)' }}>
      <Minus size={12} /> Ergebnis
    </button>
  )
}

// ─── Done Toggle ─────────────────────────────────────────────────────────────

function DoneToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
      style={value
        ? { background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }
        : { background: 'var(--th-card-secondary)', color: 'var(--th-text-3)' }
      }
    >
      {value ? <Check size={12} /> : <Minus size={12} />}
      {value ? 'Erledigt' : 'Offen'}
    </button>
  )
}

// ─── Module Detail View ───────────────────────────────────────────────────────

function ModuleDetail({
  module,
  onBack,
  onEdit,
  onDelete,
}: {
  module: StudyModule
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { data, updateModule } = useApp()
  const stats = useModuleStats(module.id)

  // Initialize exams: always keep 2 slots
  const initExams = (): [ModuleExam, ModuleExam] => {
    const saved = module.exams ?? (
      module.examDate ? [{ id: generateId(), date: module.examDate }] : []
    )
    return [
      saved[0] ?? { id: generateId() },
      saved[1] ?? { id: generateId() },
    ]
  }

  const [exams, setExams] = useState<[ModuleExam, ModuleExam]>(initExams)
  const [assignments, setAssignments] = useState<ModuleAssignment[]>(
    module.assignments ?? [{ id: generateId(), title: 'Einsendearbeit 1', done: false }]
  )

  // Resync when switching modules
  useEffect(() => {
    setExams(initExams())
    setAssignments(module.assignments ?? [{ id: generateId(), title: 'Einsendearbeit 1', done: false }])
  }, [module.id])

  const save = (newExams: [ModuleExam, ModuleExam], newAssignments: ModuleAssignment[]) => {
    updateModule({ ...module, exams: newExams, assignments: newAssignments })
  }

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
    const newA: ModuleAssignment = {
      id: generateId(),
      title: `Einsendearbeit ${assignments.length + 1}`,
      done: false,
    }
    const updated = [...assignments, newA]
    setAssignments(updated)
    save(exams, updated)
  }

  const removeAssignment = (id: string) => {
    const updated = assignments.filter(a => a.id !== id)
    setAssignments(updated)
    save(exams, updated)
  }

  const docs = data.documents.filter(d => d.moduleId === module.id)
  const cards = data.flashcards.filter(c => c.moduleId === module.id)
  const dueCount = getDueCards(data.flashcards, module.id).length

  return (
    <div className="min-h-screen bg-[var(--th-bg)]">
      {/* Top bar */}
      <div className="bg-white border-b border-[var(--th-border)] px-6 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm th-text-2 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Zur Übersicht
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <span className="font-mono text-xs th-text-3">{module.moduleNumber}</span>
        <span className="text-sm font-medium th-text flex-1 truncate">{module.name}</span>
        <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: STATUS_COLORS[module.status].bg, color: STATUS_COLORS[module.status].color }}>
          {STATUS_LABELS[module.status]}
        </span>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm th-text-2 border border-[var(--th-border)] rounded-lg hover:bg-[var(--th-bg)] transition-colors"
        >
          <Pencil size={14} /> Bearbeiten
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 th-text-3 hover:text-red-600 transition-colors"
          title="Modul löschen"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Color accent */}
      <div className="h-1" style={{ backgroundColor: module.color }} />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Module info header */}
        <div className="th-card p-6 mb-6">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="flex-1 min-w-60">
              <h1 className="text-2xl font-bold th-text mb-1">{module.name}</h1>
              <div className="flex items-center gap-4 text-sm th-text-2 mb-3 flex-wrap">
                <span>{module.semester}</span>
                <span className="font-medium th-text-2">{module.credits} ECTS</span>
                {module.moodleUrl && (
                  <a
                    href={module.moodleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <ExternalLink size={13} /> Moodle öffnen
                  </a>
                )}
              </div>
              {module.description && (
                <p className="text-sm th-text-2 leading-relaxed">{module.description}</p>
              )}
            </div>
            {/* Quick stats */}
            <div className="flex gap-4 shrink-0">
              {[
                { label: 'Studienbriefe', value: docs.length, icon: <FileText size={18} /> },
                { label: 'Karteikarten', value: cards.length, icon: <BrainCircuit size={18} /> },
                { label: 'Fällig', value: dueCount, icon: <Clock size={18} />, alert: dueCount > 0 },
              ].map(s => (
                <div key={s.label} className="text-center px-4">
                  <div className={`flex justify-center mb-1 ${s.alert ? 'text-red-500' : 'th-text-3'}`}>
                    {s.icon}
                  </div>
                  <div className={`text-2xl font-bold ${s.alert ? 'text-red-600' : 'th-text'}`}>{s.value}</div>
                  <div className="text-xs th-text-3">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Exams + Assignments */}
          <div className="lg:col-span-2 space-y-6">

            {/* ── Prüfungstermine ─────────────────────────────────── */}
            <div className="th-card p-6">
              <h2 className="flex items-center gap-2 font-semibold th-text mb-4">
                <GraduationCap size={18} className="th-text-2" /> Prüfungstermine
              </h2>
              <div className="space-y-3">
                {([0, 1] as const).map(idx => {
                  const exam = exams[idx]
                  const label = idx === 0 ? '1. Prüfungsversuch' : '2. Prüfungsversuch'
                  return (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[180px_1fr_1fr_auto] items-center gap-3 py-3 border-b border-[var(--th-border)] last:border-0">
                      <span className="text-sm font-medium th-text-2">{label}</span>
                      <div>
                        <label className="block text-xs th-text-3 mb-0.5">Datum</label>
                        <input
                          type="date"
                          className="w-full border border-[var(--th-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={exam.date ?? ''}
                          onChange={e => updateExam(idx, { date: e.target.value || undefined })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs th-text-3 mb-0.5">Note</label>
                        <input
                          type="text"
                          placeholder="z.B. 2,3"
                          className="w-full border border-[var(--th-border)] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={exam.grade ?? ''}
                          onChange={e => updateExam(idx, { grade: e.target.value || undefined })}
                        />
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <label className="text-xs th-text-3">Ergebnis</label>
                        <PassedToggle
                          value={exam.passed}
                          onChange={v => updateExam(idx, { passed: v })}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Einsendearbeiten ─────────────────────────────────── */}
            <div className="th-card p-6">
              <h2 className="flex items-center gap-2 font-semibold th-text mb-4">
                <ClipboardList size={18} className="th-text-2" /> Einsendearbeiten
              </h2>

              {assignments.length === 0 ? (
                <p className="text-sm th-text-3 text-center py-4">Noch keine Einsendearbeiten</p>
              ) : (
                <div className="space-y-3">
                  {assignments.map(ea => (
                    <div key={ea.id} className="border border-[var(--th-border)] rounded-xl p-3">
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-start gap-2 mb-2">
                        <input
                          type="text"
                          className="border border-[var(--th-border)] rounded-lg px-2 py-1 text-sm font-medium th-text-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={ea.title}
                          onChange={e => updateAssignment(ea.id, { title: e.target.value })}
                        />
                        <DoneToggle value={ea.done} onChange={v => updateAssignment(ea.id, { done: v })} />
                        <PassedToggle value={ea.passed} onChange={v => updateAssignment(ea.id, { passed: v })} />
                        <button
                          onClick={() => removeAssignment(ea.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs th-text-3 mb-0.5">Abgabedatum</label>
                          <input
                            type="date"
                            className="w-full border border-[var(--th-border)] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={ea.date ?? ''}
                            onChange={e => updateAssignment(ea.id, { date: e.target.value || undefined })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs th-text-3 mb-0.5">Note</label>
                          <input
                            type="text"
                            placeholder="z.B. 2,3"
                            className="w-full border border-[var(--th-border)] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={ea.grade ?? ''}
                            onChange={e => updateAssignment(ea.id, { grade: e.target.value || undefined })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={addAssignment}
                className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <Plus size={16} /> Einsendearbeit hinzufügen
              </button>
            </div>
          </div>

          {/* Right column: Docs + Stats */}
          <div className="space-y-6">
            {/* ── Studienbriefe ─────────────────────────────────────── */}
            <div className="th-card p-5">
              <h2 className="flex items-center gap-2 font-semibold th-text mb-3 text-sm">
                <FileText size={16} className="th-text-2" /> Studienbriefe
              </h2>
              {docs.length === 0 ? (
                <p className="text-xs th-text-3 text-center py-3">Keine Studienbriefe</p>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => {
                    const progress = doc.totalPages > 0 ? Math.round((doc.currentPage / doc.totalPages) * 100) : 0
                    return (
                      <div key={doc.id} className="text-xs">
                        <div className="flex justify-between th-text-2 mb-0.5">
                          <span className="truncate flex-1 mr-2">{doc.name}</span>
                          <span className="th-text-3 shrink-0">{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-[var(--th-bg-secondary,#f1f5f9)] rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        {doc.lastReadAt && (
                          <div className="th-text-3 mt-0.5">
                            Zuletzt: {format(parseISO(doc.lastReadAt), 'dd.MM.yyyy', { locale: de })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Lernstatistik ─────────────────────────────────────── */}
            <div className="th-card p-5">
              <h2 className="flex items-center gap-2 font-semibold th-text mb-3 text-sm">
                <BrainCircuit size={16} className="th-text-2" /> Lernstatistik
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="th-text-2">Karteikarten gesamt</span>
                  <span className="font-medium">{stats.totalCards}</span>
                </div>
                <div className="flex justify-between">
                  <span className="th-text-2">Heute fällig</span>
                  <span className={`font-medium ${stats.dueCards > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.dueCards}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="th-text-2">Gut bekannt (≥14d)</span>
                  <span className="font-medium text-green-600">
                    {cards.filter(c => c.interval >= 14).length}
                  </span>
                </div>
                <div className="h-px bg-[var(--th-bg-secondary,#f1f5f9)] my-1" />
                <div className="flex justify-between">
                  <span className="th-text-2">Lernzeit diese Woche</span>
                  <span className="font-medium">{stats.weekMinutes} min</span>
                </div>
              </div>
            </div>

            {/* ── Prüfungsübersicht ──────────────────────────────────── */}
            {(exams[0].date || exams[0].grade || exams[1].date || exams[1].grade) && (
              <div className="th-card p-5">
                <h2 className="flex items-center gap-2 font-semibold th-text mb-3 text-sm">
                  <GraduationCap size={16} className="th-text-2" /> Prüfungsübersicht
                </h2>
                <div className="space-y-2">
                  {exams.map((exam, idx) => {
                    if (!exam.date && !exam.grade && exam.passed === undefined) return null
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="th-text-2">{idx + 1}. Versuch</span>
                        <div className="flex items-center gap-2">
                          {exam.date && (
                            <span className="th-text-2">{format(parseISO(exam.date), 'dd.MM.yy')}</span>
                          )}
                          {exam.grade && <span className="font-medium">{exam.grade}</span>}
                          {exam.passed === true && <Check size={14} style={{ color: '#22c55e' }} />}
                          {exam.passed === false && <X size={14} style={{ color: '#ef4444' }} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({
  module,
  onClick,
  onEdit,
  onDelete,
}: {
  module: StudyModule
  onClick: () => void
  onEdit: (m: StudyModule) => void
  onDelete: (id: string) => void
}) {
  const stats = useModuleStats(module.id)
  const today = fmtDate(new Date(), 'yyyy-MM-dd')

  // Best passed exam
  const exams = module.exams ?? []
  const passedExam = exams.find(e => e.passed === true)
  const nextExam = exams.find(e => e.date && e.date >= today)

  return (
    <div
      className="th-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="h-2" style={{ backgroundColor: module.color }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs th-text-2 font-mono mb-1">{module.moduleNumber}</div>
            <h3 className="font-semibold th-text leading-tight">{module.name}</h3>
            <div className="text-xs th-text-2 mt-1">{module.semester}</div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[module.status]}`}>
            {STATUS_LABELS[module.status]}
          </span>
        </div>

        {module.description && (
          <p className="text-xs th-text-2 mb-3 line-clamp-2">{module.description}</p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold th-text">{module.credits}</div>
            <div className="text-xs th-text-2">ECTS</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold th-text">{stats.docs.length}</div>
            <div className="text-xs th-text-2">Briefe</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: stats.dueCards > 0 ? '#cc3333' : '#339966' }}>
              {stats.dueCards}
            </div>
            <div className="text-xs th-text-2">Fällig</div>
          </div>
        </div>

        {/* Exam / Assignment info */}
        {nextExam?.date && (
          <div className="flex items-center gap-2 text-xs rounded-lg p-2 mb-3"
            style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)', color: '#d97706' }}>
            <GraduationCap size={12} />
            <span>Prüfung: {format(parseISO(nextExam.date), 'dd.MM.yyyy', { locale: de })}</span>
          </div>
        )}
        {passedExam && (
          <div className="flex items-center gap-2 text-xs rounded-lg p-2 mb-3"
            style={{ background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.25)', color: '#22c55e' }}>
            <CheckCircle2 size={12} />
            <span>Bestanden{passedExam.grade ? ` (${passedExam.grade})` : ''}</span>
          </div>
        )}
        {module.examDate && exams.length === 0 && (
          <div className="flex items-center gap-2 text-xs th-text-2 bg-[var(--th-bg)] rounded-lg p-2 mb-3">
            <Clock size={12} />
            <span>Prüfung: {format(parseISO(module.examDate), 'dd.MM.yyyy', { locale: de })}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs th-text-2">
          <span>{stats.weekMinutes} min diese Woche</span>
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onEdit(module)}
              className="p-1.5 rounded hover:bg-[var(--th-bg-secondary,#f1f5f9)] th-text-3 hover:th-text-2 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(module.id)}
              className="p-1.5 rounded hover:bg-red-50 th-text-3 hover:text-red-600 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Module Form ──────────────────────────────────────────────────────────────

type FormData = Omit<StudyModule, 'id' | 'createdAt'>

const defaultForm: FormData = {
  name: '',
  moduleNumber: '',
  credits: 5,
  semester: SEMESTER_OPTIONS[0],
  status: 'aktiv',
  color: MODULE_COLORS[0],
  examDate: '',
  description: '',
  moodleUrl: '',
  exams: [],
  assignments: [],
}

function ModuleForm({ initial, onSave, onCancel }: { initial?: StudyModule; onSave: (data: FormData) => void; onCancel: () => void }) {
  const [form, setForm] = useState<FormData>(initial ? { ...initial } : { ...defaultForm })
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const set = (key: keyof FormData, value: string | number | boolean) =>
    setForm(f => ({ ...f, [key]: value }))

  const filteredModules = search.trim().length > 0
    ? FERNUNI_MODULES.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.number.includes(search)
      ).slice(0, 8)
    : []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectModule(m: typeof FERNUNI_MODULES[0]) {
    setForm(f => ({ ...f, name: m.name, moduleNumber: m.number, credits: m.ects }))
    setSearch('')
    setShowDropdown(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="th-card shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{initial ? 'Modul bearbeiten' : 'Neues Modul'}</h2>
          <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--th-bg-secondary,#f1f5f9)]"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Module autocomplete */}
          {!initial && (
            <div ref={searchRef} className="relative">
              <label className="block text-sm font-medium th-text-2 mb-1">Modul aus FernUni-Katalog wählen</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 th-text-3 pointer-events-none" />
                <input
                  className="w-full border border-[var(--th-border)] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Modulname oder -nummer suchen…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => search.trim().length > 0 && setShowDropdown(true)}
                />
              </div>
              {showDropdown && filteredModules.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-[var(--th-border)] rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filteredModules.map(m => (
                    <li key={m.number}>
                      <button type="button" className="w-full text-left px-3 py-2 hover:bg-[var(--th-bg)]" onClick={() => selectModule(m)}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs th-text-3 shrink-0 w-12">{m.number}</span>
                          <span className="text-sm th-text flex-1 truncate">{m.name}</span>
                          <span className="text-xs th-text-3 shrink-0">{m.ects} ECTS</span>
                        </div>
                        <div className="text-xs th-text-3 ml-14">{m.faculty}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showDropdown && search.trim().length > 0 && filteredModules.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-[var(--th-border)] rounded-lg shadow-lg px-3 py-2 text-sm th-text-3">
                  Kein Modul gefunden – bitte manuell eingeben
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium th-text-2 mb-1">Modulname *</label>
              <input
                className="th-input"
                value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="z.B. Einführung in die Betriebswirtschaftslehre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Modulnummer</label>
              <input
                className="th-input font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.moduleNumber} onChange={e => set('moduleNumber', e.target.value)}
                placeholder="31101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">ECTS</label>
              <input
                type="number" min={1} max={30}
                className="th-input"
                value={form.credits} onChange={e => set('credits', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Semester</label>
              <select
                className="th-input"
                value={form.semester} onChange={e => set('semester', e.target.value)}
              >
                {SEMESTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                {!SEMESTER_OPTIONS.includes(form.semester) && form.semester && (
                  <option value={form.semester}>{form.semester}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Status</label>
              <select
                className="th-input"
                value={form.status} onChange={e => set('status', e.target.value as ModuleStatus)}
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium th-text-2 mb-1">Moodle-Link</label>
              <input
                type="url"
                className="th-input"
                value={form.moodleUrl ?? ''}
                onChange={e => set('moodleUrl', e.target.value)}
                placeholder="https://moodle.fernuni-hagen.de/course/view.php?id=…"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium th-text-2 mb-1">Beschreibung</label>
              <textarea
                className="th-input"
                rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)}
                placeholder="Kurze Beschreibung des Moduls, Lernziele, Inhalte…"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium th-text-2 mb-2">Farbe</label>
              <div className="flex gap-2 flex-wrap">
                {MODULE_COLORS.map(c => (
                  <button
                    key={c} onClick={() => set('color', c)}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: form.color === c ? '#1e293b' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-sm th-text-2 hover:bg-[var(--th-bg-secondary,#f1f5f9)] rounded-lg">Abbrechen</button>
          <button
            onClick={() => { if (form.name) onSave(form) }}
            disabled={!form.name}
            className="flex items-center gap-2 px-4 py-2 text-sm th-btn th-btn-primary disabled:opacity-50"
          >
            <Check size={16} />
            {initial ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ModulePage() {
  const { data, createModule, updateModule, removeModule } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<StudyModule | undefined>()
  const [filterStatus, setFilterStatus] = useState<ModuleStatus | 'alle'>('alle')
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)

  const filtered = data.modules.filter(m => filterStatus === 'alle' || m.status === filterStatus)
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

  const handleEdit = (m: StudyModule) => { setEditTarget(m); setShowForm(true) }
  const handleDelete = (id: string) => {
    if (confirm('Modul und alle zugehörigen Daten löschen?')) {
      removeModule(id)
      if (activeModuleId === id) setActiveModuleId(null)
    }
  }

  // Show detail view
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
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold th-text">Meine Module</h1>
          <p className="text-sm th-text-2 mt-1">{data.modules.length} Module gesamt</p>
        </div>
        <button
          onClick={() => { setEditTarget(undefined); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 th-btn th-btn-primary transition-colors text-sm font-medium"
        >
          <Plus size={16} /> Neues Modul
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['alle', ...Object.keys(STATUS_LABELS)] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as ModuleStatus | 'alle')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'th-btn th-btn-primary'
                : 'bg-[var(--th-bg-secondary,#f1f5f9)] th-text-2 hover:bg-slate-200'
            }`}
          >
            {status === 'alle' ? 'Alle' : STATUS_LABELS[status as ModuleStatus]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 th-text-3">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Keine Module gefunden</p>
          <p className="text-sm mt-1">Klicke auf "Neues Modul" um zu beginnen.</p>
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
    </div>
  )
}

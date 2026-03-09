import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import type { CalendarEvent, EventType, StudySession } from '../types'
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek,
  isToday
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Check, Clock, Upload, ExternalLink, Timer, Pause, Play, RotateCcw, BrainCircuit as BrainIcon, Coffee, Moon } from 'lucide-react'

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  pruefung: 'Prüfung',
  abgabe: 'Abgabe',
  lernblock: 'Lernblock',
  praesenzveranstaltung: 'Präsenzveranstaltung',
  erinnerung: 'Erinnerung',
  mentoriat: 'Mentoriat',
}

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  pruefung: 'bg-red-500',
  abgabe: 'bg-orange-500',
  lernblock: 'bg-blue-500',
  praesenzveranstaltung: 'bg-purple-500',
  erinnerung: 'bg-slate-400',
  mentoriat: 'bg-teal-500',
}

const EVENT_TYPE_STYLE: Record<EventType, { bg: string; border: string; color: string }> = {
  pruefung:              { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.30)',   color: '#f87171' },
  abgabe:                { bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.30)',  color: '#fb923c' },
  lernblock:             { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.30)',  color: '#60a5fa' },
  praesenzveranstaltung: { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.30)', color: '#c084fc' },
  erinnerung:            { bg: 'var(--th-card-secondary)', border: 'var(--th-border)',    color: 'var(--th-text-2)' },
  mentoriat:             { bg: 'rgba(20,184,166,0.12)',  border: 'rgba(20,184,166,0.30)', color: '#2dd4bf' },
}

// ─── Event Form ──────────────────────────────────────────────────────────────

function EventForm({ initial, defaultDate, onSave, onCancel }: {
  initial?: CalendarEvent
  defaultDate?: string
  onSave: (e: Omit<CalendarEvent, 'id'>) => void
  onCancel: () => void
}) {
  const { data } = useApp()
  const [form, setForm] = useState<Omit<CalendarEvent, 'id'>>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    date: initial?.date ?? defaultDate ?? format(new Date(), 'yyyy-MM-dd'),
    time: initial?.time ?? '',
    endTime: initial?.endTime ?? '',
    type: initial?.type ?? 'lernblock',
    moduleId: initial?.moduleId ?? '',
    completed: initial?.completed ?? false,
  })

  const set = (key: keyof typeof form, value: string | boolean) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="th-card shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{initial ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
          <button onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Titel *</label>
            <input
              className="th-input"
              value={form.title} onChange={e => set('title', e.target.value)} placeholder="Terminbezeichnung..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Typ</label>
              <select
                className="th-input"
                value={form.type} onChange={e => set('type', e.target.value as EventType)}
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Modul</label>
              <select
                className="th-input"
                value={form.moduleId ?? ''} onChange={e => set('moduleId', e.target.value)}
              >
                <option value="">Kein Modul</option>
                {data.modules.map(m => <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Datum *</label>
              <input type="date" className="th-input"
                value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Von</label>
              <input type="time" className="th-input"
                value={form.time ?? ''} onChange={e => set('time', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Bis</label>
              <input type="time" className="th-input"
                value={form.endTime ?? ''} onChange={e => set('endTime', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Beschreibung</label>
            <textarea className="th-input"
              rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-sm th-text-2 hover:bg-[var(--th-bg-secondary,#f1f5f9)] rounded-lg">Abbrechen</button>
          <button onClick={() => { if (form.title && form.date) onSave(form) }} disabled={!form.title || !form.date}
            className="flex items-center gap-2 px-4 py-2 text-sm th-btn th-btn-primary disabled:opacity-50">
            <Check size={16} /> {initial ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Study Session Logger ────────────────────────────────────────────────────

function SessionLogger({ onLog, onCancel }: { onLog: (s: Omit<StudySession, 'id'>) => void; onCancel: () => void }) {
  const { data } = useApp()
  const [form, setForm] = useState({
    moduleId: data.modules[0]?.id ?? '',
    durationMinutes: 60,
    topic: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  })
  const set = (key: keyof typeof form, value: string | number) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="th-card shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Lernsession erfassen</h2>
          <button onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Modul *</label>
            <select className="th-input"
              value={form.moduleId} onChange={e => set('moduleId', e.target.value)}>
              {data.modules.map(m => <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Datum</label>
              <input type="date" className="th-input"
                value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Dauer (min)</label>
              <input type="number" min={5} max={480}
                className="th-input"
                value={form.durationMinutes} onChange={e => set('durationMinutes', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Thema *</label>
            <input className="th-input"
              value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="Was wurde gelernt?" />
          </div>
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Notizen</label>
            <textarea rows={2} className="th-input"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-sm th-text-2 hover:bg-[var(--th-bg-secondary,#f1f5f9)] rounded-lg">Abbrechen</button>
          <button onClick={() => { if (form.moduleId && form.topic) onLog(form) }} disabled={!form.moduleId || !form.topic}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            <Check size={16} /> Erfassen
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pomodoro Timer ──────────────────────────────────────────────────────────

type PomodoroMode = 'focus' | 'short' | 'long'

const POMODORO_DURATIONS: Record<PomodoroMode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long:  15 * 60,
}

const MODE_LABELS: Record<PomodoroMode, string> = {
  focus: 'Fokus',
  short: 'Kurze Pause',
  long:  'Lange Pause',
}

function PomodoroTimer({ onComplete }: { onComplete: (minutes: number) => void }) {
  const [mode, setMode]         = useState<PomodoroMode>('focus')
  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATIONS.focus)
  const [running, setRunning]   = useState(false)
  const [rounds, setRounds]     = useState(0)
  const [open, setOpen]         = useState(false)
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedMinutesRef       = useRef(0)

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = null
    setRunning(false)
  }, [])

  const switchMode = useCallback((m: PomodoroMode) => {
    stop()
    setMode(m)
    setTimeLeft(POMODORO_DURATIONS[m])
  }, [stop])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stop()
          const elapsed = Math.round((POMODORO_DURATIONS[mode] - 1) / 60)
          if (mode === 'focus') {
            setRounds(r => r + 1)
            if (elapsed > 0) onComplete(elapsed)
            // auto-switch to break
            const nextMode: PomodoroMode = (rounds + 1) % 4 === 0 ? 'long' : 'short'
            setTimeout(() => switchMode(nextMode), 100)
          } else {
            setTimeout(() => switchMode('focus'), 100)
          }
          // Browser notification
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(mode === 'focus' ? 'Fokus-Session abgeschlossen!' : 'Weiter lernen!', {
              body: mode === 'focus' ? 'Zeit für eine Pause.' : 'Bereit für die nächste Session?',
            })
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, mode, rounds, stop, switchMode, onComplete])

  const start = () => {
    startedMinutesRef.current = timeLeft
    setRunning(true)
  }

  const reset = () => {
    stop()
    setTimeLeft(POMODORO_DURATIONS[mode])
  }

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const total = POMODORO_DURATIONS[mode]
  const progress = ((total - timeLeft) / total) * 100

  const modeColor = mode === 'focus' ? 'var(--th-accent)' : '#01b574'
  const circumference = 2 * Math.PI * 45

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 th-card flex items-center gap-2 px-4 py-3 shadow-lg hover:shadow-xl transition-shadow text-sm font-medium th-text"
        style={{ borderRadius: 'var(--th-radius-lg)' }}
        title="Pomodoro-Timer öffnen"
      >
        <Timer size={18} style={{ color: 'var(--th-accent)' }} />
        <span>{running ? `${mins}:${String(secs).padStart(2, '0')} ${MODE_LABELS[mode]}` : 'Pomodoro'}</span>
        {running && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--th-accent)' }} />}
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 th-card shadow-2xl p-4 md:p-5 w-[min(288px,calc(100vw-2rem))]"
      style={{ borderRadius: 'var(--th-radius-lg)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-semibold th-text text-sm">
          <Timer size={16} style={{ color: modeColor }} />
          Pomodoro-Timer
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs th-text-3">{rounds} Runden</span>
          <button onClick={() => setOpen(false)} className="ml-2 p-1 rounded th-text-3 hover:th-text-2">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: 'var(--th-card-secondary)' }}>
        {([
          { m: 'focus' as PomodoroMode, Icon: BrainIcon },
          { m: 'short' as PomodoroMode, Icon: Coffee },
          { m: 'long'  as PomodoroMode, Icon: Moon },
        ]).map(({ m, Icon }) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={mode === m
              ? { background: modeColor, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }
              : { color: 'var(--th-text-2)' }
            }
          >
            <Icon size={11} /> {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Circular progress + time */}
      <div className="flex flex-col items-center mb-5">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--th-border)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke={modeColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums th-text">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="text-xs th-text-3">{MODE_LABELS[mode]}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="th-btn th-btn-secondary p-2.5 rounded-lg flex-shrink-0"
          title="Zurücksetzen"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={running ? stop : start}
          className="th-btn th-btn-primary flex-1 py-2.5 text-sm font-semibold"
        >
          {running ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {timeLeft === POMODORO_DURATIONS[mode] ? 'Start' : 'Weiter'}</>}
        </button>
      </div>
    </div>
  )
}

// ─── Module-derived virtual events ───────────────────────────────────────────

function getModuleDerivedEvents(modules: import('../types').StudyModule[]): CalendarEvent[] {
  const events: CalendarEvent[] = []
  for (const m of modules) {
    // Legacy single examDate
    if (m.examDate) {
      events.push({
        id: `__module__exam__${m.id}__legacy`,
        moduleId: m.id,
        title: `Prüfung – ${m.moduleNumber} ${m.name}`,
        date: m.examDate,
        type: 'pruefung',
      })
    }
    // exams[]
    for (const ex of m.exams ?? []) {
      if (!ex.date) continue
      events.push({
        id: `__module__exam__${m.id}__${ex.id}`,
        moduleId: m.id,
        title: `Prüfung – ${m.moduleNumber} ${m.name}`,
        date: ex.date,
        type: 'pruefung',
      })
    }
    // assignments[]
    for (const a of m.assignments ?? []) {
      if (!a.date) continue
      events.push({
        id: `__module__assign__${m.id}__${a.id}`,
        moduleId: m.id,
        title: `${a.title} – ${m.moduleNumber} ${m.name}`,
        date: a.date,
        type: 'abgabe',
      })
    }
  }
  return events
}

// ─── Mentoriat Bulk Import ────────────────────────────────────────────────────

interface ParsedMentoriat {
  date: string   // yyyy-MM-dd
  time: string   // HH:MM
  endTime: string
  thema: string  // raw topic from table
  selected: boolean
}

function parseMentoriatTable(raw: string): ParsedMentoriat[] {
  const results: ParsedMentoriat[] = []
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const re = /^\w+\s+(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2})\s+(\d{2}:\d{2})\s+(.+)$/
  for (const line of lines) {
    const m = line.match(re)
    if (!m) continue
    const [, day, month, year, start, end, thema] = m
    results.push({
      date: `${year}-${month}-${day}`,
      time: start,
      endTime: end,
      thema: thema.trim(),
      selected: true,
    })
  }
  return results
}

function MentoriatImport({ onImport, onCancel }: {
  onImport: (events: Omit<import('../types').CalendarEvent, 'id'>[]) => void
  onCancel: () => void
}) {
  const { data } = useApp()
  const [raw, setRaw] = useState('')
  const [moduleId, setModuleId] = useState(data.modules[0]?.id ?? '')
  const [optionalName, setOptionalName] = useState('')
  const [mentor, setMentor] = useState('')
  const [link, setLink] = useState('')
  const [rows, setRows] = useState<ParsedMentoriat[]>([])

  const parse = () => setRows(parseMentoriatTable(raw))
  const toggle = (i: number) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r))

  const handleImport = () => {
    const selectedModule = data.modules.find(m => m.id === moduleId)
    const prefix = optionalName.trim() || (selectedModule ? `${selectedModule.moduleNumber} ${selectedModule.name}` : 'Mentoriat')
    const events = rows
      .filter(r => r.selected)
      .map(r => {
        const titleParts = [prefix, mentor.trim() || null, r.thema].filter(Boolean)
        return {
          title: titleParts.join(' – '),
          date: r.date,
          time: r.time,
          endTime: r.endTime,
          type: 'mentoriat' as const,
          moduleId: moduleId || undefined,
          description: link.trim() || undefined,
          completed: false,
        }
      })
    onImport(events)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="th-card shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <h2 className="text-lg font-semibold">Mentoriate importieren</h2>
          <button onClick={onCancel}><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">
              Tabelle einfügen <span className="th-text-3 font-normal">(aus der Übersicht kopieren)</span>
            </label>
            <textarea
              className="th-input font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={6}
              placeholder={"So 12.10.2025 08:30 14:00 Einheit 1\nSo 19.10.2025 08:30 14:00 Einheit 1\n..."}
              value={raw}
              onChange={e => { setRaw(e.target.value); setRows([]) }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">
                Optionaler Name <span className="th-text-3 font-normal">(z. B. „Nur für VWL")</span>
              </label>
              <input
                className="th-input focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Leer = Modulname wird verwendet..."
                value={optionalName} onChange={e => setOptionalName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Mentor</label>
              <input
                className="th-input focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Name des Mentors..."
                value={mentor} onChange={e => setMentor(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Veranstaltungslink</label>
              <input
                type="url"
                className="th-input focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="https://..."
                value={link} onChange={e => setLink(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium th-text-2 mb-1">Modul</label>
              <select
                className="th-input focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={moduleId} onChange={e => setModuleId(e.target.value)}
              >
                <option value="">Kein Modul</option>
                {data.modules.map(m => <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>)}
              </select>
            </div>
            <button
              onClick={parse}
              disabled={!raw.trim()}
              className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-40 shrink-0"
            >
              Vorschau
            </button>
          </div>

          {rows.length > 0 && (
            <div className="border border-[var(--th-border)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--th-bg)] th-text-2">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">
                      <input type="checkbox"
                        checked={rows.every(r => r.selected)}
                        onChange={e => setRows(rs => rs.map(r => ({ ...r, selected: e.target.checked })))}
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Datum</th>
                    <th className="px-3 py-2 text-left">Zeit</th>
                    <th className="px-3 py-2 text-left">Titel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={i} className={r.selected ? '' : 'opacity-40'}>
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={r.selected} onChange={() => toggle(i)} />
                      </td>
                      <td className="px-3 py-2 th-text-2">{r.date.split('-').reverse().join('.')}</td>
                      <td className="px-3 py-2 th-text-2">{r.time}–{r.endTime}</td>
                      <td className="px-3 py-2 th-text">{r.thema}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 bg-[var(--th-bg)] text-xs th-text-2 border-t">
                {rows.filter(r => r.selected).length} von {rows.length} ausgewählt
              </div>
            </div>
          )}

          {rows.length === 0 && raw.trim() && (
            <p className="text-sm text-amber-600">Keine Zeilen erkannt. Bitte Vorschau klicken oder Format prüfen.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t shrink-0">
          <button onClick={onCancel} className="px-4 py-2 text-sm th-text-2 hover:bg-[var(--th-bg-secondary,#f1f5f9)] rounded-lg">Abbrechen</button>
          <button
            onClick={handleImport}
            disabled={rows.filter(r => r.selected).length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40"
          >
            <Upload size={16} /> {rows.filter(r => r.selected).length} Termine importieren
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mentoriat Detail Overlay ────────────────────────────────────────────────

function MentoriatDetailOverlay({ event, onClose, onEdit, onDelete }: {
  event: CalendarEvent
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { data } = useApp()
  const module = data.modules.find(m => m.id === event.moduleId)
  const isVirtual = event.id.startsWith('__module__')
  const isUrl = !!event.description && (event.description.startsWith('http://') || event.description.startsWith('https://'))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="th-card shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Mentoriat</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--th-bg-secondary,#f1f5f9)]"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <h2 className="text-lg font-semibold th-text leading-snug">{event.title}</h2>
          {module && (
            <div className="flex items-center gap-2 text-sm th-text-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: module.color }} />
              {module.moduleNumber} {module.name}
            </div>
          )}
          {event.time && (
            <div className="text-sm th-text-2">
              {format(parseISO(event.date), 'EEEE, dd. MMMM yyyy', { locale: de })}
              {' · '}
              {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
            </div>
          )}
          {event.description && (
            isUrl ? (
              <a
                href={event.description}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 hover:underline break-all"
              >
                <ExternalLink size={14} className="shrink-0" />
                {event.description}
              </a>
            ) : (
              <div className="text-sm th-text-2 whitespace-pre-line">{event.description}</div>
            )
          )}
        </div>
        {!isVirtual && (
          <div className="flex justify-end gap-2 px-5 pb-5">
            <button
              onClick={() => { if (confirm('Termin löschen?')) { onDelete(); onClose() } }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              Löschen
            </button>
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-lg"
            >
              Bearbeiten
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Calendar Grid ───────────────────────────────────────────────────────────

export default function KalenderPage() {
  const { data, createEvent, updateEvent, removeEvent, logSession } = useApp()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showEventForm, setShowEventForm] = useState(false)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showMentoriatImport, setShowMentoriatImport] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEvent | undefined>()
  const [viewMentoriat, setViewMentoriat] = useState<CalendarEvent | null>(null)
  const [filterModuleId, setFilterModuleId] = useState<string>('alle')

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  const derivedEvents = useMemo(() => getModuleDerivedEvents(data.modules), [data.modules])
  const allEvents = useMemo(() => [...data.events, ...derivedEvents], [data.events, derivedEvents])

  const eventsForDay = (day: Date) =>
    allEvents.filter(e => {
      const matchModule = filterModuleId === 'alle' || e.moduleId === filterModuleId
      return matchModule && isSameDay(parseISO(e.date), day)
    })

  const selectedEvents = eventsForDay(selectedDate)

  const upcomingEvents = allEvents
    .filter(e => parseISO(e.date) >= new Date() && (filterModuleId === 'alle' || e.moduleId === filterModuleId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold th-text">Kalender & Studienplan</h1>
          <p className="text-sm th-text-2 mt-1">{data.events.length} Termine gesamt</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSessionForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'rgba(22,163,74,0.85)' }}>
            <Clock size={16} /> Session erfassen
          </button>
          <button onClick={() => setShowMentoriatImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'rgba(20,184,166,0.85)' }}>
            <Upload size={16} /> Mentoriate importieren
          </button>
          <button onClick={() => { setEditEvent(undefined); setShowEventForm(true) }}
            className="flex items-center gap-2 px-4 py-2 th-btn th-btn-primary text-sm font-medium">
            <Plus size={16} /> Termin
          </button>
        </div>
      </div>

      {/* Module filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilterModuleId('alle')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === 'alle' ? 'th-btn th-btn-primary' : 'bg-[var(--th-bg-secondary,#f1f5f9)] th-text-2 hover:bg-slate-200'}`}>
          Alle Module
        </button>
        {data.modules.map(m => (
          <button key={m.id} onClick={() => setFilterModuleId(m.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === m.id ? 'text-white' : 'bg-[var(--th-bg-secondary,#f1f5f9)] th-text-2 hover:bg-slate-200'}`}
            style={filterModuleId === m.id ? { backgroundColor: m.color } : {}}>
            {m.moduleNumber}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2 th-card shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b bg-[var(--th-bg)]">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded hover:bg-[var(--th-card-hover)]"><ChevronLeft size={18} /></button>
            <h2 className="font-semibold th-text">{format(currentMonth, 'MMMM yyyy', { locale: de })}</h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 rounded hover:bg-[var(--th-card-hover)]"><ChevronRight size={18} /></button>
          </div>

          {/* Calendar scroll wrapper for mobile */}
          <div className="overflow-x-auto">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b min-w-[320px]">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold th-text-3">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 min-w-[320px]">
            {calDays.map((day, i) => {
              const events = eventsForDay(day)
              const isSelected = isSameDay(day, selectedDate)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[80px] p-2 border-b border-r border-[var(--th-border)] text-left transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-[var(--th-bg)]'
                  } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday(day) ? 'th-btn th-btn-primary' : isSelected ? 'bg-blue-200 text-blue-800' : 'th-text-2'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 3).map(e => (
                      <div
                        key={e.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate font-medium ${EVENT_TYPE_COLORS[e.type]} text-white ${e.type === 'mentoriat' ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={e.type === 'mentoriat' ? (ev) => { ev.stopPropagation(); setViewMentoriat(e) } : undefined}
                      >
                        {e.title}
                      </div>
                    ))}
                    {events.length > 3 && <div className="text-[10px] th-text-3">+{events.length - 3} mehr</div>}
                  </div>
                </button>
              )
            })}
          </div>
          </div>{/* end overflow-x-auto */}
        </div>

        {/* Sidebar: selected day + upcoming */}
        <div className="space-y-4">
          {/* Selected day events */}
          <div className="th-card shadow-sm p-4">
            <h3 className="font-semibold th-text mb-3">
              {format(selectedDate, 'EEEE, dd. MMMM', { locale: de })}
            </h3>
            {selectedEvents.length === 0 ? (
              <div className="text-sm th-text-3 text-center py-4">Keine Termine</div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(e => {
                  const module = data.modules.find(m => m.id === e.moduleId)
                  const isVirtual = e.id.startsWith('__module__')
                  return (
                    <div
                      key={e.id}
                      className={`rounded-lg p-3 ${e.type === 'mentoriat' ? 'cursor-pointer hover:shadow-sm' : ''}`}
                      style={{ background: EVENT_TYPE_STYLE[e.type].bg, border: `1px solid ${EVENT_TYPE_STYLE[e.type].border}`, color: EVENT_TYPE_STYLE[e.type].color }}
                      onClick={e.type === 'mentoriat' ? () => setViewMentoriat(e) : undefined}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">{e.title}</div>
                          {module && <div className="text-xs opacity-70 mt-0.5">{module.moduleNumber}</div>}
                          {e.time && <div className="text-xs mt-0.5">{e.time}{e.endTime ? ` – ${e.endTime}` : ''}</div>}
                          {e.description && <div className="text-xs mt-1 opacity-80">{e.description}</div>}
                          {isVirtual && <div className="text-[10px] mt-1 opacity-50 italic">aus Modul</div>}
                        </div>
                        {!isVirtual && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setEditEvent(e); setShowEventForm(true) }} className="p-1 rounded hover:bg-black/10"><Plus size={12} /></button>
                            <button onClick={() => { if (confirm('Termin löschen?')) removeEvent(e.id) }} className="p-1 rounded hover:bg-black/10"><X size={12} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <button
              onClick={() => { setShowEventForm(true) }}
              className="mt-3 w-full py-2 border border-dashed border-[var(--th-border)] rounded-lg text-sm th-text-3 hover:bg-[var(--th-bg)] hover:th-text-2 transition-colors"
            >
              + Termin für diesen Tag
            </button>
          </div>

          {/* Upcoming */}
          <div className="th-card shadow-sm p-4">
            <h3 className="font-semibold th-text mb-3">Demnächst</h3>
            {upcomingEvents.length === 0 ? (
              <div className="text-sm th-text-3 text-center py-4">Keine kommenden Termine</div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(e => {
                  const module = data.modules.find(m => m.id === e.moduleId)
                  return (
                    <div
                      key={e.id}
                      className={`flex items-center gap-3 ${e.type === 'mentoriat' ? 'cursor-pointer hover:bg-teal-50 rounded-lg px-1 -mx-1' : ''}`}
                      onClick={e.type === 'mentoriat' ? () => setViewMentoriat(e) : undefined}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${EVENT_TYPE_COLORS[e.type]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium th-text truncate">{e.title}</div>
                        <div className="text-xs th-text-3">{format(parseISO(e.date), 'dd.MM.yyyy', { locale: de })}{module ? ` · ${module.moduleNumber}` : ''}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEventForm && (
        <EventForm
          initial={editEvent}
          defaultDate={format(selectedDate, 'yyyy-MM-dd')}
          onSave={(e) => {
            if (editEvent) updateEvent({ ...e, id: editEvent.id })
            else createEvent(e)
            setShowEventForm(false)
            setEditEvent(undefined)
          }}
          onCancel={() => { setShowEventForm(false); setEditEvent(undefined) }}
        />
      )}

      {showSessionForm && (
        <SessionLogger
          onLog={(s) => { logSession(s); setShowSessionForm(false) }}
          onCancel={() => setShowSessionForm(false)}
        />
      )}

      {showMentoriatImport && (
        <MentoriatImport
          onImport={(events) => { events.forEach(createEvent); setShowMentoriatImport(false) }}
          onCancel={() => setShowMentoriatImport(false)}
        />
      )}

      {viewMentoriat && (
        <MentoriatDetailOverlay
          event={viewMentoriat}
          onClose={() => setViewMentoriat(null)}
          onEdit={() => { setEditEvent(viewMentoriat); setShowEventForm(true); setViewMentoriat(null) }}
          onDelete={() => removeEvent(viewMentoriat.id)}
        />
      )}

      {/* Pomodoro Timer — floating widget */}
      <PomodoroTimer
        onComplete={(minutes) => {
          // Auto-log the session if at least one active module exists
          const activeModule = data.modules.find(m => m.status === 'aktiv')
          if (activeModule) {
            logSession({
              moduleId: activeModule.id,
              durationMinutes: minutes,
              topic: 'Pomodoro-Session',
              notes: '',
              date: format(new Date(), 'yyyy-MM-dd'),
            })
          }
        }}
      />
    </div>
  )
}

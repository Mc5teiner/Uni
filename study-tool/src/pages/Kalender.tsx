import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import type { CalendarEvent, EventType, StudySession } from '../types'
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek,
  isToday
} from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, X, Check, Clock, Upload, ExternalLink } from 'lucide-react'

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

const EVENT_TYPE_LIGHT: Record<EventType, string> = {
  pruefung: 'bg-red-50 border-red-200 text-red-800',
  abgabe: 'bg-orange-50 border-orange-200 text-orange-800',
  lernblock: 'bg-blue-50 border-blue-200 text-blue-800',
  praesenzveranstaltung: 'bg-purple-50 border-purple-200 text-purple-800',
  erinnerung: 'bg-slate-50 border-slate-200 text-slate-600',
  mentoriat: 'bg-teal-50 border-teal-200 text-teal-800',
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{initial ? 'Termin bearbeiten' : 'Neuer Termin'}</h2>
          <button onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titel *</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.title} onChange={e => set('title', e.target.value)} placeholder="Terminbezeichnung..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Typ</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.type} onChange={e => set('type', e.target.value as EventType)}
              >
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modul</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.moduleId ?? ''} onChange={e => set('moduleId', e.target.value)}
              >
                <option value="">Kein Modul</option>
                {data.modules.map(m => <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Datum *</label>
              <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Von</label>
              <input type="time" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.time ?? ''} onChange={e => set('time', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bis</label>
              <input type="time" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.endTime ?? ''} onChange={e => set('endTime', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
            <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2} value={form.description ?? ''} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Abbrechen</button>
          <button onClick={() => { if (form.title && form.date) onSave(form) }} disabled={!form.title || !form.date}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#003366] text-white rounded-lg hover:bg-[#004488] disabled:opacity-50">
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Lernsession erfassen</h2>
          <button onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Modul *</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.moduleId} onChange={e => set('moduleId', e.target.value)}>
              {data.modules.map(m => <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Datum</label>
              <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dauer (min)</label>
              <input type="number" min={5} max={480}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.durationMinutes} onChange={e => set('durationMinutes', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Thema *</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="Was wurde gelernt?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notizen</label>
            <textarea rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Abbrechen</button>
          <button onClick={() => { if (form.moduleId && form.topic) onLog(form) }} disabled={!form.moduleId || !form.topic}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            <Check size={16} /> Erfassen
          </button>
        </div>
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <h2 className="text-lg font-semibold">Mentoriate importieren</h2>
          <button onClick={onCancel}><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tabelle einfügen <span className="text-slate-400 font-normal">(aus der Übersicht kopieren)</span>
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              rows={6}
              placeholder={"So 12.10.2025 08:30 14:00 Einheit 1\nSo 19.10.2025 08:30 14:00 Einheit 1\n..."}
              value={raw}
              onChange={e => { setRaw(e.target.value); setRows([]) }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Optionaler Name <span className="text-slate-400 font-normal">(z. B. „Nur für VWL")</span>
              </label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Leer = Modulname wird verwendet..."
                value={optionalName} onChange={e => setOptionalName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mentor</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Name des Mentors..."
                value={mentor} onChange={e => setMentor(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Veranstaltungslink</label>
              <input
                type="url"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="https://..."
                value={link} onChange={e => setLink(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Modul</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
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
                      <td className="px-3 py-2 text-slate-700">{r.date.split('-').reverse().join('.')}</td>
                      <td className="px-3 py-2 text-slate-500">{r.time}–{r.endTime}</td>
                      <td className="px-3 py-2 text-slate-800">{r.thema}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 bg-slate-50 text-xs text-slate-500 border-t">
                {rows.filter(r => r.selected).length} von {rows.length} ausgewählt
              </div>
            </div>
          )}

          {rows.length === 0 && raw.trim() && (
            <p className="text-sm text-amber-600">Keine Zeilen erkannt. Bitte Vorschau klicken oder Format prüfen.</p>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t shrink-0">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Abbrechen</button>
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Mentoriat</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <h2 className="text-lg font-semibold text-slate-800 leading-snug">{event.title}</h2>
          {module && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: module.color }} />
              {module.moduleNumber} {module.name}
            </div>
          )}
          {event.time && (
            <div className="text-sm text-slate-600">
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
              <div className="text-sm text-slate-600 whitespace-pre-line">{event.description}</div>
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kalender & Studienplan</h1>
          <p className="text-sm text-slate-500 mt-1">{data.events.length} Termine gesamt</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSessionForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Clock size={16} /> Session erfassen
          </button>
          <button onClick={() => setShowMentoriatImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
            <Upload size={16} /> Mentoriate importieren
          </button>
          <button onClick={() => { setEditEvent(undefined); setShowEventForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004488] text-sm font-medium">
            <Plus size={16} /> Termin
          </button>
        </div>
      </div>

      {/* Module filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilterModuleId('alle')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === 'alle' ? 'bg-[#003366] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          Alle Module
        </button>
        {data.modules.map(m => (
          <button key={m.id} onClick={() => setFilterModuleId(m.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === m.id ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            style={filterModuleId === m.id ? { backgroundColor: m.color } : {}}>
            {m.moduleNumber}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded hover:bg-slate-200"><ChevronLeft size={18} /></button>
            <h2 className="font-semibold text-slate-800">{format(currentMonth, 'MMMM yyyy', { locale: de })}</h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 rounded hover:bg-slate-200"><ChevronRight size={18} /></button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              const events = eventsForDay(day)
              const isSelected = isSameDay(day, selectedDate)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[80px] p-2 border-b border-r border-slate-100 text-left transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                  } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday(day) ? 'bg-[#003366] text-white' : isSelected ? 'bg-blue-200 text-blue-800' : 'text-slate-700'
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
                    {events.length > 3 && <div className="text-[10px] text-slate-400">+{events.length - 3} mehr</div>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sidebar: selected day + upcoming */}
        <div className="space-y-4">
          {/* Selected day events */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-800 mb-3">
              {format(selectedDate, 'EEEE, dd. MMMM', { locale: de })}
            </h3>
            {selectedEvents.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-4">Keine Termine</div>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(e => {
                  const module = data.modules.find(m => m.id === e.moduleId)
                  const isVirtual = e.id.startsWith('__module__')
                  return (
                    <div
                      key={e.id}
                      className={`border rounded-lg p-3 ${EVENT_TYPE_LIGHT[e.type]} ${e.type === 'mentoriat' ? 'cursor-pointer hover:shadow-sm' : ''}`}
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
              className="mt-3 w-full py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            >
              + Termin für diesen Tag
            </button>
          </div>

          {/* Upcoming */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Demnächst</h3>
            {upcomingEvents.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-4">Keine kommenden Termine</div>
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
                        <div className="text-sm font-medium text-slate-800 truncate">{e.title}</div>
                        <div className="text-xs text-slate-400">{format(parseISO(e.date), 'dd.MM.yyyy', { locale: de })}{module ? ` · ${module.moduleNumber}` : ''}</div>
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
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useApp, useModuleStats } from '../context/AppContext'
import type { StudyModule, ModuleStatus } from '../types'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Plus, Pencil, Trash2, BookOpen, Clock, X, Check, Search } from 'lucide-react'
import { FERNUNI_MODULES, getNextSemesters } from '../data/fernuniModules'

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

const STATUS_COLORS: Record<ModuleStatus, string> = {
  aktiv: 'bg-green-100 text-green-800',
  abgeschlossen: 'bg-slate-100 text-slate-600',
  geplant: 'bg-blue-100 text-blue-800',
  pausiert: 'bg-yellow-100 text-yellow-800',
}

function ModuleCard({ module, onEdit, onDelete }: { module: StudyModule; onEdit: (m: StudyModule) => void; onDelete: (id: string) => void }) {
  const stats = useModuleStats(module.id)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Color bar */}
      <div className="h-2" style={{ backgroundColor: module.color }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-xs text-slate-500 font-mono mb-1">{module.moduleNumber}</div>
            <h3 className="font-semibold text-slate-800 leading-tight">{module.name}</h3>
            <div className="text-xs text-slate-500 mt-1">{module.semester}</div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[module.status]}`}>
            {STATUS_LABELS[module.status]}
          </span>
        </div>

        {module.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{module.description}</p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">{module.credits}</div>
            <div className="text-xs text-slate-500">ECTS</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-800">{stats.docs.length}</div>
            <div className="text-xs text-slate-500">Briefe</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: stats.dueCards > 0 ? '#cc3333' : '#339966' }}>
              {stats.dueCards}
            </div>
            <div className="text-xs text-slate-500">Fällig</div>
          </div>
        </div>

        {module.examDate && (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2 mb-3">
            <Clock size={12} />
            <span>Prüfung: {format(parseISO(module.examDate), 'dd.MM.yyyy', { locale: de })}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{stats.weekMinutes} min diese Woche</span>
          <div className="flex gap-2">
            <button onClick={() => onEdit(module)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete(module.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type FormData = Omit<StudyModule, 'id' | 'createdAt'>

const defaultForm: FormData = {
  name: '',
  moduleNumber: '',
  credits: 5,
  semester: `WS ${new Date().getFullYear()}/${new Date().getFullYear() + 1 - 2000}`,
  status: 'aktiv',
  color: MODULE_COLORS[0],
  examDate: '',
  description: '',
}

function ModuleForm({ initial, onSave, onCancel }: { initial?: StudyModule; onSave: (data: FormData) => void; onCancel: () => void }) {
  const [form, setForm] = useState<FormData>(initial ? { ...initial } : { ...defaultForm })
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const set = (key: keyof FormData, value: string | number) => setForm(f => ({ ...f, [key]: value }))

  // Filter modules based on search input (by name or number)
  const filteredModules = search.trim().length > 0
    ? FERNUNI_MODULES.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.number.includes(search)
      ).slice(0, 8)
    : []

  // Close dropdown when clicking outside
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{initial ? 'Modul bearbeiten' : 'Neues Modul'}</h2>
          <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Module search / autocomplete */}
          {!initial && (
            <div ref={searchRef} className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">Modul aus FernUni-Katalog wählen</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Modulname oder -nummer suchen…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
                  onFocus={() => search.trim().length > 0 && setShowDropdown(true)}
                />
              </div>
              {showDropdown && filteredModules.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filteredModules.map(m => (
                    <li key={m.number}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors"
                        onClick={() => selectModule(m)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400 shrink-0 w-12">{m.number}</span>
                          <span className="text-sm text-slate-800 flex-1 truncate">{m.name}</span>
                          <span className="text-xs text-slate-400 shrink-0">{m.ects} ECTS</span>
                        </div>
                        <div className="text-xs text-slate-400 ml-14">{m.faculty}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showDropdown && search.trim().length > 0 && filteredModules.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm text-slate-400">
                  Kein Modul gefunden – bitte manuell eingeben
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Modulname *</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="z.B. Einführung in die Betriebswirtschaftslehre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modulnummer</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.moduleNumber} onChange={e => set('moduleNumber', e.target.value)}
                placeholder="31101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ECTS</label>
              <input
                type="number" min={1} max={30}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.credits} onChange={e => set('credits', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.semester} onChange={e => set('semester', e.target.value)}
              >
                {SEMESTER_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
                {/* Keep manually entered value if it's not in the list */}
                {!SEMESTER_OPTIONS.includes(form.semester) && form.semester && (
                  <option value={form.semester}>{form.semester}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status} onChange={e => set('status', e.target.value as ModuleStatus)}
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prüfungsdatum</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.examDate || ''} onChange={e => set('examDate', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Beschreibung</label>
              <textarea
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)}
                placeholder="Kurze Beschreibung des Moduls..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Farbe</label>
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
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Abbrechen</button>
          <button
            onClick={() => { if (form.name) onSave(form) }}
            disabled={!form.name}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#003366] text-white rounded-lg hover:bg-[#004488] transition-colors disabled:opacity-50"
          >
            <Check size={16} />
            {initial ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ModulePage() {
  const { data, createModule, updateModule, removeModule } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<StudyModule | undefined>()
  const [filterStatus, setFilterStatus] = useState<ModuleStatus | 'alle'>('alle')

  const filtered = data.modules.filter(m => filterStatus === 'alle' || m.status === filterStatus)

  const handleSave = (form: FormData) => {
    if (editTarget) {
      updateModule({ ...editTarget, ...form })
    } else {
      createModule(form)
    }
    setShowForm(false)
    setEditTarget(undefined)
  }

  const handleEdit = (m: StudyModule) => { setEditTarget(m); setShowForm(true) }
  const handleDelete = (id: string) => { if (confirm('Modul und alle zugehörigen Daten löschen?')) removeModule(id) }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meine Module</h1>
          <p className="text-sm text-slate-500 mt-1">{data.modules.length} Module gesamt</p>
        </div>
        <button
          onClick={() => { setEditTarget(undefined); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004488] transition-colors text-sm font-medium"
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
                ? 'bg-[#003366] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {status === 'alle' ? 'Alle' : STATUS_LABELS[status as ModuleStatus]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Keine Module gefunden</p>
          <p className="text-sm mt-1">Klicke auf "Neues Modul" um zu beginnen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(m => (
            <ModuleCard key={m.id} module={m} onEdit={handleEdit} onDelete={handleDelete} />
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

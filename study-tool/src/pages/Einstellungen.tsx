import { useRef, useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { auth, caldav, data as dataApi, formatBytes, type CaldavSettings } from '../api/client'
import { exportData, importData } from '../utils/storage'
import { requestNotificationPermission } from '../utils/notifications'
import {
  Download, Upload, Bell, Trash2, Info, User, Calendar,
  Eye, EyeOff, Check, X, RefreshCw, Link as LinkIcon,
  Globe, Lock,
} from 'lucide-react'

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const { user, refreshUser } = useAuth()
  const [form, setForm] = useState({
    name:          user?.name ?? '',
    study_type:    user?.studyType ?? '',
    study_program: user?.studyProgram ?? '',
  })
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  function set(f: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(v => ({ ...v, [f]: e.target.value }))
  }

  async function save() {
    setSaving(true); setMsg(null)
    try {
      await auth.updateMe({
        name:          form.name || undefined,
        study_type:    (form.study_type as 'bachelor' | 'master' | 'zertifikat' | null) || null,
        study_program: form.study_program || null,
      })
      await refreshUser()
      setMsg({ ok: true, text: 'Profil gespeichert.' })
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }) }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><User size={16} /> Profil</h2>
      {msg && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-sm border ${msg.ok
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'}`}>{msg.text}</div>
      )}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Vollständiger Name</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              value={form.name} onChange={set('name')} placeholder="Max Mustermann" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Benutzername</label>
            <input disabled className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-400"
              value={user?.username ?? ''} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Art des Studiums</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.study_type} onChange={set('study_type')}>
              <option value="">—</option>
              <option value="bachelor">Bachelor</option>
              <option value="master">Master</option>
              <option value="zertifikat">Zertifikat</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Studiengang</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={form.study_program} onChange={set('study_program')} placeholder="z. B. Informatik" />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004488] text-sm font-medium disabled:opacity-60">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Speichern…' : 'Profil speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Change password section ──────────────────────────────────────────────────

function ChangePasswordSection() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState<{ ok: boolean; text: string } | null>(null)

  function set(f: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(v => ({ ...v, [f]: e.target.value }))
  }

  async function save() {
    setMsg(null)
    if (form.next !== form.confirm) { setMsg({ ok: false, text: 'Passwörter stimmen nicht überein.' }); return }
    if (form.next.length < 12)      { setMsg({ ok: false, text: 'Mindestens 12 Zeichen erforderlich.' }); return }
    setSaving(true)
    try {
      await auth.changePassword(form.current, form.next)
      setMsg({ ok: true, text: 'Passwort geändert. Du wirst abgemeldet.' })
      setForm({ current: '', next: '', confirm: '' })
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }) }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Lock size={16} /> Passwort ändern</h2>
      {msg && (
        <div className={`mb-3 px-3 py-2 rounded-lg text-sm border ${msg.ok
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'}`}>{msg.text}</div>
      )}
      <div className="space-y-3">
        {(['current', 'next', 'confirm'] as const).map((f, i) => (
          <div key={f}>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {f === 'current' ? 'Aktuelles Passwort' : f === 'next' ? 'Neues Passwort (min. 12 Zeichen)' : 'Neues Passwort bestätigen'}
            </label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} autoComplete={i === 0 ? 'current-password' : 'new-password'}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                value={form[f]} onChange={set(f)} placeholder="••••••••••••" />
              {i === 0 && (
                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004488] text-sm font-medium disabled:opacity-60">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Ändern…' : 'Passwort ändern'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CalDAV section ───────────────────────────────────────────────────────────

function CaldavSection() {
  const [settings,  setSettings]  = useState<CaldavSettings | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [form, setForm] = useState({ serverUrl: '', username: '', password: '', calendarUrl: '' })
  const [showPw,    setShowPw]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [testing,   setTesting]   = useState(false)
  const [msg,       setMsg]       = useState<{ ok: boolean; text: string } | null>(null)

  function set(f: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(v => ({ ...v, [f]: e.target.value }))
  }

  useEffect(() => {
    caldav.getSettings()
      .then(s => {
        if (s) {
          setSettings(s)
          setForm({ serverUrl: s.serverUrl, username: s.username, password: '', calendarUrl: s.calendarUrl ?? '' })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setMsg(null); setSaving(true)
    try {
      await caldav.saveSettings({
        serverUrl:   form.serverUrl,
        username:    form.username,
        password:    form.password,
        calendarUrl: form.calendarUrl || undefined,
      })
      const s = await caldav.getSettings()
      setSettings(s)
      setMsg({ ok: true, text: 'CalDAV gespeichert.' })
      setForm(f => ({ ...f, password: '' }))
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }) }
    finally { setSaving(false) }
  }

  async function test() {
    setMsg(null); setTesting(true)
    try {
      const r = await caldav.testConnection({ serverUrl: form.serverUrl, username: form.username, password: form.password })
      setMsg({ ok: true, text: `Verbindung erfolgreich!${r.discoveredUrl ? ` Kalender: ${r.discoveredUrl}` : ''}` })
      if (r.discoveredUrl && !form.calendarUrl) setForm(f => ({ ...f, calendarUrl: r.discoveredUrl! }))
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }) }
    finally { setTesting(false) }
  }

  async function remove() {
    if (!confirm('CalDAV-Konfiguration entfernen?')) return
    await caldav.deleteSettings()
    setSettings(null)
    setForm({ serverUrl: '', username: '', password: '', calendarUrl: '' })
    setMsg({ ok: true, text: 'CalDAV entfernt.' })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h2 className="font-semibold text-slate-800 mb-1 flex items-center gap-2"><Calendar size={16} /> CalDAV-Kalender</h2>
      <p className="text-sm text-slate-500 mb-4">
        Binde einen externen Kalender ein. Termine werden schreibgeschützt neben deinen Einträgen angezeigt.
      </p>
      {loading ? <div className="text-sm text-slate-400">Lade…</div> : (
        <>
          {settings?.configured && !form.serverUrl && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
              <Check size={14} /> Konfiguriert: {settings.serverUrl}
            </div>
          )}
          {msg && (
            <div className={`mb-3 px-3 py-2 rounded-lg text-sm border ${msg.ok
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'}`}>{msg.text}</div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Server-URL</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="https://caldav.example.com/dav/" value={form.serverUrl} onChange={set('serverUrl')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Benutzername</label>
                <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  value={form.username} onChange={set('username')} placeholder="benutzer@example.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Passwort {settings?.configured && <span className="text-slate-400">(leer = unverändert)</span>}
                </label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm"
                    value={form.password} onChange={set('password')} placeholder={settings?.configured ? '(gespeichert)' : ''} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Kalender-URL <span className="text-slate-400 font-normal">(optional, wird auto-erkannt)</span>
              </label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="https://caldav.example.com/dav/home/calendar/" value={form.calendarUrl} onChange={set('calendarUrl')} />
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={test} disabled={testing || !form.serverUrl || !form.username}
                className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
                {testing ? 'Teste…' : 'Verbindung testen'}
              </button>
              <button onClick={save} disabled={saving || !form.serverUrl || !form.username}
                className="flex items-center gap-2 px-3 py-2 bg-[#003366] text-white rounded-lg text-sm hover:bg-[#004488] disabled:opacity-40">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Speichern…' : 'Speichern'}
              </button>
              {settings?.configured && (
                <button onClick={remove}
                  className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
                  <X size={14} /> Entfernen
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Storage section ──────────────────────────────────────────────────────────

function StorageSection() {
  const [info, setInfo] = useState<{ used: number; limit: number; percentage: number } | null>(null)
  const { data: apiData } = useApp()

  useEffect(() => {
    dataApi.storage().then(setInfo).catch(() => {})
  }, [apiData])  // re-check after data changes

  if (!info) return null

  const color = info.percentage > 90 ? 'bg-red-500' : info.percentage > 70 ? 'bg-amber-500' : 'bg-teal-500'

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><HardDriveIcon /> Speicherplatz</h2>
      <div className="flex justify-between text-sm text-slate-600 mb-2">
        <span>{formatBytes(info.used)} genutzt</span>
        <span>{formatBytes(info.limit)} gesamt</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(info.percentage, 100)}%` }} />
      </div>
      <div className="text-xs text-slate-400 mt-1.5">{info.percentage}% belegt</div>
    </div>
  )
}

function HardDriveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/>
    </svg>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EinstellungenPage() {
  const { data } = useApp()
  const importRef = useRef<HTMLInputElement>(null)

  const handleExport = () => exportData(data)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importData(file)
      window.location.reload()
    } catch (err) { alert('Import fehlgeschlagen: ' + (err as Error).message) }
    e.target.value = ''
  }

  const handleNotifications = async () => {
    const granted = await requestNotificationPermission()
    alert(granted ? 'Benachrichtigungen aktiviert!' : 'Benachrichtigungen wurden abgelehnt.')
  }

  const totalMinutes = data.sessions.reduce((sum, s) => sum + s.durationMinutes, 0)

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Einstellungen</h1>

      {/* Profile */}
      <ProfileSection />

      {/* Change Password */}
      <ChangePasswordSection />

      {/* CalDAV */}
      <CaldavSection />

      {/* Storage */}
      <StorageSection />

      {/* Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Info size={16} /> Statistiken</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Module',        value: data.modules.length },
            { label: 'Studienbriefe', value: data.documents.length },
            { label: 'Karteikarten',  value: data.flashcards.length },
            { label: 'Termine',       value: data.events.length },
            { label: 'Lernsessions',  value: data.sessions.length },
            { label: 'Lernminuten',   value: totalMinutes },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-bold text-slate-800">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Backup */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Backup & Wiederherstellung</h2>
        <p className="text-sm text-slate-500 mb-4">
          Exportiere alle deine Daten als JSON-Datei zur lokalen Sicherung.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004488] text-sm font-medium">
            <Download size={16} /> Backup exportieren
          </button>
          <button onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
            <Upload size={16} /> Backup importieren
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Bell size={16} /> Benachrichtigungen</h2>
        <p className="text-sm text-slate-500 mb-4">
          {typeof Notification !== 'undefined' && Notification.permission === 'granted'
            ? <span className="text-green-600">✓ Benachrichtigungen aktiviert</span>
            : 'Aktiviere Browser-Benachrichtigungen für Lernreminder und Terminhinweise.'}
        </p>
        <button onClick={handleNotifications}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium">
          <Bell size={16} /> Benachrichtigungen aktivieren
        </button>
      </div>

      {/* FernUni links */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 mb-6">
        <h2 className="font-semibold text-blue-800 mb-2 flex items-center gap-2"><Globe size={16} /> FernUniversität Hagen</h2>
        <div className="text-xs text-blue-600 space-y-1">
          <div>• Virtuelle Universität: moodle.fernuni-hagen.de</div>
          <div>• Prüfungsanmeldung: studium.fernuni-hagen.de</div>
          <div>• Bibliothek: bibliothek.fernuni-hagen.de</div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-5">
        <h2 className="font-semibold text-red-800 mb-2">Gefahrenzone</h2>
        <p className="text-sm text-red-600 mb-4">Alle lokalen Daten löschen. Stelle sicher, dass du ein Backup hast!</p>
        <button
          onClick={() => { if (confirm('ACHTUNG: Alle Daten werden gelöscht. Fortfahren?')) { localStorage.clear(); window.location.reload() } }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
          <Trash2 size={16} /> Lokale Daten löschen
        </button>
      </div>

      {/* Suppress unused import */}
      <span className="hidden"><LinkIcon size={0} /></span>
    </div>
  )
}

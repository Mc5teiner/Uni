import { useRef, useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useTheme, THEMES, type ThemeId } from '../context/ThemeContext'
import { auth, caldav, data as dataApi, formatBytes, type CaldavSettings } from '../api/client'
import { exportData, importData } from '../utils/storage'
import { requestNotificationPermission } from '../utils/notifications'
import {
  Download, Upload, Bell, Trash2, Info, User, Calendar,
  Eye, EyeOff, Check, X, RefreshCw, Link as LinkIcon,
  Globe, Lock, Palette,
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
    <div className="th-card p-5 mb-6">
      <h2 className="font-semibold th-text mb-4 flex items-center gap-2"><User size={16} /> Profil</h2>
      {msg && (
        <div className="mb-3 px-3 py-2 rounded-lg text-sm" style={{
          background: msg.ok ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
          border: `1px solid ${msg.ok ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
          color: msg.ok ? 'var(--th-success)' : 'var(--th-danger)',
        }}>{msg.text}</div>
      )}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="th-label text-xs">Vollständiger Name</label>
            <input className="th-input" value={form.name} onChange={set('name')} placeholder="Max Mustermann" />
          </div>
          <div>
            <label className="th-label text-xs">Benutzername</label>
            <input disabled className="th-input opacity-50 cursor-not-allowed" value={user?.username ?? ''} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="th-label text-xs">Art des Studiums</label>
            <select className="th-select" value={form.study_type} onChange={set('study_type')}>
              <option value="">—</option>
              <option value="bachelor">Bachelor</option>
              <option value="master">Master</option>
              <option value="zertifikat">Zertifikat</option>
            </select>
          </div>
          <div>
            <label className="th-label text-xs">Studiengang</label>
            <input className="th-input" value={form.study_program} onChange={set('study_program')} placeholder="z. B. Informatik" />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="th-btn th-btn-primary px-4 py-2 text-sm">
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
    <div className="th-card p-5 mb-6">
      <h2 className="font-semibold th-text mb-4 flex items-center gap-2"><Lock size={16} /> Passwort ändern</h2>
      {msg && (
        <div className="mb-3 px-3 py-2 rounded-lg text-sm" style={{
          background: msg.ok ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
          border: `1px solid ${msg.ok ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
          color: msg.ok ? 'var(--th-success)' : 'var(--th-danger)',
        }}>{msg.text}</div>
      )}
      <div className="space-y-3">
        {(['current', 'next', 'confirm'] as const).map((f, i) => (
          <div key={f}>
            <label className="th-label text-xs">
              {f === 'current' ? 'Aktuelles Passwort' : f === 'next' ? 'Neues Passwort (min. 12 Zeichen)' : 'Neues Passwort bestätigen'}
            </label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} autoComplete={i === 0 ? 'current-password' : 'new-password'}
                className="th-input pr-10" value={form[f]} onChange={set(f)} placeholder="••••••••••••" />
              {i === 0 && (
                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 th-text-3">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="th-btn th-btn-primary px-4 py-2 text-sm">
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
    <div className="th-card p-5 mb-6">
      <h2 className="font-semibold th-text mb-1 flex items-center gap-2"><Calendar size={16} /> CalDAV-Kalender</h2>
      <p className="text-sm th-text-2 mb-4">
        Binde einen externen Kalender ein. Termine werden schreibgeschützt neben deinen Einträgen angezeigt.
      </p>
      {loading ? <div className="text-sm th-text-3">Lade…</div> : (
        <>
          {settings?.configured && !form.serverUrl && (
            <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 mb-3"
              style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', color: 'var(--th-success)' }}>
              <Check size={14} /> Konfiguriert: {settings.serverUrl}
            </div>
          )}
          {msg && (
            <div className="mb-3 px-3 py-2 rounded-lg text-sm" style={{
              background: msg.ok ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
              border: `1px solid ${msg.ok ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
              color: msg.ok ? 'var(--th-success)' : 'var(--th-danger)',
            }}>{msg.text}</div>
          )}
          <div className="space-y-3">
            <div>
              <label className="th-label text-xs">Server-URL</label>
              <input className="th-input" placeholder="https://caldav.example.com/dav/" value={form.serverUrl} onChange={set('serverUrl')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="th-label text-xs">Benutzername</label>
                <input className="th-input" value={form.username} onChange={set('username')} placeholder="benutzer@example.com" />
              </div>
              <div>
                <label className="th-label text-xs">
                  Passwort {settings?.configured && <span className="th-text-3">(leer = unverändert)</span>}
                </label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'}
                    className="th-input pr-10"
                    value={form.password} onChange={set('password')} placeholder={settings?.configured ? '(gespeichert)' : ''} />
                  <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 th-text-3">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="th-label text-xs">
                Kalender-URL <span className="th-text-3 font-normal">(optional, wird auto-erkannt)</span>
              </label>
              <input className="th-input"
                placeholder="https://caldav.example.com/dav/home/calendar/" value={form.calendarUrl} onChange={set('calendarUrl')} />
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={test} disabled={testing || !form.serverUrl || !form.username}
                className="th-btn th-btn-secondary px-3 py-2 text-sm">
                <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
                {testing ? 'Teste…' : 'Verbindung testen'}
              </button>
              <button onClick={save} disabled={saving || !form.serverUrl || !form.username}
                className="th-btn th-btn-primary px-3 py-2 text-sm">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Speichern…' : 'Speichern'}
              </button>
              {settings?.configured && (
                <button onClick={remove}
                  className="th-btn px-3 py-2 text-sm rounded-lg"
                  style={{ border: '1px solid rgba(220,38,38,0.4)', color: 'var(--th-danger)' }}>
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
    <div className="th-card p-5 mb-6">
      <h2 className="font-semibold th-text mb-3 flex items-center gap-2"><HardDriveIcon /> Speicherplatz</h2>
      <div className="flex justify-between text-sm th-text-2 mb-2">
        <span>{formatBytes(info.used)} genutzt</span>
        <span>{formatBytes(info.limit)} gesamt</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--th-border)' }}>
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(info.percentage, 100)}%` }} />
      </div>
      <div className="text-xs th-text-3 mt-1.5">{info.percentage}% belegt</div>
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

// ─── Theme section ────────────────────────────────────────────────────────────

function ThemeSection() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="th-card p-5 mb-6">
      <h2 className="font-semibold th-text mb-1 flex items-center gap-2"><Palette size={16} /> Design-Theme</h2>
      <p className="text-sm th-text-2 mb-4">Wähle das Aussehen der Benutzeroberfläche.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {THEMES.map(t => {
          const active = theme === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as ThemeId)}
              className="text-left rounded-xl p-4 transition-all"
              style={{
                border: active ? '2px solid var(--th-accent)' : '2px solid var(--th-border)',
                background: active ? 'var(--th-accent-soft)' : 'var(--th-card-secondary)',
                boxShadow: active ? '0 0 0 3px color-mix(in srgb, var(--th-accent) 15%, transparent)' : 'none',
              }}
            >
              {/* Mini preview */}
              <div className="flex gap-1 mb-3 h-12 rounded-lg overflow-hidden" style={{ border: '1px solid var(--th-border)' }}>
                {/* Sidebar strip */}
                <div className="w-5 h-full rounded-l-lg" style={{ background: t.preview.sidebar }} />
                {/* Content area */}
                <div className="flex-1 p-1.5 flex flex-col gap-1" style={{ background: t.preview.bg }}>
                  <div className="h-2 rounded" style={{ background: t.preview.card, width: '80%', opacity: 0.9 }} />
                  <div className="flex gap-1">
                    <div className="h-5 w-5 rounded" style={{ background: t.preview.card }} />
                    <div className="h-5 flex-1 rounded" style={{ background: t.preview.card }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold th-text">{t.name}</div>
                  <div className="text-xs th-text-3 mt-0.5 leading-snug">{t.description}</div>
                </div>
                {active && (
                  <Check size={16} style={{ color: 'var(--th-accent)', flexShrink: 0, marginLeft: '0.5rem' }} />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
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
      <h1 className="text-2xl font-bold th-text mb-6">Einstellungen</h1>

      {/* Theme */}
      <ThemeSection />

      {/* Profile */}
      <ProfileSection />

      {/* Change Password */}
      <ChangePasswordSection />

      {/* CalDAV */}
      <CaldavSection />

      {/* Storage */}
      <StorageSection />

      {/* Stats */}
      <div className="th-card p-5 mb-6">
        <h2 className="font-semibold th-text mb-4 flex items-center gap-2"><Info size={16} /> Statistiken</h2>
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
              <div className="text-xl font-bold th-text">{value}</div>
              <div className="text-xs th-text-3">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Backup */}
      <div className="th-card p-5 mb-6">
        <h2 className="font-semibold th-text mb-4">Backup & Wiederherstellung</h2>
        <p className="text-sm th-text-2 mb-4">
          Exportiere alle deine Daten als JSON-Datei zur lokalen Sicherung.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleExport} className="th-btn th-btn-primary px-4 py-2 text-sm">
            <Download size={16} /> Backup exportieren
          </button>
          <button onClick={() => importRef.current?.click()} className="th-btn th-btn-secondary px-4 py-2 text-sm">
            <Upload size={16} /> Backup importieren
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Notifications */}
      <div className="th-card p-5 mb-6">
        <h2 className="font-semibold th-text mb-4 flex items-center gap-2"><Bell size={16} /> Benachrichtigungen</h2>
        <p className="text-sm th-text-2 mb-4">
          {typeof Notification !== 'undefined' && Notification.permission === 'granted'
            ? <span style={{ color: 'var(--th-success)' }}>✓ Benachrichtigungen aktiviert</span>
            : 'Aktiviere Browser-Benachrichtigungen für Lernreminder und Terminhinweise.'}
        </p>
        <button onClick={handleNotifications} className="th-btn th-btn-secondary px-4 py-2 text-sm">
          <Bell size={16} /> Benachrichtigungen aktivieren
        </button>
      </div>

      {/* FernUni links */}
      <div className="th-card p-5 mb-6" style={{ background: 'var(--th-accent-soft)', borderColor: 'color-mix(in srgb, var(--th-accent) 25%, transparent)' }}>
        <h2 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--th-accent)' }}><Globe size={16} /> FernUniversität Hagen</h2>
        <div className="text-xs space-y-1" style={{ color: 'var(--th-accent-soft-text)' }}>
          <div>• Virtuelle Universität: moodle.fernuni-hagen.de</div>
          <div>• Prüfungsanmeldung: studium.fernuni-hagen.de</div>
          <div>• Bibliothek: bibliothek.fernuni-hagen.de</div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl p-5" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}>
        <h2 className="font-semibold mb-2" style={{ color: 'var(--th-danger)' }}>Gefahrenzone</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--th-danger)', opacity: 0.85 }}>Alle lokalen Daten löschen. Stelle sicher, dass du ein Backup hast!</p>
        <button
          onClick={() => { if (confirm('ACHTUNG: Alle Daten werden gelöscht. Fortfahren?')) { localStorage.clear(); window.location.reload() } }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--th-danger)' }}>
          <Trash2 size={16} /> Lokale Daten löschen
        </button>
      </div>

      {/* Suppress unused import */}
      <span className="hidden"><LinkIcon size={0} /></span>
    </div>
  )
}

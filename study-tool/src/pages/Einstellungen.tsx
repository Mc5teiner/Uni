import { useRef, useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useTheme, THEMES, type ThemeId } from '../context/ThemeContext'
import { auth, caldav, data as dataApi, sharedDocuments as sharedDocsApi, formatBytes, type CaldavSettings } from '../api/client'
import { exportData, fullExportData, readBackupFile, type BackupSummary } from '../utils/storage'
import { requestNotificationPermission, sendNotification, checkAndSendReminders } from '../utils/notifications'
import {
  Download, Upload, Bell, Trash2, Info, User, Calendar,
  Eye, EyeOff, Check, X, RefreshCw, Link as LinkIcon,
  Globe, Lock, Palette, FileArchive, AlertTriangle, Loader2,
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
  const { data }                                  = useApp()
  const importRef                                 = useRef<HTMLInputElement>(null)
  const [fullExportProgress, setFullExportProgress] = useState<{ done: number; total: number } | null>(null)
  const [importPreview, setImportPreview]         = useState<BackupSummary | null>(null)
  const [_importFile, setImportFile]               = useState<File | null>(null)
  const [importLoading, setImportLoading]         = useState(false)

  const handleExport = () => exportData(data)

  const handleFullExport = async () => {
    const sharedIds = [...new Set(
      data.documents
        .filter(d => d.sharedDocumentId && !d.fileData)
        .map(d => d.sharedDocumentId as string)
    )]
    setFullExportProgress({ done: 0, total: sharedIds.length || 1 })
    try {
      await fullExportData(
        data,
        async (id) => {
          try { return (await sharedDocsApi.get(id)).fileData ?? null }
          catch { return null }
        },
        (done, total) => setFullExportProgress({ done, total }),
      )
    } finally {
      setFullExportProgress(null)
    }
  }

  const handleImportSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const summary = await readBackupFile(file)
      setImportFile(file)
      setImportPreview(summary)
    } catch (err) {
      alert('Ungültige Backup-Datei: ' + (err as Error).message)
    }
  }

  const handleImportConfirm = async () => {
    if (!importPreview) return
    setImportLoading(true)
    try {
      // Push all namespaces to the API
      const d = importPreview.data
      await Promise.all([
        ...d.modules.map(m        => dataApi.upsert('modules',         m)),
        ...d.documents.map(doc    => dataApi.upsert('documents',       doc)),
        ...d.flashcards.map(c     => dataApi.upsert('flashcards',      c)),
        ...d.flashcardDecks.map(dk => dataApi.upsert('flashcard_decks', dk)),
        ...d.events.map(ev        => dataApi.upsert('events',          ev)),
        ...d.sessions.map(s       => dataApi.upsert('sessions',        s)),
        ...d.goals.map(g          => dataApi.upsert('goals',           g)),
      ])
      setImportPreview(null)
      setImportFile(null)
      window.location.reload()
    } catch (err) {
      alert('Import fehlgeschlagen: ' + (err as Error).message)
    } finally {
      setImportLoading(false)
    }
  }

  const handleNotifications = async () => {
    const granted = await requestNotificationPermission()
    if (granted) {
      sendNotification('Benachrichtigungen aktiviert', 'Du erhältst jetzt Erinnerungen für fällige Karteikarten und Prüfungen.', 'setup')
    } else {
      alert('Benachrichtigungen wurden abgelehnt. Bitte erlaube sie in den Browser-Einstellungen.')
    }
  }

  const handleTestNotification = () => {
    const dueCards      = data.flashcards.filter(c => c.dueDate <= new Date().toISOString().slice(0, 10)).length
    const upcomingExams = data.events
      .filter(e => e.type === 'pruefung')
      .map(e => {
        const d = new Date(e.date)
        const daysUntil = Math.ceil((d.getTime() - Date.now()) / 86400000)
        return { title: e.title, daysUntil }
      })
      .filter(e => e.daysUntil >= 0 && e.daysUntil <= 7)
    checkAndSendReminders({ dueCards, upcomingExams })
    if (dueCards === 0 && upcomingExams.length === 0) {
      sendNotification('Alles auf dem neuesten Stand!', 'Keine fälligen Karten oder bevorstehenden Prüfungen.', 'test')
    }
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
        <h2 className="font-semibold th-text mb-4 flex items-center gap-2">
          <FileArchive size={16} /> Backup & Wiederherstellung
        </h2>

        {/* Export options */}
        <div
          className="rounded-xl p-4 mb-4 space-y-3"
          style={{ background: 'var(--th-bg-secondary)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--th-text-3)' }}>
            Exportieren
          </p>

          {/* Quick export */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--th-text)' }}>Schnell-Backup</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--th-text-3)' }}>
                Alle Daten außer PDF-Inhalte — sofort verfügbar
              </p>
            </div>
            <button onClick={handleExport} className="th-btn th-btn-secondary gap-1.5 text-sm shrink-0" style={{ minHeight: 'auto' }}>
              <Download size={14} /> JSON
            </button>
          </div>

          {/* Full export */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--th-text)' }}>Vollständiges Backup</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--th-text-3)' }}>
                Inklusive aller PDF-Studienbriefe — selbst-enthaltend, größere Datei
              </p>
              {fullExportProgress && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 size={12} className="animate-spin" style={{ color: 'var(--th-accent)' }} />
                    <span className="text-xs" style={{ color: 'var(--th-accent)' }}>
                      PDF {fullExportProgress.done}/{fullExportProgress.total} geladen…
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--th-border)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(fullExportProgress.done / fullExportProgress.total) * 100}%`,
                        background: 'var(--th-accent)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleFullExport}
              disabled={!!fullExportProgress}
              className="th-btn th-btn-primary gap-1.5 text-sm shrink-0"
              style={{ minHeight: 'auto' }}
            >
              {fullExportProgress
                ? <Loader2 size={14} className="animate-spin" />
                : <Download size={14} />}
              Voll
            </button>
          </div>
        </div>

        {/* Import */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--th-bg-secondary)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--th-text-3)' }}>
            Importieren
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--th-text-2)' }}>
            Stelle ein vorhandenes Backup wieder her. Du siehst zuerst eine Vorschau.
          </p>
          <button onClick={() => importRef.current?.click()} className="th-btn th-btn-secondary gap-1.5 text-sm" style={{ minHeight: 'auto' }}>
            <Upload size={14} /> Backup-Datei auswählen
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportSelect} />
        </div>
      </div>

      {/* Import preview modal */}
      {importPreview && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--th-card)', border: '1px solid var(--th-border)' }}
          >
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--th-border)' }}>
              <h2 className="text-base font-bold" style={{ color: 'var(--th-text)' }}>Backup importieren</h2>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Metadata */}
              <div className="text-sm space-y-1" style={{ color: 'var(--th-text-2)' }}>
                <div>
                  <span style={{ color: 'var(--th-text-3)' }}>Erstellt am: </span>
                  {importPreview.exportedAt !== 'Unbekannt'
                    ? new Date(importPreview.exportedAt).toLocaleString('de-DE')
                    : 'Unbekannt'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--th-text-3)' }}>Typ: </span>
                  {importPreview.fullBackup
                    ? <span style={{ color: '#16a34a' }} className="flex items-center gap-1">
                        <Check size={13} /> Vollständiges Backup (mit PDFs)
                      </span>
                    : <span>Schnell-Backup (ohne PDFs)</span>}
                </div>
              </div>

              {/* Data counts */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Module',       value: importPreview.modules },
                  { label: 'Dokumente',    value: importPreview.documents },
                  { label: 'Karteikarten', value: importPreview.flashcards },
                  { label: 'Kästen',       value: importPreview.decks },
                  { label: 'Termine',      value: importPreview.events },
                  { label: 'Sessions',     value: importPreview.sessions },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-lg px-3 py-2 text-center"
                    style={{ background: 'var(--th-bg-secondary)' }}
                  >
                    <div className="text-lg font-bold" style={{ color: 'var(--th-text)' }}>{value}</div>
                    <div className="text-xs" style={{ color: 'var(--th-text-3)' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Warning */}
              <div
                className="flex items-start gap-2.5 rounded-xl p-3 text-sm"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                <p style={{ color: '#92400E' }}>
                  Die Daten werden mit den bestehenden Einträgen zusammengeführt (Merge). Gleichnamige IDs werden überschrieben.
                </p>
              </div>
            </div>

            <div
              className="flex gap-3 px-6 py-4 justify-end"
              style={{ borderTop: '1px solid var(--th-border)' }}
            >
              <button
                onClick={() => { setImportPreview(null); setImportFile(null) }}
                className="th-btn th-btn-secondary"
                disabled={importLoading}
              >
                Abbrechen
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={importLoading}
                className="th-btn th-btn-primary gap-2"
              >
                {importLoading
                  ? <><Loader2 size={15} className="animate-spin" /> Wird importiert…</>
                  : <><Upload size={15} /> Importieren</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="th-card p-5 mb-6">
        <h2 className="font-semibold th-text mb-4 flex items-center gap-2"><Bell size={16} /> Benachrichtigungen</h2>

        {typeof Notification === 'undefined' ? (
          <p className="text-sm th-text-3">Dein Browser unterstützt keine Benachrichtigungen.</p>
        ) : Notification.permission === 'granted' ? (
          <>
            <div className="flex items-center gap-2 text-sm mb-4" style={{ color: '#16a34a' }}>
              <Check size={15} aria-hidden="true" /> Benachrichtigungen sind aktiv
            </div>
            <ul className="text-sm space-y-1.5 mb-4" style={{ color: 'var(--th-text-2)' }}>
              <li>• Fällige Karteikarten (max. einmal alle 12 Stunden)</li>
              <li>• Prüfungen innerhalb der nächsten 7 Tage</li>
              <li>• Werden beim Öffnen der App geprüft</li>
            </ul>
            <button onClick={handleTestNotification} className="th-btn th-btn-secondary gap-2 text-sm">
              <Bell size={15} /> Testbenachrichtigung senden
            </button>
          </>
        ) : (
          <>
            <p className="text-sm th-text-2 mb-4">
              Aktiviere Browser-Benachrichtigungen, um an fällige Karteikarten und bevorstehende Prüfungen erinnert zu werden.
            </p>
            <button onClick={handleNotifications} className="th-btn th-btn-primary gap-2 text-sm">
              <Bell size={15} /> Benachrichtigungen aktivieren
            </button>
            {Notification.permission === 'denied' && (
              <p className="text-xs mt-2" style={{ color: 'var(--th-danger)' }}>
                Benachrichtigungen wurden blockiert. Bitte erlaube sie in den Browser-Einstellungen (Adressleiste).
              </p>
            )}
          </>
        )}
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

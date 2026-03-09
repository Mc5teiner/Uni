import { useState, useEffect, useCallback } from 'react'
import { admin, settings as settingsApi, formatBytes, type AdminUser } from '../api/client'
import {
  Users, HardDrive, Shield, ShieldOff, Trash2, Plus, Key,
  RefreshCw, Settings, Mail, Check, X, ChevronRight, Eye, EyeOff,
  AlertTriangle, Globe, Lock,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StorageBar({ used, limit, pct }: { used: number; limit: number; pct: number }) {
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-teal-500'
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-0.5">
        <span>{formatBytes(used)}</span>
        <span>{formatBytes(limit)}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

// ─── Create/Edit User Modal ───────────────────────────────────────────────────

interface UserFormData {
  username: string; email: string; name: string; password: string
  role: 'user' | 'admin'; storage_limit_gb: string; study_type: string; study_program: string
  send_welcome: boolean
}

function UserModal({
  initial, onSave, onClose,
}: {
  initial?: AdminUser
  onSave: () => void
  onClose: () => void
}) {
  const isEdit = !!initial
  const [form, setForm] = useState<UserFormData>({
    username:       initial?.username ?? '',
    email:          initial?.email ?? '',
    name:           initial?.name ?? '',
    password:       '',
    role:           initial?.role ?? 'user',
    storage_limit_gb: initial ? String(Math.round(initial.storageLimit / 1_073_741_824)) : '5',
    study_type:     initial?.studyType ?? '',
    study_program:  initial?.studyProgram ?? '',
    send_welcome:   !isEdit,
  })
  const [showPw, setShowPw] = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [tempPw, setTempPw] = useState('')

  function set(f: keyof UserFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(v => ({ ...v, [f]: e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value }))
  }

  async function handleSave() {
    setError('')
    setLoading(true)
    try {
      const limitBytes = Math.round(parseFloat(form.storage_limit_gb) * 1_073_741_824)
      if (isEdit) {
        await admin.updateUser(initial!.id, {
          username: form.username, email: form.email, name: form.name,
          role: form.role, storageLimit: limitBytes,
          studyType: (form.study_type as AdminUser['studyType']) || null,
          studyProgram: form.study_program || null,
        })
        if (form.password) {
          const r = await admin.setPassword(initial!.id, form.password)
          if (r.temporaryPassword) setTempPw(r.temporaryPassword)
        }
      } else {
        const r = await admin.createUser({
          username: form.username, email: form.email, name: form.name,
          password: form.password || undefined, role: form.role,
          storageLimit: limitBytes,
          studyType: (form.study_type as AdminUser['studyType']) || undefined,
          studyProgram: form.study_program || undefined,
          send_welcome: form.send_welcome,
        })
        if (r.temporaryPassword) setTempPw(r.temporaryPassword)
      }
      onSave()
      if (!tempPw) onClose()
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  if (tempPw) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center gap-2 mb-3 text-green-600">
            <Check size={20} /><h3 className="font-semibold">Benutzer angelegt</h3>
          </div>
          <p className="text-sm text-slate-600 mb-3">Temporäres Passwort (bitte sofort ändern):</p>
          <div className="font-mono bg-slate-100 px-3 py-2 rounded-lg text-sm break-all select-all">{tempPw}</div>
          <button onClick={onClose} className="mt-4 w-full py-2 bg-[#003366] text-white rounded-lg text-sm hover:bg-[#004488]">
            Schließen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'Benutzer bearbeiten' : 'Benutzer anlegen'}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {error && <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Vollständiger Name</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                placeholder="Max Mustermann" value={form.name} onChange={set('name')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Benutzername</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                placeholder="benutzer123" value={form.username} onChange={set('username')} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">E-Mail</label>
            <input type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
              placeholder="user@example.com" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Passwort {isEdit && <span className="text-slate-400 font-normal">(leer = nicht ändern)</span>}
              {!isEdit && <span className="text-slate-400 font-normal"> (leer = auto-generiert)</span>}
            </label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} minLength={isEdit && form.password ? 12 : 0}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                placeholder={isEdit ? '(unverändert)' : '(auto-generieren)'} value={form.password} onChange={set('password')} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rolle</label>
              <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.role} onChange={set('role')}>
                <option value="user">Benutzer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Speicherlimit (GB)</label>
              <input type="number" min="0.1" step="0.5" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={form.storage_limit_gb} onChange={set('storage_limit_gb')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Studientyp</label>
              <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={form.study_type} onChange={set('study_type')}>
                <option value="">—</option>
                <option value="bachelor">Bachelor</option>
                <option value="master">Master</option>
                <option value="zertifikat">Zertifikat</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Studiengang</label>
              <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="z. B. Informatik" value={form.study_program} onChange={set('study_program')} />
            </div>
          </div>
          {!isEdit && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={form.send_welcome}
                onChange={e => setForm(f => ({ ...f, send_welcome: e.target.checked }))} />
              Willkommens-E-Mail senden
            </label>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Abbrechen</button>
          <button onClick={handleSave} disabled={loading}
            className="px-4 py-2 text-sm bg-[#003366] text-white rounded-lg hover:bg-[#004488] disabled:opacity-60">
            {loading ? 'Speichern…' : isEdit ? 'Speichern' : 'Anlegen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'smtp' | 'email' | 'system'>('smtp')
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    settingsApi.get().then(setValues).finally(() => setLoading(false))
  }, [])

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues(v => ({ ...v, [k]: e.target.value }))
  }

  async function save() {
    setSaving(true); setMsg(null)
    try {
      await settingsApi.update(values)
      setMsg({ ok: true, text: 'Einstellungen gespeichert.' })
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }) }
    finally { setSaving(false) }
  }

  async function testSmtp() {
    setTesting(true); setMsg(null)
    try {
      await settingsApi.testSmtp()
      setMsg({ ok: true, text: 'SMTP-Verbindung erfolgreich!' })
    } catch (err) { setMsg({ ok: false, text: (err as Error).message }) }
    finally { setTesting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-slate-800">System-Einstellungen</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5">
          {([['smtp','SMTP'], ['email','E-Mail-Vorlagen'], ['system','System']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === id ? 'border-[#003366] text-[#003366]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Lade Einstellungen…</div>
        ) : (
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {msg && (
              <div className={`px-3 py-2 rounded-lg text-sm border ${msg.ok
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'}`}>
                {msg.text}
              </div>
            )}

            {tab === 'smtp' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">SMTP-Host</label>
                    <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="smtp.example.com" value={values.smtp_host ?? ''} onChange={set('smtp_host')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Port</label>
                    <input type="number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="587" value={values.smtp_port ?? '587'} onChange={set('smtp_port')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Benutzername</label>
                    <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="user@example.com" value={values.smtp_user ?? ''} onChange={set('smtp_user')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Passwort</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm"
                        placeholder={values.smtp_pass === '__ENCRYPTED__' ? '(gespeichert)' : ''}
                        value={values.smtp_pass === '__ENCRYPTED__' ? '' : (values.smtp_pass ?? '')}
                        onChange={set('smtp_pass')} />
                      <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Absender (From)</label>
                    <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="noreply@example.com" value={values.smtp_from ?? ''} onChange={set('smtp_from')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Verschlüsselung</label>
                    <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      value={values.smtp_secure ?? 'false'} onChange={set('smtp_secure')}>
                      <option value="false">STARTTLS (Port 587)</option>
                      <option value="true">SSL/TLS (Port 465)</option>
                    </select>
                  </div>
                </div>
                <button onClick={testSmtp} disabled={testing}
                  className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 text-slate-700">
                  <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
                  {testing ? 'Teste Verbindung…' : 'SMTP-Verbindung testen'}
                </button>
              </div>
            )}

            {tab === 'email' && (
              <div className="space-y-5">
                {([
                  ['welcome_email_subject', 'welcome_email_html', 'Willkommens-E-Mail'],
                  ['password_reset_email_subject', 'password_reset_email_html', 'Passwort-Reset'],
                  ['password_changed_email_subject', 'password_changed_email_html', 'Passwort geändert'],
                ] as const).map(([subjKey, htmlKey, label]) => (
                  <div key={htmlKey}>
                    <h3 className="text-sm font-medium text-slate-700 mb-2">{label}</h3>
                    <div className="mb-2">
                      <label className="block text-xs text-slate-500 mb-1">Betreff</label>
                      <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={values[subjKey] ?? ''} onChange={set(subjKey)} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        HTML-Inhalt — Variablen: {'{{'}{'{'}name{'}'}{'}'}, {'{{'}{'{'}username{'}'}{'}'}, {'{{'}{'{'}appUrl{'}'}{'}'}, {'{{'}{'{'}resetUrl{'}'}{'}'}
                      </label>
                      <textarea rows={8} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                        value={values[htmlKey] ?? ''} onChange={set(htmlKey)} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'system' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">App-URL</label>
                  <input className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="https://study.example.com" value={values.app_url ?? ''} onChange={set('app_url')} />
                  <p className="text-xs text-slate-400 mt-1">Wird in E-Mail-Links verwendet.</p>
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={values.open_registration === 'true'}
                      onChange={e => setValues(v => ({ ...v, open_registration: e.target.checked ? 'true' : 'false' }))} />
                    <span className="text-sm text-slate-700">Öffentliche Registrierung erlauben</span>
                  </label>
                  <p className="text-xs text-slate-400 mt-1 ml-5">
                    Falls deaktiviert, können Benutzer nur vom Admin angelegt werden.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Schließen</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm bg-[#003366] text-white rounded-lg hover:bg-[#004488] disabled:opacity-60">
            {saving ? 'Speichern…' : 'Einstellungen speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Admin Console ───────────────────────────────────────────────────────

export default function AdminConsolePage() {
  const [users,    setUsers]   = useState<AdminUser[]>([])
  const [storage,  setStorage] = useState<{ totalBytes: number; users: { id: string; username: string; used: number; limit: number; percentage: number }[] } | null>(null)
  const [loading,  setLoading] = useState(true)
  const [tab,      setTab]     = useState<'users' | 'storage'>('users')
  const [editUser, setEditUser] = useState<AdminUser | undefined>()
  const [showCreate, setShowCreate] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)
  const [actionLoading, setActionLoading] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, s] = await Promise.all([admin.listUsers(), admin.storage()])
      setUsers(u); setStorage(s)
    } catch { /* error already shown */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  async function toggleBan(u: AdminUser) {
    setActionLoading(u.id)
    try {
      await admin.updateUser(u.id, { isBanned: !u.isBanned })
      await load()
    } finally { setActionLoading('') }
  }

  async function deleteUser(u: AdminUser) {
    setActionLoading(u.id)
    try {
      await admin.deleteUser(u.id)
      setConfirmDelete(null)
      await load()
    } finally { setActionLoading('') }
  }

  async function generatePassword(u: AdminUser) {
    setActionLoading(u.id + '-pw')
    try {
      const r = await admin.setPassword(u.id)
      if (r.temporaryPassword) {
        alert(`Neues temporäres Passwort für ${u.username}:\n\n${r.temporaryPassword}\n\nBitte sofort ändern!`)
      }
    } finally { setActionLoading('') }
  }

  const totalGb = storage ? (storage.totalBytes / 1_073_741_824).toFixed(2) : '—'

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin-Konsole</h1>
          <p className="text-sm text-slate-500 mt-1">{users.length} Benutzer · {totalGb} GB gesamt</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 text-sm">
            <Settings size={16} /> Einstellungen
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004488] text-sm font-medium">
            <Plus size={16} /> Benutzer anlegen
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 rounded-lg p-1 w-fit">
        {([['users', Users, 'Benutzer'], ['storage', HardDrive, 'Speicher']] as const).map(([id, Icon, label]) => (
          <button key={id} onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> Lade…
        </div>
      ) : tab === 'users' ? (
        /* ── Users Tab ── */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Benutzer</th>
                <th className="px-4 py-3 text-left font-medium">Rolle</th>
                <th className="px-4 py-3 text-left font-medium">Speicher</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className={u.isBanned ? 'opacity-50 bg-red-50' : 'hover:bg-slate-50'}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{u.name || u.username}</div>
                    <div className="text-xs text-slate-400">{u.username} · {u.email}</div>
                    {(u.studyType || u.studyProgram) && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {[u.studyType, u.studyProgram].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.role === 'admin' ? 'bg-[#003366]/10 text-[#003366]' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role === 'admin' ? <Shield size={10} /> : null}
                      {u.role === 'admin' ? 'Admin' : 'Benutzer'}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-40">
                    <StorageBar used={u.storageUsed ?? 0} limit={u.storageLimit} pct={Math.round(((u.storageUsed ?? 0) / u.storageLimit) * 100)} />
                    <div className="text-xs text-slate-400 mt-1">
                      {formatBytes(u.storageUsed ?? 0)} / {formatBytes(u.storageLimit)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.isBanned
                      ? <span className="text-xs text-red-600 font-medium">Gesperrt</span>
                      : <span className="text-xs text-green-600 font-medium">Aktiv</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditUser(u)} title="Bearbeiten"
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><ChevronRight size={14} /></button>
                      <button onClick={() => generatePassword(u)}
                        disabled={actionLoading === u.id + '-pw'}
                        title="Passwort neu setzen"
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                        {actionLoading === u.id + '-pw' ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
                      </button>
                      <button onClick={() => toggleBan(u)} disabled={actionLoading === u.id}
                        title={u.isBanned ? 'Entsperren' : 'Sperren'}
                        className={`p-1.5 rounded hover:bg-slate-100 ${u.isBanned ? 'text-green-600' : 'text-amber-600'}`}>
                        {u.isBanned ? <Shield size={14} /> : <ShieldOff size={14} />}
                      </button>
                      <button onClick={() => setConfirmDelete(u)} title="Löschen"
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Keine Benutzer gefunden.</div>
          )}
        </div>
      ) : (
        /* ── Storage Tab ── */
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{totalGb} GB</div>
              <div className="text-xs text-slate-500 mt-1">Gesamt genutzt</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{users.length}</div>
              <div className="text-xs text-slate-500 mt-1">Benutzer</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">
                {storage ? formatBytes(Math.round(storage.totalBytes / Math.max(users.length, 1))) : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Ø pro Benutzer</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50 text-sm font-medium text-slate-600">
              Speicher pro Benutzer
            </div>
            <div className="divide-y divide-slate-100">
              {(storage?.users ?? [])
                .sort((a, b) => b.used - a.used)
                .map(s => {
                  const u = users.find(x => x.id === s.id)
                  return (
                    <div key={s.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className="font-medium text-slate-800 text-sm">{u?.name || s.username}</span>
                          <span className="text-xs text-slate-400 ml-2">{s.username}</span>
                        </div>
                        <span className="text-xs text-slate-500">{s.percentage}%</span>
                      </div>
                      <StorageBar used={s.used} limit={s.limit} pct={s.percentage} />
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {(showCreate || editUser) && (
        <UserModal
          initial={editUser}
          onSave={load}
          onClose={() => { setShowCreate(false); setEditUser(undefined) }}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 text-red-600 mb-3">
              <AlertTriangle size={20} /><h3 className="font-semibold">Benutzer löschen</h3>
            </div>
            <p className="text-sm text-slate-600 mb-1">
              Alle Daten von <strong>{confirmDelete.username}</strong> werden unwiderruflich gelöscht.
            </p>
            <p className="text-xs text-slate-400 mb-5">Dieser Vorgang kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
                Abbrechen
              </button>
              <button onClick={() => deleteUser(confirmDelete)} disabled={!!actionLoading}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-60">
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unused imports suppressor */}
      <span className="hidden"><Globe size={0} /><Lock size={0} /><Mail size={0} /><Check size={0} /></span>
    </div>
  )
}

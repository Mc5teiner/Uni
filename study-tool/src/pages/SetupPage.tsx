import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function SetupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm]   = useState({ username: '', email: '', password: '', confirmPassword: '', name: '' })
  const [showPw, setShowPw] = useState(false)
  const [error,  setError]  = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    if (form.password.length < 12) {
      setError('Passwort muss mindestens 12 Zeichen haben.')
      return
    }
    setLoading(true)
    try {
      await auth.setup({ username: form.username, email: form.email, password: form.password, name: form.name })
      await login(form.username, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--th-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs font-semibold th-text-3 uppercase tracking-widest mb-1">FernUniversität Hagen</div>
          <h1 className="text-2xl font-bold text-[#003366]">Study Organizer</h1>
          <p className="text-sm th-text-2 mt-2">Ersteinrichtung</p>
        </div>

        <div className="th-card shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={20} className="text-[#003366]" />
            <h2 className="text-lg font-semibold th-text">Administrator anlegen</h2>
          </div>
          <p className="text-sm th-text-2 mb-5">
            Erstelle das erste Admin-Konto. Danach können weitere Benutzer über die Admin-Konsole angelegt werden.
          </p>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Vollständiger Name</label>
              <input required className="th-input"
                placeholder="Max Mustermann" value={form.name} onChange={set('name')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium th-text-2 mb-1">Benutzername</label>
                <input required pattern="[a-zA-Z0-9_.\-]+" minLength={3} maxLength={32}
                  className="th-input"
                  placeholder="admin" value={form.username} onChange={set('username')} />
              </div>
              <div>
                <label className="block text-sm font-medium th-text-2 mb-1">E-Mail</label>
                <input required type="email"
                  className="th-input"
                  placeholder="admin@example.com" value={form.email} onChange={set('email')} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">
                Passwort <span className="th-text-3 font-normal">(min. 12 Zeichen)</span>
              </label>
              <div className="relative">
                <input required type={showPw ? 'text' : 'password'} minLength={12} maxLength={128}
                  autoComplete="new-password"
                  className="w-full border border-[var(--th-border)] rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                  placeholder="••••••••••••" value={form.password} onChange={set('password')} />
                <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 th-text-3 hover:th-text-2">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium th-text-2 mb-1">Passwort bestätigen</label>
              <input required type="password" maxLength={128} autoComplete="new-password"
                className="th-input"
                placeholder="••••••••••••" value={form.confirmPassword} onChange={set('confirmPassword')} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-2.5 th-btn th-btn-primary font-medium text-sm disabled:opacity-60">
              {loading ? 'Einrichten…' : 'Admin-Konto erstellen & einloggen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

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
    <div className="md-auth-wrapper">
      <div className="w-full max-w-md">
        <div className="th-card" style={{ overflow: 'visible', padding: '0 1.5rem 1.5rem' }}>
          {/* Green gradient header */}
          <div className="md-auth-header" style={{ margin: '0 1rem', transform: 'translateY(-1.5rem)' }}>
            <ShieldCheck size={28} color="white" aria-hidden="true" />
            <h1 className="text-xl font-bold text-white mt-2">Ersteinrichtung</h1>
            <p className="text-sm text-white/70 mt-1">Administrator anlegen</p>
          </div>

          <div style={{ marginTop: '-0.5rem' }}>
            <p className="text-sm mb-5" style={{ color: 'var(--th-text-2)' }}>
              Erstelle das erste Admin-Konto. Danach können weitere Benutzer über die Admin-Konsole angelegt werden.
            </p>

            {error && (
              <div
                className="mb-4 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: 'var(--th-danger-soft)',
                  border: '1px solid color-mix(in srgb, var(--th-danger) 25%, transparent)',
                  color: 'var(--th-danger)',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="setup-name" className="th-label">Vollständiger Name</label>
                <input
                  id="setup-name"
                  required
                  className="th-input"
                  placeholder="Max Mustermann"
                  value={form.name}
                  onChange={set('name')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="setup-username" className="th-label">Benutzername</label>
                  <input
                    id="setup-username"
                    required
                    pattern="[a-zA-Z0-9_.\-]+"
                    minLength={3}
                    maxLength={32}
                    className="th-input"
                    placeholder="admin"
                    value={form.username}
                    onChange={set('username')}
                  />
                </div>
                <div>
                  <label htmlFor="setup-email" className="th-label">E-Mail</label>
                  <input
                    id="setup-email"
                    required
                    type="email"
                    className="th-input"
                    placeholder="admin@example.com"
                    value={form.email}
                    onChange={set('email')}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="setup-password" className="th-label">
                  Passwort <span style={{ color: 'var(--th-text-3)', fontWeight: 'normal' }}>(min. 12 Zeichen)</span>
                </label>
                <div className="relative">
                  <input
                    id="setup-password"
                    required
                    type={showPw ? 'text' : 'password'}
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    className="th-input"
                    style={{ paddingRight: '2.75rem' }}
                    placeholder="••••••••••••"
                    value={form.password}
                    onChange={set('password')}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 th-icon-btn"
                    style={{ color: 'var(--th-text-3)', width: '1.75rem', height: '1.75rem' }}
                    aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="setup-confirm" className="th-label">Passwort bestätigen</label>
                <input
                  id="setup-confirm"
                  required
                  type="password"
                  maxLength={128}
                  autoComplete="new-password"
                  className="th-input"
                  placeholder="••••••••••••"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="th-btn th-btn-primary w-full"
              >
                {loading ? 'Einrichten…' : 'Admin-Konto erstellen & einloggen'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

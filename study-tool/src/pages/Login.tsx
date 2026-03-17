import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../api/client'
import { Eye, EyeOff, LogIn, GraduationCap, AlertCircle, UserPlus } from 'lucide-react'

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = (location.state as { from?: string })?.from ?? '/'

  const [username,          setUsername]          = useState('')
  const [password,          setPassword]          = useState('')
  const [showPw,            setShowPw]            = useState(false)
  const [error,             setError]             = useState('')
  const [loading,           setLoading]           = useState(false)
  const [registrationOpen,  setRegistrationOpen]  = useState(false)

  useEffect(() => {
    auth.registrationStatus().then(s => setRegistrationOpen(s.open)).catch(() => { /* ignore */ })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="md-auth-wrapper">
      <div className="w-full max-w-sm">
        <div className="th-card" style={{ overflow: 'visible', padding: '0 1.5rem 1.5rem' }}>
          {/* Green gradient header */}
          <div className="md-auth-header" style={{ margin: '0 1rem', transform: 'translateY(-1.5rem)' }}>
            <GraduationCap size={28} color="white" aria-hidden="true" />
            <h1 className="text-xl font-bold text-white mt-2">Anmelden</h1>
            <p className="text-sm text-white/70 mt-1">Melde dich an, um weiterzulernen.</p>
          </div>

          <div style={{ marginTop: '-0.5rem' }}>
            {/* Error alert */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: 'var(--th-danger-soft)',
                  border: '1px solid color-mix(in srgb, var(--th-danger) 25%, transparent)',
                  color: 'var(--th-danger)',
                }}
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="space-y-5">
                {/* Username field */}
                <div>
                  <label htmlFor="login-username" className="th-label">
                    Benutzername oder E-Mail
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    required
                    aria-required="true"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="th-input"
                    placeholder="benutzername"
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                </div>

                {/* Password field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="login-password" className="th-label" style={{ margin: 0 }}>
                      Passwort
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium hover:underline focus-visible:underline"
                      style={{ color: 'var(--th-accent)' }}
                    >
                      Vergessen?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      aria-required="true"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="th-input"
                      style={{ paddingRight: '2.75rem' }}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 th-icon-btn"
                      style={{ color: 'var(--th-text-3)', width: '1.75rem', height: '1.75rem' }}
                      aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                      aria-pressed={showPw}
                    >
                      {showPw
                        ? <EyeOff size={16} aria-hidden="true" />
                        : <Eye    size={16} aria-hidden="true" />
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="th-btn th-btn-primary w-full mt-6"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin"
                      aria-hidden="true"
                      style={{ animation: 'spin 0.7s linear infinite' }}
                    />
                    Anmelden…
                  </>
                ) : (
                  <>
                    <LogIn size={16} aria-hidden="true" />
                    Anmelden
                  </>
                )}
              </button>
            </form>

            {registrationOpen && (
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--th-border)' }}>
                <p className="text-sm text-center mb-3" style={{ color: 'var(--th-text-3)' }}>
                  Noch kein Konto?
                </p>
                <Link
                  to="/register"
                  className="th-btn w-full flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ border: '1px solid var(--th-border)', color: 'var(--th-text-2)', background: 'var(--th-card)' }}
                >
                  <UserPlus size={16} aria-hidden="true" />
                  Kostenlos registrieren
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

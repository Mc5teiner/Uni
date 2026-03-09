import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, LogIn, GraduationCap, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = (location.state as { from?: string })?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

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
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--th-bg)' }}
    >
      {/* Left panel — decorative (hidden on small screens) */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[50%] flex-col justify-between p-12 relative overflow-hidden"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(145deg, var(--th-accent) 0%, color-mix(in srgb, var(--th-accent) 55%, #6D28D9) 100%)',
        }}
      >
        {/* Background decoration */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.4) 0%, transparent 40%),
                              radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 35%)`,
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.5)' }}
        />
        <div
          className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-8"
          style={{ background: 'rgba(255,255,255,0.3)' }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.20)' }}
          >
            <GraduationCap size={24} color="white" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-white/60">
              FernUniversität Hagen
            </div>
            <div className="text-lg font-bold text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>
              Study Organizer
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: '-0.03em', lineHeight: '1.15' }}>
            Organisiere dein<br />Fernstudium.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Module, Studienbriefe, Karteikarten und Termine — alles an einem Ort. Für Studierende der FernUniversität in Hagen.
          </p>

          {/* Feature list */}
          <ul className="mt-8 space-y-3">
            {[
              'Spaced-Repetition Karteikarten (SM-2)',
              'PDF-Studienbriefe mit Lesefortschritt',
              'Prüfungs- und Abgabenverwaltung',
            ].map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.20)' }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo (shown only on small screens) */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--th-accent)' }}
            >
              <GraduationCap size={20} color="white" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--th-text-3)' }}>
                FernUniversität Hagen
              </div>
              <div className="text-base font-bold" style={{ color: 'var(--th-text)', letterSpacing: '-0.02em' }}>
                Study Organizer
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-2xl font-bold mb-1"
              style={{ color: 'var(--th-text)', letterSpacing: '-0.03em' }}
            >
              Willkommen zurück
            </h1>
            <p className="text-sm" style={{ color: 'var(--th-text-2)' }}>
              Melde dich an, um weiterzulernen.
            </p>
          </div>

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
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

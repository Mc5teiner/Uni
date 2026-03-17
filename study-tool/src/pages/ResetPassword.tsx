import { useState, type FormEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { auth } from '../api/client'
import { Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const token      = params.get('token') ?? ''

  const [password, setPassword]   = useState('')
  const [confirm,  setConfirm]    = useState('')
  const [showPw,   setShowPw]     = useState(false)
  const [error,    setError]      = useState('')
  const [loading,  setLoading]    = useState(false)
  const [success,  setSuccess]    = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwörter stimmen nicht überein.'); return }
    if (password.length < 12) { setError('Mindestens 12 Zeichen erforderlich.'); return }
    setLoading(true)
    try {
      await auth.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="md-auth-wrapper">
        <div className="th-card p-6 max-w-sm w-full text-center" style={{ border: '1px solid color-mix(in srgb, var(--th-danger) 25%, transparent)' }}>
          <p className="text-sm mb-4" style={{ color: 'var(--th-danger)' }}>Ungültiger oder fehlender Token.</p>
          <Link to="/login" className="text-sm hover:underline" style={{ color: 'var(--th-accent)' }}>Zum Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="md-auth-wrapper">
      <div className="w-full max-w-sm">
        <div className="th-card" style={{ overflow: 'visible', padding: '0 1.5rem 1.5rem' }}>
          {/* Green gradient header */}
          <div className="md-auth-header" style={{ margin: '0 1rem', transform: 'translateY(-1.5rem)' }}>
            <ShieldCheck size={28} color="white" aria-hidden="true" />
            <h1 className="text-xl font-bold text-white mt-2">Neues Passwort</h1>
            <p className="text-sm text-white/70 mt-1">Wähle ein sicheres Passwort.</p>
          </div>

          <div style={{ marginTop: '-0.5rem' }}>
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm mb-4 hover:underline"
              style={{ color: 'var(--th-text-2)' }}
            >
              <ArrowLeft size={14} /> Zum Login
            </Link>

            {success ? (
              <div className="text-center py-4">
                <ShieldCheck size={40} className="mx-auto mb-3" style={{ color: 'var(--th-accent)' }} />
                <p className="font-semibold" style={{ color: 'var(--th-text)' }}>Passwort geändert!</p>
                <p className="text-sm mt-1" style={{ color: 'var(--th-text-2)' }}>Du wirst weitergeleitet…</p>
              </div>
            ) : (
              <>
                {error && (
                  <div
                    className="mb-3 px-3 py-2 rounded-lg text-sm"
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
                    <label htmlFor="reset-password" className="th-label">
                      Neues Passwort <span style={{ color: 'var(--th-text-3)', fontWeight: 'normal' }}>(min. 12 Zeichen)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reset-password"
                        required
                        type={showPw ? 'text' : 'password'}
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="th-input"
                        style={{ paddingRight: '2.75rem' }}
                        placeholder="••••••••••••"
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
                    <label htmlFor="reset-confirm" className="th-label">Bestätigen</label>
                    <input
                      id="reset-confirm"
                      required
                      type="password"
                      maxLength={128}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className="th-input"
                      placeholder="••••••••••••"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="th-btn th-btn-primary w-full"
                  >
                    {loading ? 'Speichern…' : 'Passwort speichern'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

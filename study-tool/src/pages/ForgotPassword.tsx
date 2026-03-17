import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../api/client'
import { Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.forgotPassword(email)
      setSent(true)
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
            <Mail size={28} color="white" aria-hidden="true" />
            <h1 className="text-xl font-bold text-white mt-2">Passwort zurücksetzen</h1>
            <p className="text-sm text-white/70 mt-1">Wir senden dir einen Reset-Link.</p>
          </div>

          <div style={{ marginTop: '-0.5rem' }}>
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm mb-4 hover:underline"
              style={{ color: 'var(--th-text-2)' }}
            >
              <ArrowLeft size={14} /> Zurück zum Login
            </Link>

            {sent ? (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm"
                style={{
                  color: 'var(--th-accent)',
                  background: 'color-mix(in srgb, var(--th-accent) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--th-accent) 25%, transparent)',
                }}
              >
                <Mail size={16} className="shrink-0" />
                Falls ein Konto mit dieser E-Mail existiert, wird eine Nachricht versendet.
              </div>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: 'var(--th-text-2)' }}>
                  Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.
                </p>
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
                    <label htmlFor="forgot-email" className="th-label">E-Mail</label>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="th-input"
                      placeholder="deine@email.de"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="th-btn th-btn-primary w-full"
                  >
                    {loading ? 'Senden…' : 'Reset-Link anfordern'}
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

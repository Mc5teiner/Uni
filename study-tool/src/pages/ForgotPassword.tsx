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
    <div className="min-h-screen bg-[var(--th-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs font-semibold th-text-3 uppercase tracking-widest mb-1">FernUniversität Hagen</div>
          <h1 className="text-2xl font-bold text-[#003366]">Study Organizer</h1>
        </div>

        <div className="th-card shadow-sm p-6">
          <Link to="/login" className="flex items-center gap-1.5 text-sm th-text-2 hover:th-text-2 mb-4">
            <ArrowLeft size={14} /> Zurück zum Login
          </Link>
          <h2 className="text-lg font-semibold th-text mb-1">Passwort zurücksetzen</h2>

          {sent ? (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-3 text-sm">
                <Mail size={16} className="shrink-0" />
                Falls ein Konto mit dieser E-Mail existiert, wird eine Nachricht versendet.
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm th-text-2 mb-4">
                Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.
              </p>
              {error && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium th-text-2 mb-1">E-Mail</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="th-input"
                    placeholder="deine@email.de" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 th-btn th-btn-primary font-medium text-sm disabled:opacity-60">
                  {loading ? 'Senden…' : 'Reset-Link anfordern'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

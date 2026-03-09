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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">FernUniversität Hagen</div>
          <h1 className="text-2xl font-bold text-[#003366]">Study Organizer</h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <Link to="/login" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
            <ArrowLeft size={14} /> Zurück zum Login
          </Link>
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Passwort zurücksetzen</h2>

          {sent ? (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-3 text-sm">
                <Mail size={16} className="shrink-0" />
                Falls ein Konto mit dieser E-Mail existiert, wird eine Nachricht versendet.
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-4">
                Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.
              </p>
              {error && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    placeholder="deine@email.de" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-[#003366] text-white rounded-lg hover:bg-[#004488] font-medium text-sm disabled:opacity-60">
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

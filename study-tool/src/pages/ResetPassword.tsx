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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-sm w-full text-center">
          <p className="text-red-700 text-sm mb-4">Ungültiger oder fehlender Token.</p>
          <Link to="/login" className="text-[#003366] text-sm hover:underline">Zum Login</Link>
        </div>
      </div>
    )
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
            <ArrowLeft size={14} /> Zum Login
          </Link>

          {success ? (
            <div className="text-center py-4">
              <ShieldCheck size={40} className="mx-auto text-green-500 mb-3" />
              <p className="font-semibold text-slate-800">Passwort geändert!</p>
              <p className="text-sm text-slate-500 mt-1">Du wirst weitergeleitet…</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Neues Passwort</h2>
              {error && (
                <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Neues Passwort <span className="text-slate-400 font-normal">(min. 12 Zeichen)</span>
                  </label>
                  <div className="relative">
                    <input required type={showPw ? 'text' : 'password'} minLength={12} maxLength={128}
                      autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                      placeholder="••••••••••••" />
                    <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bestätigen</label>
                  <input required type="password" maxLength={128} autoComplete="new-password"
                    value={confirm} onChange={e => setConfirm(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]"
                    placeholder="••••••••••••" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-[#003366] text-white rounded-lg hover:bg-[#004488] font-medium text-sm disabled:opacity-60">
                  {loading ? 'Speichern…' : 'Passwort speichern'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

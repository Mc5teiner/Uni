import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, GraduationCap, AlertCircle, Check } from 'lucide-react'
import { auth } from '../api/client'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username:      '',
    email:         '',
    password:      '',
    passwordRepeat: '',
    name:          '',
    study_type:    '',
    study_program: '',
  })
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(v => ({ ...v, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.passwordRepeat) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    if (form.password.length < 12) {
      setError('Passwort muss mindestens 12 Zeichen lang sein.')
      return
    }

    setLoading(true)
    try {
      await auth.register({
        username:      form.username,
        email:         form.email,
        password:      form.password,
        name:          form.name,
        study_type:    form.study_type || undefined,
        study_program: form.study_program || undefined,
      })
      setSuccess(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--th-bg)' }}>
        <div className="w-full max-w-sm p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(22,163,74,0.12)' }}
          >
            <Check size={32} style={{ color: '#16a34a' }} />
          </div>
          <h1 className="text-2xl font-bold th-text mb-2">Konto erstellt!</h1>
          <p className="th-text-2 mb-6 text-sm">
            Dein Konto wurde erfolgreich angelegt. Du kannst dich jetzt anmelden.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="th-btn th-btn-primary w-full"
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--th-bg)' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[50%] flex-col justify-between p-12 relative overflow-hidden"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(145deg, var(--th-accent) 0%, color-mix(in srgb, var(--th-accent) 55%, #6D28D9) 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.4) 0%, transparent 40%),
                              radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 35%)`,
          }}
        />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.5)' }} />

        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.20)' }}
          >
            <GraduationCap size={24} color="white" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-white/60">FernUniversität Hagen</div>
            <div className="text-lg font-bold text-white leading-tight" style={{ letterSpacing: '-0.02em' }}>Study Organizer</div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ letterSpacing: '-0.03em', lineHeight: '1.15' }}>
            Jetzt kostenlos<br />registrieren.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Erstelle dein persönliches Konto und organisiere dein Fernstudium mit Karteikarten, Terminen und PDF-Studienbriefen.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-start justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-sm py-4">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--th-accent)' }}>
              <GraduationCap size={20} color="white" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--th-text-3)' }}>FernUniversität Hagen</div>
              <div className="text-base font-bold" style={{ color: 'var(--th-text)', letterSpacing: '-0.02em' }}>Study Organizer</div>
            </div>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--th-text)', letterSpacing: '-0.03em' }}>
              Konto erstellen
            </h1>
            <p className="text-sm" style={{ color: 'var(--th-text-2)' }}>
              Bereits registriert?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--th-accent)' }}>
                Anmelden
              </Link>
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'var(--th-danger-soft)',
                border: '1px solid color-mix(in srgb, var(--th-danger) 25%, transparent)',
                color: 'var(--th-danger)',
              }}
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">

              {/* Name */}
              <div>
                <label htmlFor="reg-name" className="th-label">Vollständiger Name *</label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={set('name')}
                  className="th-input"
                  placeholder="Erika Musterfrau"
                />
              </div>

              {/* Username */}
              <div>
                <label htmlFor="reg-username" className="th-label">Benutzername *</label>
                <input
                  id="reg-username"
                  type="text"
                  autoComplete="username"
                  required
                  value={form.username}
                  onChange={set('username')}
                  className="th-input"
                  placeholder="erika.muster"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--th-text-3)' }}>
                  3–32 Zeichen, nur Buchstaben, Zahlen, _ . -
                </p>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" className="th-label">E-Mail-Adresse *</label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={set('email')}
                  className="th-input"
                  placeholder="erika@example.com"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="th-label">Passwort * (min. 12 Zeichen)</label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={set('password')}
                    className="th-input"
                    style={{ paddingRight: '2.75rem' }}
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 th-icon-btn"
                    style={{ color: 'var(--th-text-3)', width: '1.75rem', height: '1.75rem' }}
                    aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password repeat */}
              <div>
                <label htmlFor="reg-password2" className="th-label">Passwort bestätigen *</label>
                <input
                  id="reg-password2"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.passwordRepeat}
                  onChange={set('passwordRepeat')}
                  className="th-input"
                  placeholder="••••••••••••"
                />
              </div>

              {/* Optional study fields */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: 'var(--th-bg-secondary)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--th-text-3)' }}>
                  Studium (optional)
                </p>

                <div>
                  <label htmlFor="reg-study-type" className="th-label">Abschluss</label>
                  <select
                    id="reg-study-type"
                    value={form.study_type}
                    onChange={set('study_type')}
                    className="th-input"
                  >
                    <option value="">— nicht angegeben —</option>
                    <option value="bachelor">Bachelor</option>
                    <option value="master">Master</option>
                    <option value="zertifikat">Zertifikat</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-study-program" className="th-label">Studiengang</label>
                  <input
                    id="reg-study-program"
                    type="text"
                    value={form.study_program}
                    onChange={set('study_program')}
                    className="th-input"
                    placeholder="z. B. Informatik"
                  />
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={loading || !form.username || !form.email || !form.password || !form.name}
              className="th-btn th-btn-primary w-full mt-6"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin"
                    style={{ animation: 'spin 0.7s linear infinite' }}
                  />
                  Konto erstellen…
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Konto erstellen
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

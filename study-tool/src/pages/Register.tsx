import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, AlertCircle, Check } from 'lucide-react'
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
      <div className="md-auth-wrapper">
        <div className="w-full max-w-sm">
          <div className="th-card" style={{ overflow: 'visible', padding: '0 1.5rem 1.5rem' }}>
            <div className="md-auth-header" style={{ margin: '0 1rem', transform: 'translateY(-1.5rem)' }}>
              <Check size={28} color="white" aria-hidden="true" />
              <h1 className="text-xl font-bold text-white mt-2">Konto erstellt!</h1>
            </div>
            <div className="text-center" style={{ marginTop: '-0.5rem' }}>
              <p className="text-sm mb-6" style={{ color: 'var(--th-text-2)' }}>
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
            <UserPlus size={28} color="white" aria-hidden="true" />
            <h1 className="text-xl font-bold text-white mt-2">Registrieren</h1>
            <p className="text-sm text-white/70 mt-1">Erstelle dein kostenloses Konto.</p>
          </div>

          <div style={{ marginTop: '-0.5rem' }}>
            <p className="text-sm mb-4" style={{ color: 'var(--th-text-2)' }}>
              Bereits registriert?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--th-accent)' }}>
                Anmelden
              </Link>
            </p>

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
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

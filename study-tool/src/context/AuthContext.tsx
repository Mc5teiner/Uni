import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { auth, setAccessToken, type PublicUser } from '../api/client'

interface AuthContextValue {
  user: PublicUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setupNeeded: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]             = useState<PublicUser | null>(null)
  const [loading, setLoading]       = useState(true)
  const [setupNeeded, setSetupNeeded] = useState(false)

  /** Try to restore session via refresh cookie on page load */
  useEffect(() => {
    async function init() {
      try {
        // Check if initial setup is needed
        const { setupNeeded: sn } = await auth.checkSetup()
        if (sn) { setSetupNeeded(true); setLoading(false); return }

        // Try silent token refresh (uses HttpOnly cookie)
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        if (res.ok) {
          const { accessToken, user: u } = await res.json()
          setAccessToken(accessToken)
          setUser(u)
        }
      } catch { /* no session */ }
      setLoading(false)
    }
    void init()
  }, [])

  /** Listen for session-expired events (from API client on failed refresh) */
  useEffect(() => {
    const handler = () => { setUser(null); setAccessToken(null) }
    window.addEventListener('session-expired', handler)
    return () => window.removeEventListener('session-expired', handler)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const { user: u } = await auth.login(username, password)
    setUser(u)
    setSetupNeeded(false)
  }, [])

  const logout = useCallback(async () => {
    await auth.logout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const u = await auth.me()
    setUser(u)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, setupNeeded }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

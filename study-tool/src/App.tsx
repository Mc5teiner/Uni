import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ModulePage from './pages/Module'
import DokumentePage from './pages/Dokumente'
import KarteikartenPage from './pages/Karteikarten'
import KalenderPage from './pages/Kalender'
import EinstellungenPage from './pages/Einstellungen'
import LoginPage from './pages/Login'
import SetupPage from './pages/SetupPage'
import ForgotPasswordPage from './pages/ForgotPassword'
import ResetPasswordPage from './pages/ResetPassword'
import AdminConsolePage from './pages/AdminConsole'
import NotenrechnerPage from './pages/Notenrechner'

// ─── Route guards ─────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, setupNeeded } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm animate-pulse">Laden…</div>
      </div>
    )
  }
  if (setupNeeded) return <Navigate to="/setup" replace />
  if (!user)       return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/setup"          element={<SetupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />

          {/* Protected app routes */}
          <Route path="/" element={
            <RequireAuth>
              <AppProvider>
                <Layout />
              </AppProvider>
            </RequireAuth>
          }>
            <Route index                 element={<Dashboard />} />
            <Route path="module"         element={<ModulePage />} />
            <Route path="dokumente"      element={<DokumentePage />} />
            <Route path="karteikarten"   element={<KarteikartenPage />} />
            <Route path="kalender"       element={<KalenderPage />} />
            <Route path="einstellungen"  element={<EinstellungenPage />} />
            <Route path="notenrechner"   element={<NotenrechnerPage />} />
            <Route path="admin"          element={
              <RequireAdmin><AdminConsolePage /></RequireAdmin>
            } />
          </Route>
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

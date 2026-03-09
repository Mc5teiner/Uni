import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, BrainCircuit,
  Calendar, Settings, LogOut, ShieldCheck, User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',       end: true },
  { to: '/module',       icon: BookOpen,        label: 'Module' },
  { to: '/dokumente',    icon: FileText,        label: 'Studienbriefe' },
  { to: '/karteikarten', icon: BrainCircuit,    label: 'Karteikarten' },
  { to: '/kalender',     icon: Calendar,        label: 'Kalender & Plan' },
  { to: '/einstellungen',icon: Settings,        label: 'Einstellungen' },
]

const STUDY_TYPE_LABEL: Record<string, string> = {
  bachelor:   'B.Sc. / B.A.',
  master:     'M.Sc. / M.A.',
  zertifikat: 'Zertifikat',
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden th-bg">
      {/* Sidebar */}
      <aside className="th-sidebar w-64 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5" style={{ borderBottom: '1px solid var(--th-sidebar-border, rgba(255,255,255,0.12))' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--th-sidebar-muted)' }}>
            FernUniversität
          </div>
          <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--th-sidebar-text)' }}>
            Study Organizer
          </h1>
          <div className="text-xs mt-1" style={{ color: 'var(--th-sidebar-muted)' }}>Hagen</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `th-nav-item flex items-center gap-3 px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'th-nav-item-active' : ''
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `th-nav-item flex items-center gap-3 px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'th-nav-item-active' : ''
                }`
              }
            >
              <ShieldCheck size={18} />
              Admin-Konsole
            </NavLink>
          )}
        </nav>

        {/* User info + logout */}
        <div className="p-4" style={{ borderTop: '1px solid var(--th-sidebar-border, rgba(255,255,255,0.12))' }}>
          {user && (
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--th-nav-active-bg)', color: 'var(--th-nav-active-text)' }}
              >
                <User size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--th-sidebar-text)' }}>
                  {user.name || user.username}
                </div>
                {(user.studyType || user.studyProgram) && (
                  <div className="text-[10px] truncate" style={{ color: 'var(--th-sidebar-muted)' }}>
                    {[STUDY_TYPE_LABEL[user.studyType ?? ''] ?? user.studyType, user.studyProgram]
                      .filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="th-nav-item w-full flex items-center gap-2 px-3 py-2 text-xs"
          >
            <LogOut size={14} />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto th-bg">
        <Outlet />
      </main>
    </div>
  )
}

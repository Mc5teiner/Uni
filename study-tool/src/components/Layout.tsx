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
  bachelor:  'B.Sc. / B.A.',
  master:    'M.Sc. / M.A.',
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#003366] text-white flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-blue-800">
          <div className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-1">FernUniversität</div>
          <h1 className="text-xl font-bold leading-tight">Study Organizer</h1>
          <div className="text-xs text-blue-300 mt-1">Hagen</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}

          {/* Admin link — only for admins */}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <ShieldCheck size={18} />
              Admin-Konsole
            </NavLink>
          )}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-blue-800">
          {user && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <User size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{user.name || user.username}</div>
                {(user.studyType || user.studyProgram) && (
                  <div className="text-[10px] text-blue-300 truncate">
                    {[STUDY_TYPE_LABEL[user.studyType ?? ''] ?? user.studyType, user.studyProgram]
                      .filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-blue-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

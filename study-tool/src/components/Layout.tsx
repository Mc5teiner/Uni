import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, BrainCircuit,
  Calendar, Settings, LogOut, ShieldCheck, User, Menu, X,
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

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Logo */}
      <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--th-sidebar-border, rgba(255,255,255,0.12))' }}>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--th-sidebar-muted)' }}>
            FernUniversität
          </div>
          <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--th-sidebar-text)' }}>
            Study Organizer
          </h1>
          <div className="text-xs mt-0.5" style={{ color: 'var(--th-sidebar-muted)' }}>Hagen</div>
        </div>
        {/* Close button (mobile only) */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg th-nav-item"
            aria-label="Sidebar schließen"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
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
            onClick={onClose}
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
    </>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden th-bg">
      {/* ── Desktop sidebar (always visible ≥ md) ── */}
      <aside className="th-sidebar w-64 flex-col flex-shrink-0 hidden md:flex">
        <SidebarContent />
      </aside>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile sidebar (slide in) ── */}
      <aside
        className={`th-sidebar fixed inset-y-0 left-0 z-50 w-64 flex flex-col flex-shrink-0 md:hidden
          transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto th-bg flex flex-col">
        {/* Mobile header bar */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-30"
          style={{ background: 'var(--th-sidebar)', borderBottom: '1px solid var(--th-sidebar-border, rgba(255,255,255,0.12))' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg th-nav-item"
            aria-label="Menü öffnen"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--th-sidebar-text)' }}>
            Study Organizer
          </span>
        </header>

        {/* Page content */}
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

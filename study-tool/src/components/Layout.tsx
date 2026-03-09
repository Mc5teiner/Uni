import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, BrainCircuit,
  Calendar, Settings, LogOut, ShieldCheck, Menu, X,
  GraduationCap,
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
  bachelor:   'Bachelor',
  master:     'Master',
  zertifikat: 'Zertifikat',
}

/** Returns initials from a name or username */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function UserAvatar({ name }: { name: string }) {
  const initials = getInitials(name)
  return (
    <div
      aria-hidden="true"
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
      style={{
        background: 'linear-gradient(135deg, var(--th-accent) 0%, color-mix(in srgb, var(--th-accent) 70%, #8B5CF6) 100%)',
        color: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
      }}
    >
      {initials}
    </div>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const displayName = user?.name || user?.username || ''

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo / Branding ─────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-5"
        style={{ borderBottom: '1px solid var(--th-sidebar-border, rgba(255,255,255,0.08))' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(255,255,255,0.15)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <GraduationCap size={20} style={{ color: 'var(--th-sidebar-text)' }} aria-hidden="true" />
          </div>
          <div>
            <div
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--th-sidebar-muted)' }}
            >
              FernUniversität Hagen
            </div>
            <div
              className="text-sm font-bold leading-tight"
              style={{ color: 'var(--th-sidebar-text)', letterSpacing: '-0.02em' }}
            >
              Study Organizer
            </div>
          </div>
        </div>

        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden th-icon-btn th-nav-item"
            aria-label="Navigationsmenü schließen"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav
        className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin"
        aria-label="Hauptnavigation"
      >
        <ul className="space-y-0.5" role="list">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `th-nav-item ${isActive ? 'th-nav-item-active' : ''}`
                }
                aria-current={undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      aria-hidden="true"
                      style={{
                        opacity: isActive ? 1 : 0.75,
                        flexShrink: 0,
                      }}
                    />
                    <span>{label}</span>
                    {isActive && (
                      <span className="sr-only">(aktuelle Seite)</span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}

          {user?.role === 'admin' && (
            <li>
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  `th-nav-item ${isActive ? 'th-nav-item-active' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <ShieldCheck size={18} aria-hidden="true" style={{ opacity: isActive ? 1 : 0.75, flexShrink: 0 }} />
                    <span>Admin-Konsole</span>
                    {isActive && <span className="sr-only">(aktuelle Seite)</span>}
                  </>
                )}
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {/* ── User profile + Logout ───────────────────────────────── */}
      <div
        className="px-3 py-4"
        style={{ borderTop: '1px solid var(--th-sidebar-border, rgba(255,255,255,0.08))' }}
      >
        {user && (
          <div
            className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <UserAvatar name={displayName} />
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold truncate leading-tight"
                style={{ color: 'var(--th-sidebar-text)' }}
              >
                {displayName}
              </div>
              {(user.studyType || user.studyProgram) && (
                <div
                  className="text-xs truncate mt-0.5 leading-tight"
                  style={{ color: 'var(--th-sidebar-muted)' }}
                >
                  {[
                    STUDY_TYPE_LABEL[user.studyType ?? ''] ?? user.studyType,
                    user.studyProgram,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="th-nav-item w-full text-sm"
          style={{ color: 'var(--th-sidebar-muted)' }}
        >
          <LogOut size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>Abmelden</span>
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Skip to main content — accessibility */}
      <a href="#main-content" className="skip-link">
        Zum Hauptinhalt springen
      </a>

      <div className="flex h-screen overflow-hidden th-bg">
        {/* ── Desktop sidebar ─────────────────────────────────── */}
        <aside
          className="th-sidebar hidden md:flex flex-col flex-shrink-0"
          style={{ width: 'var(--sidebar-w)' }}
          aria-label="Seitenleiste"
        >
          <SidebarContent />
        </aside>

        {/* ── Mobile overlay ──────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[200] md:hidden"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Mobile sidebar ──────────────────────────────────── */}
        <aside
          className={`th-sidebar fixed inset-y-0 left-0 z-[300] flex flex-col flex-shrink-0 md:hidden
            transform transition-transform duration-250 ease-in-out`}
          style={{
            width: 'var(--sidebar-w)',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
          aria-label="Mobile Navigation"
          aria-hidden={!mobileOpen}
          inert={!mobileOpen ? '' as unknown as boolean : undefined}
        >
          <SidebarContent onClose={() => setMobileOpen(false)} />
        </aside>

        {/* ── Main content area ────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <header
            className="md:hidden flex items-center gap-3 px-4 sticky top-0 z-30 shrink-0"
            style={{
              background: 'var(--th-sidebar)',
              borderBottom: '1px solid var(--th-sidebar-border, rgba(255,255,255,0.08))',
              height: '56px',
            }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              className="th-icon-btn"
              aria-label="Navigationsmenü öffnen"
              aria-expanded={mobileOpen}
              aria-controls="mobile-sidebar"
              style={{ color: 'var(--th-sidebar-text)', opacity: 0.85 }}
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap size={18} style={{ color: 'var(--th-sidebar-text)', opacity: 0.8 }} aria-hidden="true" />
              <span
                className="text-sm font-bold truncate"
                style={{ color: 'var(--th-sidebar-text)', letterSpacing: '-0.02em' }}
              >
                Study Organizer
              </span>
            </div>
          </header>

          {/* Page content */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto scrollbar-thin th-bg"
            tabIndex={-1}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}

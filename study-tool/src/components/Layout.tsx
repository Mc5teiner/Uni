import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, BrainCircuit,
  Calendar, Settings, LogOut, ShieldCheck, Menu, X,
  GraduationCap, ChevronLeft, ChevronRight, Calculator, Timer, Search,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { getDueCards } from '../utils/spaceRepetition'
import { checkAndSendReminders } from '../utils/notifications'
import { differenceInDays, parseISO } from 'date-fns'
import GlobalSearch from './GlobalSearch'

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',       end: true },
  { to: '/module',        icon: BookOpen,        label: 'Module' },
  { to: '/dokumente',     icon: FileText,        label: 'Studienbriefe' },
  { to: '/karteikarten',  icon: BrainCircuit,    label: 'Karteikarten' },
  { to: '/kalender',      icon: Calendar,        label: 'Kalender & Plan' },
  { to: '/notenrechner',  icon: Calculator,      label: 'Notenrechner' },
  { to: '/pomodoro',      icon: Timer,           label: 'Pomodoro' },
  { to: '/einstellungen', icon: Settings,        label: 'Einstellungen' },
]

const SIDEBAR_FULL = 260
const SIDEBAR_MINI = 68

const STUDY_TYPE_LABEL: Record<string, string> = {
  bachelor:   'Bachelor',
  master:     'Master',
  zertifikat: 'Zertifikat',
}

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

function SidebarContent({
  collapsed = false,
  onToggle,
  onClose,
  onSearchOpen,
}: {
  collapsed?: boolean
  onToggle?: () => void
  onClose?: () => void
  onSearchOpen?: () => void
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const displayName = user?.name || user?.username || ''

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Logo / Branding ─────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0 px-4 py-4"
        style={{
          borderBottom: '1px solid var(--th-sidebar-border, rgba(255,255,255,0.08))',
          minHeight: '64px',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(255,255,255,0.15)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <GraduationCap size={20} style={{ color: 'var(--th-sidebar-text)' }} aria-hidden="true" />
          </div>
          {!collapsed && (
            <div className="min-w-0 overflow-hidden">
              <div
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--th-sidebar-muted)', whiteSpace: 'nowrap' }}
              >
                FernUniversität Hagen
              </div>
              <div
                className="text-sm font-bold leading-tight"
                style={{ color: 'var(--th-sidebar-text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}
              >
                Study Organizer
              </div>
            </div>
          )}
        </div>

        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden th-icon-btn"
            style={{ color: 'var(--th-sidebar-muted)', flexShrink: 0 }}
            aria-label="Navigationsmenü schließen"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}

        {/* Collapse toggle — desktop only */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="hidden md:flex items-center justify-center th-icon-btn shrink-0"
            style={{ color: 'var(--th-sidebar-muted)' }}
            aria-label={collapsed ? 'Seitenleiste erweitern' : 'Seitenleiste einklappen'}
          >
            {collapsed
              ? <ChevronRight size={16} aria-hidden="true" />
              : <ChevronLeft  size={16} aria-hidden="true" />
            }
          </button>
        )}
      </div>

      {/* ── Search button ───────────────────────────────────────── */}
      {onSearchOpen && (
        <div className="px-2 pt-3 pb-1">
          <button
            type="button"
            onClick={onSearchOpen}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--th-sidebar-muted)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            aria-label="Suche öffnen (Strg+K)"
          >
            <Search size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-xs" style={{ opacity: 0.75 }}>Suchen…</span>
                <kbd
                  className="font-mono text-[10px] px-1 rounded"
                  style={{ background: 'rgba(255,255,255,0.10)', opacity: 0.6 }}
                >
                  ⌘K
                </kbd>
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav
        className="flex-1 px-2 py-3 overflow-y-auto scrollbar-thin"
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
                  `th-nav-item${isActive ? ' th-nav-item-active' : ''}${collapsed ? ' th-nav-item-collapsed' : ''}`
                }
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      aria-hidden="true"
                      style={{ opacity: isActive ? 1 : 0.75, flexShrink: 0 }}
                    />
                    {!collapsed && <span>{label}</span>}
                    {isActive && <span className="sr-only">(aktuelle Seite)</span>}
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
                  `th-nav-item${isActive ? ' th-nav-item-active' : ''}${collapsed ? ' th-nav-item-collapsed' : ''}`
                }
                aria-label={collapsed ? 'Admin-Konsole' : undefined}
                title={collapsed ? 'Admin-Konsole' : undefined}
              >
                {({ isActive }) => (
                  <>
                    <ShieldCheck size={18} aria-hidden="true" style={{ opacity: isActive ? 1 : 0.75, flexShrink: 0 }} />
                    {!collapsed && <span>Admin-Konsole</span>}
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
        className="px-2 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--th-sidebar-border, rgba(255,255,255,0.08))' }}
      >
        {user && (
          collapsed ? (
            <div className="flex justify-center mb-2">
              <UserAvatar name={displayName} />
            </div>
          ) : (
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
          )
        )}

        <button
          onClick={handleLogout}
          className={`th-nav-item w-full text-sm${collapsed ? ' th-nav-item-collapsed' : ''}`}
          style={{ color: 'var(--th-sidebar-muted)' }}
          aria-label={collapsed ? 'Abmelden' : undefined}
          title={collapsed ? 'Abmelden' : undefined}
        >
          <LogOut size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
          {!collapsed && <span>Abmelden</span>}
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [collapsed,   setCollapsed]   = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const { data }                      = useApp()

  const sidebarW = collapsed ? SIDEBAR_MINI : SIDEBAR_FULL

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Smart daily reminders (runs once on mount when permission is already granted)
  useEffect(() => {
    const dueCards     = getDueCards(data.flashcards)
    const upcomingExams = data.events
      .filter(e => e.type === 'pruefung' && parseISO(e.date) >= new Date())
      .map(e => ({ title: e.title, daysUntil: differenceInDays(parseISO(e.date), new Date()) }))
    checkAndSendReminders({ dueCards: dueCards.length, upcomingExams })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* Skip to main content — accessibility */}
      <a href="#main-content" className="skip-link">
        Zum Hauptinhalt springen
      </a>

      <div className="flex h-screen overflow-hidden th-layout-outer">
        {/* ── Spacer: pushes content right of the fixed floating sidebar ── */}
        <div
          className="hidden md:block flex-shrink-0"
          style={{
            width: sidebarW + 24, // 12px gap on each side
            transition: 'width 280ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          aria-hidden="true"
        />

        {/* ── Desktop floating sidebar ─────────────────────────────── */}
        <aside
          className="th-sidebar th-sidebar-float hidden md:flex flex-col"
          style={{ width: sidebarW }}
          aria-label="Seitenleiste"
        >
          <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} onSearchOpen={() => setSearchOpen(true)} />
        </aside>

        {/* ── Mobile overlay ───────────────────────────────────────── */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[200] md:hidden"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Mobile sidebar ───────────────────────────────────────── */}
        <aside
          className={`th-sidebar fixed inset-y-0 left-0 z-[300] flex flex-col flex-shrink-0 md:hidden
            transform transition-transform duration-250 ease-in-out`}
          style={{
            width: SIDEBAR_FULL,
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
          aria-label="Mobile Navigation"
          aria-hidden={!mobileOpen}
          inert={!mobileOpen ? '' as unknown as boolean : undefined}
        >
          <SidebarContent onClose={() => setMobileOpen(false)} onSearchOpen={() => { setMobileOpen(false); setSearchOpen(true) }} />
        </aside>

        {/* ── Main content area ─────────────────────────────────────── */}
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
              style={{ color: 'var(--th-sidebar-text)', opacity: 0.85 }}
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <GraduationCap size={18} style={{ color: 'var(--th-sidebar-text)', opacity: 0.8 }} aria-hidden="true" />
              <span
                className="text-sm font-bold truncate"
                style={{ color: 'var(--th-sidebar-text)', letterSpacing: '-0.02em' }}
              >
                Study Organizer
              </span>
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              className="th-icon-btn shrink-0"
              aria-label="Suche öffnen"
              style={{ color: 'var(--th-sidebar-text)', opacity: 0.75 }}
            >
              <Search size={20} aria-hidden="true" />
            </button>
          </header>

          {/* Floating content card — on desktop: 12 px gap on top/right/bottom,
              rounded corners + shadow matching the sidebar float style         */}
          <div
            className="flex-1 flex flex-col min-h-0 th-content-float md:mt-3 md:mr-3 md:mb-3"
          >
            <main
              id="main-content"
              className="flex-1 overflow-y-auto scrollbar-thin"
              tabIndex={-1}
            >
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </>
  )
}

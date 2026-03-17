import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, BrainCircuit,
  Calendar, Settings, LogOut, ShieldCheck, Menu, X,
  GraduationCap, ChevronLeft, ChevronRight, Calculator, Timer, Search,
  Bell,
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

const SIDEBAR_FULL = 250
const SIDEBAR_MINI = 68

const PAGE_LABELS: Record<string, string> = {
  '/':              'Dashboard',
  '/module':        'Module',
  '/dokumente':     'Studienbriefe',
  '/karteikarten':  'Karteikarten',
  '/kalender':      'Kalender & Plan',
  '/notenrechner':  'Notenrechner',
  '/pomodoro':      'Pomodoro',
  '/einstellungen': 'Einstellungen',
  '/admin':         'Admin-Konsole',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function SidebarContent({
  collapsed = false,
  onToggle,
  onClose,
}: {
  collapsed?: boolean
  onToggle?: () => void
  onClose?: () => void
}) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Logo / Branding ─────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0 px-6 py-5"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          minHeight: '64px',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <GraduationCap size={collapsed ? 24 : 20} style={{ color: '#ffffff', flexShrink: 0 }} aria-hidden="true" />
          {!collapsed && (
            <span
              className="text-sm font-bold tracking-tight whitespace-nowrap"
              style={{ color: '#ffffff', letterSpacing: '-0.01em' }}
            >
              Study Organizer
            </span>
          )}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden th-icon-btn"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            aria-label="Navigationsmenü schließen"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}

        {onToggle && (
          <button
            onClick={onToggle}
            className="hidden md:flex items-center justify-center th-icon-btn shrink-0"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            aria-label={collapsed ? 'Seitenleiste erweitern' : 'Seitenleiste einklappen'}
          >
            {collapsed
              ? <ChevronRight size={16} aria-hidden="true" />
              : <ChevronLeft  size={16} aria-hidden="true" />
            }
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
                      style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }}
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
                    <ShieldCheck size={18} aria-hidden="true" style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }} />
                    {!collapsed && <span>Admin-Konsole</span>}
                    {isActive && <span className="sr-only">(aktuelle Seite)</span>}
                  </>
                )}
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {/* ── Logout ───────────────────────────────────────────────── */}
      <div
        className="px-3 py-3 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
      >
        <button
          onClick={handleLogout}
          className={`th-nav-item w-full text-sm${collapsed ? ' th-nav-item-collapsed' : ''}`}
          style={{ color: 'rgba(255,255,255,0.5)' }}
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
  const { user }                      = useAuth()
  const location                      = useLocation()

  const sidebarW = collapsed ? SIDEBAR_MINI : SIDEBAR_FULL

  const pageLabel = PAGE_LABELS[location.pathname] || 'Seite'

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

  useEffect(() => {
    const dueCards     = getDueCards(data.flashcards)
    const upcomingExams = data.events
      .filter(e => e.type === 'pruefung' && parseISO(e.date) >= new Date())
      .map(e => ({ title: e.title, daysUntil: differenceInDays(parseISO(e.date), new Date()) }))
    checkAndSendReminders({ dueCards: dueCards.length, upcomingExams })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const displayName = user?.name || user?.username || ''

  return (
    <>
      <a href="#main-content" className="skip-link">
        Zum Hauptinhalt springen
      </a>

      <div className="flex h-screen overflow-hidden th-layout-outer">
        {/* ── Spacer for fixed sidebar ── */}
        <div
          className="hidden md:block flex-shrink-0"
          style={{
            width: sidebarW,
            transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          aria-hidden="true"
        />

        {/* ── Desktop sidebar ─────────────────────────────────── */}
        <aside
          className="th-sidebar th-sidebar-float hidden md:flex flex-col"
          style={{ width: sidebarW }}
          aria-label="Seitenleiste"
        >
          <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
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
            width: SIDEBAR_FULL,
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
          aria-label="Mobile Navigation"
          aria-hidden={!mobileOpen}
          inert={!mobileOpen ? '' as unknown as boolean : undefined}
        >
          <SidebarContent onClose={() => setMobileOpen(false)} />
        </aside>

        {/* ── Main content area ───────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Top Navbar ── */}
          <header
            className="flex items-center gap-4 px-4 md:px-6 shrink-0"
            style={{
              height: '64px',
              background: 'transparent',
            }}
          >
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden th-icon-btn"
              aria-label="Navigationsmenü öffnen"
              aria-expanded={mobileOpen}
              style={{ color: 'var(--th-text-2)' }}
            >
              <Menu size={22} aria-hidden="true" />
            </button>

            {/* Breadcrumb */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--th-text-3)' }}>
                <span>Seiten</span>
                <span>/</span>
                <span style={{ color: 'var(--th-text)' }}>{pageLabel}</span>
              </div>
              <h1 className="text-sm font-bold" style={{ color: 'var(--th-text)' }}>
                {pageLabel}
              </h1>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="th-icon-btn"
                aria-label="Suche öffnen (Strg+K)"
                style={{ color: 'var(--th-text-2)' }}
              >
                <Search size={18} aria-hidden="true" />
              </button>

              {/* Notifications bell */}
              <button
                className="th-icon-btn relative"
                aria-label="Benachrichtigungen"
                style={{ color: 'var(--th-text-2)' }}
              >
                <Bell size={18} aria-hidden="true" />
                {getDueCards(data.flashcards).length > 0 && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full"
                    style={{ background: 'var(--th-danger)' }}
                  />
                )}
              </button>

              {/* User avatar */}
              {displayName && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center ml-1 text-xs font-bold"
                  style={{
                    background: 'var(--md-gradient-dark)',
                    color: '#ffffff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                  title={displayName}
                >
                  {getInitials(displayName)}
                </div>
              )}
            </div>
          </header>

          {/* ── Page content ── */}
          <div className="flex-1 flex flex-col min-h-0">
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

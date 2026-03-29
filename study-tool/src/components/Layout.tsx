import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, BrainCircuit,
  Calendar, Settings, LogOut, ShieldCheck,
  GraduationCap, Calculator, Timer, Search,
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
  { to: '/kalender',      icon: Calendar,        label: 'Kalender' },
  { to: '/notenrechner',  icon: Calculator,      label: 'Noten' },
  { to: '/pomodoro',      icon: Timer,           label: 'Pomodoro' },
  { to: '/einstellungen', icon: Settings,        label: 'Einstellungen' },
]


function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function Layout() {
  const [searchOpen,  setSearchOpen]  = useState(false)
  const { data }                      = useApp()
  const { user, logout }              = useAuth()
  const navigate                      = useNavigate()
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

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const displayName = user?.name || user?.username || ''
  const dueCount = getDueCards(data.flashcards).length

  return (
    <>
      <a href="#main-content" className="skip-link">
        Zum Hauptinhalt springen
      </a>

      <div className="flex flex-col h-screen overflow-hidden th-layout-outer">

        {/* ═══ Top Navigation Rail (steiner.nrw Phase Rail) ═══ */}
        <header
          className="shrink-0"
          style={{
            background: 'var(--p2)',
            borderBottom: '0.5px solid var(--p3)',
          }}
        >
          {/* ── Brand bar ── */}
          <div
            className="flex items-center gap-4 px-4 md:px-6"
            style={{ height: '48px', borderBottom: '0.5px solid var(--p3)' }}
          >
            {/* Brand */}
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap size={18} style={{ color: 'var(--am)', flexShrink: 0 }} aria-hidden="true" />
              <span
                className="font-bold whitespace-nowrap hidden sm:inline"
                style={{ fontSize: 'var(--text-title)', color: 'var(--ink)', letterSpacing: '-0.01em' }}
              >
                Study Organizer
              </span>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right actions */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="th-icon-btn"
                aria-label="Suche öffnen (Strg+K)"
                style={{ color: 'var(--ink3)' }}
              >
                <Search size={16} aria-hidden="true" />
              </button>

              {/* Notifications bell */}
              <button
                className="th-icon-btn relative"
                aria-label="Benachrichtigungen"
                style={{ color: 'var(--ink3)' }}
              >
                <Bell size={16} aria-hidden="true" />
                {dueCount > 0 && (
                  <span
                    className="absolute top-0.5 right-0.5 rounded-full"
                    style={{ width: '6px', height: '6px', background: 'var(--re)' }}
                  />
                )}
              </button>

              {/* User avatar */}
              {displayName && (
                <div
                  className="flex items-center justify-center ml-1"
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--am)',
                    color: '#ffffff',
                    fontSize: 'var(--text-badge)',
                    fontWeight: 500,
                    boxShadow: 'none',
                  }}
                  title={displayName}
                >
                  {getInitials(displayName)}
                </div>
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="th-icon-btn ml-1"
                style={{ color: 'var(--ink4)' }}
                aria-label="Abmelden"
                title="Abmelden"
              >
                <LogOut size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* ── Horizontal nav rail (desktop) ── */}
          <nav
            className="hidden md:flex items-center gap-1 px-4 md:px-6 overflow-x-auto scrollbar-thin"
            style={{ height: '42px' }}
            aria-label="Hauptnavigation"
          >
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `th-nav-item${isActive ? ' th-nav-item-active' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={14} aria-hidden="true" style={{ opacity: isActive ? 1 : 0.6 }} />
                    <span>{label}</span>
                    {isActive && <span className="sr-only">(aktuelle Seite)</span>}
                  </>
                )}
              </NavLink>
            ))}

            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `th-nav-item${isActive ? ' th-nav-item-active' : ''}`
                }
              >
                {({ isActive }) => (
                  <>
                    <ShieldCheck size={14} aria-hidden="true" style={{ opacity: isActive ? 1 : 0.6 }} />
                    <span>Admin</span>
                    {isActive && <span className="sr-only">(aktuelle Seite)</span>}
                  </>
                )}
              </NavLink>
            )}
          </nav>
        </header>

        {/* ═══ Page content ═══ */}
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

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </>
  )
}

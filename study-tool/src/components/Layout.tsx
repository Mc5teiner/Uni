import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, BookOpen, FileText, BrainCircuit, Calendar, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/module', icon: BookOpen, label: 'Module' },
  { to: '/dokumente', icon: FileText, label: 'Studienbriefe' },
  { to: '/karteikarten', icon: BrainCircuit, label: 'Karteikarten' },
  { to: '/kalender', icon: Calendar, label: 'Kalender & Plan' },
  { to: '/einstellungen', icon: Settings, label: 'Einstellungen' },
]

export default function Layout() {
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
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-blue-800">
          <div className="text-xs text-blue-400">
            Daten werden lokal gespeichert.<br />
            Kein Cloud-Sync.
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

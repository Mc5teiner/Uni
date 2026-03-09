import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { getDueCards } from '../utils/spaceRepetition'
import { format, parseISO, isToday, isTomorrow, differenceInDays, startOfWeek, eachDayOfInterval, endOfWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { BrainCircuit, FileText, BookOpen, Calendar, Clock, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

function getGreeting(name: string): string {
  const h = new Date().getHours()
  const salut = h >= 5 && h < 12 ? 'Guten Morgen'
    : h >= 12 && h < 18 ? 'Guten Tag'
    : h >= 18 && h < 23 ? 'Guten Abend'
    : 'Gute Nacht'
  return `${salut}, ${name}!`
}

const ICON_COLORS: Record<string, { bg: string; text: string; className: string }> = {
  blue:   { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6', className: 'stat-icon-blue'   },
  green:  { bg: 'rgba(16,185,129,0.12)',  text: '#10b981', className: 'stat-icon-green'  },
  red:    { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', className: 'stat-icon-red'    },
  purple: { bg: 'rgba(139,92,246,0.12)',  text: '#8b5cf6', className: 'stat-icon-purple' },
  orange: { bg: 'rgba(249,115,22,0.12)',  text: '#f97316', className: 'stat-icon-orange' },
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue', to }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string | number
  sub?: string
  color?: string
  to?: string
}) {
  const c = ICON_COLORS[color] ?? ICON_COLORS.blue
  const content = (
    <div className="th-card p-5 hover:shadow-lg transition-shadow cursor-default">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`p-2.5 rounded-xl ${c.className}`}
          style={{ background: c.bg, color: c.text }}
        >
          <Icon size={20} />
        </div>
        <span className="text-sm font-medium th-text-2">{label}</span>
      </div>
      <div className="text-3xl font-bold th-text">{value}</div>
      {sub && <div className="text-xs th-text-3 mt-1">{sub}</div>}
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

function UpcomingEvent({ event, moduleName }: { event: { title: string; date: string; type: string }; moduleName?: string }) {
  const date = parseISO(event.date)
  const label = isToday(date) ? 'Heute' : isTomorrow(date) ? 'Morgen' : `in ${differenceInDays(date, new Date())}d`
  const isUrgent = differenceInDays(date, new Date()) <= 3

  return (
    <div className="flex items-center gap-3 py-2.5 last:border-0" style={{ borderBottom: '1px solid var(--th-border)' }}>
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: isUrgent ? 'var(--th-danger)' : 'var(--th-accent)' }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium th-text truncate">{event.title}</div>
        {moduleName && <div className="text-xs th-text-3">{moduleName}</div>}
      </div>
      <span
        className="text-xs font-medium shrink-0"
        style={{ color: isUrgent ? 'var(--th-danger)' : 'var(--th-text-3)' }}
      >
        {label}
      </span>
    </div>
  )
}

function WeekChart({ sessions }: { sessions: { date: string; durationMinutes: number }[] }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(new Date(), { weekStartsOn: 1 })
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const dayData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const total  = sessions.filter(s => s.date === dayStr).reduce((sum, s) => sum + s.durationMinutes, 0)
    return { day, total }
  })

  const max = Math.max(...dayData.map(d => d.total), 60)

  return (
    <div className="flex items-end gap-2 h-24">
      {dayData.map(({ day, total }) => (
        <div key={day.toISOString()} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm relative flex-1 flex items-end"
            style={{ background: 'var(--th-card-secondary, #f1f5f9)' }}
          >
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${total > 0 ? Math.max((total / max) * 100, 8) : 0}%`,
                background: isToday(day) ? 'var(--th-accent)' : 'color-mix(in srgb, var(--th-accent) 40%, transparent)',
              }}
            />
          </div>
          <span className="text-[10px] th-text-3">{format(day, 'EEE', { locale: de })}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data } = useApp()
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')

  const dueCards       = getDueCards(data.flashcards)
  const activeModules  = data.modules.filter(m => m.status === 'aktiv')
  const todayEvents    = data.events.filter(e => e.date === today)
  const upcomingExams  = data.events
    .filter(e => e.type === 'pruefung' && parseISO(e.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
  const upcomingDeadlines = data.events
    .filter(e => parseISO(e.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)

  const weekAgo      = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  const weekSessions = data.sessions.filter(s => s.date >= weekAgo)
  const weekMinutes  = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
  const docsInProgress = data.documents.filter(d => d.currentPage > 1)

  const studyStreak = (() => {
    let streak = 0
    let current = new Date()
    while (true) {
      const dateStr = format(current, 'yyyy-MM-dd')
      if (data.sessions.some(s => s.date === dateStr)) {
        streak++
        current = new Date(current.getTime() - 86400000)
      } else break
    }
    return streak
  })()

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm th-text-3 mb-1">{format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}</div>
        <h1 className="text-2xl font-bold th-text">
          {user?.name ? getGreeting(user.name) : 'Willkommen!'}{' '}
          {user?.studyProgram && <span className="text-lg font-normal th-text-2">· {user.studyProgram}</span>}
        </h1>
        <p className="th-text-2 mt-1 text-sm">
          {dueCards.length > 0
            ? `Du hast ${dueCards.length} Karteikarte${dueCards.length !== 1 ? 'n' : ''} zu wiederholen.`
            : 'Alle Karteikarten sind aktuell. Gut gemacht!'}
        </p>
      </div>

      {/* Today's events */}
      {todayEvents.length > 0 && (
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: 'var(--th-accent-soft)', border: '1px solid color-mix(in srgb, var(--th-accent) 25%, transparent)' }}
        >
          <div className="flex items-center gap-2 font-semibold mb-3" style={{ color: 'var(--th-accent)' }}>
            <Calendar size={16} /> Heute
          </div>
          <div className="space-y-2">
            {todayEvents.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--th-accent-soft-text)' }}>
                <CheckCircle2 size={14} />
                <span>{e.title}</span>
                {e.time && <span style={{ opacity: 0.7 }}>{e.time}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard icon={BookOpen}    label="Aktive Module"         value={activeModules.length}
          sub={`${data.modules.length} gesamt`} color="blue" to="/module" />
        <StatCard icon={BrainCircuit} label="Karten fällig"        value={dueCards.length}
          sub={`${data.flashcards.length} Karten gesamt`} color={dueCards.length > 0 ? 'red' : 'green'} to="/karteikarten" />
        <StatCard icon={Clock}        label="Minuten diese Woche"  value={weekMinutes}
          sub={`${weekSessions.length} Sessions`} color="purple" to="/kalender" />
        <StatCard icon={TrendingUp}   label="Lerntage in Folge"    value={studyStreak}
          sub={studyStreak > 0 ? 'Weiter so!' : 'Starte heute!'} color="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Study activity chart */}
          <div className="th-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold th-section-title">Lernaktivität diese Woche</h2>
              <span className="text-sm th-text-3">{weekMinutes} min</span>
            </div>
            {weekSessions.length > 0 ? (
              <WeekChart sessions={data.sessions} />
            ) : (
              <div className="h-24 flex items-center justify-center th-text-3 text-sm text-center">
                Noch keine Lernsessions diese Woche.<br />Erfasse deine erste im Kalender!
              </div>
            )}
          </div>

          {/* Active modules progress */}
          {activeModules.length > 0 && (
            <div className="th-card p-5">
              <h2 className="font-semibold th-section-title mb-4">Modulfortschritt</h2>
              <div className="space-y-4">
                {activeModules.map(m => {
                  const moduleDocs = data.documents.filter(d => d.moduleId === m.id)
                  const docProgress = moduleDocs.length > 0
                    ? moduleDocs.reduce((sum, d) => sum + (d.totalPages > 0 ? d.currentPage / d.totalPages : 0), 0) / moduleDocs.length * 100
                    : 0
                  const dueForModule   = getDueCards(data.flashcards, m.id).length
                  const totalForModule = data.flashcards.filter(c => c.moduleId === m.id).length
                  const weekMin        = data.sessions
                    .filter(s => s.moduleId === m.id && s.date >= weekAgo)
                    .reduce((sum, s) => sum + s.durationMinutes, 0)
                  const daysUntilExam = m.examDate ? differenceInDays(parseISO(m.examDate), new Date()) : null

                  return (
                    <div key={m.id} className="th-card-secondary p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                          <div>
                            <div className="font-medium th-text text-sm">{m.name}</div>
                            <div className="text-xs th-text-3">{m.moduleNumber} · {m.credits} ECTS</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs th-text-2">
                          {daysUntilExam !== null && (
                            <span
                              className="font-medium"
                              style={{ color: daysUntilExam <= 14 ? 'var(--th-danger)' : 'var(--th-text-2)' }}
                            >
                              Prüfung in {daysUntilExam}d
                            </span>
                          )}
                          <span>{weekMin}min/Woche</span>
                        </div>
                      </div>

                      {moduleDocs.length > 0 && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs th-text-3 mb-1">
                            <span>Studienbriefe gelesen</span>
                            <span>{Math.round(docProgress)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: 'var(--th-border)' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${docProgress}%`, backgroundColor: m.color }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 text-xs th-text-3 mt-2">
                        <span>{moduleDocs.length} Briefe</span>
                        <span style={{ color: dueForModule > 0 ? 'var(--th-danger)' : 'var(--th-text-3)', fontWeight: dueForModule > 0 ? '500' : 'normal' }}>
                          {dueForModule} fällige Karten
                        </span>
                        <span>{totalForModule} Karten gesamt</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upcoming exams */}
          {upcomingExams.length > 0 && (
            <div className="th-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={16} style={{ color: 'var(--th-danger)' }} />
                <h2 className="font-semibold th-section-title">Kommende Prüfungen</h2>
              </div>
              <div>
                {upcomingExams.map(e => {
                  const module = data.modules.find(m => m.id === e.moduleId)
                  return <UpcomingEvent key={e.id} event={e} moduleName={module?.name} />
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <div className="th-card p-5">
            <h2 className="font-semibold th-section-title mb-4">Schnellzugriff</h2>
            <div className="space-y-1">
              <Link
                to="/karteikarten"
                className="flex items-center gap-3 p-3 rounded-[var(--th-radius)] transition-colors"
                style={{ borderRadius: 'var(--th-radius)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--th-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <div
                  className="p-2 rounded-lg"
                  style={{
                    background: dueCards.length > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                    color: dueCards.length > 0 ? '#ef4444' : '#10b981',
                  }}
                >
                  <BrainCircuit size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium th-text">
                    {dueCards.length > 0 ? `${dueCards.length} Karten lernen` : 'Karteikarten'}
                  </div>
                  <div className="text-xs th-text-3">Spaced Repetition</div>
                </div>
              </Link>
              <Link
                to="/dokumente"
                className="flex items-center gap-3 p-3"
                style={{ borderRadius: 'var(--th-radius)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--th-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  <FileText size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium th-text">Studienbriefe</div>
                  <div className="text-xs th-text-3">{docsInProgress.length} in Bearbeitung</div>
                </div>
              </Link>
              <Link
                to="/kalender"
                className="flex items-center gap-3 p-3"
                style={{ borderRadius: 'var(--th-radius)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--th-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <div className="p-2 rounded-lg" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                  <Calendar size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium th-text">Kalender</div>
                  <div className="text-xs th-text-3">{upcomingDeadlines.length} kommende Termine</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Upcoming events */}
          {upcomingDeadlines.length > 0 && (
            <div className="th-card p-5">
              <h2 className="font-semibold th-section-title mb-4">Nächste Termine</h2>
              <div>
                {upcomingDeadlines.map(e => {
                  const module = data.modules.find(m => m.id === e.moduleId)
                  return <UpcomingEvent key={e.id} event={e} moduleName={module?.moduleNumber} />
                })}
              </div>
            </div>
          )}

          {/* No modules hint */}
          {data.modules.length === 0 && (
            <div className="th-card p-6 text-center" style={{ borderStyle: 'dashed' }}>
              <BookOpen size={32} className="mx-auto mb-3 th-text-3" />
              <div className="text-sm font-medium th-text mb-1">Fang hier an!</div>
              <div className="text-xs th-text-3 mb-4">Erstelle dein erstes FernUni-Modul</div>
              <Link
                to="/module"
                className="th-btn th-btn-primary inline-flex px-4 py-2 text-sm"
              >
                Module anlegen
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

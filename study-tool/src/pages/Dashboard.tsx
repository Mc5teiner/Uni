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

function StatCard({ icon: Icon, label, value, sub, color = 'blue', to }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string | number
  sub?: string
  color?: string
  to?: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  const content = (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color] ?? colorMap.blue}`}>
          <Icon size={20} />
        </div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="text-3xl font-bold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

function UpcomingEvent({ event, moduleName }: { event: { title: string; date: string; type: string }; moduleName?: string }) {
  const date = parseISO(event.date)
  const label = isToday(date) ? 'Heute' : isTomorrow(date) ? 'Morgen' : `in ${differenceInDays(date, new Date())}d`
  const isUrgent = differenceInDays(date, new Date()) <= 3

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUrgent ? 'bg-red-500' : 'bg-blue-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{event.title}</div>
        {moduleName && <div className="text-xs text-slate-400">{moduleName}</div>}
      </div>
      <span className={`text-xs font-medium shrink-0 ${isUrgent ? 'text-red-600' : 'text-slate-400'}`}>{label}</span>
    </div>
  )
}

function WeekChart({ sessions }: { sessions: { date: string; durationMinutes: number }[] }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const dayData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const total = sessions.filter(s => s.date === dayStr).reduce((sum, s) => sum + s.durationMinutes, 0)
    return { day, total }
  })

  const max = Math.max(...dayData.map(d => d.total), 60)

  return (
    <div className="flex items-end gap-2 h-24">
      {dayData.map(({ day, total }) => (
        <div key={day.toISOString()} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-slate-100 rounded-sm relative flex-1 flex items-end">
            <div
              className={`w-full rounded-sm transition-all ${isToday(day) ? 'bg-[#003366]' : 'bg-blue-300'}`}
              style={{ height: `${total > 0 ? Math.max((total / max) * 100, 8) : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">{format(day, 'EEE', { locale: de })}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data } = useApp()
  const { user }  = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')

  const dueCards = getDueCards(data.flashcards)
  const activeModules = data.modules.filter(m => m.status === 'aktiv')
  const todayEvents = data.events.filter(e => e.date === today)
  const upcomingExams = data.events
    .filter(e => e.type === 'pruefung' && parseISO(e.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  const upcomingDeadlines = data.events
    .filter(e => parseISO(e.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)

  const weekAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  const weekSessions = data.sessions.filter(s => s.date >= weekAgo)
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0)

  const docsWithProgress = data.documents.filter(d => d.currentPage > 1)

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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm text-slate-400 mb-1">{format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}</div>
        <h1 className="text-2xl font-bold text-slate-800">
          {user?.name ? getGreeting(user.name) : 'Willkommen!'}{' '}
          {user?.studyProgram && <span className="text-lg font-normal text-slate-500">· {user.studyProgram}</span>}
        </h1>
        <p className="text-slate-500 mt-1">
          {dueCards.length > 0
            ? `Du hast ${dueCards.length} Karteikarte${dueCards.length !== 1 ? 'n' : ''} zu wiederholen.`
            : 'Alle Karteikarten sind aktuell. Gut gemacht!'}
        </p>
      </div>

      {/* Today's events */}
      {todayEvents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-700 font-semibold mb-3">
            <Calendar size={16} /> Heute
          </div>
          <div className="space-y-2">
            {todayEvents.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-sm text-blue-800">
                <CheckCircle2 size={14} />
                <span>{e.title}</span>
                {e.time && <span className="text-blue-500">{e.time}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={BookOpen} label="Aktive Module" value={activeModules.length}
          sub={`${data.modules.length} gesamt`} color="blue" to="/module" />
        <StatCard icon={BrainCircuit} label="Karten fällig" value={dueCards.length}
          sub={`${data.flashcards.length} Karten gesamt`} color={dueCards.length > 0 ? 'red' : 'green'} to="/karteikarten" />
        <StatCard icon={Clock} label="Minuten diese Woche" value={weekMinutes}
          sub={`${weekSessions.length} Sessions`} color="purple" to="/kalender" />
        <StatCard icon={TrendingUp} label="Lerntage in Folge" value={studyStreak}
          sub={studyStreak > 0 ? 'Weiter so!' : 'Starte heute!'} color="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Study activity chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Lernaktivität diese Woche</h2>
              <span className="text-sm text-slate-400">{weekMinutes} min</span>
            </div>
            {weekSessions.length > 0 ? (
              <WeekChart sessions={data.sessions} />
            ) : (
              <div className="h-24 flex items-center justify-center text-slate-400 text-sm">
                Noch keine Lernsessions diese Woche.<br />Erfasse deine erste im Kalender!
              </div>
            )}
          </div>

          {/* Active modules progress */}
          {activeModules.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Modulfortschritt</h2>
              <div className="space-y-4">
                {activeModules.map(m => {
                  const moduleDocs = data.documents.filter(d => d.moduleId === m.id)
                  const docProgress = moduleDocs.length > 0
                    ? moduleDocs.reduce((sum, d) => sum + (d.totalPages > 0 ? d.currentPage / d.totalPages : 0), 0) / moduleDocs.length * 100
                    : 0
                  const dueForModule = getDueCards(data.flashcards, m.id).length
                  const totalForModule = data.flashcards.filter(c => c.moduleId === m.id).length
                  const weekMin = data.sessions
                    .filter(s => s.moduleId === m.id && s.date >= weekAgo)
                    .reduce((sum, s) => sum + s.durationMinutes, 0)
                  const daysUntilExam = m.examDate ? differenceInDays(parseISO(m.examDate), new Date()) : null

                  return (
                    <div key={m.id} className="border border-slate-100 rounded-lg p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                          <div>
                            <div className="font-medium text-slate-800 text-sm">{m.name}</div>
                            <div className="text-xs text-slate-400">{m.moduleNumber} · {m.credits} ECTS</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {daysUntilExam !== null && (
                            <span className={`font-medium ${daysUntilExam <= 14 ? 'text-red-600' : 'text-slate-500'}`}>
                              Prüfung in {daysUntilExam}d
                            </span>
                          )}
                          <span>{weekMin}min/Woche</span>
                        </div>
                      </div>

                      {moduleDocs.length > 0 && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>Studienbriefe gelesen</span>
                            <span>{Math.round(docProgress)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full">
                            <div className="h-full rounded-full transition-all" style={{ width: `${docProgress}%`, backgroundColor: m.color }} />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 text-xs text-slate-500 mt-2">
                        <span>{moduleDocs.length} Briefe</span>
                        <span className={dueForModule > 0 ? 'text-red-600 font-medium' : ''}>{dueForModule} fällige Karten</span>
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
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={16} className="text-red-500" />
                <h2 className="font-semibold text-slate-800">Kommende Prüfungen</h2>
              </div>
              <div className="space-y-2">
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
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Schnellzugriff</h2>
            <div className="space-y-2">
              <Link to="/karteikarten" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className={`p-2 rounded-lg ${dueCards.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  <BrainCircuit size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {dueCards.length > 0 ? `${dueCards.length} Karten lernen` : 'Karteikarten'}
                  </div>
                  <div className="text-xs text-slate-400">Spaced Repetition</div>
                </div>
              </Link>
              <Link to="/dokumente" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><FileText size={16} /></div>
                <div>
                  <div className="text-sm font-medium text-slate-800">Studienbriefe</div>
                  <div className="text-xs text-slate-400">{docsWithProgress.length} in Bearbeitung</div>
                </div>
              </Link>
              <Link to="/kalender" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600"><Calendar size={16} /></div>
                <div>
                  <div className="text-sm font-medium text-slate-800">Kalender</div>
                  <div className="text-xs text-slate-400">{upcomingDeadlines.length} kommende Termine</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Upcoming events */}
          {upcomingDeadlines.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-800 mb-4">Nächste Termine</h2>
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
            <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <BookOpen size={32} className="mx-auto mb-3 text-slate-300" />
              <div className="text-sm font-medium text-slate-600 mb-1">Fang hier an!</div>
              <div className="text-xs text-slate-400 mb-3">Erstelle dein erstes FernUni-Modul</div>
              <Link to="/module" className="inline-block px-4 py-2 bg-[#003366] text-white text-sm rounded-lg hover:bg-[#004488]">
                Module anlegen
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

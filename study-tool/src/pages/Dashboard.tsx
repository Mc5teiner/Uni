import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { getDueCards } from '../utils/spaceRepetition'
import { format, parseISO, isToday, isTomorrow, differenceInDays, startOfWeek, eachDayOfInterval, endOfWeek, subDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { BrainCircuit, FileText, BookOpen, Calendar, Clock, TrendingUp, AlertCircle, CheckCircle2, ArrowRight, Flame, Calculator, GraduationCap, BarChart2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  calcGesamtnote, calcPflichtStats, calcWahlStats,
  defaultGradeConfig, type GradeConfig,
  GRADE_CONFIG_KEY, fmtGrade2, fmtGrade1, gradeColor, gradeLabel, roundToStep,
} from '../utils/gradeCalculations'

type GradientType = 'primary' | 'info' | 'warning' | 'danger' | 'dark' | 'success'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient = 'info',
  to,
}: {
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>
  label: string
  value: string | number
  sub?: string
  gradient?: GradientType
  to?: string
}) {
  const content = (
    <div className="md-stat-card pt-8 pb-4">
      {/* Floating gradient icon box */}
      <div className={`md-icon-box md-gradient-${gradient}`}>
        <Icon size={24} aria-hidden="true" />
      </div>

      {/* Value aligned right */}
      <div className="text-right mb-3">
        <p className="text-xs font-medium" style={{ color: 'var(--th-text-2)' }}>{label}</p>
        <h3 className="text-2xl font-bold" style={{ color: 'var(--th-text)' }}>{value}</h3>
      </div>

      {/* Divider + subtitle */}
      {sub && (
        <>
          <div style={{ borderTop: '1px solid var(--th-border)' }} />
          <p className="text-xs mt-3 flex items-center gap-1" style={{ color: 'var(--th-text-2)' }}>
            {sub}
          </p>
        </>
      )}
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block no-underline th-card-interactive" style={{ borderRadius: 'var(--th-radius)' }}>
        {content}
      </Link>
    )
  }
  return content
}

function EventRow({
  event,
  moduleName,
}: {
  event: { title: string; date: string; type: string; time?: string }
  moduleName?: string
}) {
  const date    = parseISO(event.date)
  const daysOut = differenceInDays(date, new Date())
  const label   = isToday(date) ? 'Heute' : isTomorrow(date) ? 'Morgen' : `in ${daysOut}d`
  const urgent  = daysOut <= 3

  return (
    <li
      className="flex items-center gap-3 py-3"
      style={{ borderBottom: '1px solid var(--th-border)' }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        aria-hidden="true"
        style={{ background: urgent ? 'var(--th-danger)' : 'var(--th-accent)' }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--th-text)' }}>
          {event.title}
        </div>
        {moduleName && (
          <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--th-text-3)' }}>
            {moduleName}
          </div>
        )}
      </div>
      <span
        className="text-xs font-bold shrink-0 px-2 py-0.5 rounded"
        style={{
          background: urgent ? 'var(--th-danger-soft)' : 'var(--th-bg-secondary)',
          color:      urgent ? 'var(--th-danger)'      : 'var(--th-text-3)',
        }}
      >
        {label}
      </span>
    </li>
  )
}

function WeekChart({ sessions }: { sessions: { date: string; durationMinutes: number }[] }) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(new Date(),   { weekStartsOn: 1 })
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const dayData = days.map(day => {
    const str   = format(day, 'yyyy-MM-dd')
    const total = sessions.filter(s => s.date === str).reduce((sum, s) => sum + s.durationMinutes, 0)
    return { day, total }
  })

  const max = Math.max(...dayData.map(d => d.total), 60)

  return (
    <div
      className="flex items-end gap-3"
      style={{ height: '6rem' }}
      role="img"
      aria-label="Balkendiagramm der Lernaktivität dieser Woche"
    >
      {dayData.map(({ day, total }) => {
        const today     = isToday(day)
        const heightPct = total > 0 ? Math.max((total / max) * 100, 6) : 0
        return (
          <div
            key={day.toISOString()}
            className="flex-1 flex flex-col items-center gap-1.5"
            title={`${format(day, 'EEEE', { locale: de })}: ${total} min`}
          >
            <div
              className="w-full rounded flex-1 flex items-end overflow-hidden"
              style={{ background: 'var(--th-bg-secondary)' }}
              aria-hidden="true"
            >
              <div
                className="w-full rounded"
                style={{
                  height: `${heightPct}%`,
                  background: today
                    ? 'var(--md-gradient-primary)'
                    : 'var(--md-gradient-info)',
                  opacity: today ? 1 : 0.6,
                  transition: 'height 600ms cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            </div>
            <span
              className="text-[10px] font-bold uppercase"
              style={{ color: today ? 'var(--th-accent)' : 'var(--th-text-3)' }}
            >
              {format(day, 'EEE', { locale: de })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MonthChart({ sessions }: { sessions: { date: string; durationMinutes: number }[] }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i)
    return { d, str: format(d, 'yyyy-MM-dd') }
  })
  const max = Math.max(...days.map(({ str }) =>
    sessions.filter(s => s.date === str).reduce((sum, s) => sum + s.durationMinutes, 0)
  ), 1)

  return (
    <div className="flex items-end gap-0.5" style={{ height: '3rem' }} aria-label="Lernaktivität letzte 30 Tage" role="img">
      {days.map(({ d, str }) => {
        const total    = sessions.filter(s => s.date === str).reduce((sum, s) => sum + s.durationMinutes, 0)
        const today    = isToday(d)
        const heightPct = total > 0 ? Math.max((total / max) * 100, 10) : 3
        return (
          <div
            key={str}
            className="flex-1 rounded-sm"
            style={{
              height:     `${heightPct}%`,
              background: total === 0
                ? 'var(--th-border)'
                : today
                  ? 'var(--th-accent)'
                  : 'color-mix(in srgb, var(--th-accent) 55%, transparent)',
              transition: 'height 400ms ease',
            }}
            title={`${format(d, 'dd.MM.', { locale: de })}: ${total} min`}
          />
        )
      })}
    </div>
  )
}

function ModuleTimeChart({
  modules,
  sessions,
  sinceDate,
}: {
  modules: { id: string; name: string; color: string }[]
  sessions: { moduleId: string; durationMinutes: number; date: string }[]
  sinceDate: string
}) {
  const rows = modules
    .map(m => ({
      ...m,
      minutes: sessions.filter(s => s.moduleId === m.id && s.date >= sinceDate)
        .reduce((sum, s) => sum + s.durationMinutes, 0),
    }))
    .filter(r => r.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)

  if (rows.length === 0) return null

  const maxMin = rows[0].minutes

  return (
    <ul className="space-y-3" role="list">
      {rows.map(r => (
        <li key={r.id} className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            aria-hidden="true"
            style={{ backgroundColor: r.color }}
          />
          <span className="flex-1 text-sm truncate" style={{ color: 'var(--th-text-2)' }}>
            {r.name}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 th-progress-track">
              <div
                className="th-progress-fill"
                style={{ width: `${(r.minutes / maxMin) * 100}%`, backgroundColor: r.color }}
              />
            </div>
            <span className="text-xs w-12 text-right font-mono" style={{ color: 'var(--th-text-3)' }}>
              {r.minutes >= 60
                ? `${Math.floor(r.minutes / 60)}h ${r.minutes % 60}m`
                : `${r.minutes}m`}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function GesamtnoteWidget() {
  const [cfg, setCfg] = useState<GradeConfig | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GRADE_CONFIG_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<GradeConfig>
        setCfg({ ...defaultGradeConfig(), ...parsed })
      }
    } catch { /* ignore */ }
  }, [])

  const gesamt  = cfg ? calcGesamtnote(cfg) : null
  const pflicht = cfg ? calcPflichtStats(cfg) : null
  const wahl    = cfg ? calcWahlStats(cfg)    : null

  return (
    <section aria-labelledby="grade-heading" className="th-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 id="grade-heading" className="th-section-title flex items-center gap-2">
          <GraduationCap size={16} aria-hidden="true" style={{ color: 'var(--th-accent)' }} />
          Notenübersicht
        </h2>
        <Link
          to="/notenrechner"
          className="text-xs font-bold flex items-center gap-1 hover:underline uppercase"
          style={{ color: 'var(--th-accent)' }}
        >
          <Calculator size={12} /> Rechner
        </Link>
      </div>

      {gesamt !== null ? (
        <div className="flex items-center gap-5">
          <div
            className="text-5xl font-black leading-none shrink-0"
            style={{ color: gradeColor(gesamt), letterSpacing: '-0.06em' }}
          >
            {fmtGrade2(gesamt)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold mb-0.5" style={{ color: gradeColor(gesamt) }}>
              {gradeLabel(gesamt)} · gerundet: {fmtGrade1(roundToStep(gesamt))}
            </div>
            <div className="flex gap-4 text-xs" style={{ color: 'var(--th-text-3)' }}>
              {pflicht?.avg != null && (
                <span>Pflicht: <strong style={{ color: 'var(--th-text-2)' }}>{fmtGrade1(pflicht.avg)}</strong> ({pflicht.enteredCount}/10)</span>
              )}
              {wahl?.avg != null && (
                <span>Wahl: <strong style={{ color: 'var(--th-text-2)' }}>{fmtGrade1(wahl.avg)}</strong> ({wahl.enteredCount}/8)</span>
              )}
            </div>
            {pflicht && pflicht.issues.length > 0 && (
              <div className="flex items-center gap-1 text-xs mt-1.5" style={{ color: 'var(--th-danger)' }}>
                <AlertCircle size={11} />
                {pflicht.issues[0]}
              </div>
            )}
            {pflicht?.passingMet && (
              <div className="flex items-center gap-1 text-xs mt-1.5" style={{ color: 'var(--th-success)' }}>
                <CheckCircle2 size={11} /> Pflichtbereich bestanden
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-3">
          <div className="text-3xl font-black mb-1" style={{ color: 'var(--th-text-3)', letterSpacing: '-0.04em' }}>–</div>
          <p className="text-xs mb-3" style={{ color: 'var(--th-text-3)' }}>
            Noch keine Noten eingetragen
          </p>
          <Link
            to="/notenrechner"
            className="inline-flex items-center gap-1.5 text-xs font-bold th-btn th-btn-primary px-3 py-1.5"
          >
            <Calculator size={13} /> Noten eingeben
          </Link>
        </div>
      )}
    </section>
  )
}

export default function Dashboard() {
  const { data }  = useApp()
  const today     = format(new Date(), 'yyyy-MM-dd')
  const weekAgo   = format(new Date(Date.now() -  7 * 86400000), 'yyyy-MM-dd')
  const monthAgo  = format(new Date(Date.now() - 30 * 86400000), 'yyyy-MM-dd')

  const dueCards          = getDueCards(data.flashcards)
  const activeModules     = data.modules.filter(m => m.status === 'aktiv')
  const todayEvents       = data.events.filter(e => e.date === today)
  const upcomingExams     = data.events
    .filter(e => e.type === 'pruefung' && parseISO(e.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
  const upcomingDeadlines = data.events
    .filter(e => parseISO(e.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)

  const weekSessions   = data.sessions.filter(s => s.date >= weekAgo)
  const weekMinutes    = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
  const docsInProgress = data.documents.filter(d => d.currentPage > 1)

  const studyStreak = (() => {
    let streak = 0
    let cur    = new Date()
    while (true) {
      const str = format(cur, 'yyyy-MM-dd')
      if (data.sessions.some(s => s.date === str)) {
        streak++
        cur = new Date(cur.getTime() - 86400000)
      } else break
    }
    return streak
  })()

  return (
    <div className="p-4 md:p-6">

      {/* ── Stat cards (Material Dashboard style with floating icons) ── */}
      <section aria-label="Lernstatistiken" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6 mt-4">
        <StatCard
          icon={BookOpen}
          label="Aktive Module"
          value={activeModules.length}
          sub={`${data.modules.length} Module gesamt`}
          gradient="info"
          to="/module"
        />
        <StatCard
          icon={BrainCircuit}
          label="Karten fällig"
          value={dueCards.length}
          sub={`${data.flashcards.length} Karten gesamt`}
          gradient={dueCards.length > 0 ? 'danger' : 'success'}
          to="/karteikarten"
        />
        <StatCard
          icon={Clock}
          label="Minuten diese Woche"
          value={weekMinutes}
          sub={`${weekSessions.length} Sessions`}
          gradient="primary"
          to="/kalender"
        />
        <StatCard
          icon={studyStreak > 0 ? Flame : TrendingUp}
          label="Lerntage in Folge"
          value={studyStreak}
          sub={studyStreak > 0 ? 'Weiter so!' : 'Starte heute!'}
          gradient="warning"
        />
      </section>

      {/* ── Today's events banner ───────────────────────────────── */}
      {todayEvents.length > 0 && (
        <section
          aria-label="Heutige Termine"
          className="th-card p-4 mb-6"
          style={{ borderLeft: '4px solid var(--th-accent)' }}
        >
          <div
            className="flex items-center gap-2 text-sm font-bold mb-3"
            style={{ color: 'var(--th-accent)' }}
          >
            <Calendar size={15} aria-hidden="true" />
            Heute
          </div>
          <ul className="space-y-2" role="list">
            {todayEvents.map(e => (
              <li key={e.id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--th-text-2)' }}>
                <CheckCircle2 size={14} aria-hidden="true" style={{ color: 'var(--th-accent)' }} />
                <span>{e.title}</span>
                {e.time && (
                  <span className="opacity-60 font-mono text-xs">{e.time}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Main grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left column — 2/3 width */}
        <div className="xl:col-span-2 space-y-6">

          {/* Study activity — chart card with dark gradient header */}
          <section aria-labelledby="chart-heading" className="th-card pt-6 pb-4">
            <div className="md-chart-header md-gradient-success" style={{ marginTop: '-2rem' }}>
              {weekSessions.length > 0 ? (
                <WeekChart sessions={data.sessions} />
              ) : (
                <div className="flex items-center justify-center text-white/70 text-sm py-4">
                  Noch keine Lernsessions diese Woche
                </div>
              )}
            </div>
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between mb-1">
                <h2 id="chart-heading" className="th-section-title">
                  Lernaktivität
                </h2>
                <span className="text-sm font-bold" style={{ color: 'var(--th-text-2)' }}>
                  {weekMinutes} min
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--th-text-3)' }}>
                Diese Woche
              </p>
            </div>

            {data.sessions.length > 0 && (
              <div className="px-4 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--th-text-3)' }}>
                    Letzte 30 Tage
                  </span>
                  <span className="text-xs" style={{ color: 'var(--th-text-3)' }}>
                    {data.sessions.filter(s => s.date >= monthAgo).reduce((sum, s) => sum + s.durationMinutes, 0)} min
                  </span>
                </div>
                <MonthChart sessions={data.sessions} />
              </div>
            )}
          </section>

          {/* Per-module time breakdown */}
          {data.sessions.filter(s => s.date >= monthAgo).length > 0 && (
            <section aria-labelledby="modtime-heading" className="th-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="md-icon-box-sm md-gradient-info">
                  <BarChart2 size={18} aria-hidden="true" />
                </div>
                <div>
                  <h2 id="modtime-heading" className="th-section-title">Lernzeit pro Modul</h2>
                  <p className="text-xs" style={{ color: 'var(--th-text-3)' }}>30 Tage</p>
                </div>
              </div>
              <ModuleTimeChart
                modules={data.modules}
                sessions={data.sessions}
                sinceDate={monthAgo}
              />
            </section>
          )}

          {/* Active modules progress */}
          {activeModules.length > 0 && (
            <section aria-labelledby="modules-heading" className="th-card p-6">
              <h2 id="modules-heading" className="th-section-title mb-5">Modulfortschritt</h2>
              <table className="md-table">
                <thead>
                  <tr>
                    <th>Modul</th>
                    <th>Fortschritt</th>
                    <th>Karten</th>
                    <th>Woche</th>
                  </tr>
                </thead>
                <tbody>
                  {activeModules.map(m => {
                    const moduleDocs  = data.documents.filter(d => d.moduleId === m.id)
                    const docProgress = moduleDocs.length > 0
                      ? moduleDocs.reduce((sum, d) => sum + (d.totalPages > 0 ? d.currentPage / d.totalPages : 0), 0) / moduleDocs.length * 100
                      : 0
                    const dueForModule   = getDueCards(data.flashcards, m.id).length
                    const weekMin        = data.sessions
                      .filter(s => s.moduleId === m.id && s.date >= weekAgo)
                      .reduce((sum, s) => sum + s.durationMinutes, 0)

                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: m.color }}
                            />
                            <div>
                              <div className="font-medium text-sm">{m.name}</div>
                              <div className="text-xs" style={{ color: 'var(--th-text-3)' }}>{m.moduleNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-24 th-progress-track">
                              <div
                                className="th-progress-fill"
                                style={{ width: `${docProgress}%`, background: 'var(--md-gradient-info)' }}
                              />
                            </div>
                            <span className="text-xs font-bold" style={{ color: 'var(--th-text-2)' }}>
                              {Math.round(docProgress)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="text-xs font-bold"
                            style={{ color: dueForModule > 0 ? 'var(--th-danger)' : 'var(--th-text-3)' }}
                          >
                            {dueForModule} fällig
                          </span>
                        </td>
                        <td>
                          <span className="text-xs" style={{ color: 'var(--th-text-3)' }}>
                            {weekMin} min
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>
          )}

          {/* Upcoming exams */}
          {upcomingExams.length > 0 && (
            <section aria-labelledby="exams-heading" className="th-card p-6">
              <h2 id="exams-heading" className="flex items-center gap-2 th-section-title mb-4">
                <AlertCircle size={16} aria-hidden="true" style={{ color: 'var(--th-danger)' }} />
                Kommende Prüfungen
              </h2>
              <ul role="list" style={{ listStyle: 'none' }}>
                {upcomingExams.map(e => {
                  const module = data.modules.find(m => m.id === e.moduleId)
                  return <EventRow key={e.id} event={e} moduleName={module?.name} />
                })}
              </ul>
            </section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Gesamtnote widget */}
          <GesamtnoteWidget />

          {/* Quick actions */}
          <section aria-labelledby="quicklinks-heading" className="th-card p-6">
            <h2 id="quicklinks-heading" className="th-section-title mb-4">Schnellzugriff</h2>
            <nav aria-label="Schnellzugriff" className="space-y-1">
              {[
                {
                  to:   '/karteikarten',
                  icon: BrainCircuit,
                  gradient: dueCards.length > 0 ? 'danger' : 'success',
                  label: dueCards.length > 0 ? `${dueCards.length} Karten lernen` : 'Karteikarten',
                  sub:  'Spaced Repetition',
                },
                {
                  to:   '/dokumente',
                  icon: FileText,
                  gradient: 'info',
                  label: 'Studienbriefe',
                  sub:  `${docsInProgress.length} in Bearbeitung`,
                },
                {
                  to:   '/kalender',
                  icon: Calendar,
                  gradient: 'warning',
                  label: 'Kalender',
                  sub:  `${upcomingDeadlines.length} kommende Termine`,
                },
                {
                  to:   '/notenrechner',
                  icon: Calculator,
                  gradient: 'primary',
                  label: 'Notenrechner',
                  sub:  'B.Sc. Gesamtnote berechnen',
                },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg no-underline group"
                  style={{ transition: 'background 150ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--th-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div className={`md-icon-box-sm md-gradient-${item.gradient}`}>
                    <item.icon size={17} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold" style={{ color: 'var(--th-text)' }}>
                      {item.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--th-text-3)' }}>
                      {item.sub}
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    style={{ color: 'var(--th-text-3)', flexShrink: 0 }}
                  />
                </Link>
              ))}
            </nav>
          </section>

          {/* Upcoming events */}
          {upcomingDeadlines.length > 0 && (
            <section aria-labelledby="upcoming-heading" className="th-card p-6">
              <h2 id="upcoming-heading" className="th-section-title mb-4">Nächste Termine</h2>
              <ul role="list" style={{ listStyle: 'none' }}>
                {upcomingDeadlines.map(e => {
                  const module = data.modules.find(m => m.id === e.moduleId)
                  return <EventRow key={e.id} event={e} moduleName={module?.moduleNumber} />
                })}
              </ul>
            </section>
          )}

          {/* Empty state — no modules */}
          {data.modules.length === 0 && (
            <div
              className="th-card p-8 text-center"
              style={{ borderStyle: 'dashed', border: '2px dashed var(--th-border)' }}
            >
              <div className="md-icon-box md-gradient-info mx-auto mb-4">
                <BookOpen size={28} aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--th-text)' }}>
                Fang hier an!
              </h3>
              <p className="text-xs mb-5" style={{ color: 'var(--th-text-3)' }}>
                Erstelle dein erstes FernUni-Modul
              </p>
              <Link to="/module" className="th-btn th-btn-primary text-sm inline-flex">
                Module anlegen
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

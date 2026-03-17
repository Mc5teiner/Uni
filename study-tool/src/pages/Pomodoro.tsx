import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { format } from 'date-fns'
import { Timer, Play, Pause, RotateCcw, BookOpen, CheckCircle, Coffee } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATIONS = {
  work:        25 * 60,
  shortBreak:   5 * 60,
  longBreak:   15 * 60,
} as const

type Mode = keyof typeof DURATIONS

const MODE_LABELS: Record<Mode, string> = {
  work:       'Fokus',
  shortBreak: 'Kurze Pause',
  longBreak:  'Lange Pause',
}

const MODE_COLORS: Record<Mode, string> = {
  work:       '#1A73E8',
  shortBreak: '#4CAF50',
  longBreak:  '#fb8c00',
}

const LONG_BREAK_EVERY = 4
const STORAGE_KEY = 'pomo-timer-state'

// ─── Sound helper ─────────────────────────────────────────────────────────────

function playDing(frequency = 880) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch { /* ignore */ }
}

// ─── Circular progress ────────────────────────────────────────────────────────

function CircularTimer({
  progress, color, children,
}: {
  progress: number
  color: string
  children: React.ReactNode
}) {
  const r = 110
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - progress)

  return (
    <div className="relative" style={{ width: 280, height: 280 }}>
      <svg width="280" height="280" className="absolute inset-0" aria-hidden="true">
        <circle cx="140" cy="140" r={r} fill="none" stroke="var(--th-bg-secondary)" strokeWidth="12" />
        <circle
          cx="140" cy="140" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 140 140)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

// ─── Session-Log Dialog ───────────────────────────────────────────────────────

function LogDialog({
  modules,
  moduleId,
  topic,
  onModuleChange,
  onTopicChange,
  onConfirm,
  onSkip,
}: {
  modules: { id: string; moduleNumber: string; name: string }[]
  moduleId: string
  topic: string
  onModuleChange: (id: string) => void
  onTopicChange: (t: string) => void
  onConfirm: () => void
  onSkip: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div
        className="th-card w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ border: '1px solid var(--th-border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#2563eb22' }}
          >
            <CheckCircle size={20} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <p className="font-semibold th-text">Pomodoro abgeschlossen!</p>
            <p className="text-xs th-text-3">Session als Lerneinheit speichern?</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium th-text-2 mb-1">Modul</label>
          <select
            className="th-input"
            value={moduleId}
            onChange={e => onModuleChange(e.target.value)}
          >
            {modules.length === 0 && <option value="">– kein Modul –</option>}
            {modules.map(m => (
              <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium th-text-2 mb-1">Thema (optional)</label>
          <input
            className="th-input"
            value={topic}
            onChange={e => onTopicChange(e.target.value)}
            placeholder="z.B. Kapitel 3 – Kostenrechnung"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onSkip}
            className="flex-1 py-2 rounded-lg text-sm font-medium th-text-2"
            style={{ background: 'var(--th-bg-secondary)' }}
          >
            Überspringen
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#2563eb' }}
          >
            Loggen
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PomodoroPage() {
  const { data, logSession } = useApp()

  const [mode, setMode]           = useState<Mode>('work')
  const [timeLeft, setTimeLeft]   = useState(DURATIONS.work)
  const [running, setRunning]     = useState(false)
  const [pomodoros, setPomodoros] = useState(0)
  const [moduleId, setModuleId]   = useState(() => data.modules[0]?.id ?? '')
  const [topic, setTopic]         = useState('')

  // Session-log dialog state
  const [showLogDialog, setShowLogDialog] = useState(false)
  const [logModuleId, setLogModuleId]     = useState('')
  const [logTopic, setLogTopic]           = useState('')

  // Refs for stale-closure-safe access inside callbacks/intervals
  const modeRef        = useRef<Mode>('work')
  const pomodorosRef   = useRef(0)
  const moduleIdRef    = useRef(moduleId)
  const topicRef       = useRef(topic)
  const runningRef     = useRef(false)
  const timeLeftRef    = useRef(DURATIONS.work)
  // Stores the absolute timestamp when the current timer will reach 0
  const endTimeRef     = useRef<number | null>(null)

  modeRef.current      = mode
  pomodorosRef.current = pomodoros
  moduleIdRef.current  = moduleId
  topicRef.current     = topic
  runningRef.current   = running
  timeLeftRef.current  = timeLeft

  const logSessionRef       = useRef(logSession)
  logSessionRef.current     = logSession
  const setShowLogRef       = useRef(setShowLogDialog)
  setShowLogRef.current     = setShowLogDialog
  const setLogModuleIdRef   = useRef(setLogModuleId)
  setLogModuleIdRef.current = setLogModuleId
  const setLogTopicRef      = useRef(setLogTopic)
  setLogTopicRef.current    = setLogTopic

  // ── Set default module when modules load ──────────────────────────────────
  useEffect(() => {
    if (!moduleId && data.modules.length > 0) {
      setModuleId(data.modules[0].id)
    }
  }, [data.modules, moduleId])

  // ── Session complete handler ───────────────────────────────────────────────
  const handleComplete = useCallback(() => {
    playDing()
    const currentMode      = modeRef.current
    const currentPomodoros = pomodorosRef.current

    if (currentMode === 'work') {
      // Show confirmation dialog – user picks module & confirms logging
      setShowLogRef.current(true)
      setLogModuleIdRef.current(moduleIdRef.current)
      setLogTopicRef.current(topicRef.current.trim())

      const newCount  = currentPomodoros + 1
      setPomodoros(newCount)
      const nextMode: Mode = newCount % LONG_BREAK_EVERY === 0 ? 'longBreak' : 'shortBreak'
      setMode(nextMode)
      setTimeLeft(DURATIONS[nextMode])
    } else {
      playDing(660)
      setMode('work')
      setTimeLeft(DURATIONS.work)
    }
  }, []) // intentionally empty — uses refs

  // ── Countdown interval (timestamp-based so tab-switching doesn't drift) ───
  useEffect(() => {
    if (!running) {
      endTimeRef.current = null
      return
    }
    // (Re-)set the absolute end time based on current remaining seconds
    endTimeRef.current = Date.now() + timeLeftRef.current * 1000

    const id = setInterval(() => {
      if (!endTimeRef.current) return
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        setRunning(false)
        endTimeRef.current = null
        setTimeout(handleComplete, 0)
      }
    }, 500) // 500 ms for snappy display; timestamp handles accuracy

    return () => clearInterval(id)
  }, [running, handleComplete])

  // ── Visibility-change handler: correct time after returning to tab ─────────
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden || !runningRef.current || !endTimeRef.current) return
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        setRunning(false)
        endTimeRef.current = null
        handleComplete()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [handleComplete])

  // ── Persist timer when navigating away within the app ─────────────────────
  // Restore on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const s = JSON.parse(raw) as {
        endTime: number; mode: Mode; pomodoros: number; moduleId: string; topic: string
      }
      localStorage.removeItem(STORAGE_KEY)
      const remaining = Math.max(0, Math.round((s.endTime - Date.now()) / 1000))
      setMode(s.mode)
      setPomodoros(s.pomodoros)
      if (s.moduleId) setModuleId(s.moduleId)
      setTopic(s.topic)
      if (remaining > 0) {
        // Resume from where the user left off
        setTimeLeft(remaining)
        endTimeRef.current = s.endTime
        setRunning(true)
      } else if (s.mode === 'work') {
        // Timer finished while user was on another page
        playDing()
        const newCount = s.pomodoros + 1
        setPomodoros(newCount)
        const nextMode: Mode = newCount % LONG_BREAK_EVERY === 0 ? 'longBreak' : 'shortBreak'
        setMode(nextMode)
        setTimeLeft(DURATIONS[nextMode])
        setShowLogDialog(true)
        setLogModuleId(s.moduleId)
        setLogTopic(s.topic)
      }
      // break timer that expired: just reset to work silently
    } catch { /* ignore */ }
  }, []) // only on mount

  // Save on unmount if still running
  useEffect(() => {
    return () => {
      if (runningRef.current && endTimeRef.current) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          endTime:   endTimeRef.current,
          mode:      modeRef.current,
          pomodoros: pomodorosRef.current,
          moduleId:  moduleIdRef.current,
          topic:     topicRef.current,
        }))
      }
    }
  }, [])

  // ── Log confirmation ───────────────────────────────────────────────────────
  const confirmLog = useCallback(() => {
    logSessionRef.current({
      moduleId:        logModuleId,
      date:            format(new Date(), 'yyyy-MM-dd'),
      durationMinutes: DURATIONS.work / 60,
      topic:           logTopic || 'Pomodoro-Session',
    })
    setShowLogDialog(false)
  }, [logModuleId, logTopic])

  // ── Actions ───────────────────────────────────────────────────────────────
  const switchMode = (m: Mode) => {
    setRunning(false)
    setMode(m)
    setTimeLeft(DURATIONS[m])
  }

  const reset = () => {
    setRunning(false)
    setTimeLeft(DURATIONS[mode])
  }

  // ── Display ───────────────────────────────────────────────────────────────
  const mins     = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs     = String(timeLeft % 60).padStart(2, '0')
  const progress = 1 - timeLeft / DURATIONS[mode]
  const color    = MODE_COLORS[mode]

  const today        = format(new Date(), 'yyyy-MM-dd')
  const todaySessions = data.sessions.filter(s => s.date === today)
  const todayMins    = todaySessions.reduce((s, x) => s + x.durationMinutes, 0)
  const todayCount   = todaySessions.filter(s => s.durationMinutes === DURATIONS.work / 60).length

  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto">

      {/* Session-log confirmation dialog */}
      {showLogDialog && (
        <LogDialog
          modules={data.modules}
          moduleId={logModuleId}
          topic={logTopic}
          onModuleChange={setLogModuleId}
          onTopicChange={setLogTopic}
          onConfirm={confirmLog}
          onSkip={() => setShowLogDialog(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="md-icon-box-sm md-gradient-info">
          <Timer size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--th-text)' }}>Pomodoro-Timer</h1>
          <p className="text-xs" style={{ color: 'var(--th-text-2)' }}>Fokussiertes Lernen in 25-Minuten-Intervallen</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div
        className="flex gap-1 mb-8 p-1 rounded-xl"
        style={{ background: 'var(--th-bg-secondary)' }}
      >
        {(['work', 'shortBreak', 'longBreak'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className="flex-1 py-2 px-2 rounded-lg text-sm font-semibold transition-colors"
            style={mode === m
              ? { background: 'var(--th-card)', color: 'var(--th-text)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
              : { color: 'var(--th-text-2)' }
            }
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <div className="flex flex-col items-center mb-8">
        <CircularTimer progress={progress} color={color}>
          <div className="text-5xl font-mono font-bold th-text tabular-nums">
            {mins}:{secs}
          </div>
          <div className="text-sm font-semibold mt-1" style={{ color }}>
            {MODE_LABELS[mode]}
          </div>
          {/* Completed pomodoro dots */}
          {pomodoros > 0 && (
            <div className="flex gap-1.5 mt-3" aria-label={`${pomodoros} Pomodoros abgeschlossen`}>
              {Array.from({ length: Math.min(pomodoros, LONG_BREAK_EVERY) }).map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              ))}
            </div>
          )}
        </CircularTimer>

        {/* Controls */}
        <div className="flex items-center gap-6 mt-4">
          <button
            onClick={reset}
            className="p-3 rounded-full transition-colors th-text-2"
            style={{ background: 'var(--th-bg-secondary)' }}
            aria-label="Timer zurücksetzen"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={() => setRunning(r => !r)}
            className="w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{ background: color }}
            aria-label={running ? 'Pausieren' : 'Starten'}
          >
            {running
              ? <Pause size={28} />
              : <Play size={28} className="translate-x-0.5" />
            }
          </button>
          <div style={{ width: '3rem' }} aria-hidden="true" />
        </div>
      </div>

      {/* Session settings (work mode) */}
      {mode === 'work' && (
        <div
          className="th-card p-5 mb-6 space-y-4"
          style={{  }}
        >
          <h3 className="text-sm font-semibold th-text flex items-center gap-2">
            <BookOpen size={15} style={{ color: 'var(--th-text-3)' }} />
            Session-Details
          </h3>
          <div>
            <label className="block text-xs font-medium th-text-2 mb-1">Modul</label>
            <select
              className="th-input"
              value={moduleId}
              onChange={e => setModuleId(e.target.value)}
            >
              {data.modules.length === 0 && <option value="">– kein Modul –</option>}
              {data.modules.map(m => (
                <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium th-text-2 mb-1">Thema (optional)</label>
            <input
              className="th-input"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="z.B. Kapitel 3 – Kostenrechnung"
            />
          </div>
        </div>
      )}

      {/* Break hint */}
      {mode !== 'work' && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl mb-6 text-sm"
          style={{ background: 'var(--th-bg-secondary)', color: 'var(--th-text-2)' }}
        >
          <Coffee size={18} style={{ color, flexShrink: 0 }} />
          <span>
            {mode === 'shortBreak'
              ? 'Kurze Pause – Streck dich, trink etwas Wasser!'
              : 'Lange Pause – Du hast 4 Pomodoros geschafft! Gönn dir eine richtige Pause.'
            }
          </span>
        </div>
      )}

      {/* Today's stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pomodoros heute', value: todayCount, icon: Timer },
          { label: 'Minuten heute',   value: todayMins,  icon: BookOpen },
          { label: 'Diese Sitzung',   value: pomodoros,  icon: CheckCircle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="th-card p-4 text-center">
            <Icon size={16} className="mx-auto mb-1.5 th-text-3" />
            <div className="text-xl font-bold th-text">{value}</div>
            <div className="text-xs th-text-3 mt-0.5 leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Technique hint */}
      <p className="text-xs th-text-3 text-center mt-6 leading-relaxed">
        25 Min. Fokus → 5 Min. Pause → alle 4 Pomodoros: 15 Min. lange Pause.<br />
        Erledigte Fokusphasen werden am Ende als Lerneinheit gespeichert.
      </p>
    </div>
  )
}

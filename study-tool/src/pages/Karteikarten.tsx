import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import type { Flashcard, FlashcardDifficulty, SharedDeck } from '../types'
import { applyReview, getDueCards, getDifficultyLabel, getDifficultyColor } from '../utils/spaceRepetition'
import { format, parseISO, differenceInDays } from 'date-fns'
import { Plus, BrainCircuit, Check, X, Pencil, Layers, Tag, ImageIcon, RefreshCw, ZoomIn, Download, Upload, ChevronDown, AlertCircle, CheckCircle2, ListChecks, Trophy, Globe, Share2, LogIn } from 'lucide-react'
import { downloadAnkiExport, parseAnkiTxt, type ImportedCard } from '../utils/ankiIO'
import { sharedDecks as sharedDecksApi } from '../api/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
        onClick={onClose}
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

function CardImage({ src, alt }: { src: string; alt: string }) {
  const [lightbox, setLightbox] = useState(false)
  return (
    <>
      <div
        className="relative inline-block mt-3 cursor-zoom-in group"
        onClick={e => { e.stopPropagation(); setLightbox(true) }}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-48 rounded-lg border border-[var(--th-border)] object-contain"
        />
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors">
          <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
        </div>
      </div>
      {lightbox && <ImageLightbox src={src} alt={alt} onClose={() => setLightbox(false)} />}
    </>
  )
}

function ImageUpload({ value, onChange, label }: { value?: string; onChange: (v: string | undefined) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-2 mt-1">
      {value ? (
        <div className="relative group">
          <img src={value} alt={label} className="h-16 rounded border border-[var(--th-border)] object-contain" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={10} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex items-center gap-1.5 text-xs th-text-2 border border-dashed border-[var(--th-border)] rounded-lg px-3 py-2 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          <ImageIcon size={14} /> Bild hochladen
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = ev => onChange(ev.target?.result as string)
          reader.readAsDataURL(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── Review Session ───────────────────────────────────────────────────────────

function ReviewSession({ cards, onDone, onReview }: {
  cards: Flashcard[]
  onDone: () => void
  onReview: (card: Flashcard, q: FlashcardDifficulty) => void
}) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewed, setReviewed] = useState(0)

  const card = cards[index]

  if (!card || reviewed >= cards.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold th-text mb-2">Alle Karten abgearbeitet!</h2>
        <p className="th-text-2 mb-6">{reviewed} Karten wiederholt.</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setIndex(0); setFlipped(false); setReviewed(0) }}
            className="flex items-center gap-2 px-5 py-2.5 border border-[var(--th-border)] th-text-2 rounded-xl font-medium hover:bg-[var(--th-bg)]"
          >
            <RefreshCw size={16} /> Nochmal
          </button>
          <button onClick={onDone} className="px-6 py-2.5 th-btn th-btn-primary rounded-xl font-medium hover:bg-[#004488]">
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    )
  }

  const handleRate = (q: FlashcardDifficulty) => {
    onReview(card, q)
    setFlipped(false)
    setReviewed(r => r + 1)
    setIndex(i => i + 1)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="w-full mb-6">
        <div className="flex justify-between text-sm th-text-2 mb-2">
          <span>{reviewed} / {cards.length} Karten</span>
          <button onClick={onDone} className="flex items-center gap-1 th-text-3 hover:th-text-2">
            <X size={14} /> Abbrechen
          </button>
        </div>
        <div className="h-2 bg-slate-200 rounded-full">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(reviewed / cards.length) * 100}%` }} />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full th-card shadow-lg border border-[var(--th-border)] min-h-[260px] flex flex-col items-center justify-center p-8 cursor-pointer select-none mb-6"
        onClick={() => setFlipped(f => !f)}
      >
        {!flipped ? (
          <>
            <div className="text-xs th-text-3 uppercase tracking-widest mb-4 font-medium">Frage</div>
            <div className="text-xl font-medium th-text text-center leading-relaxed whitespace-pre-wrap">
              {card.front}
            </div>
            {card.frontImage && <CardImage src={card.frontImage} alt="Frage Bild" />}
            <div className="text-xs th-text-3 mt-6">Klicken zum Aufdecken</div>
          </>
        ) : (
          <>
            <div className="text-xs text-blue-500 uppercase tracking-widest mb-4 font-medium">Antwort</div>
            <div className="text-xl th-text text-center leading-relaxed whitespace-pre-wrap">
              {card.back}
            </div>
            {card.backImage && <CardImage src={card.backImage} alt="Antwort Bild" />}
          </>
        )}
      </div>

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4 justify-center">
          {card.tags.map(t => (
            <span key={t} className="text-xs bg-[var(--th-bg-secondary,#f1f5f9)] th-text-2 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}

      {/* Rating buttons */}
      {flipped && (
        <div className="w-full">
          <div className="text-xs text-center th-text-3 mb-3">Wie gut hast du es gewusst?</div>
          <div className="grid grid-cols-3 gap-2">
            {([0, 1, 2, 3, 4, 5] as FlashcardDifficulty[]).map(q => (
              <button
                key={q}
                onClick={e => { e.stopPropagation(); handleRate(q) }}
                className={`py-2 px-3 rounded-lg text-white text-xs font-medium ${getDifficultyColor(q)} hover:opacity-90 transition-opacity`}
              >
                {getDifficultyLabel(q)}
              </button>
            ))}
          </div>
          <p className="text-center text-xs th-text-3 mt-3">
            Nächste Wiederholung passt sich automatisch an deine Antwort an
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Quiz Session ─────────────────────────────────────────────────────────────

function QuizSession({ cards, onDone }: { cards: Flashcard[]; onDone: () => void }) {
  const [index, setIndex]     = useState(0)
  const [score, setScore]     = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [finished, setFinished] = useState(false)

  const card = cards[index]

  // Generate shuffled options whenever the card changes
  useEffect(() => {
    if (!card) return
    const distractors = cards
      .filter((_, i) => i !== index)
      .map(c => c.back)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    setOptions([...distractors, card.back].sort(() => Math.random() - 0.5))
    setSelected(null)
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  if (finished || (!card && index >= cards.length)) {
    const pct = Math.round((score / cards.length) * 100)
    const passed = pct >= 70
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Trophy size={56} className="mb-4" style={{ color: passed ? '#16a34a' : '#d97706' }} />
        <h2 className="text-2xl font-bold th-text mb-1">Quiz abgeschlossen!</h2>
        <p className="th-text-2 mb-3">{score} von {cards.length} richtig</p>
        <div className="text-5xl font-bold mb-6" style={{ color: passed ? '#16a34a' : '#dc2626' }}>
          {pct}%
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setIndex(0); setScore(0); setSelected(null); setFinished(false) }}
            className="flex items-center gap-2 px-5 py-2.5 border border-[var(--th-border)] th-text-2 rounded-xl font-medium hover:bg-[var(--th-bg)]"
          >
            <RefreshCw size={16} /> Nochmal
          </button>
          <button onClick={onDone} className="px-6 py-2.5 th-btn th-btn-primary rounded-xl font-medium">
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    )
  }

  const correctIdx = options.indexOf(card.back)

  const handleSelect = (i: number) => {
    if (selected !== null) return
    setSelected(i)
    if (i === correctIdx) setScore(s => s + 1)
  }

  const handleNext = () => {
    if (index + 1 >= cards.length) setFinished(true)
    else setIndex(i => i + 1)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="w-full mb-6">
        <div className="flex justify-between text-sm th-text-2 mb-2">
          <span>{index + 1} / {cards.length} · <span className="text-green-600 font-medium">{score} richtig</span></span>
          <button onClick={onDone} className="flex items-center gap-1 th-text-3 hover:th-text-2">
            <X size={14} /> Abbrechen
          </button>
        </div>
        <div className="h-2 bg-slate-200 rounded-full">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(index / cards.length) * 100}%`, background: '#7c3aed' }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="w-full th-card shadow-lg border border-[var(--th-border)] flex flex-col items-center justify-center p-8 mb-6 text-center min-h-[140px]">
        <div className="text-xs th-text-3 uppercase tracking-widest mb-3 font-medium">Frage</div>
        <div className="text-xl font-medium th-text leading-relaxed whitespace-pre-wrap">{card.front}</div>
        {card.frontImage && <CardImage src={card.frontImage} alt="Frage" />}
      </div>

      {/* Answer options */}
      <div className="w-full space-y-2">
        {options.map((opt, i) => {
          let bg = 'var(--th-card)'
          let border = 'var(--th-border)'
          let textColor = 'var(--th-text)'
          if (selected !== null) {
            if (i === correctIdx)       { bg = '#f0fdf4'; border = '#16a34a'; textColor = '#15803d' }
            else if (i === selected)    { bg = '#fef2f2'; border = '#ef4444'; textColor = '#b91c1c' }
            else                        { textColor = 'var(--th-text-3)' }
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className="w-full text-left p-4 rounded-xl border-2 text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: bg, borderColor: border, color: textColor }}
            >
              <span className="font-mono text-xs mr-2 opacity-50">{'ABCD'[i]}.</span>
              {opt}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <button
          onClick={handleNext}
          className="mt-6 px-8 py-3 th-btn th-btn-primary rounded-xl font-semibold text-sm"
        >
          {index + 1 >= cards.length ? 'Ergebnis anzeigen' : 'Nächste Frage →'}
        </button>
      )}
    </div>
  )
}

// ─── Card Form ────────────────────────────────────────────────────────────────

function CardForm({ initial, defaultModuleId, modules, onSave, onCancel }: {
  initial?: Flashcard
  defaultModuleId: string
  modules: { id: string; name: string; moduleNumber: string; color: string }[]
  onSave: (data: {
    front: string; back: string; tags: string[]
    moduleId: string; frontImage?: string; backImage?: string
  }) => void
  onCancel: () => void
}) {
  const [front, setFront] = useState(initial?.front ?? '')
  const [back, setBack] = useState(initial?.back ?? '')
  const [tagInput, setTagInput] = useState(initial?.tags.join(', ') ?? '')
  const [moduleId, setModuleId] = useState(initial?.moduleId ?? defaultModuleId)
  const [frontImage, setFrontImage] = useState<string | undefined>(initial?.frontImage)
  const [backImage, setBackImage] = useState<string | undefined>(initial?.backImage)

  const handleSave = () => {
    if (!front.trim() || !back.trim()) return
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    onSave({ front, back, tags, moduleId, frontImage, backImage })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="th-card shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{initial ? 'Karte bearbeiten' : 'Neue Karteikarte'}</h2>
          <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--th-bg-secondary,#f1f5f9)]"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Module */}
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Modul *</label>
            <select
              className="th-input"
              value={moduleId}
              onChange={e => setModuleId(e.target.value)}
            >
              {modules.length === 0 && <option value="">– kein Modul –</option>}
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>
              ))}
            </select>
          </div>

          {/* Front */}
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Vorderseite (Frage) *</label>
            <textarea
              className="th-input"
              rows={3} value={front} onChange={e => setFront(e.target.value)}
              placeholder="Frage oder Begriff..."
            />
            <ImageUpload value={frontImage} onChange={setFrontImage} label="Frage Bild" />
          </div>

          {/* Back */}
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Rückseite (Antwort) *</label>
            <textarea
              className="th-input"
              rows={3} value={back} onChange={e => setBack(e.target.value)}
              placeholder="Antwort oder Definition..."
            />
            <ImageUpload value={backImage} onChange={setBackImage} label="Antwort Bild" />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Tags (kommagetrennt)</label>
            <input
              className="th-input"
              value={tagInput} onChange={e => setTagInput(e.target.value)}
              placeholder="Kapitel 1, Grundlagen, ..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-sm th-text-2 hover:bg-[var(--th-bg-secondary,#f1f5f9)] rounded-lg">Abbrechen</button>
          <button
            onClick={handleSave} disabled={!front.trim() || !back.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm th-btn th-btn-primary disabled:opacity-50"
          >
            <Check size={16} /> {initial ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Anki Import Dialog ───────────────────────────────────────────────────────

interface AnkiImportDialogProps {
  pending: ImportedCard[]
  modules: { id: string; name: string; moduleNumber: string; color: string }[]
  onConfirm: (assignments: Record<number, string>) => void
  onCancel: () => void
}

function AnkiImportDialog({ pending, modules, onConfirm, onCancel }: AnkiImportDialogProps) {
  // moduleAssignment[cardIndex] = moduleId
  const [assignments, setAssignments] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {}
    pending.forEach((card, i) => {
      if (card.detectedModuleNumber) {
        const found = modules.find(m =>
          m.moduleNumber.replace(/\s+/g, '') === card.detectedModuleNumber?.replace(/\s+/g, '')
        )
        init[i] = found?.id ?? modules[0]?.id ?? ''
      } else {
        init[i] = modules[0]?.id ?? ''
      }
    })
    return init
  })

  const [globalModule, setGlobalModule] = useState(modules[0]?.id ?? '')

  const applyGlobal = () => {
    const next: Record<number, string> = {}
    pending.forEach((_, i) => { next[i] = globalModule })
    setAssignments(next)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="th-card shadow-2xl w-full max-w-2xl my-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--th-border)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--th-text)' }}>Anki-Import</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--th-text-2)' }}>
              {pending.length} Karte{pending.length !== 1 ? 'n' : ''} gefunden — Modul zuweisen
            </p>
          </div>
          <button onClick={onCancel} className="th-icon-btn"><X size={20} /></button>
        </div>

        {/* Global assign */}
        <div className="px-5 py-3 flex items-center gap-3 border-b shrink-0"
          style={{ background: 'var(--th-bg-secondary)', borderColor: 'var(--th-border)' }}>
          <span className="text-sm font-medium shrink-0" style={{ color: 'var(--th-text-2)' }}>Alle zuweisen:</span>
          <select
            className="th-input flex-1"
            value={globalModule}
            onChange={e => setGlobalModule(e.target.value)}
          >
            {modules.map(m => (
              <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>
            ))}
          </select>
          <button
            onClick={applyGlobal}
            className="shrink-0 px-3 py-1.5 text-sm font-semibold rounded-lg th-btn"
            style={{ background: 'var(--th-accent-soft)', color: 'var(--th-accent-soft-text)' }}
          >
            Anwenden
          </button>
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto">
          {pending.map((card, i) => {
            const auto = !!card.detectedModuleNumber && modules.some(m =>
              m.moduleNumber.replace(/\s+/g, '') === card.detectedModuleNumber?.replace(/\s+/g, '')
            )
            return (
              <div
                key={i}
                className="flex items-start gap-3 px-5 py-3 border-b"
                style={{ borderColor: 'var(--th-border)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--th-text)' }}>
                    {card.front}
                  </div>
                  <div className="text-xs truncate mt-0.5" style={{ color: 'var(--th-text-2)' }}>
                    {card.back}
                  </div>
                  {card.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {card.tags.map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--th-bg-secondary)', color: 'var(--th-text-3)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <select
                    className="th-input text-xs py-1"
                    value={assignments[i] ?? ''}
                    onChange={e => setAssignments(prev => ({ ...prev, [i]: e.target.value }))}
                    style={{ minWidth: '9rem' }}
                  >
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>
                    ))}
                  </select>
                  {auto && (
                    <span className="text-[10px]" style={{ color: '#16a34a' }}>↑ Auto-erkannt</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t shrink-0" style={{ borderColor: 'var(--th-border)' }}>
          <button onClick={onCancel} className="th-btn px-4 py-2 text-sm" style={{ color: 'var(--th-text-2)' }}>
            Abbrechen
          </button>
          <button
            onClick={() => onConfirm(assignments)}
            className="th-btn th-btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Check size={16} /> {pending.length} Karten importieren
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function KarteikartenPage() {
  const { data, createFlashcard, updateFlashcard, removeFlashcard } = useApp()
  const [filterModuleId, setFilterModuleId] = useState<string>('alle')
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState<Flashcard | undefined>()
  const [reviewing, setReviewing] = useState(false)
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([])
  const [quizzing, setQuizzing] = useState(false)
  const [quizCards, setQuizCards] = useState<Flashcard[]>([])

  // Anki import/export state
  const [showAnkiMenu, setShowAnkiMenu] = useState(false)
  const [importPending, setImportPending] = useState<ImportedCard[] | null>(null)
  const [importResult, setImportResult] = useState<{ count: number; skipped: number } | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // Community tab
  const [activeTab, setActiveTab] = useState<'meine' | 'community'>('meine')
  const [communityDecks, setCommunityDecks] = useState<SharedDeck[]>([])
  const [communityLoading, setCommunityLoading] = useState(false)
  const [communityError, setCommunityError] = useState<string | null>(null)

  // Share deck dialog
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareSuccess, setShareSuccess] = useState<string | null>(null)

  // Clone dialog
  const [cloneTarget, setCloneTarget] = useState<SharedDeck | null>(null)
  const [cloneModuleId, setCloneModuleId] = useState('')
  const [cloneLoading, setCloneLoading] = useState(false)

  const loadCommunity = async () => {
    setCommunityLoading(true)
    setCommunityError(null)
    try {
      const decks = await sharedDecksApi.list()
      setCommunityDecks(decks)
    } catch (e) {
      setCommunityError((e as Error).message)
    } finally {
      setCommunityLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'community') loadCommunity()
  }, [activeTab])

  const handleShareDeck = async (name: string, description: string) => {
    if (allCards.length === 0) return
    const moduleName = activeModuleId
      ? data.modules.find(m => m.id === activeModuleId)?.name
      : undefined
    try {
      await sharedDecksApi.publish({
        name,
        description: description || undefined,
        moduleName,
        cards: allCards.map(c => ({
          front: c.front,
          back: c.back,
          frontImage: c.frontImage,
          backImage: c.backImage,
          tags: c.tags,
        })),
      })
      setShowShareDialog(false)
      setShareSuccess(`Deck „${name}" wurde geteilt (${allCards.length} Karten).`)
      setTimeout(() => setShareSuccess(null), 5000)
    } catch (e) {
      alert('Fehler: ' + (e as Error).message)
    }
  }

  const handleClone = async () => {
    if (!cloneTarget || !cloneModuleId) return
    setCloneLoading(true)
    try {
      const result = await sharedDecksApi.clone(cloneTarget.id, cloneModuleId)
      setCloneTarget(null)
      setCloneModuleId('')
      // Reload app data so the new cards appear
      window.location.reload()
      void result
    } catch (e) {
      alert('Fehler: ' + (e as Error).message)
    } finally {
      setCloneLoading(false)
    }
  }

  const activeModuleId = filterModuleId === 'alle' ? undefined : filterModuleId

  // Base filter: module
  const moduleFiltered = data.flashcards.filter(c =>
    filterModuleId === 'alle' || c.moduleId === filterModuleId
  )

  // Tag filter on top
  const allCards = activeTags.size === 0
    ? moduleFiltered
    : moduleFiltered.filter(c => c.tags.some(t => activeTags.has(t)))

  // All unique tags across module-filtered cards
  const allTags = Array.from(new Set(moduleFiltered.flatMap(c => c.tags))).sort()

  const dueCards = getDueCards(data.flashcards, activeModuleId)
    .filter(c => activeTags.size === 0 || c.tags.some(t => activeTags.has(t)))

  const today = format(new Date(), 'yyyy-MM-dd')

  // ── Module map for Anki export ─────────────────────────────────────────────
  const moduleMap = Object.fromEntries(
    data.modules.map(m => [m.id, { name: m.name, moduleNumber: m.moduleNumber }])
  )

  // ── Anki export ────────────────────────────────────────────────────────────
  const handleExportAll = () => {
    downloadAnkiExport(data.flashcards, moduleMap)
    setShowAnkiMenu(false)
  }

  const handleExportFiltered = () => {
    downloadAnkiExport(allCards, moduleMap)
    setShowAnkiMenu(false)
  }

  // ── Anki import ────────────────────────────────────────────────────────────
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setShowAnkiMenu(false)

    const result = await parseAnkiTxt(file)
    if (result.cards.length === 0) {
      alert(result.warnings.join('\n') || 'Keine Karten in der Datei gefunden.')
      return
    }
    setImportPending(result.cards)
  }

  const handleImportConfirm = (assignments: Record<number, string>) => {
    if (!importPending) return
    let count = 0
    for (let i = 0; i < importPending.length; i++) {
      const card = importPending[i]
      const moduleId = assignments[i] ?? data.modules[0]?.id ?? ''
      createFlashcard({
        front:       card.front,
        back:        card.back,
        tags:        card.tags,
        moduleId,
        frontImage:  card.frontImage,
        backImage:   card.backImage,
      })
      count++
    }
    setImportPending(null)
    setImportResult({ count, skipped: 0 })
    setTimeout(() => setImportResult(null), 4000)
  }

  const toggleTag = (tag: string) => {
    setActiveTags(prev => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  const startDueReview = () => {
    if (dueCards.length === 0) return
    setReviewCards([...dueCards].sort(() => Math.random() - 0.5))
    setReviewing(true)
  }

  const startAllReview = () => {
    if (allCards.length === 0) return
    setReviewCards([...allCards].sort(() => Math.random() - 0.5))
    setReviewing(true)
  }

  const startQuiz = () => {
    if (allCards.length < 2) return
    setQuizCards([...allCards].sort(() => Math.random() - 0.5))
    setQuizzing(true)
  }

  const handleReview = (card: Flashcard, q: FlashcardDifficulty) => {
    updateFlashcard(applyReview(card, q))
  }

  const handleSave = (d: {
    front: string; back: string; tags: string[]
    moduleId: string; frontImage?: string; backImage?: string
  }) => {
    if (editCard) {
      updateFlashcard({ ...editCard, ...d })
    } else {
      createFlashcard(d)
    }
    setShowForm(false)
    setEditCard(undefined)
  }

  if (reviewing) {
    return (
      <div className="h-screen flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-[var(--th-border)] flex items-center gap-3">
          <BrainCircuit size={20} className="text-[#003366]" />
          <span className="font-semibold th-text">Lernmodus</span>
          <span className="text-xs th-text-3">– {reviewCards.length} Karten</span>
        </div>
        <div className="flex-1">
          <ReviewSession cards={reviewCards} onDone={() => setReviewing(false)} onReview={handleReview} />
        </div>
      </div>
    )
  }

  if (quizzing) {
    return (
      <div className="h-screen flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-[var(--th-border)] flex items-center gap-3">
          <ListChecks size={20} style={{ color: '#7c3aed' }} />
          <span className="font-semibold th-text">Quiz</span>
          <span className="text-xs th-text-3">– {quizCards.length} Fragen</span>
        </div>
        <div className="flex-1">
          <QuizSession cards={quizCards} onDone={() => setQuizzing(false)} />
        </div>
      </div>
    )
  }

  const defaultModuleId = filterModuleId === 'alle' ? (data.modules[0]?.id ?? '') : filterModuleId

  return (
    <div className="p-4 md:p-6">

      {/* Hidden file input for Anki import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".txt,.tsv,.csv"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Import result toast */}
      {importResult && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold"
          style={{ background: '#16a34a', color: 'white' }}
        >
          <CheckCircle2 size={16} />
          {importResult.count} Karten erfolgreich importiert!
        </div>
      )}

      {/* Anki import dialog */}
      {importPending && data.modules.length > 0 && (
        <AnkiImportDialog
          pending={importPending}
          modules={data.modules}
          onConfirm={handleImportConfirm}
          onCancel={() => setImportPending(null)}
        />
      )}
      {importPending && data.modules.length === 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="th-card p-6 max-w-sm w-full text-center shadow-2xl">
            <AlertCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--th-danger)' }} />
            <p className="font-semibold mb-2" style={{ color: 'var(--th-text)' }}>Kein Modul vorhanden</p>
            <p className="text-sm mb-4" style={{ color: 'var(--th-text-2)' }}>
              Bitte lege zuerst mindestens ein Modul an, bevor du Karten importierst.
            </p>
            <button onClick={() => setImportPending(null)} className="th-btn th-btn-primary px-4 py-2 text-sm">
              OK
            </button>
          </div>
        </div>
      )}

      {/* Share success toast */}
      {shareSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold"
          style={{ background: '#16a34a', color: 'white' }}
        >
          <CheckCircle2 size={16} /> {shareSuccess}
        </div>
      )}

      {/* Share deck dialog */}
      {showShareDialog && (
        <ShareDeckDialog
          cardCount={allCards.length}
          onShare={handleShareDeck}
          onCancel={() => setShowShareDialog(false)}
        />
      )}

      {/* Clone dialog */}
      {cloneTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="th-card p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-semibold th-text mb-1">Deck übernehmen</h3>
            <p className="text-sm th-text-2 mb-4">
              „{cloneTarget.name}" ({cloneTarget.cardCount} Karten) wird in dein Konto kopiert.
              Wähle das Modul, dem die Karten zugeordnet werden sollen:
            </p>
            {data.modules.length === 0 ? (
              <p className="text-sm text-red-600 mb-4">Du hast noch keine Module. Lege zuerst ein Modul an.</p>
            ) : (
              <select
                className="th-input w-full mb-4"
                value={cloneModuleId}
                onChange={e => setCloneModuleId(e.target.value)}
              >
                <option value="">— Modul wählen —</option>
                {data.modules.map(m => (
                  <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>
                ))}
              </select>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setCloneTarget(null)} className="th-btn px-4 py-2 text-sm" style={{ color: 'var(--th-text-2)' }}>
                Abbrechen
              </button>
              <button
                onClick={handleClone}
                disabled={!cloneModuleId || cloneLoading}
                className="th-btn th-btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
              >
                {cloneLoading ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={14} />}
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold th-text">Karteikarten</h1>
          <p className="text-sm th-text-2 mt-1">{allCards.length} Karten{activeTags.size > 0 ? ' (gefiltert)' : ''}</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          {dueCards.length > 0 && (
            <button
              onClick={startDueReview}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <BrainCircuit size={16} /> {dueCards.length} Fällig lernen
            </button>
          )}
          {allCards.length > 0 && (
            <button
              onClick={startAllReview}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <RefreshCw size={16} /> Alle üben
            </button>
          )}
          {allCards.length >= 2 && (
            <button
              onClick={startQuiz}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
              style={{ background: '#7c3aed' }}
            >
              <ListChecks size={16} /> Quiz
            </button>
          )}

          {/* Anki import/export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAnkiMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors"
              style={{
                borderColor: 'var(--th-border)',
                background: showAnkiMenu ? 'var(--th-bg-secondary)' : 'var(--th-card)',
                color: 'var(--th-text-2)',
              }}
              aria-haspopup="true"
              aria-expanded={showAnkiMenu}
            >
              <img
                src="https://apps.ankiweb.net/favicon.ico"
                alt=""
                className="w-4 h-4 rounded"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              Anki
              <ChevronDown size={13} />
            </button>

            {showAnkiMenu && (
              <>
                {/* Backdrop to close */}
                <div className="fixed inset-0 z-10" onClick={() => setShowAnkiMenu(false)} />
                <div
                  className="absolute right-0 top-full mt-1.5 z-20 rounded-xl shadow-xl overflow-hidden min-w-[13rem]"
                  style={{ background: 'var(--th-card)', border: '1px solid var(--th-border)' }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--th-border)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-3)' }}>
                      Exportieren
                    </p>
                  </div>
                  <button
                    onClick={handleExportAll}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--th-bg-secondary)]"
                    style={{ color: 'var(--th-text)' }}
                  >
                    <Download size={15} style={{ color: 'var(--th-text-3)' }} />
                    <span>Alle {data.flashcards.length} Karten</span>
                  </button>
                  {allCards.length !== data.flashcards.length && (
                    <button
                      onClick={handleExportFiltered}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--th-bg-secondary)]"
                      style={{ color: 'var(--th-text)' }}
                    >
                      <Download size={15} style={{ color: 'var(--th-text-3)' }} />
                      <span>Gefilterte {allCards.length} Karten</span>
                    </button>
                  )}
                  <div className="px-3 py-2 border-t border-b" style={{ borderColor: 'var(--th-border)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--th-text-3)' }}>
                      Importieren
                    </p>
                  </div>
                  <button
                    onClick={() => { importInputRef.current?.click(); setShowAnkiMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--th-bg-secondary)]"
                    style={{ color: 'var(--th-text)' }}
                  >
                    <Upload size={15} style={{ color: 'var(--th-text-3)' }} />
                    <span>Aus Anki-Datei (.txt)</span>
                  </button>
                  <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--th-border)', background: 'var(--th-bg-secondary)' }}>
                    <p className="text-[10px]" style={{ color: 'var(--th-text-3)' }}>
                      Export in Anki: Datei → Exportieren → „Notizen als Klartext (.txt)"
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {allCards.length > 0 && activeTab === 'meine' && (
            <button
              onClick={() => setShowShareDialog(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors"
              style={{ borderColor: 'var(--th-border)', color: 'var(--th-text-2)', background: 'var(--th-card)' }}
              title="Aktuelle Karten als Community-Deck teilen"
            >
              <Share2 size={15} /> Teilen
            </button>
          )}

          <button
            onClick={() => { setEditCard(undefined); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 th-btn th-btn-primary transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Neue Karte
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--th-border)' }}>
        <button
          onClick={() => setActiveTab('meine')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === 'meine' ? 'border-blue-600 text-blue-600' : 'border-transparent th-text-2 hover:th-text'}`}
        >
          <Layers size={14} /> Meine Karten
        </button>
        <button
          onClick={() => setActiveTab('community')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === 'community' ? 'border-blue-600 text-blue-600' : 'border-transparent th-text-2 hover:th-text'}`}
        >
          <Globe size={14} /> Community-Decks
        </button>
      </div>

      {/* ─── Community Tab ──────────────────────────────────────────────── */}
      {activeTab === 'community' && (
        <div>
          {communityLoading && (
            <div className="flex items-center justify-center py-20 th-text-3">
              <RefreshCw size={20} className="animate-spin mr-2" /> Lade Community-Decks…
            </div>
          )}
          {communityError && (
            <div className="text-center py-16">
              <AlertCircle size={32} className="mx-auto mb-2 text-red-500" />
              <p className="text-sm text-red-600">{communityError}</p>
              <button onClick={loadCommunity} className="mt-4 text-sm th-text-2 underline">Nochmal versuchen</button>
            </div>
          )}
          {!communityLoading && !communityError && communityDecks.length === 0 && (
            <div className="text-center py-20 th-text-3">
              <Globe size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Noch keine geteilten Decks</p>
              <p className="text-sm mt-1">Sei der Erste und teile deine Karten!</p>
            </div>
          )}
          {!communityLoading && !communityError && communityDecks.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {communityDecks.map(deck => (
                <div key={deck.id} className="th-card p-5 flex flex-col gap-3">
                  <div>
                    <div className="font-semibold th-text mb-0.5 truncate">{deck.name}</div>
                    {deck.moduleName && (
                      <div className="text-xs th-text-3 mb-1">{deck.moduleName}</div>
                    )}
                    {deck.description && (
                      <p className="text-sm th-text-2 line-clamp-2">{deck.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs th-text-3">
                    <span>{deck.cardCount} Karten</span>
                    <span>von {deck.ownerName}</span>
                  </div>
                  <button
                    onClick={() => { setCloneTarget(deck); setCloneModuleId(data.modules[0]?.id ?? '') }}
                    className="flex items-center justify-center gap-2 px-3 py-2 th-btn th-btn-primary text-sm font-medium w-full"
                  >
                    <LogIn size={14} /> Übernehmen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Meine Karten Tab ───────────────────────────────────────────── */}
      {activeTab === 'meine' && <>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Gesamt', value: allCards.length, color: 'th-text' },
          { label: 'Heute fällig', value: dueCards.length, color: dueCards.length > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Heute gelernt', value: allCards.filter(c => c.lastReviewedAt?.startsWith(today)).length, color: 'text-blue-600' },
          { label: 'Gut bekannt', value: allCards.filter(c => c.interval >= 14).length, color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="th-card p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs th-text-2 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Module filter */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <button
          onClick={() => setFilterModuleId('alle')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === 'alle' ? 'th-btn th-btn-primary' : 'bg-[var(--th-bg-secondary,#f1f5f9)] th-text-2 hover:bg-slate-200'}`}
        >Alle Module</button>
        {data.modules.map(m => (
          <button key={m.id} onClick={() => setFilterModuleId(m.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === m.id ? 'text-white' : 'bg-[var(--th-bg-secondary,#f1f5f9)] th-text-2 hover:bg-slate-200'}`}
            style={filterModuleId === m.id ? { backgroundColor: m.color } : {}}
          >{m.moduleNumber} {m.name}</button>
        ))}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <Tag size={13} className="th-text-3 shrink-0" />
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTags.has(tag)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[var(--th-bg-secondary,#f1f5f9)] th-text-2 hover:bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
          {activeTags.size > 0 && (
            <button
              onClick={() => setActiveTags(new Set())}
              className="text-xs th-text-3 hover:th-text-2 underline"
            >
              zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Card list */}
      {allCards.length === 0 ? (
        <div className="text-center py-20 th-text-3">
          <Layers size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Keine Karteikarten</p>
          <p className="text-sm mt-1">
            {activeTags.size > 0 ? 'Keine Karten mit diesen Tags.' : 'Erstelle deine erste Karte!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allCards.map(card => {
            const module = data.modules.find(m => m.id === card.moduleId)
            const isDue = card.dueDate <= today
            const daysUntil = differenceInDays(parseISO(card.dueDate), new Date())
            return (
              <div
                key={card.id}
                onClick={() => { setReviewCards([card]); setReviewing(true) }}
                className={`bg-white rounded-lg border p-4 flex items-center gap-4 cursor-pointer hover:shadow-sm transition-shadow ${isDue ? 'border-red-200 bg-red-50 hover:border-red-300' : 'border-[var(--th-border)] hover:border-[var(--th-border)]'}`}
              >
                {/* Card content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium th-text truncate">{card.front}</span>
                    {(card.frontImage || card.backImage) && (
                      <span title="Enthält Bild"><ImageIcon size={12} className="th-text-3 shrink-0" /></span>
                    )}
                  </div>
                  <div className="text-sm th-text-2 truncate">{card.back}</div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {module && (
                    <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: module.color }}>
                      {module.moduleNumber}
                    </span>
                  )}
                  {card.tags.map(t => (
                    <span key={t} className="text-xs bg-[var(--th-bg-secondary,#f1f5f9)] th-text-2 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                  <span className={`text-xs font-medium ${isDue ? 'text-red-600' : 'th-text-3'}`}>
                    {isDue ? 'Fällig!' : `in ${daysUntil}d`}
                  </span>
                  <span className="text-xs text-slate-300">|</span>
                  <span className="text-xs th-text-3">∅ {card.interval}d</span>
                  {/* Touch-friendly action buttons */}
                  <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => { e.stopPropagation(); setEditCard(card); setShowForm(true) }}
                      className="th-card-action-btn th-card-action-edit"
                      style={{ flex: 'none', minWidth: '44px', padding: '0 12px' }}
                      aria-label="Karte bearbeiten"
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); if (confirm('Karte löschen?')) removeFlashcard(card.id) }}
                      className="th-card-action-btn th-card-action-delete"
                      style={{ flex: 'none', minWidth: '44px', padding: '0 12px' }}
                      aria-label="Karte löschen"
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <CardForm
          initial={editCard}
          defaultModuleId={defaultModuleId}
          modules={data.modules}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditCard(undefined) }}
        />
      )}

      </>}
    </div>
  )
}

// ─── Share Deck Dialog ────────────────────────────────────────────────────────

function ShareDeckDialog({
  cardCount,
  onShare,
  onCancel,
}: {
  cardCount: number
  onShare: (name: string, description: string) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await onShare(name.trim(), description.trim())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="th-card p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Share2 size={18} style={{ color: '#003366' }} />
          <h3 className="font-semibold th-text">Deck teilen</h3>
        </div>
        <p className="text-sm th-text-2 mb-4">
          {cardCount} Karten werden als Community-Deck veröffentlicht. Andere Benutzer können es übernehmen und unabhängig lernen.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium th-text-2 mb-1">Deck-Name *</label>
            <input
              className="th-input w-full"
              placeholder="z. B. Rechtsgrundlagen Sem. 1"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium th-text-2 mb-1">Beschreibung (optional)</label>
            <textarea
              className="th-input w-full resize-none"
              rows={2}
              placeholder="Was beinhaltet dieses Deck?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel} className="th-btn px-4 py-2 text-sm" style={{ color: 'var(--th-text-2)' }}>
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            className="th-btn th-btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Share2 size={14} />}
            Teilen
          </button>
        </div>
      </div>
    </div>
  )
}

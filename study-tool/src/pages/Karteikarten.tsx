import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import type { Flashcard, FlashcardDifficulty } from '../types'
import { applyReview, getDueCards, getDifficultyLabel, getDifficultyColor } from '../utils/spaceRepetition'
import { format, parseISO, differenceInDays } from 'date-fns'
import { Plus, BrainCircuit, Check, X, Pencil, Layers, Tag, ImageIcon, RefreshCw, ZoomIn } from 'lucide-react'

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

export default function KarteikartenPage() {
  const { data, createFlashcard, updateFlashcard, removeFlashcard } = useApp()
  const [filterModuleId, setFilterModuleId] = useState<string>('alle')
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState<Flashcard | undefined>()
  const [reviewing, setReviewing] = useState(false)
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([])

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

  const defaultModuleId = filterModuleId === 'alle' ? (data.modules[0]?.id ?? '') : filterModuleId

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold th-text">Karteikarten</h1>
          <p className="text-sm th-text-2 mt-1">{allCards.length} Karten{activeTags.size > 0 ? ' (gefiltert)' : ''}</p>
        </div>
        <div className="flex gap-2">
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
          <button
            onClick={() => { setEditCard(undefined); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 th-btn th-btn-primary transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Neue Karte
          </button>
        </div>
      </div>

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
                  <button
                    onClick={e => { e.stopPropagation(); setEditCard(card); setShowForm(true) }}
                    className="p-1.5 th-text-3 hover:th-text-2"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); if (confirm('Karte löschen?')) removeFlashcard(card.id) }}
                    className="p-1.5 th-text-3 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
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
    </div>
  )
}

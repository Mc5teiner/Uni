import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { Flashcard, FlashcardDifficulty } from '../types'
import { applyReview, getDueCards, getDifficultyLabel, getDifficultyColor } from '../utils/spaceRepetition'
import { format, parseISO, differenceInDays } from 'date-fns'
import { Plus, BrainCircuit, Check, X, Pencil, Layers } from 'lucide-react'

// ─── Review Session ──────────────────────────────────────────────────────────

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
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Alle Karten abgearbeitet!</h2>
        <p className="text-slate-500 mb-6">{reviewed} Karten heute wiederholt.</p>
        <button onClick={onDone} className="px-6 py-3 bg-[#003366] text-white rounded-xl font-medium hover:bg-[#004488]">
          Zurück zur Übersicht
        </button>
      </div>
    )
  }

  const handleRate = (q: FlashcardDifficulty) => {
    onReview(card, q)
    setFlipped(false)
    setReviewed(r => r + 1)
    if (index + 1 < cards.length) setIndex(i => i + 1)
    else setIndex(cards.length) // triggers done screen
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="w-full mb-6">
        <div className="flex justify-between text-sm text-slate-500 mb-2">
          <span>{reviewed} / {cards.length} Karten</span>
          <button onClick={onDone} className="flex items-center gap-1 text-slate-400 hover:text-slate-600"><X size={14} /> Abbrechen</button>
        </div>
        <div className="h-2 bg-slate-200 rounded-full">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(reviewed / cards.length) * 100}%` }} />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full bg-white rounded-2xl shadow-lg border border-slate-200 min-h-[260px] flex flex-col items-center justify-center p-8 cursor-pointer select-none mb-6"
        onClick={() => setFlipped(f => !f)}
      >
        {!flipped ? (
          <>
            <div className="text-xs text-slate-400 uppercase tracking-widest mb-4 font-medium">Frage</div>
            <div className="text-xl font-medium text-slate-800 text-center leading-relaxed whitespace-pre-wrap">{card.front}</div>
            <div className="text-xs text-slate-400 mt-6">Klicken zum Aufdecken</div>
          </>
        ) : (
          <>
            <div className="text-xs text-blue-500 uppercase tracking-widest mb-4 font-medium">Antwort</div>
            <div className="text-xl text-slate-800 text-center leading-relaxed whitespace-pre-wrap">{card.back}</div>
          </>
        )}
      </div>

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4 justify-center">
          {card.tags.map(t => <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>)}
        </div>
      )}

      {/* Rating buttons */}
      {flipped && (
        <div className="w-full">
          <div className="text-xs text-center text-slate-400 mb-3">Wie gut hast du es gewusst?</div>
          <div className="grid grid-cols-3 gap-2">
            {([0, 1, 2, 3, 4, 5] as FlashcardDifficulty[]).map(q => (
              <button
                key={q}
                onClick={() => handleRate(q)}
                className={`py-2 px-3 rounded-lg text-white text-xs font-medium ${getDifficultyColor(q)} hover:opacity-90 transition-opacity`}
              >
                {getDifficultyLabel(q)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Card Form ───────────────────────────────────────────────────────────────

function CardForm({ initial, onSave, onCancel }: {
  initial?: Flashcard
  moduleId?: string
  onSave: (front: string, back: string, tags: string[]) => void
  onCancel: () => void
}) {
  const [front, setFront] = useState(initial?.front ?? '')
  const [back, setBack] = useState(initial?.back ?? '')
  const [tagInput, setTagInput] = useState(initial?.tags.join(', ') ?? '')

  const handleSave = () => {
    if (!front.trim() || !back.trim()) return
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean)
    onSave(front, back, tags)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{initial ? 'Karte bearbeiten' : 'Neue Karteikarte'}</h2>
          <button onClick={onCancel}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vorderseite (Frage) *</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3} value={front} onChange={e => setFront(e.target.value)}
              placeholder="Frage oder Begriff..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rückseite (Antwort) *</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3} value={back} onChange={e => setBack(e.target.value)}
              placeholder="Antwort oder Definition..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags (kommagetrennt)</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={tagInput} onChange={e => setTagInput(e.target.value)}
              placeholder="Kapitel 1, Grundlagen, ..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Abbrechen</button>
          <button
            onClick={handleSave} disabled={!front.trim() || !back.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#003366] text-white rounded-lg hover:bg-[#004488] disabled:opacity-50"
          >
            <Check size={16} /> {initial ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function KarteikartenPage() {
  const { data, createFlashcard, updateFlashcard, removeFlashcard } = useApp()
  const [filterModuleId, setFilterModuleId] = useState<string>('alle')
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState<Flashcard | undefined>()
  const [reviewing, setReviewing] = useState(false)
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([])

  const activeModuleId = filterModuleId === 'alle' ? undefined : filterModuleId

  const allCards = data.flashcards.filter(c => filterModuleId === 'alle' || c.moduleId === filterModuleId)
  const dueCards = getDueCards(data.flashcards, activeModuleId)
  const today = format(new Date(), 'yyyy-MM-dd')

  const startReview = () => {
    const cards = getDueCards(data.flashcards, activeModuleId)
    if (cards.length === 0) return
    setReviewCards([...cards].sort(() => Math.random() - 0.5))
    setReviewing(true)
  }

  const handleReview = (card: Flashcard, q: FlashcardDifficulty) => {
    updateFlashcard(applyReview(card, q))
  }

  const handleSave = (front: string, back: string, tags: string[]) => {
    if (editCard) {
      updateFlashcard({ ...editCard, front, back, tags })
    } else {
      createFlashcard({
        moduleId: filterModuleId === 'alle' ? (data.modules[0]?.id ?? '') : filterModuleId,
        front, back, tags,
      })
    }
    setShowForm(false)
    setEditCard(undefined)
  }

  if (reviewing) {
    return (
      <div className="h-screen flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-3">
          <BrainCircuit size={20} className="text-[#003366]" />
          <span className="font-semibold text-slate-800">Lernmodus</span>
        </div>
        <div className="flex-1">
          <ReviewSession cards={reviewCards} onDone={() => setReviewing(false)} onReview={handleReview} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Karteikarten</h1>
          <p className="text-sm text-slate-500 mt-1">{allCards.length} Karten gesamt</p>
        </div>
        <div className="flex gap-3">
          {dueCards.length > 0 && (
            <button
              onClick={startReview}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <BrainCircuit size={16} /> {dueCards.length} Karten lernen
            </button>
          )}
          <button
            onClick={() => { setEditCard(undefined); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004488] transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Neue Karte
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Gesamt', value: allCards.length, color: 'text-slate-800' },
          { label: 'Heute fällig', value: dueCards.length, color: dueCards.length > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Gelernt heute', value: allCards.filter(c => c.lastReviewedAt?.startsWith(today)).length, color: 'text-blue-600' },
          { label: 'Gut bekannt', value: allCards.filter(c => c.interval >= 14).length, color: 'text-green-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Module filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterModuleId('alle')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === 'alle' ? 'bg-[#003366] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >Alle Module</button>
        {data.modules.map(m => (
          <button key={m.id} onClick={() => setFilterModuleId(m.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === m.id ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            style={filterModuleId === m.id ? { backgroundColor: m.color } : {}}
          >{m.moduleNumber} {m.name}</button>
        ))}
      </div>

      {/* Card list */}
      {allCards.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Layers size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Noch keine Karteikarten</p>
          <p className="text-sm mt-1">Erstelle deine erste Karte!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allCards.map(card => {
            const module = data.modules.find(m => m.id === card.moduleId)
            const isDue = card.dueDate <= today
            const daysUntil = differenceInDays(parseISO(card.dueDate), new Date())
            return (
              <div key={card.id} className={`bg-white rounded-lg border p-4 flex items-center gap-4 ${isDue ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">{card.front}</div>
                  <div className="text-sm text-slate-500 truncate">{card.back}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {module && (
                    <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: module.color }}>
                      {module.moduleNumber}
                    </span>
                  )}
                  {card.tags.map(t => <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>)}
                  <span className={`text-xs font-medium ${isDue ? 'text-red-600' : 'text-slate-400'}`}>
                    {isDue ? 'Fällig!' : `in ${daysUntil}d`}
                  </span>
                  <span className="text-xs text-slate-400">Intervall: {card.interval}d</span>
                  <button onClick={() => { setEditCard(card); setShowForm(true) }} className="p-1.5 text-slate-400 hover:text-slate-700"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm('Karte löschen?')) removeFlashcard(card.id) }} className="p-1.5 text-slate-400 hover:text-red-600"><X size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <CardForm
          initial={editCard}
          moduleId={filterModuleId === 'alle' ? (data.modules[0]?.id ?? '') : filterModuleId}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditCard(undefined) }}
        />
      )}
    </div>
  )
}

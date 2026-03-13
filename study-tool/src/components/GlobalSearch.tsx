import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Search, BookOpen, FileText, BrainCircuit, X, ArrowRight, Hash } from 'lucide-react'

interface SearchResult {
  id: string
  type: 'module' | 'document' | 'flashcard' | 'deck'
  title: string
  subtitle?: string
  path: string
}

const TYPE_CONFIG = {
  module:    { label: 'Modul',        icon: BookOpen },
  document:  { label: 'Studienbrief', icon: FileText },
  flashcard: { label: 'Karteikarte',  icon: BrainCircuit },
  deck:      { label: 'Karteikasten', icon: Hash },
} as const

export default function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState(0)
  const { data }                = useApp()
  const navigate                = useNavigate()
  const inputRef                = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const out: SearchResult[] = []

    data.modules.forEach(m => {
      if (m.name.toLowerCase().includes(q) || m.moduleNumber.includes(q) || m.description?.toLowerCase().includes(q)) {
        const mod = data.modules.find(x => x.id === m.id)
        out.push({ id: m.id, type: 'module', title: m.name, subtitle: `${m.moduleNumber} · ${m.semester}`, path: '/module' })
      }
    })

    data.documents.forEach(d => {
      if (d.name.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q)) {
        const mod = data.modules.find(m => m.id === d.moduleId)
        out.push({ id: d.id, type: 'document', title: d.name, subtitle: mod?.name, path: '/dokumente' })
      }
    })

    data.flashcardDecks.forEach(deck => {
      if (deck.name.toLowerCase().includes(q) || deck.description?.toLowerCase().includes(q)) {
        const mod = data.modules.find(m => m.id === deck.moduleId)
        out.push({ id: deck.id, type: 'deck', title: deck.name, subtitle: mod?.name, path: '/karteikarten' })
      }
    })

    data.flashcards.forEach(c => {
      if (c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)) {
        const mod = data.modules.find(m => m.id === c.moduleId)
        out.push({
          id:       c.id,
          type:     'flashcard',
          title:    c.front.length > 80 ? c.front.slice(0, 80) + '…' : c.front,
          subtitle: mod?.name,
          path:     '/karteikarten',
        })
      }
    })

    return out.slice(0, 14)
  }, [query, data])

  useEffect(() => { setSelected(0) }, [results])

  function go(r: SearchResult) {
    navigate(r.path)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowDown':
        e.preventDefault()
        setSelected(s => Math.min(s + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelected(s => Math.max(s - 1, 0))
        break
      case 'Enter':
        if (results[selected]) go(results[selected])
        break
    }
  }

  const q = query.trim()

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center pt-[10vh] px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Globale Suche"
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--th-card)', border: '1px solid var(--th-border)' }}
      >
        {/* ── Input ─────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: '1px solid var(--th-border)' }}
        >
          <Search size={18} aria-hidden="true" style={{ color: 'var(--th-text-3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="search"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--th-text)' }}
            placeholder="Module, Dokumente, Karteikarten durchsuchen…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Suchbegriff eingeben"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-haspopup="listbox"
            aria-autocomplete="list"
          />
          <button
            type="button"
            onClick={onClose}
            className="th-icon-btn shrink-0"
            aria-label="Suche schließen"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* ── Results ───────────────────────────────────────────── */}
        {q.length >= 2 ? (
          <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
            {results.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm" style={{ color: 'var(--th-text-3)' }}>
                Keine Ergebnisse für „{query}"
              </div>
            ) : (
              <ul role="listbox" aria-label="Suchergebnisse">
                {results.map((r, i) => {
                  const { icon: Icon, label } = TYPE_CONFIG[r.type]
                  return (
                    <li key={`${r.type}-${r.id}`} role="option" aria-selected={i === selected}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                        style={{
                          background:   i === selected ? 'var(--th-card-hover)' : '',
                          borderBottom: '1px solid var(--th-border)',
                        }}
                        onClick={() => go(r)}
                        onMouseEnter={() => setSelected(i)}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'var(--th-bg-secondary)' }}
                        >
                          <Icon size={15} aria-hidden="true" style={{ color: 'var(--th-accent)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--th-text)' }}>
                            {r.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--th-accent)', opacity: 0.8 }}>
                              {label}
                            </span>
                            {r.subtitle && (
                              <>
                                <span aria-hidden="true" style={{ color: 'var(--th-border)' }}>·</span>
                                <span className="text-xs truncate" style={{ color: 'var(--th-text-3)' }}>
                                  {r.subtitle}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={14} aria-hidden="true" style={{ color: 'var(--th-text-3)', flexShrink: 0 }} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : (
          /* ── Keyboard hints ───────────────────────────────────── */
          <div
            className="px-4 py-3 flex items-center gap-5 text-xs"
            style={{ color: 'var(--th-text-3)' }}
          >
            {[
              { keys: '↑ ↓', label: 'navigieren' },
              { keys: 'Enter', label: 'öffnen' },
              { keys: 'Esc', label: 'schließen' },
            ].map(({ keys, label }) => (
              <span key={keys} className="flex items-center gap-1.5">
                <kbd
                  className="font-mono px-1.5 py-0.5 rounded text-[10px]"
                  style={{ background: 'var(--th-bg-secondary)', border: '1px solid var(--th-border)' }}
                >
                  {keys}
                </kbd>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

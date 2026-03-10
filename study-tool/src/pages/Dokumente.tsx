import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import type { StudyDocument, Bookmark } from '../types'
import { generateId } from '../utils/storage'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Upload, FileText, Trash2, Bookmark as BookmarkIcon, BookmarkCheck,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Plus, ArrowLeft,
  StickyNote, Pencil, Check, PanelLeft, Share2,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { getNextSemesters } from '../data/fernuniModules'
import { sharedDocuments as sharedDocsApi } from '../api/client'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const SEMESTER_OPTIONS = getNextSemesters(10)

// ─── PDF Thumbnail ────────────────────────────────────────────────────────────

function PDFThumbnail({ doc }: { doc: StudyDocument }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError]   = useState(false)

  useEffect(() => {
    let cancelled = false
    const render = async (fileData: string) => {
      try {
        const binary = atob(fileData)
        const bytes  = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const pdf      = await pdfjsLib.getDocument({ data: bytes }).promise
        if (cancelled) return
        const pdfPage  = await pdf.getPage(1)
        if (cancelled) return
        const viewport = pdfPage.getViewport({ scale: 0.4 })
        const canvas   = canvasRef.current
        if (!canvas) return
        canvas.width  = viewport.width
        canvas.height = viewport.height
        const ctx     = canvas.getContext('2d')!
        await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise
        if (!cancelled) setLoaded(true)
      } catch { if (!cancelled) setError(true) }
    }

    if (doc.fileData) {
      // Legacy: inline base64
      render(doc.fileData)
    } else if (doc.sharedDocumentId) {
      // New: fetch from shared-documents API
      sharedDocsApi.get(doc.sharedDocumentId)
        .then(sd => { if (!cancelled && sd.fileData) render(sd.fileData) })
        .catch(() => { if (!cancelled) setError(true) })
    }
    return () => { cancelled = true }
  }, [doc.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full bg-[var(--th-bg-secondary,#f1f5f9)] rounded-lg overflow-hidden flex items-center justify-center" style={{ aspectRatio: '3/4' }}>
      {!loaded && !error && <FileText size={28} className="text-slate-300" />}
      {error && <FileText size={28} className="text-slate-300 opacity-40" />}
      <canvas
        ref={canvasRef}
        style={{ display: loaded ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  )
}

// ─── Document Edit Form ───────────────────────────────────────────────────────

interface DocEditFormProps {
  doc: StudyDocument
  modules: { id: string; name: string; moduleNumber: string; color: string }[]
  onSave: (updated: StudyDocument) => void
  onCancel: () => void
}

function DocEditForm({ doc, modules, onSave, onCancel }: DocEditFormProps) {
  const [name, setName] = useState(doc.name)
  const [semester, setSemester] = useState(doc.semester ?? SEMESTER_OPTIONS[0])
  const [moduleId, setModuleId] = useState(doc.moduleId)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="th-card shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Studienbrief bearbeiten</h2>
          <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--th-bg-secondary,#f1f5f9)]"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Name</label>
            <input
              className="th-input"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Semester</label>
            <select
              className="th-input"
              value={semester}
              onChange={e => setSemester(e.target.value)}
            >
              {SEMESTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              {!SEMESTER_OPTIONS.includes(semester) && semester && (
                <option value={semester}>{semester}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium th-text-2 mb-1">Modul</label>
            <select
              className="th-input"
              value={moduleId}
              onChange={e => setModuleId(e.target.value)}
            >
              <option value="">– kein Modul –</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>{m.moduleNumber} {m.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-sm th-text-2 hover:bg-[var(--th-bg-secondary,#f1f5f9)] rounded-lg transition-colors">
            Abbrechen
          </button>
          <button
            onClick={() => onSave({ ...doc, name: name.trim() || doc.name, semester, moduleId })}
            disabled={!name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm th-btn th-btn-primary transition-colors disabled:opacity-50"
          >
            <Check size={16} /> Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PDF Viewer ───────────────────────────────────────────────────────────────

function PDFViewer({ doc, onUpdate }: { doc: StudyDocument; onUpdate: (d: StudyDocument) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(doc.currentPage || 1)
  const [totalPages, setTotalPages] = useState(doc.totalPages || 1)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showBookmarkInput, setShowBookmarkInput] = useState(false)
  const [bookmarkLabel, setBookmarkLabel] = useState('')
  const [showPanel, setShowPanel] = useState(() => window.innerWidth >= 768)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  // Keep refs for use in event handlers without stale closures
  const pageRef = useRef(page)
  pageRef.current = page
  const totalPagesRef = useRef(totalPages)
  totalPagesRef.current = totalPages

  // Load PDF — supports both legacy inline fileData and shared document references
  useEffect(() => {
    let cancelled = false
    const loadFromBase64 = async (fileData: string) => {
      try {
        const binary = atob(fileData)
        const bytes  = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
        if (cancelled) return
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        if (doc.totalPages !== pdf.numPages) {
          onUpdate({ ...doc, totalPages: pdf.numPages })
          // Also update page count on the shared document (best-effort)
          if (doc.sharedDocumentId) {
            sharedDocsApi.updatePages(doc.sharedDocumentId, pdf.numPages).catch(() => {/* ignore */})
          }
        }
        setLoading(false)
      } catch (e) {
        console.error('PDF load error', e)
        if (!cancelled) { setLoadError(true); setLoading(false) }
      }
    }

    setLoading(true)
    setLoadError(false)

    if (doc.fileData) {
      // Legacy: inline base64
      loadFromBase64(doc.fileData)
    } else if (doc.sharedDocumentId) {
      sharedDocsApi.get(doc.sharedDocumentId)
        .then(sd => { if (!cancelled && sd.fileData) loadFromBase64(sd.fileData) })
        .catch(() => { if (!cancelled) { setLoadError(true); setLoading(false) } })
    } else {
      setLoadError(true)
      setLoading(false)
    }
    return () => { cancelled = true }
  }, [doc.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
    }
    const pdfPage = await pdfDoc.getPage(page)
    const viewport = pdfPage.getViewport({ scale })
    const canvas = canvasRef.current
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    const task = pdfPage.render({ canvasContext: ctx, viewport, canvas })
    renderTaskRef.current = task
    try {
      await task.promise
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'RenderingCancelledException') console.error(e)
    }
  }, [pdfDoc, page, scale])

  useEffect(() => {
    renderPage()
    // Scroll back to top when changing pages
    if (scrollAreaRef.current) scrollAreaRef.current.scrollTop = 0
  }, [renderPage])

  const goToPage = useCallback((p: number) => {
    const newPage = Math.max(1, Math.min(p, totalPagesRef.current))
    setPage(newPage)
    onUpdate({ ...doc, currentPage: newPage, lastReadAt: new Date().toISOString() })
  }, [doc, onUpdate])

  // Keyboard navigation (arrow keys, PageUp/Down)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        goToPage(pageRef.current + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        goToPage(pageRef.current - 1)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [goToPage])

  // Mouse wheel on the scroll area: at the top/bottom edge, turn the page
  const wheelAccRef = useRef(0)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollAreaRef.current
    if (!el) return
    const atTop = el.scrollTop === 0
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2

    if (e.deltaY > 0 && atBottom) {
      wheelAccRef.current += e.deltaY
      if (wheelAccRef.current > 150) {
        wheelAccRef.current = 0
        goToPage(pageRef.current + 1)
      }
    } else if (e.deltaY < 0 && atTop) {
      wheelAccRef.current += Math.abs(e.deltaY)
      if (wheelAccRef.current > 150) {
        wheelAccRef.current = 0
        goToPage(pageRef.current - 1)
      }
    } else {
      wheelAccRef.current = 0
    }
  }

  const isBookmarked = doc.bookmarks.some(b => b.page === page)

  const addBookmark = () => {
    if (!bookmarkLabel.trim()) return
    const newBookmark: Bookmark = { id: generateId(), page, label: bookmarkLabel, createdAt: new Date().toISOString() }
    onUpdate({ ...doc, bookmarks: [...doc.bookmarks, newBookmark] })
    setBookmarkLabel('')
    setShowBookmarkInput(false)
  }

  const removeBookmark = (id: string) => {
    onUpdate({ ...doc, bookmarks: doc.bookmarks.filter(b => b.id !== id) })
  }

  const addNote = () => {
    if (!noteText.trim()) return
    const note = { id: generateId(), page, text: noteText, createdAt: new Date().toISOString() }
    onUpdate({ ...doc, notes: [...doc.notes, note] })
    setNoteText('')
    setShowNoteInput(false)
  }

  const removeNote = (id: string) => {
    onUpdate({ ...doc, notes: doc.notes.filter(n => n.id !== id) })
  }

  const startEditNote = (id: string, text: string) => {
    setEditingNoteId(id)
    setEditingNoteText(text)
  }

  const saveEditNote = () => {
    if (!editingNoteId || !editingNoteText.trim()) return
    onUpdate({ ...doc, notes: doc.notes.map(n => n.id === editingNoteId ? { ...n, text: editingNoteText.trim() } : n) })
    setEditingNoteId(null)
    setEditingNoteText('')
  }

  const pageNotes = doc.notes.filter(n => n.page === page)

  const panelBadge = doc.bookmarks.length + doc.notes.length

  return (
    <div className="flex h-full overflow-hidden relative">

      {/* ── Mobile backdrop ──────────────────────────────────────── */}
      {showPanel && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          style={{ backdropFilter: 'blur(2px)' }}
          onClick={() => setShowPanel(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Lesezeichen / Notizen Panel ─────────────────────────── */}
      {/*
          Mobile:  position:fixed, slides in from left as overlay
          Desktop: static flex column (part of layout)
      */}
      <div
        className={[
          'flex flex-col bg-white overflow-hidden flex-shrink-0',
          'border-r border-[var(--th-border)]',
          // mobile: fixed overlay
          'fixed top-0 bottom-0 left-0 z-50 w-[280px] shadow-2xl',
          'transition-transform duration-250 ease-in-out',
          // desktop: back to static
          'md:relative md:z-auto md:w-64 md:shadow-none',
          showPanel ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Panel header (mobile only — close button) */}
        <div className="md:hidden flex items-center justify-between px-3 py-3 border-b bg-slate-800 text-white flex-shrink-0">
          <span className="text-sm font-semibold">Lesezeichen &amp; Notizen</span>
          <button
            onClick={() => setShowPanel(false)}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label="Panel schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Bookmarks */}
        <div className="p-3 border-b bg-[var(--th-bg)] flex-shrink-0">
          <div className="text-xs font-semibold th-text-2 uppercase tracking-wide mb-2">Lesezeichen</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {doc.bookmarks.length === 0 ? (
              <div className="text-xs th-text-3 text-center py-2">Noch keine Lesezeichen</div>
            ) : doc.bookmarks.map(bm => (
              <div key={bm.id} className="flex items-center gap-1 group">
                <button
                  onClick={() => { goToPage(bm.page); if (window.innerWidth < 768) setShowPanel(false) }}
                  className="flex-1 text-left text-xs py-1.5 px-2 rounded hover:bg-blue-50 th-text-2"
                >
                  <span className="font-mono th-text-3 mr-1">S.{bm.page}</span>
                  {bm.label}
                </button>
                <button
                  onClick={() => removeBookmark(bm.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity"
                  aria-label="Lesezeichen entfernen"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowBookmarkInput(!showBookmarkInput)}
            className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <Plus size={12} /> Lesezeichen hinzufügen
          </button>
          {showBookmarkInput && (
            <div className="mt-2 flex gap-1">
              <input
                autoFocus
                className="flex-1 text-xs border border-[var(--th-border)] rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Bezeichnung..."
                value={bookmarkLabel}
                onChange={e => setBookmarkLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBookmark()}
              />
              <button onClick={addBookmark} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded font-medium">OK</button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="p-3 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold th-text-2 uppercase tracking-wide mb-2">Notizen – Seite {page}</div>
          <div className="space-y-2">
            {pageNotes.length === 0 ? (
              <div className="text-xs th-text-3 text-center py-2">Keine Notizen für diese Seite</div>
            ) : pageNotes.map(note => (
              <div key={note.id} className="bg-yellow-50 border border-yellow-200 rounded text-xs th-text-2 group">
                {editingNoteId === note.id ? (
                  <div className="p-2">
                    <textarea
                      autoFocus
                      className="w-full text-xs border border-yellow-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white resize-none"
                      rows={3}
                      value={editingNoteText}
                      onChange={e => setEditingNoteText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEditNote() }}
                    />
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={saveEditNote}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 text-white rounded font-medium"
                        style={{ minHeight: '2rem' }}
                      >
                        <Check size={12} /> Speichern
                      </button>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="flex items-center justify-center px-2 py-1.5 rounded hover:bg-yellow-100 th-text-3"
                        style={{ minHeight: '2rem' }}
                        aria-label="Abbrechen"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2">
                    <div className="whitespace-pre-wrap">{note.text}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="th-text-3">{format(new Date(note.createdAt), 'dd.MM.yyyy HH:mm')}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditNote(note.id, note.text)}
                          className="p-1 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50 transition-colors"
                          aria-label="Notiz bearbeiten"
                          style={{ minWidth: '1.75rem', minHeight: '1.75rem' }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => removeNote(note.id)}
                          className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                          aria-label="Notiz löschen"
                          style={{ minWidth: '1.75rem', minHeight: '1.75rem' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            <Plus size={12} /> Notiz hinzufügen
          </button>
          {showNoteInput && (
            <div className="mt-2">
              <textarea
                autoFocus
                className="w-full text-xs border border-[var(--th-border)] rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3} placeholder="Notiz..."
                value={noteText} onChange={e => setNoteText(e.target.value)}
              />
              <button onClick={addNote} className="mt-1 w-full py-1.5 bg-blue-600 text-white text-xs rounded font-medium">Speichern</button>
            </div>
          )}
        </div>
      </div>

      {/* ── PDF canvas area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-slate-700 min-w-0">

        {/* Toolbar */}
        <div className="bg-slate-800 text-white flex items-center gap-1 px-2 py-2 flex-shrink-0 flex-wrap">

          {/* Panel toggle — prominent on mobile */}
          <button
            onClick={() => setShowPanel(v => !v)}
            className={`relative p-2 rounded-lg transition-colors ${showPanel ? 'bg-blue-600 hover:bg-blue-500' : 'hover:bg-slate-600'}`}
            title="Lesezeichen &amp; Notizen"
            aria-label="Lesezeichen und Notizen ein-/ausblenden"
            aria-pressed={showPanel}
          >
            <PanelLeft size={18} />
            {panelBadge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-yellow-400 text-slate-900 text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                {panelBadge}
              </span>
            )}
          </button>

          <div className="w-px h-5 bg-slate-600 mx-1" />

          {/* Page nav */}
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-slate-600 disabled:opacity-30 transition-colors"
            title="Vorherige Seite (←)"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm flex items-center gap-1 px-1">
            <input
              type="number" min={1} max={totalPages}
              value={page}
              onChange={e => goToPage(parseInt(e.target.value) || 1)}
              className="w-10 bg-slate-700 text-center rounded px-1 py-0.5 text-sm"
            />
            <span className="text-slate-400">/</span>
            <span>{totalPages}</span>
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg hover:bg-slate-600 disabled:opacity-30 transition-colors"
            title="Nächste Seite (→)"
          >
            <ChevronRight size={18} />
          </button>

          <div className="w-px h-5 bg-slate-600 mx-1" />

          {/* Zoom */}
          <button onClick={() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)))} className="p-2 rounded-lg hover:bg-slate-600 transition-colors" title="Vergrößern">
            <ZoomIn size={18} />
          </button>
          <span className="text-xs text-slate-400 w-9 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))} className="p-2 rounded-lg hover:bg-slate-600 transition-colors" title="Verkleinern">
            <ZoomOut size={18} />
          </button>

          <div className="w-px h-5 bg-slate-600 mx-1" />

          {/* Bookmark current page */}
          <button
            onClick={() => isBookmarked
              ? removeBookmark(doc.bookmarks.find(b => b.page === page)!.id)
              : setShowBookmarkInput(true)
            }
            className={`p-2 rounded-lg hover:bg-slate-600 transition-colors ${isBookmarked ? 'text-yellow-400' : ''}`}
            title={isBookmarked ? 'Lesezeichen entfernen' : 'Lesezeichen hinzufügen'}
          >
            {isBookmarked ? <BookmarkCheck size={18} /> : <BookmarkIcon size={18} />}
          </button>

          {/* Add note */}
          <button
            onClick={() => setShowNoteInput(true)}
            className="p-2 rounded-lg hover:bg-slate-600 transition-colors"
            title="Notiz hinzufügen"
          >
            <StickyNote size={18} />
          </button>

          <div className="flex-1" />

          {/* Progress */}
          <div className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded tabular-nums hidden sm:block">
            {Math.round((page / totalPages) * 100)}% gelesen
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-600 flex-shrink-0">
          <div className="h-full bg-blue-400 transition-all" style={{ width: `${(page / totalPages) * 100}%` }} />
        </div>

        {/* Canvas scroll area */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-auto p-4 md:p-6 flex justify-center"
          onWheel={handleWheel}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-white/60 text-sm">PDF wird geladen…</div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center h-full text-white/60 text-sm gap-3">
              <FileText size={40} className="opacity-30" />
              <span>PDF konnte nicht geladen werden.</span>
            </div>
          ) : (
            <canvas ref={canvasRef} className="shadow-2xl" style={{ maxWidth: '100%', height: 'auto' }} />
          )}
        </div>

        {/* Page turn hint — hidden on mobile to save space */}
        <div className="hidden sm:block bg-slate-800/60 text-center text-xs text-slate-400 py-1 flex-shrink-0">
          ← → oder Mausrad am Seitenrand zum Blättern
        </div>
      </div>
    </div>
  )
}

// ─── Document List ────────────────────────────────────────────────────────────

export default function DokumentePage() {
  const { data, createDocument, updateDocument, removeDocument } = useApp()
  const [activeDoc, setActiveDoc] = useState<StudyDocument | null>(null)
  const [filterModuleId, setFilterModuleId] = useState<string>('alle')
  const [editingDoc, setEditingDoc] = useState<StudyDocument | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentSemester = SEMESTER_OPTIONS[0]

  const filtered = data.documents.filter(d => filterModuleId === 'alle' || d.moduleId === filterModuleId)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.includes('pdf')) return
    e.target.value = ''

    setUploading(true)
    setUploadMsg(null)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = ev => resolve((ev.target?.result as string).split(',')[1])
        reader.onerror = () => reject(new Error('Lesefehler'))
        reader.readAsDataURL(file)
      })

      const result = await sharedDocsApi.upload(file.name, base64)

      createDocument({
        moduleId:         filterModuleId === 'alle' ? (data.modules[0]?.id ?? '') : filterModuleId,
        name:             file.name.replace(/\.pdf$/i, ''),
        fileName:         file.name,
        sharedDocumentId: result.id,
        totalPages:       result.totalPages,
        semester:         currentSemester,
        lastReadAt:       undefined,
      })

      setUploadMsg(result.existing
        ? '✓ Datei bereits vorhanden – bestehende Version verknüpft (kein doppelter Speicher)'
        : '✓ Studienbrief hochgeladen und im gemeinsamen Speicher abgelegt'
      )
      setTimeout(() => setUploadMsg(null), 5000)
    } catch (err) {
      setUploadMsg(`Fehler beim Hochladen: ${(err as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleUpdate = (d: StudyDocument) => {
    updateDocument(d)
    setActiveDoc(d)
  }

  const handleEditSave = (updated: StudyDocument) => {
    updateDocument(updated)
    setEditingDoc(null)
  }

  if (activeDoc) {
    const current = data.documents.find(d => d.id === activeDoc.id) ?? activeDoc
    const module = data.modules.find(m => m.id === current.moduleId)
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[var(--th-border)] flex-shrink-0">
          <button onClick={() => setActiveDoc(null)} className="flex items-center gap-1 text-sm th-text-2 hover:text-slate-900">
            <ArrowLeft size={16} /> Zurück
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <span className="text-sm font-medium th-text">{current.name}</span>
          {module && (
            <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: module.color }}>
              {module.moduleNumber}
            </span>
          )}
          {current.semester && (
            <span className="text-xs th-text-3">{current.semester}</span>
          )}
          {current.lastReadAt && (
            <span className="text-xs th-text-3 ml-auto">
              Zuletzt: {format(new Date(current.lastReadAt), 'dd.MM. HH:mm', { locale: de })}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <PDFViewer doc={current} onUpdate={handleUpdate} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold th-text">Studienbriefe</h1>
          <p className="text-sm th-text-2 mt-1">{data.documents.length} Dokumente</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 th-btn th-btn-primary transition-colors text-sm font-medium disabled:opacity-60"
        >
          <Upload size={16} /> {uploading ? 'Hochladen…' : 'PDF hochladen'}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
      </div>

      {/* Upload status */}
      {uploadMsg && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-sm ${
          uploadMsg.startsWith('Fehler')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <Share2 size={14} className="flex-shrink-0" />
          {uploadMsg}
        </div>
      )}

      {/* Module filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterModuleId('alle')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === 'alle' ? 'th-btn th-btn-primary' : 'bg-[var(--th-bg-secondary,#f1f5f9)] th-text-2 hover:bg-slate-200'}`}
        >Alle Module</button>
        {data.modules.map(m => (
          <button
            key={m.id}
            onClick={() => setFilterModuleId(m.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === m.id ? 'text-white' : 'bg-[var(--th-bg-secondary,#f1f5f9)] th-text-2 hover:bg-slate-200'}`}
            style={filterModuleId === m.id ? { backgroundColor: m.color } : {}}
          >
            {m.moduleNumber} {m.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 th-text-3">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Keine Studienbriefe</p>
          <p className="text-sm mt-1">Lade deine PDFs hoch um zu beginnen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filtered.map(doc => {
            const module = data.modules.find(m => m.id === doc.moduleId)
            const progress = doc.totalPages > 0 ? Math.round((doc.currentPage / doc.totalPages) * 100) : 0
            return (
              <div key={doc.id} className="th-card overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                {/* Color stripe */}
                {module && <div className="h-1.5 flex-shrink-0" style={{ backgroundColor: module.color }} />}

                {/* Cover thumbnail */}
                <div className="p-3 pb-0">
                  <PDFThumbnail doc={doc} />
                </div>

                {/* Info */}
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-medium th-text text-sm line-clamp-2 leading-snug mb-2">{doc.name}</h3>

                  {/* Module + semester + shared indicator */}
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    {module && (
                      <span className="text-xs px-1.5 py-0.5 rounded text-white shrink-0" style={{ backgroundColor: module.color }}>
                        {module.moduleNumber}
                      </span>
                    )}
                    {doc.semester && (
                      <span className="text-xs th-text-3">{doc.semester}</span>
                    )}
                    {doc.sharedDocumentId && (
                      <span className="text-xs flex items-center gap-0.5 text-teal-600" title="Im gemeinsamen Speicher abgelegt">
                        <Share2 size={10} /> Geteilt
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs th-text-3 mb-0.5">
                      <span>S. {doc.currentPage}/{doc.totalPages || '?'}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--th-bg-secondary,#f1f5f9)] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs th-text-3 mb-3">
                    <span>{doc.bookmarks.length} LZ</span>
                    <span>{doc.notes.length} Notizen</span>
                    {doc.lastReadAt && <span>{format(new Date(doc.lastReadAt), 'dd.MM.', { locale: de })}</span>}
                  </div>

                  <button
                    onClick={() => setActiveDoc(doc)}
                    className="mt-auto w-full th-btn th-btn-primary text-xs"
                    style={{ minHeight: '2.5rem' }}
                  >
                    Öffnen & Lesen
                  </button>
                </div>

                {/* Touch-friendly action bar */}
                <div className="th-card-actions">
                  <button
                    onClick={() => setEditingDoc(doc)}
                    className="th-card-action-btn th-card-action-edit"
                    aria-label={`"${doc.name}" bearbeiten`}
                  >
                    <Pencil size={15} aria-hidden="true" />
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(
                        doc.sharedDocumentId
                          ? `"${doc.name}" aus deiner Ansicht entfernen?\n\nDie PDF-Datei bleibt im gemeinsamen Speicher erhalten und kann jederzeit erneut hochgeladen werden.`
                          : `Dokument "${doc.name}" löschen?`
                      )) removeDocument(doc.id)
                    }}
                    className="th-card-action-btn th-card-action-delete"
                    aria-label={`"${doc.name}" entfernen`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Entfernen
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit dialog */}
      {editingDoc && (
        <DocEditForm
          doc={editingDoc}
          modules={data.modules}
          onSave={handleEditSave}
          onCancel={() => setEditingDoc(null)}
        />
      )}
    </div>
  )
}

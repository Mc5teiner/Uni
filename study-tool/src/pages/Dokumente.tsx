import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import type { StudyDocument, Bookmark } from '../types'
import { generateId } from '../utils/storage'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Upload, FileText, Trash2, Bookmark as BookmarkIcon, BookmarkCheck,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Plus, ArrowLeft,
  StickyNote, Pencil, Check,
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { getNextSemesters } from '../data/fernuniModules'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const SEMESTER_OPTIONS = getNextSemesters(10)

// ─── PDF Thumbnail ────────────────────────────────────────────────────────────

function PDFThumbnail({ fileData }: { fileData: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const data = atob(fileData)
        const bytes = new Uint8Array(data.length)
        for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i)
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
        if (cancelled) return
        const pdfPage = await pdf.getPage(1)
        if (cancelled) return
        const viewport = pdfPage.getViewport({ scale: 0.4 })
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise
        if (!cancelled) setLoaded(true)
      } catch { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [fileData])

  return (
    <div className="w-full bg-[var(--th-bg-secondary,#f1f5f9)] rounded-lg overflow-hidden flex items-center justify-center" style={{ aspectRatio: '3/4' }}>
      {!loaded && <FileText size={28} className="text-slate-300" />}
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
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showBookmarkInput, setShowBookmarkInput] = useState(false)
  const [bookmarkLabel, setBookmarkLabel] = useState('')
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  // Keep refs for use in event handlers without stale closures
  const pageRef = useRef(page)
  pageRef.current = page
  const totalPagesRef = useRef(totalPages)
  totalPagesRef.current = totalPages

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      try {
        const data = atob(doc.fileData)
        const bytes = new Uint8Array(data.length)
        for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i)
        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        if (doc.totalPages !== pdf.numPages) {
          onUpdate({ ...doc, totalPages: pdf.numPages })
        }
        setLoading(false)
      } catch (e) {
        console.error('PDF load error', e)
        setLoading(false)
      }
    }
    loadPDF()
  }, [doc.fileData])

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

  const pageNotes = doc.notes.filter(n => n.page === page)

  return (
    <div className="flex h-full">
      {/* Sidebar: bookmarks + notes */}
      <div className="w-64 bg-white border-r border-[var(--th-border)] flex flex-col flex-shrink-0 overflow-hidden">
        <div className="p-3 border-b bg-[var(--th-bg)]">
          <div className="text-xs font-semibold th-text-2 uppercase tracking-wide mb-2">Lesezeichen</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {doc.bookmarks.length === 0 ? (
              <div className="text-xs th-text-3 text-center py-2">Noch keine Lesezeichen</div>
            ) : doc.bookmarks.map(bm => (
              <div key={bm.id} className="flex items-center gap-1 group">
                <button
                  onClick={() => goToPage(bm.page)}
                  className="flex-1 text-left text-xs py-1 px-2 rounded hover:bg-blue-50 th-text-2"
                >
                  <span className="font-mono th-text-3 mr-1">S.{bm.page}</span>
                  {bm.label}
                </button>
                <button onClick={() => removeBookmark(bm.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600">
                  <X size={10} />
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
                className="flex-1 text-xs border border-[var(--th-border)] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Bezeichnung..."
                value={bookmarkLabel}
                onChange={e => setBookmarkLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBookmark()}
              />
              <button onClick={addBookmark} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">OK</button>
            </div>
          )}
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold th-text-2 uppercase tracking-wide mb-2">Notizen – Seite {page}</div>
          <div className="space-y-2">
            {pageNotes.length === 0 ? (
              <div className="text-xs th-text-3 text-center py-2">Keine Notizen für diese Seite</div>
            ) : pageNotes.map(note => (
              <div key={note.id} className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs th-text-2">
                {note.text}
                <div className="th-text-3 mt-1">{format(new Date(note.createdAt), 'dd.MM.yyyy HH:mm')}</div>
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
                className="w-full text-xs border border-[var(--th-border)] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3} placeholder="Notiz..."
                value={noteText} onChange={e => setNoteText(e.target.value)}
              />
              <button onClick={addNote} className="mt-1 w-full py-1 bg-blue-600 text-white text-xs rounded">Speichern</button>
            </div>
          )}
        </div>
      </div>

      {/* PDF canvas area */}
      <div className="flex-1 flex flex-col bg-slate-700">
        {/* Toolbar */}
        <div className="bg-slate-800 text-white flex items-center gap-3 px-4 py-2 flex-shrink-0">
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="p-1 rounded hover:bg-slate-600 disabled:opacity-30" title="Vorherige Seite (←)">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm">
            <input
              type="number" min={1} max={totalPages}
              value={page}
              onChange={e => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 bg-slate-700 text-center rounded px-1 py-0.5 text-sm"
            /> / {totalPages}
          </span>
          <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="p-1 rounded hover:bg-slate-600 disabled:opacity-30" title="Nächste Seite (→)">
            <ChevronRight size={18} />
          </button>
          <div className="w-px h-5 bg-slate-600" />
          <button onClick={() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)))} className="p-1 rounded hover:bg-slate-600"><ZoomIn size={18} /></button>
          <span className="text-xs th-text-3 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(0.5, +(s - 0.2).toFixed(1)))} className="p-1 rounded hover:bg-slate-600"><ZoomOut size={18} /></button>
          <div className="w-px h-5 bg-slate-600" />
          <button
            onClick={() => isBookmarked ? removeBookmark(doc.bookmarks.find(b => b.page === page)!.id) : setShowBookmarkInput(true)}
            className={`p-1 rounded hover:bg-slate-600 ${isBookmarked ? 'text-yellow-400' : ''}`}
            title={isBookmarked ? 'Lesezeichen entfernen' : 'Lesezeichen hinzufügen'}
          >
            {isBookmarked ? <BookmarkCheck size={18} /> : <BookmarkIcon size={18} />}
          </button>
          <button onClick={() => setShowNoteInput(true)} className="p-1 rounded hover:bg-slate-600" title="Notiz hinzufügen">
            <StickyNote size={18} />
          </button>
          <div className="flex-1" />
          <div className="text-xs th-text-3 bg-slate-700 px-2 py-1 rounded">
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
          className="flex-1 overflow-auto p-6 flex justify-center"
          onWheel={handleWheel}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-white/60">PDF wird geladen...</div>
          ) : (
            <canvas ref={canvasRef} className="shadow-2xl" style={{ maxWidth: '100%', height: 'auto' }} />
          )}
        </div>

        {/* Page turn hint */}
        <div className="bg-slate-800/60 text-center text-xs th-text-2 py-1 flex-shrink-0">
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentSemester = SEMESTER_OPTIONS[0]

  const filtered = data.documents.filter(d => filterModuleId === 'alle' || d.moduleId === filterModuleId)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.includes('pdf')) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1]
      createDocument({
        moduleId: filterModuleId === 'alle' ? (data.modules[0]?.id ?? '') : filterModuleId,
        name: file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        fileData: base64,
        totalPages: 0,
        semester: currentSemester,
        lastReadAt: undefined,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold th-text">Studienbriefe</h1>
          <p className="text-sm th-text-2 mt-1">{data.documents.length} Dokumente</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 th-btn th-btn-primary transition-colors text-sm font-medium"
        >
          <Upload size={16} /> PDF hochladen
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
      </div>

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
                  <PDFThumbnail fileData={doc.fileData} />
                </div>

                {/* Info */}
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-medium th-text text-sm line-clamp-2 leading-snug mb-2">{doc.name}</h3>

                  {/* Module + semester */}
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    {module && (
                      <span className="text-xs px-1.5 py-0.5 rounded text-white shrink-0" style={{ backgroundColor: module.color }}>
                        {module.moduleNumber}
                      </span>
                    )}
                    {doc.semester && (
                      <span className="text-xs th-text-3">{doc.semester}</span>
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
                    onClick={() => { if (confirm('Dokument löschen?')) removeDocument(doc.id) }}
                    className="th-card-action-btn th-card-action-delete"
                    aria-label={`"${doc.name}" löschen`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Löschen
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

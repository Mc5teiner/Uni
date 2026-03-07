import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import type { StudyDocument, Bookmark } from '../types'
import { generateId } from '../utils/storage'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Upload, FileText, Trash2, Bookmark as BookmarkIcon, BookmarkCheck, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Plus, ArrowLeft, StickyNote } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

// ─── PDF Viewer ─────────────────────────────────────────────────────────────

function PDFViewer({ doc, onUpdate }: { doc: StudyDocument; onUpdate: (d: StudyDocument) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
    const task = pdfPage.render({ canvasContext: ctx, viewport, canvas: canvas })
    renderTaskRef.current = task
    try {
      await task.promise
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'RenderingCancelledException') console.error(e)
    }
  }, [pdfDoc, page, scale])

  useEffect(() => { renderPage() }, [renderPage])

  const goToPage = (p: number) => {
    const newPage = Math.max(1, Math.min(p, totalPages))
    setPage(newPage)
    onUpdate({ ...doc, currentPage: newPage, lastReadAt: new Date().toISOString() })
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
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
        <div className="p-3 border-b bg-slate-50">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Lesezeichen</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {doc.bookmarks.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-2">Noch keine Lesezeichen</div>
            ) : doc.bookmarks.map(bm => (
              <div key={bm.id} className="flex items-center gap-1 group">
                <button
                  onClick={() => goToPage(bm.page)}
                  className="flex-1 text-left text-xs py-1 px-2 rounded hover:bg-blue-50 text-slate-700"
                >
                  <span className="font-mono text-slate-400 mr-1">S.{bm.page}</span>
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
                className="flex-1 text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notizen – Seite {page}</div>
          <div className="space-y-2">
            {pageNotes.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-2">Keine Notizen für diese Seite</div>
            ) : pageNotes.map(note => (
              <div key={note.id} className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-slate-700">
                {note.text}
                <div className="text-slate-400 mt-1">{format(new Date(note.createdAt), 'dd.MM.yyyy HH:mm')}</div>
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
                className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="p-1 rounded hover:bg-slate-600 disabled:opacity-30">
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
          <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="p-1 rounded hover:bg-slate-600 disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
          <div className="w-px h-5 bg-slate-600" />
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="p-1 rounded hover:bg-slate-600"><ZoomIn size={18} /></button>
          <span className="text-xs text-slate-400">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-1 rounded hover:bg-slate-600"><ZoomOut size={18} /></button>
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
          <div className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">
            {Math.round((page / totalPages) * 100)}% gelesen
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-600">
          <div className="h-full bg-blue-400 transition-all" style={{ width: `${(page / totalPages) * 100}%` }} />
        </div>

        {/* Canvas scroll area */}
        <div className="flex-1 overflow-auto p-6 flex justify-center">
          {loading ? (
            <div className="flex items-center justify-center h-full text-white/60">PDF wird geladen...</div>
          ) : (
            <canvas ref={canvasRef} className="shadow-2xl" />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Document List ───────────────────────────────────────────────────────────

export default function DokumentePage() {
  const { data, createDocument, updateDocument, removeDocument } = useApp()
  const [activeDoc, setActiveDoc] = useState<StudyDocument | null>(null)
  const [filterModuleId, setFilterModuleId] = useState<string>('alle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = data.documents.filter(d => filterModuleId === 'alle' || d.moduleId === filterModuleId)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.includes('pdf')) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1]
      createDocument({
        moduleId: filterModuleId === 'alle' ? (data.modules[0]?.id ?? '') : filterModuleId,
        name: file.name.replace('.pdf', ''),
        fileName: file.name,
        fileData: base64,
        totalPages: 0,
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

  if (activeDoc) {
    const current = data.documents.find(d => d.id === activeDoc.id) ?? activeDoc
    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
          <button onClick={() => setActiveDoc(null)} className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Zurück
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <span className="text-sm font-medium text-slate-800">{current.name}</span>
          {current.lastReadAt && (
            <span className="text-xs text-slate-400 ml-auto">
              Zuletzt gelesen: {format(new Date(current.lastReadAt), 'dd.MM. HH:mm', { locale: de })}
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
          <h1 className="text-2xl font-bold text-slate-800">Studienbriefe</h1>
          <p className="text-sm text-slate-500 mt-1">{data.documents.length} Dokumente</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg hover:bg-[#004488] transition-colors text-sm font-medium"
        >
          <Upload size={16} /> PDF hochladen
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
      </div>

      {/* Module filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilterModuleId('alle')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === 'alle' ? 'bg-[#003366] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >Alle Module</button>
        {data.modules.map(m => (
          <button
            key={m.id}
            onClick={() => setFilterModuleId(m.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterModuleId === m.id ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            style={filterModuleId === m.id ? { backgroundColor: m.color } : {}}
          >
            {m.moduleNumber} {m.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Keine Studienbriefe</p>
          <p className="text-sm mt-1">Lade deine PDFs hoch um zu beginnen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const module = data.modules.find(m => m.id === doc.moduleId)
            const progress = doc.totalPages > 0 ? Math.round((doc.currentPage / doc.totalPages) * 100) : 0
            return (
              <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                {module && <div className="h-1.5" style={{ backgroundColor: module.color }} />}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-medium text-slate-800 line-clamp-2">{doc.name}</h3>
                      {module && <div className="text-xs text-slate-400 mt-0.5">{module.moduleNumber} {module.name}</div>}
                    </div>
                    <button onClick={() => { if (confirm('Dokument löschen?')) removeDocument(doc.id) }} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Seite {doc.currentPage} / {doc.totalPages || '?'}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                    <span>{doc.bookmarks.length} Lesezeichen</span>
                    <span>{doc.notes.length} Notizen</span>
                    {doc.lastReadAt && <span>Zuletzt: {format(new Date(doc.lastReadAt), 'dd.MM.', { locale: de })}</span>}
                  </div>

                  <button
                    onClick={() => setActiveDoc(doc)}
                    className="w-full py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors font-medium"
                  >
                    Öffnen & Lesen
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

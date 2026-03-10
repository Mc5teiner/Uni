/**
 * Shared document storage — PDFs stored once, referenced by many users.
 *
 * Deduplication via SHA-256: if two users upload the same file, only one
 * copy is kept on disk. Each user's StudyDocument points to the shared ID.
 *
 * Only the file metadata (no binary data) is returned on list endpoints.
 * The full base64 fileData is only returned when fetching by ID.
 */
import { Router } from 'express'
import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import {
  getSharedDocMeta,
  getSharedDocData,
  getSharedDocByHash,
  createSharedDoc,
  updateSharedDocPages,
} from '../db'
import { requireAuth } from '../middleware/auth'
import type { AuthenticatedRequest } from '../types'

const router = Router()

function r(req: import('express').Request): AuthenticatedRequest {
  return req as AuthenticatedRequest
}

// ─── GET /api/shared-documents/:id ───────────────────────────────────────────
// Returns metadata + full base64 fileData for a specific document.
// Any authenticated user can fetch any shared doc (they need it to render PDFs).

router.get('/:id', requireAuth, (req, res) => {
  const id   = req.params.id as string
  const meta = getSharedDocMeta(id)
  if (!meta) {
    res.status(404).json({ error: 'Dokument nicht gefunden' })
    return
  }
  const fileData = getSharedDocData(id)
  res.json({
    id:          meta.id,
    fileName:    meta.file_name,
    fileHash:    meta.file_hash,
    fileSize:    meta.file_size,
    totalPages:  meta.total_pages,
    uploadedBy:  meta.uploaded_by,
    uploadedAt:  meta.uploaded_at,
    fileData:    fileData ?? '',
  })
})

// ─── POST /api/shared-documents ──────────────────────────────────────────────
// Upload a PDF (base64). If a file with the same SHA-256 already exists,
// returns the existing ID instead of creating a duplicate.

router.post('/', requireAuth, (req, res) => {
  const { fileName, fileData } = req.body as {
    fileName?: string
    fileData?: string
  }

  if (!fileName || typeof fileName !== 'string' || !fileData || typeof fileData !== 'string') {
    res.status(400).json({ error: 'fileName und fileData (base64) sind erforderlich' })
    return
  }

  // Compute hash server-side — never trust the client hash
  const fileHash = createHash('sha256').update(fileData).digest('hex')

  // Deduplication: return existing record if the same file was already uploaded
  const existing = getSharedDocByHash(fileHash)
  if (existing) {
    res.json({
      id:         existing.id,
      existing:   true,
      totalPages: existing.total_pages,
    })
    return
  }

  const id       = uuidv4()
  const fileSize = Buffer.byteLength(fileData, 'utf8')

  createSharedDoc({
    id,
    fileName,
    fileData,
    fileHash,
    fileSize,
    uploadedBy: r(req).user.sub,
  })

  res.status(201).json({ id, existing: false, totalPages: 0 })
})

// ─── PATCH /api/shared-documents/:id/pages ───────────────────────────────────
// Called after the PDF is rendered client-side to update the total page count.

router.patch('/:id/pages', requireAuth, (req, res) => {
  const { totalPages } = req.body as { totalPages?: number }
  if (typeof totalPages !== 'number' || totalPages < 1) {
    res.status(400).json({ error: 'totalPages muss eine positive Zahl sein' })
    return
  }
  const id   = req.params.id as string
  const meta = getSharedDocMeta(id)
  if (!meta) {
    res.status(404).json({ error: 'Dokument nicht gefunden' })
    return
  }
  // Only update if not yet set (avoid race conditions with concurrent readers)
  if (meta.total_pages === 0) {
    updateSharedDocPages(id, totalPages)
  }
  res.json({ ok: true })
})

export default router

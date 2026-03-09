/**
 * User data CRUD — replaces localStorage.
 * Each item stored individually for efficient updates and storage accounting.
 */
import { Router } from 'express'
import { z } from 'zod'
import { db, getUserStorageBytes, auditLog } from '../db'
import { requireAuth } from '../middleware/auth'
import type { AuthenticatedRequest, DataNamespace } from '../types'
import { VALID_NAMESPACES } from '../types'

const router = Router()
router.use(requireAuth)

function r(req: import('express').Request): AuthenticatedRequest {
  return req as AuthenticatedRequest
}

// ─── GET all items for a namespace ───────────────────────────────────────────

router.get('/:namespace', (req, res) => {
  const ns = req.params.namespace as DataNamespace
  if (!VALID_NAMESPACES.includes(ns)) {
    res.status(400).json({ error: 'Ungültiger Namespace' })
    return
  }

  const rows = db.prepare(
    'SELECT item_id, data FROM user_data WHERE user_id = ? AND namespace = ?'
  ).all(r(req).user.sub, ns) as { item_id: string; data: string }[]

  const items = rows.map(row => {
    try { return JSON.parse(row.data) }
    catch { return null }
  }).filter(Boolean)

  res.json(items)
})

// ─── Upsert a single item ─────────────────────────────────────────────────────

router.put('/:namespace/:id', (req, res) => {
  const ns = req.params.namespace as DataNamespace
  const itemId = req.params.id

  if (!VALID_NAMESPACES.includes(ns)) {
    res.status(400).json({ error: 'Ungültiger Namespace' })
    return
  }

  const schema = z.object({}).passthrough()
  const parsed = schema.safeParse(req.body)
  if (!parsed.success || typeof req.body !== 'object' || req.body === null) {
    res.status(400).json({ error: 'Ungültige Daten' })
    return
  }

  const userId = r(req).user.sub
  const dataStr = JSON.stringify(req.body)

  // Enforce storage limit
  const currentUsage = getUserStorageBytes(userId)
  const existingRow = db.prepare(
    'SELECT LENGTH(data) as len FROM user_data WHERE user_id = ? AND namespace = ? AND item_id = ?'
  ).get(userId, ns, itemId) as { len: number } | undefined

  const existingLen = existingRow?.len ?? 0
  const newLen = Buffer.byteLength(dataStr, 'utf8')
  const delta = newLen - existingLen

  const user = db.prepare('SELECT storage_limit FROM users WHERE id = ?').get(userId) as { storage_limit: number }
  if (currentUsage + delta > user.storage_limit) {
    res.status(413).json({ error: 'Speicherlimit überschritten' })
    return
  }

  db.prepare(
    `INSERT INTO user_data (user_id, namespace, item_id, data, updated_at)
     VALUES (?, ?, ?, ?, unixepoch())
     ON CONFLICT(user_id, namespace, item_id)
     DO UPDATE SET data = excluded.data, updated_at = unixepoch()`
  ).run(userId, ns, itemId, dataStr)

  res.json({ ok: true })
})

// ─── Delete a single item ─────────────────────────────────────────────────────

router.delete('/:namespace/:id', (req, res) => {
  const ns = req.params.namespace as DataNamespace
  if (!VALID_NAMESPACES.includes(ns)) {
    res.status(400).json({ error: 'Ungültiger Namespace' })
    return
  }

  db.prepare(
    'DELETE FROM user_data WHERE user_id = ? AND namespace = ? AND item_id = ?'
  ).run(r(req).user.sub, req.params.id, ns)

  // Also handle cascading delete for modules (delete related items)
  if (ns === 'modules') {
    const moduleId = req.params.id
    const uid = r(req).user.sub
    ;(['documents', 'flashcards', 'flashcard_decks', 'events', 'sessions'] as DataNamespace[]).forEach(relNs => {
      // Get all items in namespace and filter client-side (moduleId is inside JSON)
      const rows = db.prepare(
        'SELECT item_id, data FROM user_data WHERE user_id = ? AND namespace = ?'
      ).all(uid, relNs) as { item_id: string; data: string }[]

      const toDelete = rows.filter(row => {
        try { return JSON.parse(row.data).moduleId === moduleId }
        catch { return false }
      })
      const del = db.prepare('DELETE FROM user_data WHERE user_id = ? AND namespace = ? AND item_id = ?')
      for (const row of toDelete) del.run(uid, relNs, row.item_id)
    })
  }

  res.json({ ok: true })
})

// ─── Storage info ─────────────────────────────────────────────────────────────

router.get('/meta/storage', (req, res) => {
  const userId = r(req).user.sub
  const bytes = getUserStorageBytes(userId)
  const user = db.prepare('SELECT storage_limit FROM users WHERE id = ?').get(userId) as { storage_limit: number }

  // Per-namespace breakdown
  const breakdown = db.prepare(
    `SELECT namespace, COUNT(*) as count, COALESCE(SUM(LENGTH(data)),0) as bytes
     FROM user_data WHERE user_id = ? GROUP BY namespace`
  ).all(userId) as { namespace: string; count: number; bytes: number }[]

  res.json({
    used: bytes,
    limit: user.storage_limit,
    percentage: Math.round((bytes / user.storage_limit) * 100),
    breakdown,
  })
})

// Suppress unused-var warning — auditLog imported for future use
void auditLog

export default router

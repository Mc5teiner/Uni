import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db, getSettings, getUserStorageBytes, getAllUsersStorage, auditLog } from '../db'
import { hashPassword, generateToken } from '../crypto'
import { requireAdmin } from '../middleware/auth'
import { sendWelcomeEmail } from '../email'
import type { AuthenticatedRequest, User, AppSettings } from '../types'

const router = Router()
router.use(requireAdmin)

function me(req: import('express').Request) {
  return (req as AuthenticatedRequest).user.sub
}
function ip(req: import('express').Request) {
  const h = req.headers['x-forwarded-for']
  return (typeof h === 'string' ? h.split(',')[0].trim() : req.socket.remoteAddress) ?? 'unknown'
}

function publicUser(u: User, bytesUsed?: number) {
  return {
    id:           u.id,
    username:     u.username,
    email:        u.email,
    name:         u.name,
    studyType:    u.study_type,
    studyProgram: u.study_program,
    role:         u.role,
    storageLimit: u.storage_limit,
    isBanned:     u.is_banned === 1,
    createdAt:    u.created_at,
    storageUsed:  bytesUsed,
  }
}

// ─── List users ───────────────────────────────────────────────────────────────

router.get('/users', (_req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as User[]
  const storageMap = new Map(getAllUsersStorage().map(s => [s.userId, s.bytes]))
  res.json(users.map(u => publicUser(u, storageMap.get(u.id) ?? 0)))
})

// ─── Get single user ──────────────────────────────────────────────────────────

router.get('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as User | undefined
  if (!user) { res.status(404).json({ error: 'Benutzer nicht gefunden' }); return }
  res.json(publicUser(user, getUserStorageBytes(user.id)))
})

// ─── Create user (admin creates accounts) ────────────────────────────────────

router.post('/users', async (req, res) => {
  const schema = z.object({
    username:      z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
    email:         z.string().email().max(254),
    password:      z.string().min(12).max(128).optional(),  // optional: auto-generate
    name:          z.string().min(1).max(100),
    role:          z.enum(['user', 'admin']).optional().default('user'),
    study_type:    z.enum(['bachelor', 'master', 'zertifikat']).optional(),
    study_program: z.string().max(200).optional(),
    storage_limit: z.number().int().positive().optional(),
    send_welcome:  z.boolean().optional().default(true),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.flatten() })
    return
  }

  const {
    username, email, name, role, study_type, study_program, storage_limit, send_welcome,
  } = parsed.data
  const lowerEmail = email.toLowerCase()
  const rawPassword = parsed.data.password ?? generateToken(16)  // auto-generate if not provided

  const existing = db.prepare(
    'SELECT id FROM users WHERE username = ? OR email = ?'
  ).get(username, lowerEmail)
  if (existing) {
    res.status(409).json({ error: 'Benutzername oder E-Mail bereits vergeben' })
    return
  }

  const hash = await hashPassword(rawPassword)
  const id   = uuidv4()
  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, name, role, study_type, study_program, storage_limit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, username, lowerEmail, hash, name, role,
    study_type ?? null, study_program ?? null,
    storage_limit ?? 5_368_709_120
  )

  auditLog(me(req), 'admin.user_created', {
    targetUserId: id, ip: ip(req),
    details: { username, role },
  })

  const settings = getSettings() as unknown as AppSettings
  if (send_welcome && settings.smtp_host) {
    sendWelcomeEmail(lowerEmail, {
      name, username, appUrl: settings.app_url,
    }, settings).catch(() => {})
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User
  res.status(201).json({ ...publicUser(user), temporaryPassword: parsed.data.password ? undefined : rawPassword })
})

// ─── Update user ──────────────────────────────────────────────────────────────

router.patch('/users/:id', async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as User | undefined
  if (!user) { res.status(404).json({ error: 'Benutzer nicht gefunden' }); return }

  const schema = z.object({
    username:      z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
    email:         z.string().email().max(254).optional(),
    name:          z.string().min(1).max(100).optional(),
    role:          z.enum(['user', 'admin']).optional(),
    storage_limit: z.number().int().positive().optional(),
    is_banned:     z.boolean().optional(),
    study_type:    z.enum(['bachelor', 'master', 'zertifikat']).nullable().optional(),
    study_program: z.string().max(200).nullable().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' })
    return
  }

  // Prevent self-demotion from admin
  if (req.params.id === me(req) && parsed.data.role === 'user') {
    res.status(400).json({ error: 'Du kannst deine eigene Admin-Rolle nicht entfernen' })
    return
  }

  const updates: string[] = []
  const values: unknown[] = []
  const d = parsed.data
  if (d.username      !== undefined) { updates.push('username = ?');      values.push(d.username) }
  if (d.email         !== undefined) { updates.push('email = ?');         values.push(d.email.toLowerCase()) }
  if (d.name          !== undefined) { updates.push('name = ?');          values.push(d.name) }
  if (d.role          !== undefined) { updates.push('role = ?');          values.push(d.role) }
  if (d.storage_limit !== undefined) { updates.push('storage_limit = ?'); values.push(d.storage_limit) }
  if (d.is_banned     !== undefined) { updates.push('is_banned = ?');     values.push(d.is_banned ? 1 : 0) }
  if (d.study_type    !== undefined) { updates.push('study_type = ?');    values.push(d.study_type) }
  if (d.study_program !== undefined) { updates.push('study_program = ?'); values.push(d.study_program) }

  if (updates.length === 0) { res.json({ ok: true }); return }

  updates.push('updated_at = unixepoch()')
  values.push(req.params.id)
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  if (d.is_banned) {
    // Revoke all tokens when banning
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(req.params.id)
  }

  auditLog(me(req), 'admin.user_updated', {
    targetUserId: req.params.id, ip: ip(req), details: { keys: Object.keys(parsed.data) },
  })

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as User
  res.json(publicUser(updated, getUserStorageBytes(updated.id)))
})

// ─── Set password for user ────────────────────────────────────────────────────

router.post('/users/:id/set-password', async (req, res) => {
  const schema = z.object({
    password: z.string().min(12).max(128).optional(),  // optional: auto-generate
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Ungültige Eingabe' }); return }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)
  if (!user) { res.status(404).json({ error: 'Benutzer nicht gefunden' }); return }

  const rawPassword = parsed.data.password ?? generateToken(16)
  const hash = await hashPassword(rawPassword)

  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ?, updated_at = unixepoch() WHERE id = ?')
      .run(hash, req.params.id)
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(req.params.id)
  })()

  auditLog(me(req), 'admin.password_set', { targetUserId: req.params.id, ip: ip(req) })
  res.json({ temporaryPassword: parsed.data.password ? undefined : rawPassword, ok: true })
})

// ─── Delete user ──────────────────────────────────────────────────────────────

router.delete('/users/:id', (req, res) => {
  if (req.params.id === me(req)) {
    res.status(400).json({ error: 'Du kannst dein eigenes Konto nicht löschen' })
    return
  }
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.id) as { username: string } | undefined
  if (!user) { res.status(404).json({ error: 'Benutzer nicht gefunden' }); return }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  auditLog(me(req), 'admin.user_deleted', {
    targetUserId: req.params.id, ip: ip(req), details: { username: user.username },
  })
  res.json({ ok: true })
})

// ─── Storage overview ─────────────────────────────────────────────────────────

router.get('/storage', (_req, res) => {
  const total = (db.prepare(
    "SELECT COALESCE(SUM(LENGTH(data)),0) as t FROM user_data"
  ).get() as { t: number }).t

  const users = db.prepare('SELECT id, username, storage_limit FROM users').all() as {
    id: string; username: string; storage_limit: number
  }[]
  const storageMap = new Map(getAllUsersStorage().map(s => [s.userId, s.bytes]))

  res.json({
    totalBytes: total,
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      used: storageMap.get(u.id) ?? 0,
      limit: u.storage_limit,
      percentage: Math.round(((storageMap.get(u.id) ?? 0) / u.storage_limit) * 100),
    })),
  })
})

// ─── View user data ───────────────────────────────────────────────────────────

router.get('/users/:id/data', (req, res) => {
  const ns = req.query.namespace as string | undefined
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)
  if (!user) { res.status(404).json({ error: 'Benutzer nicht gefunden' }); return }

  const query = ns
    ? db.prepare('SELECT namespace, item_id, LENGTH(data) as size FROM user_data WHERE user_id = ? AND namespace = ?')
    : db.prepare('SELECT namespace, item_id, LENGTH(data) as size FROM user_data WHERE user_id = ?')

  const rows = (ns ? query.all(req.params.id, ns) : query.all(req.params.id)) as {
    namespace: string; item_id: string; size: number
  }[]

  // Group by namespace
  const grouped: Record<string, { count: number; totalSize: number; items: { id: string; size: number }[] }> = {}
  for (const row of rows) {
    if (!grouped[row.namespace]) grouped[row.namespace] = { count: 0, totalSize: 0, items: [] }
    grouped[row.namespace].count++
    grouped[row.namespace].totalSize += row.size
    grouped[row.namespace].items.push({ id: row.item_id, size: row.size })
  }

  res.json(grouped)
})

// ─── Backup ───────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/backup
 * Downloads a full JSON backup of:
 *   - app_settings
 *   - all users (without password hashes / refresh tokens)
 *   - all user data (all namespaces, full blobs — including PDFs as base64)
 *   - caldav_settings (passwords stay AES-encrypted in the export)
 *
 * The result is streamed as a single JSON file so it can be restored via
 * POST /api/admin/restore or simply piped to a file on a Synology NAS.
 */
router.get('/backup', (req, res) => {
  try {
    const users   = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as User[]
    const settings = db.prepare('SELECT * FROM app_settings').all()
    const userData = db.prepare('SELECT * FROM user_data ORDER BY user_id, namespace, item_id').all()
    const caldav   = db.prepare('SELECT user_id, server_url, username, calendar_url, encrypted_password FROM caldav_settings').all()
    const auditRows = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10000').all()

    const backup = {
      version:   2,
      createdAt: new Date().toISOString(),
      createdBy: (req as AuthenticatedRequest).user.usr,
      users: users.map(u => ({
        id:            u.id,
        username:      u.username,
        email:         u.email,
        name:          u.name,
        study_type:    u.study_type,
        study_program: u.study_program,
        role:          u.role,
        storage_limit: u.storage_limit,
        is_banned:     u.is_banned,
        created_at:    u.created_at,
        // password_hash intentionally EXCLUDED from export for security
      })),
      settings,
      caldavSettings: caldav,
      userData,
      auditLog: auditRows,
    }

    const json = JSON.stringify(backup, null, 2)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="study-organizer-backup-${timestamp}.json"`)
    res.setHeader('Content-Length', Buffer.byteLength(json, 'utf8'))
    auditLog((req as AuthenticatedRequest).user.sub, 'admin.backup_created', {
      ip: ip(req), details: {
        users: users.length, userDataRows: (userData as unknown[]).length,
      },
    })
    res.send(json)
  } catch (err) {
    res.status(500).json({ error: 'Backup fehlgeschlagen: ' + (err as Error).message })
  }
})

/**
 * GET /api/admin/backup/users
 * Lightweight export of user accounts only (for auditing / migration).
 */
router.get('/backup/users', (_req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as User[]
  const storageMap = new Map(getAllUsersStorage().map(s => [s.userId, s.bytes]))
  const data = users.map(u => ({
    ...publicUser(u, storageMap.get(u.id) ?? 0),
    // password_hash NOT included
  }))
  const json = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), users: data }, null, 2)
  const ts = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="users-backup-${ts}.json"`)
  res.send(json)
})

/**
 * GET /api/admin/backup/settings
 * Export of all app_settings only.
 * smtp_pass stays AES-encrypted in the export.
 */
router.get('/backup/settings', (_req, res) => {
  const settings = db.prepare('SELECT * FROM app_settings').all()
  const json = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), settings }, null, 2)
  const ts = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="settings-backup-${ts}.json"`)
  res.send(json)
})

/**
 * GET /api/admin/backup/user/:id
 * Full data export for a single user (all namespaces + all blobs).
 */
router.get('/backup/user/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as User | undefined
  if (!user) { res.status(404).json({ error: 'Benutzer nicht gefunden' }); return }

  const userData = db.prepare(
    'SELECT namespace, item_id, data, created_at, updated_at FROM user_data WHERE user_id = ? ORDER BY namespace, item_id'
  ).all(req.params.id)

  const json = JSON.stringify({
    version: 1,
    createdAt: new Date().toISOString(),
    user: publicUser(user, getUserStorageBytes(user.id)),
    data: userData,
  }, null, 2)

  const ts = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="user-${user.username}-backup-${ts}.json"`)
  res.send(json)
})

// ─── Audit log ────────────────────────────────────────────────────────────────

router.get('/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string || '100'), 500)
  const offset = parseInt(req.query.offset as string || '0')
  const userId = req.query.userId as string | undefined

  const rows = userId
    ? db.prepare(
        'SELECT * FROM audit_log WHERE user_id = ? OR target_user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).all(userId, userId, limit, offset)
    : db.prepare(
        'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).all(limit, offset)

  res.json(rows)
})

export default router

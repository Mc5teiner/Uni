/**
 * Auth routes — security-critical, each line reviewed.
 *
 * Timing-attack mitigation:
 *  - argon2.verify is constant-time by design
 *  - On "user not found" we still run a dummy verify to prevent
 *    timing oracle distinguishing "unknown user" from "wrong password"
 *  - Token lookups use DB-side hash comparison (no branch before constant-time)
 *
 * Enumeration mitigation:
 *  - Login: same error message for unknown user and wrong password
 *  - Forgot-password: always responds with 200 regardless of whether email exists
 *  - Registration: only if open_registration=true OR called by admin
 */

import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db, getSettings, auditLog } from '../db'
import {
  hashPassword, verifyPassword,
  signAccessToken, generateRefreshToken,
  verifyAccessToken,
  generateToken, hashToken,
  REFRESH_TOKEN_TTL,
} from '../crypto'
import { requireAuth } from '../middleware/auth'
import { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from '../email'
import type { AuthenticatedRequest, User, AppSettings, RefreshTokenRow, PasswordResetRow } from '../types'

const router = Router()

// Dummy hash for timing-safe "unknown user" branches
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummysaltdummysalt$dummyhashvaluethatisalwayswrong'

function ip(req: import('express').Request): string {
  const h = req.headers['x-forwarded-for']
  if (typeof h === 'string') return h.split(',')[0].trim()
  return req.socket.remoteAddress ?? 'unknown'
}
function ua(req: import('express').Request): string {
  return req.headers['user-agent'] ?? ''
}

function setRefreshCookie(res: import('express').Response, token: string): void {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_TTL * 1000,
    path: '/api/auth',
  })
}

function clearRefreshCookie(res: import('express').Response): void {
  res.clearCookie('refresh_token', { path: '/api/auth' })
}

// ─── Setup ───────────────────────────────────────────────────────────────────

/** Check if initial setup is needed (no users exist) */
router.get('/check-setup', (_req, res) => {
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
  res.json({ setupNeeded: count === 0 })
})

/** Create first admin account — only works if no users exist */
router.post('/setup', async (req, res) => {
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
  if (count > 0) {
    res.status(409).json({ error: 'Setup bereits abgeschlossen' })
    return
  }

  const schema = z.object({
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
    email:    z.string().email().max(254),
    password: z.string().min(12).max(128),
    name:     z.string().min(1).max(100),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.flatten() })
    return
  }
  const { username, email, password, name } = parsed.data

  const hash  = await hashPassword(password)
  const id    = uuidv4()
  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, name, role)
     VALUES (?, ?, ?, ?, ?, 'admin')`
  ).run(id, username, email.toLowerCase(), hash, name)

  auditLog(id, 'setup.admin_created', { ip: ip(req), ua: ua(req) })
  res.json({ ok: true })
})

// ─── Register ────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const settings = getSettings() as unknown as AppSettings
  const isOpen = settings.open_registration === 'true'

  // If called by an admin via the admin API, bypass open_registration check
  // (admin creation goes through /api/admin/users — this route is public registration only)
  if (!isOpen) {
    res.status(403).json({ error: 'Registrierung ist nicht öffentlich' })
    return
  }

  const schema = z.object({
    username:     z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
    email:        z.string().email().max(254),
    password:     z.string().min(12).max(128),
    name:         z.string().min(1).max(100),
    study_type:   z.enum(['bachelor', 'master', 'zertifikat']).optional(),
    study_program: z.string().max(200).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe', issues: parsed.error.flatten() })
    return
  }

  const { username, email, password, name, study_type, study_program } = parsed.data
  const lowerEmail = email.toLowerCase()

  // Check uniqueness without revealing which field conflicts
  const existing = db.prepare(
    'SELECT id FROM users WHERE username = ? OR email = ?'
  ).get(username, lowerEmail)
  if (existing) {
    res.status(409).json({ error: 'Benutzername oder E-Mail bereits vergeben' })
    return
  }

  const hash = await hashPassword(password)
  const id   = uuidv4()
  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, name, study_type, study_program)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, username, lowerEmail, hash, name, study_type ?? null, study_program ?? null)

  auditLog(id, 'auth.register', { ip: ip(req), ua: ua(req) })

  // Fire-and-forget welcome email
  if (settings.smtp_host) {
    sendWelcomeEmail(lowerEmail, {
      name, username, appUrl: settings.app_url,
    }, settings).catch(() => { /* non-critical */ })
  }

  res.status(201).json({ ok: true })
})

// ─── Login ───────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const schema = z.object({
    username: z.string().max(254),  // accept username or email
    password: z.string().max(128),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' })
    return
  }
  const { username, password } = parsed.data

  // Look up by username or email (case-insensitive via COLLATE NOCASE)
  const user = db.prepare(
    'SELECT * FROM users WHERE username = ? OR email = ?'
  ).get(username, username.toLowerCase()) as User | undefined

  // Timing-safe: always run argon2 verify even if user not found
  const hashToCheck = user?.password_hash ?? DUMMY_HASH
  const valid = await verifyPassword(hashToCheck, password)

  if (!user || !valid) {
    auditLog(user?.id ?? null, 'auth.login.failed', {
      ip: ip(req), ua: ua(req),
      details: { username },
      success: false,
    })
    // Identical message — no enumeration
    res.status(401).json({ error: 'Ungültige Anmeldedaten' })
    return
  }

  if (user.is_banned) {
    auditLog(user.id, 'auth.login.banned', { ip: ip(req), ua: ua(req), success: false })
    res.status(403).json({ error: 'Konto gesperrt' })
    return
  }

  // Issue tokens
  const { token: accessToken } = signAccessToken(user.id, user.username, user.role, process.env.JWT_SECRET!)
  const { token: refreshToken, hash: rtHash, expiresAt } = generateRefreshToken()

  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uuidv4(), user.id, rtHash, expiresAt, ua(req), ip(req))

  auditLog(user.id, 'auth.login', { ip: ip(req), ua: ua(req) })
  setRefreshCookie(res, refreshToken)
  res.json({
    accessToken,
    user: publicUser(user),
  })
})

// ─── Refresh ─────────────────────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
  const rawToken = req.cookies?.refresh_token as string | undefined
  if (!rawToken) {
    res.status(401).json({ error: 'Kein Refresh-Token' })
    return
  }

  const hash = hashToken(rawToken)
  const rtRow = db.prepare(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0'
  ).get(hash) as RefreshTokenRow | undefined

  if (!rtRow || rtRow.expires_at < Math.floor(Date.now() / 1000)) {
    clearRefreshCookie(res)
    res.status(401).json({ error: 'Refresh-Token ungültig oder abgelaufen' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(rtRow.user_id) as User | undefined
  if (!user || user.is_banned) {
    clearRefreshCookie(res)
    res.status(401).json({ error: 'Benutzer nicht gefunden oder gesperrt' })
    return
  }

  // Token rotation — revoke old, issue new
  const { token: newRefresh, hash: newHash, expiresAt } = generateRefreshToken()
  db.transaction(() => {
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(rtRow.id)
    db.prepare(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(uuidv4(), user.id, newHash, expiresAt, ua(req), ip(req))
  })()

  const { token: accessToken } = signAccessToken(user.id, user.username, user.role, process.env.JWT_SECRET!)
  setRefreshCookie(res, newRefresh)
  res.json({ accessToken, user: publicUser(user) })
})

// ─── Logout ──────────────────────────────────────────────────────────────────

router.post('/logout', (req, res) => {
  const rawToken = req.cookies?.refresh_token as string | undefined
  if (rawToken) {
    const hash = hashToken(rawToken)
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?').run(hash)
  }
  // Also try to get user from access token for audit log
  let userId: string | null = null
  try {
    const tok = req.headers.authorization?.slice(7)
    if (tok) userId = verifyAccessToken(tok, process.env.JWT_SECRET!).sub
  } catch { /* ignored */ }

  auditLog(userId, 'auth.logout', { ip: ip(req), ua: ua(req) })
  clearRefreshCookie(res)
  res.json({ ok: true })
})

// ─── Me ──────────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const r = req as AuthenticatedRequest
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.user.sub) as User | undefined
  if (!user) { res.status(404).json({ error: 'Benutzer nicht gefunden' }); return }
  res.json(publicUser(user))
})

router.patch('/me', requireAuth, async (req, res) => {
  const r = req as AuthenticatedRequest
  const schema = z.object({
    name:          z.string().min(1).max(100).optional(),
    study_type:    z.enum(['bachelor', 'master', 'zertifikat']).nullable().optional(),
    study_program: z.string().max(200).nullable().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' })
    return
  }

  const updates: string[] = []
  const values: unknown[] = []
  if (parsed.data.name !== undefined)          { updates.push('name = ?');          values.push(parsed.data.name) }
  if (parsed.data.study_type !== undefined)    { updates.push('study_type = ?');    values.push(parsed.data.study_type) }
  if (parsed.data.study_program !== undefined) { updates.push('study_program = ?'); values.push(parsed.data.study_program) }

  if (updates.length === 0) { res.json({ ok: true }); return }

  updates.push('updated_at = unixepoch()')
  values.push(r.user.sub)
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.user.sub) as User
  res.json(publicUser(user))
})

// ─── Change password ─────────────────────────────────────────────────────────

router.post('/change-password', requireAuth, async (req, res) => {
  const r = req as AuthenticatedRequest
  const schema = z.object({
    current_password: z.string().max(128),
    new_password:     z.string().min(12).max(128),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.user.sub) as User
  const valid = await verifyPassword(user.password_hash, parsed.data.current_password)
  if (!valid) {
    auditLog(user.id, 'auth.password_change.failed', { ip: ip(req), ua: ua(req), success: false })
    res.status(401).json({ error: 'Aktuelles Passwort falsch' })
    return
  }

  const newHash = await hashPassword(parsed.data.new_password)
  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ?, updated_at = unixepoch() WHERE id = ?')
      .run(newHash, user.id)
    // Revoke all refresh tokens on password change (force re-login on other devices)
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(user.id)
  })()

  auditLog(user.id, 'auth.password_changed', { ip: ip(req), ua: ua(req) })

  const settings = getSettings() as unknown as AppSettings
  if (settings.smtp_host) {
    sendPasswordChangedEmail(user.email, { name: user.name }, settings).catch(() => {})
  }

  clearRefreshCookie(res)
  res.json({ ok: true })
})

// ─── Forgot password ─────────────────────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
  const schema = z.object({ email: z.string().email().max(254) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    // Always 200 — don't leak whether email is valid
    res.json({ ok: true })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?')
    .get(parsed.data.email.toLowerCase()) as User | undefined

  // Respond immediately — don't leak existence
  res.json({ ok: true })

  if (!user) return

  const settings = getSettings() as unknown as AppSettings
  if (!settings.smtp_host) return

  // Invalidate old tokens for this user
  db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id)

  const rawToken = generateToken(32)
  const tokenHash = hashToken(rawToken)
  const expiresAt = Math.floor(Date.now() / 1000) + 3600  // 1 hour

  db.prepare(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
  ).run(uuidv4(), user.id, tokenHash, expiresAt)

  auditLog(user.id, 'auth.password_reset_requested', { ip: ip(req), ua: ua(req) })

  const resetUrl = `${settings.app_url}/reset-password?token=${rawToken}`
  sendPasswordResetEmail(user.email, { resetUrl, name: user.name }, settings).catch(() => {})
})

// ─── Reset password ───────────────────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
  const schema = z.object({
    token:        z.string().min(1).max(128),
    new_password: z.string().min(12).max(128),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' })
    return
  }

  const tokenHash = hashToken(parsed.data.token)
  const reset = db.prepare(
    'SELECT * FROM password_resets WHERE token_hash = ? AND used = 0'
  ).get(tokenHash) as PasswordResetRow | undefined

  if (!reset || reset.expires_at < Math.floor(Date.now() / 1000)) {
    res.status(400).json({ error: 'Token ungültig oder abgelaufen' })
    return
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(reset.user_id) as User | undefined
  if (!user) {
    res.status(400).json({ error: 'Benutzer nicht gefunden' })
    return
  }

  const newHash = await hashPassword(parsed.data.new_password)
  db.transaction(() => {
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(reset.id)
    db.prepare('UPDATE users SET password_hash = ?, updated_at = unixepoch() WHERE id = ?')
      .run(newHash, user.id)
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(user.id)
  })()

  auditLog(user.id, 'auth.password_reset_completed', { ip: ip(req), ua: ua(req) })

  const settings = getSettings() as unknown as AppSettings
  if (settings.smtp_host) {
    sendPasswordChangedEmail(user.email, { name: user.name }, settings).catch(() => {})
  }

  res.json({ ok: true })
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function publicUser(u: User) {
  return {
    id:           u.id,
    username:     u.username,
    email:        u.email,
    name:         u.name,
    studyType:    u.study_type,
    studyProgram: u.study_program,
    role:         u.role,
    storageLimit: u.storage_limit,
    createdAt:    u.created_at,
  }
}

export default router

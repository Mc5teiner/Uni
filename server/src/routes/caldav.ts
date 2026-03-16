import { Router } from 'express'
import { z } from 'zod'
import { db, auditLog } from '../db'
import { requireAuth } from '../middleware/auth'
import { encrypt, decrypt } from '../crypto'
import { fetchCalendarEvents, discoverCalendarUrl, putCalendarEvent, deleteCalendarEvent } from '../caldav/client'
import { v4 as uuidv4 } from 'uuid'
import type { AuthenticatedRequest, CaldavSettingsRow } from '../types'

const router = Router()
router.use(requireAuth)

function uid(req: import('express').Request) {
  return (req as AuthenticatedRequest).user.sub
}
function ip(req: import('express').Request) {
  const h = req.headers['x-forwarded-for']
  return (typeof h === 'string' ? h.split(',')[0].trim() : req.socket.remoteAddress) ?? 'unknown'
}
const MASTER = () => process.env.ENCRYPTION_SECRET ?? process.env.JWT_SECRET ?? ''

// ─── Get settings ─────────────────────────────────────────────────────────────

router.get('/settings', (req, res) => {
  const row = db.prepare('SELECT * FROM caldav_settings WHERE user_id = ?')
    .get(uid(req)) as CaldavSettingsRow | undefined
  if (!row) { res.json(null); return }
  res.json({
    serverUrl:   row.server_url,
    username:    row.username,
    calendarUrl: row.calendar_url,
    configured:  true,
  })
})

// ─── Save settings ────────────────────────────────────────────────────────────

router.put('/settings', (req, res) => {
  const schema = z.object({
    serverUrl:   z.string().url().max(2048),
    username:    z.string().min(1).max(254),
    password:    z.string().min(1).max(256),
    calendarUrl: z.string().url().max(2048).nullable().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Eingabe' })
    return
  }

  const { serverUrl, username, password, calendarUrl } = parsed.data
  const enc = encrypt(password, MASTER())

  db.prepare(
    `INSERT INTO caldav_settings (user_id, server_url, username, password_encrypted, calendar_url, updated_at)
     VALUES (?, ?, ?, ?, ?, unixepoch())
     ON CONFLICT(user_id) DO UPDATE SET
       server_url = excluded.server_url,
       username = excluded.username,
       password_encrypted = excluded.password_encrypted,
       calendar_url = excluded.calendar_url,
       updated_at = unixepoch()`
  ).run(uid(req), serverUrl, username, enc, calendarUrl ?? null)

  auditLog(uid(req), 'caldav.settings_saved', { ip: ip(req) })
  res.json({ ok: true })
})

// ─── Delete settings ──────────────────────────────────────────────────────────

router.delete('/settings', (req, res) => {
  db.prepare('DELETE FROM caldav_settings WHERE user_id = ?').run(uid(req))
  auditLog(uid(req), 'caldav.settings_deleted', { ip: ip(req) })
  res.json({ ok: true })
})

// ─── Test connection ──────────────────────────────────────────────────────────

router.post('/test', async (req, res) => {
  const schema = z.object({
    serverUrl:   z.string().url(),
    username:    z.string().min(1),
    password:    z.string().min(1),
    calendarUrl: z.string().url().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Ungültige Eingabe' }); return }

  try {
    const discovered = await discoverCalendarUrl(
      parsed.data.serverUrl,
      parsed.data.username,
      parsed.data.password
    )
    res.json({ ok: true, discoveredUrl: discovered })
  } catch (err) {
    res.status(400).json({ ok: false, error: (err as Error).message })
  }
})

// ─── Fetch events from CalDAV ─────────────────────────────────────────────────

router.get('/events', async (req, res) => {
  const row = db.prepare('SELECT * FROM caldav_settings WHERE user_id = ?')
    .get(uid(req)) as CaldavSettingsRow | undefined
  if (!row) { res.status(404).json({ error: 'Kein CalDAV-Konto konfiguriert' }); return }

  let password: string
  try {
    password = decrypt(row.password_encrypted, MASTER())
  } catch {
    res.status(500).json({ error: 'Passwort konnte nicht entschlüsselt werden' })
    return
  }

  try {
    const events = await fetchCalendarEvents({
      server_url:   row.server_url,
      username:     row.username,
      password,
      calendar_url: row.calendar_url,
    })
    res.json(events)
  } catch (err) {
    res.status(502).json({ error: `CalDAV Fehler: ${(err as Error).message}` })
  }
})

// ─── Push event to CalDAV ─────────────────────────────────────────────────────
// Creates or updates a VEVENT on the CalDAV server.
// Body: { uid?, title, date, time?, endTime?, description?, eventType? }
// Returns: { uid } — the UID used (generated if not provided)

router.post('/push', async (req, res) => {
  const row = db.prepare('SELECT * FROM caldav_settings WHERE user_id = ?')
    .get(uid(req)) as CaldavSettingsRow | undefined
  if (!row) { res.status(404).json({ error: 'Kein CalDAV-Konto konfiguriert' }); return }

  const schema = z.object({
    uid:         z.string().max(256).optional(),
    title:       z.string().min(1).max(500),
    date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time:        z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime:     z.string().regex(/^\d{2}:\d{2}$/).optional(),
    description: z.string().max(4000).optional(),
    eventType:   z.string().max(100).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Ungültige Eingabe' }); return }

  let password: string
  try { password = decrypt(row.password_encrypted, MASTER()) }
  catch { res.status(500).json({ error: 'Passwort konnte nicht entschlüsselt werden' }); return }

  const calUrl   = row.calendar_url ?? row.server_url
  const eventUid = parsed.data.uid ?? `${uuidv4()}@fernuni-organizer`
  const authHdr  = 'Basic ' + Buffer.from(`${row.username}:${password}`).toString('base64')

  try {
    await putCalendarEvent(calUrl, authHdr, { ...parsed.data, uid: eventUid })
    auditLog(uid(req), 'caldav.event_pushed', { ip: ip(req), details: { eventUid } })
    res.json({ uid: eventUid })
  } catch (err) {
    res.status(502).json({ error: `CalDAV Fehler: ${(err as Error).message}` })
  }
})

// ─── Delete event from CalDAV ─────────────────────────────────────────────────

router.delete('/push/:caldavUid', async (req, res) => {
  const row = db.prepare('SELECT * FROM caldav_settings WHERE user_id = ?')
    .get(uid(req)) as CaldavSettingsRow | undefined
  if (!row) { res.status(404).json({ error: 'Kein CalDAV-Konto konfiguriert' }); return }

  let password: string
  try { password = decrypt(row.password_encrypted, MASTER()) }
  catch { res.status(500).json({ error: 'Passwort konnte nicht entschlüsselt werden' }); return }

  const calUrl  = row.calendar_url ?? row.server_url
  const authHdr = 'Basic ' + Buffer.from(`${row.username}:${password}`).toString('base64')

  try {
    await deleteCalendarEvent(calUrl, authHdr, req.params.caldavUid as string)
    auditLog(uid(req), 'caldav.event_deleted', { ip: ip(req), details: { caldavUid: req.params.caldavUid } })
    res.json({ ok: true })
  } catch (err) {
    res.status(502).json({ error: `CalDAV Fehler: ${(err as Error).message}` })
  }
})

export default router

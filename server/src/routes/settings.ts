import { Router } from 'express'
import { z } from 'zod'
import { db, getSettings, setSetting, auditLog } from '../db'
import { requireAdmin } from '../middleware/auth'
import { testSmtpConnection } from '../email'
import type { AuthenticatedRequest, AppSettings } from '../types'
import { decrypt, encrypt } from '../crypto'

const router = Router()
router.use(requireAdmin)

function me(req: import('express').Request) {
  return (req as AuthenticatedRequest).user.sub
}
function ip(req: import('express').Request) {
  const h = req.headers['x-forwarded-for']
  return (typeof h === 'string' ? h.split(',')[0].trim() : req.socket.remoteAddress) ?? 'unknown'
}

const ENCRYPTED_KEYS = ['smtp_pass'] as const
const MASTER_SECRET  = () => process.env.ENCRYPTION_SECRET ?? process.env.JWT_SECRET ?? ''

/** Returns settings with sensitive fields masked */
router.get('/', (_req, res) => {
  const settings = getSettings()
  // Mask encrypted fields — return a flag instead of value
  const safe = { ...settings }
  for (const key of ENCRYPTED_KEYS) {
    if (safe[key]) {
      try {
        decrypt(safe[key], MASTER_SECRET())  // test decryptability
        safe[key] = '__ENCRYPTED__'
      } catch {
        safe[key] = ''
      }
    }
  }
  res.json(safe)
})

const SettingsSchema = z.object({
  smtp_host:                      z.string().max(253).optional(),
  smtp_port:                      z.string().regex(/^\d+$/).optional(),
  smtp_user:                      z.string().max(254).optional(),
  smtp_pass:                      z.string().max(256).optional(),
  smtp_from:                      z.string().max(254).optional(),
  smtp_secure:                    z.enum(['true', 'false']).optional(),
  welcome_email_subject:          z.string().max(200).optional(),
  welcome_email_html:             z.string().max(50_000).optional(),
  password_reset_email_subject:   z.string().max(200).optional(),
  password_reset_email_html:      z.string().max(50_000).optional(),
  password_changed_email_subject: z.string().max(200).optional(),
  password_changed_email_html:    z.string().max(50_000).optional(),
  open_registration:              z.enum(['true', 'false']).optional(),
  app_url:                        z.string().url().max(500).optional(),
})

router.put('/', (req, res) => {
  const parsed = SettingsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Einstellungen', issues: parsed.error.flatten() })
    return
  }

  const updated: string[] = []
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue
    if (value === '__ENCRYPTED__') continue  // sentinel: don't overwrite stored value
    const stored = ENCRYPTED_KEYS.includes(key as typeof ENCRYPTED_KEYS[number]) && value
      ? encrypt(value, MASTER_SECRET())
      : value
    setSetting(key, stored)
    updated.push(key)
  }

  auditLog(me(req), 'admin.settings_updated', { ip: ip(req), details: { keys: updated } })
  res.json({ ok: true, updated })
})

router.post('/smtp/test', async (_req, res) => {
  const settings = getSettings() as unknown as AppSettings
  // Decrypt smtp_pass for test
  let smtpPass = settings.smtp_pass
  if (smtpPass && smtpPass !== '__ENCRYPTED__') {
    try { smtpPass = decrypt(smtpPass, MASTER_SECRET()) } catch { smtpPass = '' }
  } else {
    smtpPass = ''
  }

  try {
    await testSmtpConnection({ ...settings, smtp_pass: smtpPass })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ ok: false, error: (err as Error).message })
  }
})

// Helper for email routes — decrypt smtp_pass before use
export function getDecryptedSettings(): AppSettings {
  const settings = getSettings() as unknown as AppSettings
  if (settings.smtp_pass) {
    try { settings.smtp_pass = decrypt(settings.smtp_pass, MASTER_SECRET()) } catch { settings.smtp_pass = '' }
  }
  return settings
}

// Suppress linting
void db

export default router

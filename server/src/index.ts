/**
 * FernUni Study Organizer — Backend Server
 *
 * Security stack:
 *  - Helmet:          strict Content-Security-Policy + HSTS + other headers
 *  - CORS:            configured for same-origin (or explicit ALLOWED_ORIGIN)
 *  - Rate limiting:   per-IP on all auth endpoints
 *  - express.json():  size-limited to prevent DoS via large payloads
 *  - Cookie parser:   for HttpOnly refresh-token cookie
 *
 * Secrets required (env vars):
 *  JWT_SECRET          — 256-bit random string (auto-generated on first start)
 *  ENCRYPTION_SECRET   — 256-bit random string for field encryption (fallback: JWT_SECRET)
 *  DATA_DIR            — path where SQLite DB is stored (default: ./data)
 *  PORT                — HTTP port (default: 3000)
 *  NODE_ENV            — 'production' enables secure cookies + HSTS
 *  ALLOWED_ORIGIN      — CORS origin (default: same-origin via proxy)
 */

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import path from 'path'
import fs from 'fs'
import { randomBytes } from 'crypto'

// ─── Bootstrap secrets ────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, '../data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const SECRETS_FILE = path.join(DATA_DIR, '.secrets.json')

function bootstrapSecrets(): void {
  let secrets: Record<string, string> = {}
  if (fs.existsSync(SECRETS_FILE)) {
    try { secrets = JSON.parse(fs.readFileSync(SECRETS_FILE, 'utf8')) } catch { /* regenerate */ }
  }
  if (!secrets.JWT_SECRET) {
    secrets.JWT_SECRET = randomBytes(32).toString('hex')
    console.info('[boot] Generated new JWT_SECRET')
  }
  if (!secrets.ENCRYPTION_SECRET) {
    secrets.ENCRYPTION_SECRET = randomBytes(32).toString('hex')
    console.info('[boot] Generated new ENCRYPTION_SECRET')
  }
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets), { mode: 0o600 })
  process.env.JWT_SECRET          ??= secrets.JWT_SECRET
  process.env.ENCRYPTION_SECRET   ??= secrets.ENCRYPTION_SECRET
}

bootstrapSecrets()

// DB must be imported after secrets are set
import './db'

// ─── Routes ───────────────────────────────────────────────────────────────────
import authRouter           from './routes/auth'
import dataRouter           from './routes/data'
import adminRouter          from './routes/admin'
import settingsRouter       from './routes/settings'
import caldavRouter         from './routes/caldav'
import sharedDocumentsRouter from './routes/sharedDocuments'
import sharedDecksRouter     from './routes/sharedDecks'

const app  = express()
const PORT = parseInt(process.env.PORT ?? '3000', 10)
const PROD = process.env.NODE_ENV === 'production'

// ─── Security headers ─────────────────────────────────────────────────────────

app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false)

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"],  // Tailwind needs inline styles
      imgSrc:         ["'self'", 'data:', 'blob:'],
      fontSrc:        ["'self'"],
      connectSrc:     ["'self'"],
      workerSrc:      ["'self'", 'blob:'],             // PDF.js worker
      objectSrc:      ["'none'"],
      frameAncestors: ["'none'"],
      baseUri:        ["'self'"],
      formAction:     ["'self'"],
      upgradeInsecureRequests: PROD ? [] : null,
    },
  },
  hsts: PROD ? { maxAge: 63_072_000, includeSubDomains: true, preload: true } : false,
  crossOriginEmbedderPolicy: false,  // breaks PDF.js
}))

// ─── CORS ─────────────────────────────────────────────────────────────────────

const allowedOrigin = process.env.ALLOWED_ORIGIN
app.use(cors({
  origin: allowedOrigin ?? false,  // false = same-origin only
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

// ─── Body parsing ─────────────────────────────────────────────────────────────

// Large limit for base64 PDFs (user data + shared document uploads)
app.use('/api/data',             express.json({ limit: '52mb' }))
app.use('/api/shared-documents', express.json({ limit: '52mb' }))
// Normal limit for all other routes
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// ─── Rate limiting ────────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 20,                     // 20 attempts per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen, bitte warte kurz.' },
  skipSuccessfulRequests: true,  // only count failures
})

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen.' },
})

app.use('/api/auth/login',           authLimiter)
app.use('/api/auth/setup',           authLimiter)
app.use('/api/auth/register',        authLimiter)
app.use('/api/auth/reset-password',  authLimiter)
app.use('/api/auth/forgot-password', forgotLimiter)

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/api/auth',             authRouter)
app.use('/api/data',             dataRouter)
app.use('/api/admin',            adminRouter)
app.use('/api/settings',         settingsRouter)
app.use('/api/caldav',           caldavRouter)
app.use('/api/shared-documents', sharedDocumentsRouter)
app.use('/api/shared-decks',     sharedDecksRouter)

// ─── Static frontend (production) ────────────────────────────────────────────

const STATIC_DIR = path.join(__dirname, '../../study-tool/dist')
if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR, {
    maxAge: '1d',
    etag: true,
    index: false,  // handled below
  }))
  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) { next(); return }
    res.sendFile(path.join(STATIC_DIR, 'index.html'))
  })
}

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Never leak stack traces to clients
  console.error('[error]', err.message)
  res.status(500).json({ error: PROD ? 'Interner Serverfehler' : err.message })
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.info(`[server] FernUni Study Organizer running on :${PORT} (${PROD ? 'production' : 'development'})`)
})

export default app

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = process.env.DATA_DIR ?? path.join(__dirname, '../../data')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

export const db = new Database(path.join(DATA_DIR, 'study.db'))

// Enable WAL mode for concurrent reads and better performance
db.pragma('journal_mode = WAL')
// Enforce foreign keys (SQLite disables them by default)
db.pragma('foreign_keys = ON')
// Secure deletion: overwrite freed pages with zeros
db.pragma('secure_delete = ON')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  username       TEXT UNIQUE NOT NULL COLLATE NOCASE,
  email          TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL DEFAULT '',
  study_type     TEXT CHECK(study_type IN ('bachelor','master','zertifikat') OR study_type IS NULL),
  study_program  TEXT,
  role           TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  storage_limit  INTEGER NOT NULL DEFAULT 5368709120,
  is_banned      INTEGER NOT NULL DEFAULT 0 CHECK(is_banned IN (0,1)),
  created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  issued_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at   INTEGER NOT NULL,
  revoked      INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0,1)),
  user_agent   TEXT,
  ip_address   TEXT
);

CREATE TABLE IF NOT EXISTS password_resets (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   INTEGER NOT NULL,
  used         INTEGER NOT NULL DEFAULT 0 CHECK(used IN (0,1)),
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS user_data (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  namespace  TEXT NOT NULL CHECK(namespace IN (
               'modules','documents','flashcards','flashcard_decks',
               'events','sessions','goals')),
  item_id    TEXT NOT NULL,
  data       TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, namespace, item_id)
);

CREATE TABLE IF NOT EXISTS caldav_settings (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  server_url         TEXT NOT NULL,
  username           TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  calendar_url       TEXT,
  updated_at         INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS audit_log (
  id             TEXT PRIMARY KEY,
  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  target_user_id TEXT,
  ip_address     TEXT,
  user_agent     TEXT,
  details        TEXT,
  success        INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_user_data_user   ON user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_user     ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created    ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_hash     ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_hash       ON password_resets(token_hash);
`

db.exec(SCHEMA)

// Insert default settings if not present
const DEFAULT_SETTINGS: Record<string, string> = {
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: '',
  smtp_secure: 'false',
  welcome_email_subject: 'Willkommen beim FernUni Study Organizer!',
  welcome_email_html: `<!DOCTYPE html>
<html>
<body>
<h2>Willkommen, {{name}}!</h2>
<p>Dein Konto beim <strong>FernUni Study Organizer</strong> wurde erfolgreich erstellt.</p>
<p><strong>Benutzername:</strong> {{username}}</p>
<p><a href="{{appUrl}}" style="background:#003366;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
  Jetzt einloggen
</a></p>
</body>
</html>`,
  password_reset_email_subject: 'Passwort zurücksetzen – FernUni Study Organizer',
  password_reset_email_html: `<!DOCTYPE html>
<html>
<body>
<h2>Passwort zurücksetzen</h2>
<p>Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.</p>
<p><a href="{{resetUrl}}" style="background:#003366;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
  Passwort jetzt zurücksetzen
</a></p>
<p style="color:#666;font-size:12px;">Dieser Link ist 1 Stunde gültig. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.</p>
</body>
</html>`,
  password_changed_email_subject: 'Dein Passwort wurde geändert',
  password_changed_email_html: `<!DOCTYPE html>
<html>
<body>
<h2>Passwort geändert</h2>
<p>Hallo {{name}}, dein Passwort beim FernUni Study Organizer wurde soeben geändert.</p>
<p style="color:#666;font-size:12px;">Falls du das nicht warst, wende dich sofort an den Administrator.</p>
</body>
</html>`,
  open_registration: 'false',
  app_url: 'http://localhost:3000',
}

const insertSetting = db.prepare(
  `INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`
)
const insertMany = db.transaction((settings: Record<string, string>) => {
  for (const [key, value] of Object.entries(settings)) {
    insertSetting.run(key, value)
  }
})
insertMany(DEFAULT_SETTINGS)

export function getSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export function getSetting(key: string): string {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? ''
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, unixepoch())
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()`
  ).run(key, value)
}

/** Storage used by user in bytes (sum of JSON blob lengths) */
export function getUserStorageBytes(userId: string): number {
  const row = db.prepare(
    `SELECT COALESCE(SUM(LENGTH(data)), 0) as total FROM user_data WHERE user_id = ?`
  ).get(userId) as { total: number }
  return row.total
}

/** Storage used by all users */
export function getAllUsersStorage(): { userId: string; bytes: number }[] {
  return db.prepare(
    `SELECT user_id as userId, COALESCE(SUM(LENGTH(data)), 0) as bytes
     FROM user_data GROUP BY user_id`
  ).all() as { userId: string; bytes: number }[]
}

export function auditLog(
  userId: string | null,
  action: string,
  opts: {
    targetUserId?: string
    ip?: string
    ua?: string
    details?: Record<string, unknown>
    success?: boolean
  } = {}
): void {
  const { v4: uuidv4 } = require('uuid')
  db.prepare(
    `INSERT INTO audit_log (id, user_id, action, target_user_id, ip_address, user_agent, details, success)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuidv4(),
    userId,
    action,
    opts.targetUserId ?? null,
    opts.ip ?? null,
    opts.ua ?? null,
    opts.details ? JSON.stringify(opts.details) : null,
    opts.success !== false ? 1 : 0
  )
}

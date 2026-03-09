/**
 * Cryptographic utilities — all security-critical operations live here.
 *
 * Choices:
 *  - Password hashing:  Argon2id (PHC winner, recommended by OWASP & BSI)
 *    Parameters: 64 MB memory, 3 iterations, 4 parallel lanes — well above OWASP minimum
 *  - Symmetric encryption: AES-256-GCM with per-value random IV (for CalDAV/SMTP secrets)
 *  - Key derivation: HKDF-SHA256 (separate subkey per purpose — no key reuse)
 *  - Token hashing: SHA-256 (tokens stored only as hash in DB)
 *  - JWT: HS256 with 256-bit random secret
 *  - Comparisons: crypto.timingSafeEqual everywhere (prevent timing oracle)
 */

import argon2 from 'argon2'
import {
  createCipheriv, createDecipheriv,
  createHmac, createHash,
  hkdfSync, randomBytes,
  timingSafeEqual,
} from 'crypto'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import type { AccessTokenPayload } from '../types'

// ─── Argon2id ───────────────────────────────────────────────────────────────

const ARGON2_OPTIONS: argon2.Options & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MB — OWASP recommends ≥12 MB; BSI recommends ≥64 MB
  timeCost: 3,         // 3 iterations
  parallelism: 4,      // 4 parallel lanes
  hashLength: 32,      // 256-bit output
  raw: false,
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

// ─── AES-256-GCM (for CalDAV/SMTP secrets stored in DB) ────────────────────

const GCM_IV_LEN  = 12  // 96-bit IV — optimal for GCM

function deriveEncryptionKey(masterSecret: string, purpose: string): Buffer {
  // HKDF-SHA256: separate subkey per purpose, no key reuse
  return Buffer.from(
    hkdfSync('sha256', masterSecret, 'fernuni-study-organizer', purpose, 32)
  )
}

/**
 * Encrypt a plaintext string.
 * Output format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plaintext: string, masterSecret: string, purpose = 'field-encryption'): string {
  const key = deriveEncryptionKey(masterSecret, purpose)
  const iv  = randomBytes(GCM_IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

/**
 * Decrypt a value encrypted with `encrypt()`.
 * Throws if authentication fails (tampered data).
 */
export function decrypt(ciphertext: string, masterSecret: string, purpose = 'field-encryption'): string {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivB64, tagB64, ctB64] = parts
  const key = deriveEncryptionKey(masterSecret, purpose)
  const iv  = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct  = Buffer.from(ctB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

/** Generate a cryptographically random URL-safe token */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/** SHA-256 hash of a token — for safe DB storage */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Timing-safe string comparison (prevent timing oracle attacks) */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still run the comparison to prevent timing leaks via short-circuit
    timingSafeEqual(Buffer.alloc(1), Buffer.alloc(1))
    return false
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL  = 15 * 60          // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 3600   // 7 days

/** Sign a short-lived access token (lives in memory on client, never in localStorage) */
export function signAccessToken(
  userId: string,
  username: string,
  role: 'user' | 'admin',
  secret: string
): { token: string; jti: string } {
  const jti = uuidv4()
  const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
    sub: userId,
    usr: username,
    role,
    jti,
  }
  const token = jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL,
  })
  return { token, jti }
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  return jwt.verify(token, secret, { algorithms: ['HS256'] }) as AccessTokenPayload
}

/** Generate a refresh token and return both plaintext (for cookie) and hash (for DB) */
export function generateRefreshToken(): { token: string; hash: string; expiresAt: number } {
  const token = generateToken(48)   // 384 bits — plenty
  const hash  = hashToken(token)
  const expiresAt = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL
  return { token, hash, expiresAt }
}

/** HMAC-based CSRF token tied to the session (double-submit cookie pattern) */
export function generateCsrfToken(sessionId: string, secret: string): string {
  const nonce = generateToken(16)
  const sig = createHmac('sha256', secret)
    .update(`${sessionId}:${nonce}`)
    .digest('base64url')
  return `${nonce}.${sig}`
}

export function verifyCsrfToken(token: string, sessionId: string, secret: string): boolean {
  const dot = token.indexOf('.')
  if (dot === -1) return false
  const nonce = token.slice(0, dot)
  const expected = createHmac('sha256', secret)
    .update(`${sessionId}:${nonce}`)
    .digest('base64url')
  return safeEqual(token.slice(dot + 1), expected)
}

export { REFRESH_TOKEN_TTL, ACCESS_TOKEN_TTL }

import type { RequestHandler } from 'express'
import type { AuthenticatedRequest } from '../types'
import { verifyAccessToken } from '../crypto'
import { db } from '../db'
import type { User } from '../types'

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not set')
  return secret
}

/** Extract Bearer token from Authorization header */
function extractBearer(req: AuthenticatedRequest): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7)
}

/**
 * Require a valid access token.
 * Populates req.user with the decoded payload.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  const r = req as AuthenticatedRequest
  const token = extractBearer(r)
  if (!token) {
    res.status(401).json({ error: 'Authentifizierung erforderlich' })
    return
  }
  try {
    r.user = verifyAccessToken(token, getSecret())
  } catch {
    res.status(401).json({ error: 'Token ungültig oder abgelaufen' })
    return
  }

  // Check if user is still active (not banned/deleted) — lightweight DB check
  const user = db.prepare('SELECT is_banned FROM users WHERE id = ?').get(r.user.sub) as Pick<User, 'is_banned'> | undefined
  if (!user) {
    res.status(401).json({ error: 'Benutzer nicht gefunden' })
    return
  }
  if (user.is_banned) {
    res.status(403).json({ error: 'Konto gesperrt' })
    return
  }
  next()
}

/** Require admin role on top of a valid token */
export const requireAdmin: RequestHandler = (req, res, next) => {
  requireAuth(req, res, () => {
    const r = req as AuthenticatedRequest
    if (r.user.role !== 'admin') {
      res.status(403).json({ error: 'Administratorrechte erforderlich' })
      return
    }
    next()
  })
}

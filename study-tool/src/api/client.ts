/**
 * Type-safe API client.
 *
 * Token strategy (CCC-worthy):
 *  - Access token lives in memory (module-level variable), never localStorage/sessionStorage
 *  - Refresh token is in an HttpOnly cookie — JS cannot touch it
 *  - On 401: transparent single retry via /api/auth/refresh
 *  - On refresh failure: dispatch 'session-expired' event → AuthContext logs out
 */

import type {
  AppData, StudyModule, StudyDocument, Flashcard, FlashcardDeck,
  CalendarEvent, StudySession, StudyGoal,
} from '../types'

export interface PublicUser {
  id: string
  username: string
  email: string
  name: string
  studyType: 'bachelor' | 'master' | 'zertifikat' | null
  studyProgram: string | null
  role: 'user' | 'admin'
  storageLimit: number
  createdAt: number
}

export interface AdminUser extends PublicUser {
  isBanned: boolean
  storageUsed: number
}

export interface StorageInfo {
  used: number
  limit: number
  percentage: number
  breakdown: { namespace: string; count: number; bytes: number }[]
}

// ─── Token management (in-memory only) ───────────────────────────────────────

let _accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

let _refreshing: Promise<boolean> | null = null

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',  // sends HttpOnly refresh cookie
    })
    if (!res.ok) {
      _accessToken = null
      window.dispatchEvent(new Event('session-expired'))
      return false
    }
    const data = await res.json()
    _accessToken = data.accessToken
    return true
  } catch {
    _accessToken = null
    window.dispatchEvent(new Event('session-expired'))
    return false
  }
}

async function apiFetch(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (res.status === 401 && retry) {
    // Deduplicate concurrent refresh attempts
    if (!_refreshing) {
      _refreshing = doRefresh().finally(() => { _refreshing = null })
    }
    const ok = await _refreshing
    if (ok) return apiFetch(path, options, false)
  }

  return res
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let msg = `API-Fehler ${res.status}`
    try {
      const j = await res.json()
      msg = j.error ?? msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  checkSetup: () => req<{ setupNeeded: boolean }>('GET', '/api/auth/check-setup'),

  setup: (body: { username: string; email: string; password: string; name: string }) =>
    req<{ ok: boolean }>('POST', '/api/auth/setup', body),

  login: async (username: string, password: string): Promise<{ accessToken: string; user: PublicUser }> => {
    const res = await req<{ accessToken: string; user: PublicUser }>('POST', '/api/auth/login', { username, password })
    _accessToken = res.accessToken
    return res
  },

  register: (body: {
    username: string; email: string; password: string; name: string
    study_type?: string; study_program?: string
  }) => req<{ ok: boolean }>('POST', '/api/auth/register', body),

  logout: async () => {
    try { await req('POST', '/api/auth/logout') } catch { /* ignore */ }
    _accessToken = null
  },

  me: () => req<PublicUser>('GET', '/api/auth/me'),

  updateMe: (body: { name?: string; study_type?: string | null; study_program?: string | null }) =>
    req<PublicUser>('PATCH', '/api/auth/me', body),

  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ ok: boolean }>('POST', '/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),

  forgotPassword: (email: string) =>
    req<{ ok: boolean }>('POST', '/api/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    req<{ ok: boolean }>('POST', '/api/auth/reset-password', { token, new_password: newPassword }),
}

// ─── Data (replaces localStorage) ────────────────────────────────────────────

type Namespace = 'modules' | 'documents' | 'flashcards' | 'flashcard_decks' | 'events' | 'sessions' | 'goals'

export const data = {
  getAll: <T>(ns: Namespace) => req<T[]>('GET', `/api/data/${ns}`),

  upsert: <T extends { id: string }>(ns: Namespace, item: T) =>
    req<{ ok: boolean }>('PUT', `/api/data/${ns}/${item.id}`, item),

  delete: (ns: Namespace, id: string) =>
    req<{ ok: boolean }>('DELETE', `/api/data/${ns}/${id}`),

  storage: () => req<StorageInfo>('GET', '/api/data/meta/storage'),

  /** Load all namespaces and build an AppData object */
  loadAll: async (): Promise<Partial<AppData>> => {
    const [modules, documents, flashcards, flashcard_decks, events, sessions, goals] = await Promise.all([
      data.getAll<StudyModule>('modules'),
      data.getAll<StudyDocument>('documents'),
      data.getAll<Flashcard>('flashcards'),
      data.getAll<FlashcardDeck>('flashcard_decks'),
      data.getAll<CalendarEvent>('events'),
      data.getAll<StudySession>('sessions'),
      data.getAll<StudyGoal>('goals'),
    ])
    return { modules, documents, flashcards, flashcardDecks: flashcard_decks, events, sessions, goals }
  },
}

// ─── Admin ────────────────────────────────────────────────────────────────────

// Admin API uses snake_case body fields
interface AdminCreateBody {
  username?: string; email?: string; name?: string; password?: string
  role?: 'user' | 'admin'; storageLimit?: number; studyType?: AdminUser['studyType']
  studyProgram?: string | null; send_welcome?: boolean
}
interface AdminUpdateBody {
  username?: string; email?: string; name?: string; role?: 'user' | 'admin'
  storageLimit?: number; isBanned?: boolean; studyType?: AdminUser['studyType'] | null
  studyProgram?: string | null
}
// Transform camelCase → snake_case for the backend
function toSnake(body: AdminCreateBody | AdminUpdateBody): Record<string, unknown> {
  const r: Record<string, unknown> = { ...body }
  if ('storageLimit' in r) { r.storage_limit = r.storageLimit; delete r.storageLimit }
  if ('studyType'    in r) { r.study_type    = r.studyType;    delete r.studyType }
  if ('studyProgram' in r) { r.study_program = r.studyProgram; delete r.studyProgram }
  if ('isBanned'     in r) { r.is_banned     = r.isBanned;     delete r.isBanned }
  return r
}

export const admin = {
  listUsers:   () => req<AdminUser[]>('GET', '/api/admin/users'),
  getUser:     (id: string) => req<AdminUser>('GET', `/api/admin/users/${id}`),
  createUser:  (body: AdminCreateBody) =>
    req<AdminUser & { temporaryPassword?: string }>('POST', '/api/admin/users', toSnake(body)),
  updateUser:  (id: string, body: AdminUpdateBody) =>
    req<AdminUser>('PATCH', `/api/admin/users/${id}`, toSnake(body)),
  deleteUser:  (id: string) => req<{ ok: boolean }>('DELETE', `/api/admin/users/${id}`),
  setPassword: (id: string, password?: string) =>
    req<{ temporaryPassword?: string; ok: boolean }>('POST', `/api/admin/users/${id}/set-password`, { password }),
  storage:     () => req<{
    totalBytes: number
    users: { id: string; username: string; used: number; limit: number; percentage: number }[]
  }>('GET', '/api/admin/storage'),
  userData:    (id: string, ns?: string) =>
    req<Record<string, unknown>>('GET', `/api/admin/users/${id}/data${ns ? `?namespace=${ns}` : ''}`),
  auditLog:    (limit?: number, userId?: string) =>
    req<unknown[]>('GET', `/api/admin/audit?limit=${limit ?? 100}${userId ? `&userId=${userId}` : ''}`),
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = {
  get:      () => req<Record<string, string>>('GET', '/api/settings'),
  update:   (body: Record<string, string>) => req<{ ok: boolean }>('PUT', '/api/settings', body),
  testSmtp: () => req<{ ok: boolean }>('POST', '/api/settings/smtp/test'),
}

// ─── CalDAV ───────────────────────────────────────────────────────────────────

export interface CaldavSettings {
  serverUrl: string
  username: string
  calendarUrl: string | null
  configured: boolean
}

export interface CaldavEvent {
  uid: string
  title: string
  date: string
  time?: string
  endTime?: string
  description?: string
}

export const caldav = {
  getSettings:    () => req<CaldavSettings | null>('GET', '/api/caldav/settings'),
  saveSettings:   (body: { serverUrl: string; username: string; password: string; calendarUrl?: string | null }) =>
    req<{ ok: boolean }>('PUT', '/api/caldav/settings', body),
  deleteSettings: () => req<{ ok: boolean }>('DELETE', '/api/caldav/settings'),
  testConnection: (body: { serverUrl: string; username: string; password: string }) =>
    req<{ ok: boolean; discoveredUrl?: string }>('POST', '/api/caldav/test', body),
  fetchEvents:    () => req<CaldavEvent[]>('GET', '/api/caldav/events'),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1_048_576)  return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`
}

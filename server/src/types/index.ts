import type { Request } from 'express'

export interface User {
  id: string
  username: string
  email: string
  password_hash: string
  name: string
  study_type: 'bachelor' | 'master' | 'zertifikat' | null
  study_program: string | null
  role: 'user' | 'admin'
  storage_limit: number
  is_banned: 0 | 1
  created_at: number
  updated_at: number
}

export interface RefreshTokenRow {
  id: string
  user_id: string
  token_hash: string
  issued_at: number
  expires_at: number
  revoked: 0 | 1
  user_agent: string | null
  ip_address: string | null
}

export interface PasswordResetRow {
  id: string
  user_id: string
  token_hash: string
  expires_at: number
  used: 0 | 1
  created_at: number
}

export interface UserDataRow {
  user_id: string
  namespace: DataNamespace
  item_id: string
  data: string
  created_at: number
  updated_at: number
}

export interface CaldavSettingsRow {
  user_id: string
  server_url: string
  username: string
  password_encrypted: string
  calendar_url: string | null
  updated_at: number
}

export type DataNamespace =
  | 'modules'
  | 'documents'
  | 'flashcards'
  | 'flashcard_decks'
  | 'events'
  | 'sessions'
  | 'goals'
  | 'grades'

export const VALID_NAMESPACES: DataNamespace[] = [
  'modules', 'documents', 'flashcards', 'flashcard_decks', 'events', 'sessions', 'goals', 'grades',
]

export interface AccessTokenPayload {
  sub: string        // user id
  usr: string        // username
  role: 'user' | 'admin'
  jti: string        // token id (for potential revocation)
  iat: number
  exp: number
}

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload
}

export interface AppSettings {
  smtp_host: string
  smtp_port: string
  smtp_user: string
  smtp_pass: string
  smtp_from: string
  smtp_secure: string          // 'true' | 'false'
  welcome_email_subject: string
  welcome_email_html: string
  password_reset_email_subject: string
  password_reset_email_html: string
  password_changed_email_subject: string
  password_changed_email_html: string
  open_registration: string    // 'true' | 'false'
  app_url: string
}

export interface CaldavEvent {
  uid: string
  title: string
  date: string          // YYYY-MM-DD
  time?: string         // HH:MM
  endTime?: string      // HH:MM
  description?: string
  location?: string
}

// ============================================================
// Core domain types for FernUni Hagen Study Organizer
// ============================================================

export type ModuleStatus = 'aktiv' | 'abgeschlossen' | 'geplant' | 'pausiert'
export type Semester = string // e.g. "WS 2025/26"

export interface ModuleExam {
  id: string
  date?: string       // "YYYY-MM-DD"
  grade?: string      // e.g. "2,3"
  passed?: boolean    // undefined = no result yet
}

export interface ModuleAssignment {
  id: string
  title: string       // "Einsendearbeit 1" etc.
  date?: string       // deadline "YYYY-MM-DD"
  grade?: string
  done: boolean
  passed?: boolean
}

export interface StudyModule {
  id: string
  name: string
  moduleNumber: string // e.g. "31101" (FernUni module number)
  credits: number      // ECTS
  semester: Semester
  status: ModuleStatus
  color: string        // hex color for UI differentiation
  examDate?: string    // ISO date string (legacy – use exams[] instead)
  exams?: ModuleExam[]
  assignments?: ModuleAssignment[]
  moodleUrl?: string
  description?: string
  createdAt: string
}

// ============================================================
// PDF / Study Letters (Studienbriefe)
// ============================================================

export interface StudyDocument {
  id: string
  moduleId: string
  name: string
  fileName: string
  fileData: string     // base64 encoded
  totalPages: number
  currentPage: number
  semester?: string    // e.g. "WS 2025/26"
  lastReadAt?: string
  bookmarks: Bookmark[]
  notes: DocumentNote[]
  uploadedAt: string
}

export interface Bookmark {
  id: string
  page: number
  label: string
  createdAt: string
}

export interface DocumentNote {
  id: string
  page: number
  text: string
  createdAt: string
}

// ============================================================
// Flashcards with Spaced Repetition (SM-2 algorithm)
// ============================================================

export type FlashcardDifficulty = 0 | 1 | 2 | 3 | 4 | 5
// 0=Kompletter Blackout, 1=Falsch aber erinnert, 2=Falsch aber leicht
// 3=Richtig nach Mühe, 4=Richtig mit kleiner Pause, 5=Perfekt

export interface Flashcard {
  id: string
  moduleId: string
  front: string
  back: string
  frontImage?: string   // data URL (base64 image)
  backImage?: string    // data URL (base64 image)
  tags: string[]
  // SM-2 state
  interval: number      // days until next review
  repetitions: number   // how many times reviewed
  easeFactor: number    // 2.5 default
  dueDate: string       // ISO date
  lastReviewedAt?: string
  createdAt: string
}

export interface FlashcardDeck {
  id: string
  moduleId: string
  name: string
  description?: string
  createdAt: string
}

// ============================================================
// Calendar & Study Planning
// ============================================================

export type EventType = 'pruefung' | 'abgabe' | 'lernblock' | 'praesenzveranstaltung' | 'erinnerung' | 'mentoriat'

export interface CalendarEvent {
  id: string
  moduleId?: string
  title: string
  description?: string
  date: string         // ISO date
  time?: string        // "HH:MM"
  endTime?: string
  type: EventType
  isRecurring?: boolean
  recurringDays?: number[] // 0=Sun, 1=Mon ... 6=Sat
  completed?: boolean
}

// ============================================================
// Study Session & Progress
// ============================================================

export interface StudySession {
  id: string
  moduleId: string
  date: string         // ISO date
  durationMinutes: number
  topic: string
  notes?: string
}

export interface StudyGoal {
  id: string
  moduleId?: string
  title: string
  targetDate: string
  targetMinutesPerWeek: number
  currentMinutesThisWeek: number
  createdAt: string
}

// ============================================================
// App State
// ============================================================

export interface AppData {
  modules: StudyModule[]
  documents: StudyDocument[]
  flashcards: Flashcard[]
  flashcardDecks: FlashcardDeck[]
  events: CalendarEvent[]
  sessions: StudySession[]
  goals: StudyGoal[]
  lastUpdated: string
}

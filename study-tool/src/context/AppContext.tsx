/**
 * AppContext — API-backed version.
 *
 * Strategy:
 *  - On mount: load all user data from the API
 *  - All mutations: dispatch optimistically (instant UI update),
 *    then sync to API in the background
 *  - Reducer stays identical to the localStorage version
 *  - If user is not logged in (no token), falls back to empty data
 */

import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react'
import type { AppData, StudyModule, StudyDocument, Flashcard, FlashcardDeck, CalendarEvent, StudySession, StudyGoal } from '../types'
import type { GradeConfig } from '../utils/gradeCalculations'
import {
  loadData, saveModule, deleteModule,
  saveDocument, deleteDocument,
  saveFlashcard, deleteFlashcard, saveDeck,
  saveEvent, deleteEvent,
  saveSession,
  saveGoal, deleteGoal,
  generateId,
} from '../utils/storage'
import { getNewCard } from '../utils/spaceRepetition'
import { format } from 'date-fns'
import { data as api, getAccessToken } from '../api/client'
import { useAuth } from './AuthContext'

// ─── Reducer (unchanged) ──────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD'; data: AppData }
  | { type: 'SAVE_MODULE'; module: StudyModule }
  | { type: 'DELETE_MODULE'; moduleId: string }
  | { type: 'SAVE_DOCUMENT'; doc: StudyDocument }
  | { type: 'DELETE_DOCUMENT'; docId: string }
  | { type: 'SAVE_FLASHCARD'; card: Flashcard }
  | { type: 'DELETE_FLASHCARD'; cardId: string }
  | { type: 'SAVE_DECK'; deck: FlashcardDeck }
  | { type: 'SAVE_EVENT'; event: CalendarEvent }
  | { type: 'DELETE_EVENT'; eventId: string }
  | { type: 'SAVE_SESSION'; session: StudySession }
  | { type: 'SAVE_GOAL'; goal: StudyGoal }
  | { type: 'DELETE_GOAL'; goalId: string }
  | { type: 'SAVE_GRADES'; grades: GradeConfig }

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'LOAD':            return action.data
    case 'SAVE_MODULE':     return saveModule(state, action.module)
    case 'DELETE_MODULE':   return deleteModule(state, action.moduleId)
    case 'SAVE_DOCUMENT':   return saveDocument(state, action.doc)
    case 'DELETE_DOCUMENT': return deleteDocument(state, action.docId)
    case 'SAVE_FLASHCARD':  return saveFlashcard(state, action.card)
    case 'DELETE_FLASHCARD':return deleteFlashcard(state, action.cardId)
    case 'SAVE_DECK':       return saveDeck(state, action.deck)
    case 'SAVE_EVENT':      return saveEvent(state, action.event)
    case 'DELETE_EVENT':    return deleteEvent(state, action.eventId)
    case 'SAVE_SESSION':    return saveSession(state, action.session)
    case 'SAVE_GOAL':       return saveGoal(state, action.goal)
    case 'DELETE_GOAL':     return deleteGoal(state, action.goalId)
    case 'SAVE_GRADES':     return { ...state, grades: action.grades }
    default:                return state
  }
}

// ─── API sync helpers ─────────────────────────────────────────────────────────

const nsMap = {
  module:       'modules',
  document:     'documents',
  flashcard:    'flashcards',
  deck:         'flashcard_decks',
  event:        'events',
  session:      'sessions',
  goal:         'goals',
  grades:       'grades',
} as const

type NS = typeof nsMap[keyof typeof nsMap]

function apiUpsert(ns: NS, item: { id: string }) {
  if (!getAccessToken()) return
  api.upsert(ns, item).catch(err => console.warn('[AppContext] sync error', err))
}

function apiDelete(ns: NS, id: string) {
  if (!getAccessToken()) return
  api.delete(ns, id).catch(err => console.warn('[AppContext] sync error', err))
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  data: AppData
  dataLoading: boolean
  createModule: (m: Omit<StudyModule, 'id' | 'createdAt'>) => void
  updateModule: (m: StudyModule) => void
  removeModule: (id: string) => void
  createDocument: (d: Omit<StudyDocument, 'id' | 'uploadedAt' | 'bookmarks' | 'notes' | 'currentPage'>) => void
  updateDocument: (d: StudyDocument) => void
  removeDocument: (id: string) => void
  createFlashcard: (c: Omit<Flashcard, 'id' | 'createdAt' | 'interval' | 'repetitions' | 'easeFactor' | 'dueDate'>) => void
  updateFlashcard: (c: Flashcard) => void
  removeFlashcard: (id: string) => void
  createDeck: (d: Omit<FlashcardDeck, 'id' | 'createdAt'>) => void
  createEvent: (e: Omit<CalendarEvent, 'id'>) => void
  updateEvent: (e: CalendarEvent) => void
  removeEvent: (id: string) => void
  logSession: (s: Omit<StudySession, 'id'>) => void
  createGoal: (g: Omit<StudyGoal, 'id' | 'createdAt' | 'currentMinutesThisWeek'>) => void
  updateGoal: (g: StudyGoal) => void
  removeGoal: (id: string) => void
  updateGrades: (grades: GradeConfig) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const DEFAULT_DATA: AppData = {
  modules: [], documents: [], flashcards: [], flashcardDecks: [],
  events: [], sessions: [], goals: [], grades: null, lastUpdated: new Date().toISOString(),
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [data, dispatch]         = useReducer(reducer, loadData())
  const [dataLoading, setDataLoading] = useReducer((_: boolean, v: boolean) => v, false)

  // Load all data from API when user logs in
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'LOAD', data: DEFAULT_DATA })
      return
    }
    setDataLoading(true)
    api.loadAll()
      .then(partial => {
        dispatch({ type: 'LOAD', data: { ...DEFAULT_DATA, ...partial, lastUpdated: new Date().toISOString() } })
      })
      .catch(err => console.error('[AppContext] load error', err))
      .finally(() => setDataLoading(false))
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const ctx: AppContextValue = {
    data,
    dataLoading,

    createModule: useCallback((m) => {
      const item = { ...m, id: generateId(), createdAt: new Date().toISOString() }
      dispatch({ type: 'SAVE_MODULE', module: item })
      apiUpsert('modules', item)
    }, []),

    updateModule: useCallback((m) => {
      dispatch({ type: 'SAVE_MODULE', module: m })
      apiUpsert('modules', m)
    }, []),

    removeModule: useCallback((id) => {
      dispatch({ type: 'DELETE_MODULE', moduleId: id })
      apiDelete('modules', id)
    }, []),

    createDocument: useCallback((d) => {
      const item = { ...d, id: generateId(), uploadedAt: new Date().toISOString(), bookmarks: [], notes: [], currentPage: 1 }
      dispatch({ type: 'SAVE_DOCUMENT', doc: item })
      apiUpsert('documents', item)
    }, []),

    updateDocument: useCallback((d) => {
      dispatch({ type: 'SAVE_DOCUMENT', doc: d })
      apiUpsert('documents', d)
    }, []),

    removeDocument: useCallback((id) => {
      dispatch({ type: 'DELETE_DOCUMENT', docId: id })
      apiDelete('documents', id)
    }, []),

    createFlashcard: useCallback((c) => {
      const item = { ...c, id: generateId(), createdAt: new Date().toISOString(), ...getNewCard() }
      dispatch({ type: 'SAVE_FLASHCARD', card: item })
      apiUpsert('flashcards', item)
    }, []),

    updateFlashcard: useCallback((c) => {
      dispatch({ type: 'SAVE_FLASHCARD', card: c })
      apiUpsert('flashcards', c)
    }, []),

    removeFlashcard: useCallback((id) => {
      dispatch({ type: 'DELETE_FLASHCARD', cardId: id })
      apiDelete('flashcards', id)
    }, []),

    createDeck: useCallback((d) => {
      const item = { ...d, id: generateId(), createdAt: new Date().toISOString() }
      dispatch({ type: 'SAVE_DECK', deck: item })
      apiUpsert('flashcard_decks', item)
    }, []),

    createEvent: useCallback((e) => {
      const item = { ...e, id: generateId() }
      dispatch({ type: 'SAVE_EVENT', event: item })
      apiUpsert('events', item)
    }, []),

    updateEvent: useCallback((e) => {
      dispatch({ type: 'SAVE_EVENT', event: e })
      apiUpsert('events', e)
    }, []),

    removeEvent: useCallback((id) => {
      dispatch({ type: 'DELETE_EVENT', eventId: id })
      apiDelete('events', id)
    }, []),

    logSession: useCallback((s) => {
      const item = { ...s, id: generateId() }
      dispatch({ type: 'SAVE_SESSION', session: item })
      apiUpsert('sessions', item)
    }, []),

    createGoal: useCallback((g) => {
      const item = { ...g, id: generateId(), createdAt: new Date().toISOString(), currentMinutesThisWeek: 0 }
      dispatch({ type: 'SAVE_GOAL', goal: item })
      apiUpsert('goals', item)
    }, []),

    updateGoal: useCallback((g) => {
      dispatch({ type: 'SAVE_GOAL', goal: g })
      apiUpsert('goals', g)
    }, []),

    removeGoal: useCallback((id) => {
      dispatch({ type: 'DELETE_GOAL', goalId: id })
      apiDelete('goals', id)
    }, []),

    updateGrades: useCallback((grades: GradeConfig) => {
      dispatch({ type: 'SAVE_GRADES', grades })
      apiUpsert('grades', { id: 'singleton', ...grades })
    }, []),
  }

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function useModuleStats(moduleId: string) {
  const { data } = useApp()
  const today   = format(new Date(), 'yyyy-MM-dd')
  const weekAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const dueCards   = data.flashcards.filter(c => c.moduleId === moduleId && c.dueDate <= today).length
  const totalCards = data.flashcards.filter(c => c.moduleId === moduleId).length
  const docs       = data.documents.filter(d => d.moduleId === moduleId)
  const weekSessions = data.sessions.filter(s => s.moduleId === moduleId && s.date >= weekAgo)
  const weekMinutes  = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0)

  return { dueCards, totalCards, docs, weekMinutes }
}

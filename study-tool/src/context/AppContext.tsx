import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { AppData, StudyModule, StudyDocument, Flashcard, FlashcardDeck, CalendarEvent, StudySession, StudyGoal } from '../types'
import {
  loadData, saveData, generateId,
  saveModule, deleteModule,
  saveDocument, deleteDocument,
  saveFlashcard, deleteFlashcard, saveDeck,
  saveEvent, deleteEvent,
  saveSession,
  saveGoal, deleteGoal,
} from '../utils/storage'
import { getNewCard } from '../utils/spaceRepetition'
import { format } from 'date-fns'

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

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'LOAD': return action.data
    case 'SAVE_MODULE': return saveModule(state, action.module)
    case 'DELETE_MODULE': return deleteModule(state, action.moduleId)
    case 'SAVE_DOCUMENT': return saveDocument(state, action.doc)
    case 'DELETE_DOCUMENT': return deleteDocument(state, action.docId)
    case 'SAVE_FLASHCARD': return saveFlashcard(state, action.card)
    case 'DELETE_FLASHCARD': return deleteFlashcard(state, action.cardId)
    case 'SAVE_DECK': return saveDeck(state, action.deck)
    case 'SAVE_EVENT': return saveEvent(state, action.event)
    case 'DELETE_EVENT': return deleteEvent(state, action.eventId)
    case 'SAVE_SESSION': return saveSession(state, action.session)
    case 'SAVE_GOAL': return saveGoal(state, action.goal)
    case 'DELETE_GOAL': return deleteGoal(state, action.goalId)
    default: return state
  }
}

interface AppContextValue {
  data: AppData
  // Modules
  createModule: (m: Omit<StudyModule, 'id' | 'createdAt'>) => void
  updateModule: (m: StudyModule) => void
  removeModule: (id: string) => void
  // Documents
  createDocument: (d: Omit<StudyDocument, 'id' | 'uploadedAt' | 'bookmarks' | 'notes' | 'currentPage'>) => void
  updateDocument: (d: StudyDocument) => void
  removeDocument: (id: string) => void
  // Flashcards
  createFlashcard: (c: Omit<Flashcard, 'id' | 'createdAt' | 'interval' | 'repetitions' | 'easeFactor' | 'dueDate'>) => void
  updateFlashcard: (c: Flashcard) => void
  removeFlashcard: (id: string) => void
  createDeck: (d: Omit<FlashcardDeck, 'id' | 'createdAt'>) => void
  // Events
  createEvent: (e: Omit<CalendarEvent, 'id'>) => void
  updateEvent: (e: CalendarEvent) => void
  removeEvent: (id: string) => void
  // Sessions
  logSession: (s: Omit<StudySession, 'id'>) => void
  // Goals
  createGoal: (g: Omit<StudyGoal, 'id' | 'createdAt' | 'currentMinutesThisWeek'>) => void
  updateGoal: (g: StudyGoal) => void
  removeGoal: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const ctx: AppContextValue = {
    data,
    createModule: (m) => dispatch({ type: 'SAVE_MODULE', module: { ...m, id: generateId(), createdAt: new Date().toISOString() } }),
    updateModule: (m) => dispatch({ type: 'SAVE_MODULE', module: m }),
    removeModule: (id) => dispatch({ type: 'DELETE_MODULE', moduleId: id }),
    createDocument: (d) => dispatch({ type: 'SAVE_DOCUMENT', doc: { ...d, id: generateId(), uploadedAt: new Date().toISOString(), bookmarks: [], notes: [], currentPage: 1 } }),
    updateDocument: (d) => dispatch({ type: 'SAVE_DOCUMENT', doc: d }),
    removeDocument: (id) => dispatch({ type: 'DELETE_DOCUMENT', docId: id }),
    createFlashcard: (c) => dispatch({ type: 'SAVE_FLASHCARD', card: { ...c, id: generateId(), createdAt: new Date().toISOString(), ...getNewCard() } }),
    updateFlashcard: (c) => dispatch({ type: 'SAVE_FLASHCARD', card: c }),
    removeFlashcard: (id) => dispatch({ type: 'DELETE_FLASHCARD', cardId: id }),
    createDeck: (d) => dispatch({ type: 'SAVE_DECK', deck: { ...d, id: generateId(), createdAt: new Date().toISOString() } }),
    createEvent: (e) => dispatch({ type: 'SAVE_EVENT', event: { ...e, id: generateId() } }),
    updateEvent: (e) => dispatch({ type: 'SAVE_EVENT', event: e }),
    removeEvent: (id) => dispatch({ type: 'DELETE_EVENT', eventId: id }),
    logSession: (s) => dispatch({ type: 'SAVE_SESSION', session: { ...s, id: generateId() } }),
    createGoal: (g) => dispatch({ type: 'SAVE_GOAL', goal: { ...g, id: generateId(), createdAt: new Date().toISOString(), currentMinutesThisWeek: 0 } }),
    updateGoal: (g) => dispatch({ type: 'SAVE_GOAL', goal: g }),
    removeGoal: (id) => dispatch({ type: 'DELETE_GOAL', goalId: id }),
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
  const today = format(new Date(), 'yyyy-MM-dd')
  const weekAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const dueCards = data.flashcards.filter(c => c.moduleId === moduleId && c.dueDate <= today).length
  const totalCards = data.flashcards.filter(c => c.moduleId === moduleId).length
  const docs = data.documents.filter(d => d.moduleId === moduleId)
  const weekSessions = data.sessions.filter(s => s.moduleId === moduleId && s.date >= weekAgo)
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0)

  return { dueCards, totalCards, docs, weekMinutes }
}

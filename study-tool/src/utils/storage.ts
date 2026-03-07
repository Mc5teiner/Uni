import type { AppData, StudyModule, StudyDocument, Flashcard, FlashcardDeck, CalendarEvent, StudySession, StudyGoal } from '../types'

const STORAGE_KEY = 'fernuni-study-tool-v1'

const defaultData: AppData = {
  modules: [],
  documents: [],
  flashcards: [],
  flashcardDecks: [],
  events: [],
  sessions: [],
  goals: [],
  lastUpdated: new Date().toISOString(),
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData
    return { ...defaultData, ...JSON.parse(raw) }
  } catch {
    return defaultData
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, lastUpdated: new Date().toISOString() }))
}

export function generateId(): string {
  return crypto.randomUUID()
}

// Module helpers
export function saveModule(data: AppData, module: StudyModule): AppData {
  const existing = data.modules.findIndex(m => m.id === module.id)
  const modules = existing >= 0
    ? data.modules.map(m => m.id === module.id ? module : m)
    : [...data.modules, module]
  return { ...data, modules }
}

export function deleteModule(data: AppData, moduleId: string): AppData {
  return {
    ...data,
    modules: data.modules.filter(m => m.id !== moduleId),
    documents: data.documents.filter(d => d.moduleId !== moduleId),
    flashcards: data.flashcards.filter(f => f.moduleId !== moduleId),
    flashcardDecks: data.flashcardDecks.filter(f => f.moduleId !== moduleId),
    events: data.events.filter(e => e.moduleId !== moduleId),
    sessions: data.sessions.filter(s => s.moduleId !== moduleId),
  }
}

// Document helpers
export function saveDocument(data: AppData, doc: StudyDocument): AppData {
  const existing = data.documents.findIndex(d => d.id === doc.id)
  const documents = existing >= 0
    ? data.documents.map(d => d.id === doc.id ? doc : d)
    : [...data.documents, doc]
  return { ...data, documents }
}

export function deleteDocument(data: AppData, docId: string): AppData {
  return { ...data, documents: data.documents.filter(d => d.id !== docId) }
}

// Flashcard helpers
export function saveFlashcard(data: AppData, card: Flashcard): AppData {
  const existing = data.flashcards.findIndex(f => f.id === card.id)
  const flashcards = existing >= 0
    ? data.flashcards.map(f => f.id === card.id ? card : f)
    : [...data.flashcards, card]
  return { ...data, flashcards }
}

export function deleteFlashcard(data: AppData, cardId: string): AppData {
  return { ...data, flashcards: data.flashcards.filter(f => f.id !== cardId) }
}

export function saveDeck(data: AppData, deck: FlashcardDeck): AppData {
  const existing = data.flashcardDecks.findIndex(d => d.id === deck.id)
  const flashcardDecks = existing >= 0
    ? data.flashcardDecks.map(d => d.id === deck.id ? deck : d)
    : [...data.flashcardDecks, deck]
  return { ...data, flashcardDecks }
}

// Event helpers
export function saveEvent(data: AppData, event: CalendarEvent): AppData {
  const existing = data.events.findIndex(e => e.id === event.id)
  const events = existing >= 0
    ? data.events.map(e => e.id === event.id ? event : e)
    : [...data.events, event]
  return { ...data, events }
}

export function deleteEvent(data: AppData, eventId: string): AppData {
  return { ...data, events: data.events.filter(e => e.id !== eventId) }
}

// Session helpers
export function saveSession(data: AppData, session: StudySession): AppData {
  return { ...data, sessions: [...data.sessions, session] }
}

// Goal helpers
export function saveGoal(data: AppData, goal: StudyGoal): AppData {
  const existing = data.goals.findIndex(g => g.id === goal.id)
  const goals = existing >= 0
    ? data.goals.map(g => g.id === goal.id ? goal : g)
    : [...data.goals, goal]
  return { ...data, goals }
}

export function deleteGoal(data: AppData, goalId: string): AppData {
  return { ...data, goals: data.goals.filter(g => g.id !== goalId) }
}

// Export / Import
export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fernuni-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importData(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        resolve({ ...defaultData, ...data })
      } catch {
        reject(new Error('Ungültige Backup-Datei'))
      }
    }
    reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'))
    reader.readAsText(file)
  })
}

import type { Flashcard, FlashcardDifficulty } from '../types'
import { addDays, format } from 'date-fns'

/**
 * SM-2 Spaced Repetition Algorithm
 * q = quality of response (0-5)
 * EF = ease factor (>= 1.3)
 * n = repetition number
 * I = interval in days
 */
export function applyReview(card: Flashcard, quality: FlashcardDifficulty): Flashcard {
  let { interval, repetitions, easeFactor } = card

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1
  } else {
    // Incorrect – restart
    repetitions = 0
    interval = 1
  }

  // Update ease factor
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

  const dueDate = format(addDays(new Date(), interval), 'yyyy-MM-dd')

  return {
    ...card,
    interval,
    repetitions,
    easeFactor,
    dueDate,
    lastReviewedAt: new Date().toISOString(),
  }
}

export function getDueCards(cards: Flashcard[], moduleId?: string): Flashcard[] {
  const today = format(new Date(), 'yyyy-MM-dd')
  return cards.filter(card => {
    const matchesModule = !moduleId || card.moduleId === moduleId
    return matchesModule && card.dueDate <= today
  })
}

export function getNewCard(): Pick<Flashcard, 'interval' | 'repetitions' | 'easeFactor' | 'dueDate'> {
  return {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
  }
}

export function getDifficultyLabel(q: FlashcardDifficulty): string {
  const labels = ['Kompletter Blackout', 'Fast nichts', 'Mit Mühe falsch', 'Mit Mühe richtig', 'Kurz überlegt', 'Sofort gewusst']
  return labels[q]
}

export function getDifficultyColor(q: FlashcardDifficulty): string {
  const colors = ['bg-red-600', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-500', 'bg-green-500']
  return colors[q]
}

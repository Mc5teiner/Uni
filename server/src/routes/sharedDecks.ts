/**
 * Shared flashcard decks — a user publishes a deck, others clone it.
 *
 * Routes:
 *   GET    /api/shared-decks           — list all shared decks (metadata)
 *   GET    /api/shared-decks/:id       — deck metadata + cards
 *   POST   /api/shared-decks           — publish a new deck
 *   DELETE /api/shared-decks/:id       — delete (only owner or admin)
 *   POST   /api/shared-decks/:id/clone — clone into your own flashcards
 */
import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import {
  listSharedDecks,
  getSharedDeck,
  getSharedDeckCards,
  createSharedDeck,
  deleteSharedDeck,
  db,
} from '../db'
import { requireAuth } from '../middleware/auth'
import type { AuthenticatedRequest } from '../types'

const router = Router()

function r(req: import('express').Request): AuthenticatedRequest {
  return req as AuthenticatedRequest
}

// ─── GET /api/shared-decks ───────────────────────────────────────────────────

router.get('/', requireAuth, (_req, res) => {
  const decks = listSharedDecks()
  res.json(decks.map(d => ({
    id:          d.id,
    ownerId:     d.owner_id,
    ownerName:   d.owner_name,
    name:        d.name,
    description: d.description,
    moduleName:  d.module_name,
    cardCount:   d.card_count,
    createdAt:   d.created_at,
  })))
})

// ─── GET /api/shared-decks/:id ───────────────────────────────────────────────

router.get('/:id', requireAuth, (req, res) => {
  const deck = getSharedDeck(req.params.id as string)
  if (!deck) { res.status(404).json({ error: 'Deck nicht gefunden' }); return }

  const cards = getSharedDeckCards(deck.id)
  res.json({
    id:          deck.id,
    ownerId:     deck.owner_id,
    ownerName:   deck.owner_name,
    name:        deck.name,
    description: deck.description,
    moduleName:  deck.module_name,
    cardCount:   deck.card_count,
    createdAt:   deck.created_at,
    cards: cards.map(c => ({
      id:         c.id,
      front:      c.front,
      back:       c.back,
      frontImage: c.front_image ?? undefined,
      backImage:  c.back_image ?? undefined,
      tags:       JSON.parse(c.tags) as string[],
    })),
  })
})

// ─── POST /api/shared-decks ──────────────────────────────────────────────────

router.post('/', requireAuth, (req, res) => {
  const { name, description, moduleName, cards } = req.body as {
    name?: string
    description?: string
    moduleName?: string
    cards?: { front: string; back: string; frontImage?: string; backImage?: string; tags?: string[] }[]
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'name ist erforderlich' }); return
  }
  if (!Array.isArray(cards) || cards.length === 0) {
    res.status(400).json({ error: 'Mindestens eine Karte erforderlich' }); return
  }
  if (cards.length > 1000) {
    res.status(400).json({ error: 'Maximal 1000 Karten pro Deck' }); return
  }

  const id = uuidv4()
  const ownerId = r(req).user.sub

  createSharedDeck({
    id,
    ownerId,
    name:        name.trim(),
    description: description?.trim() || undefined,
    moduleName:  moduleName?.trim() || undefined,
    cards: cards.map(c => ({
      id:         uuidv4(),
      front:      c.front ?? '',
      back:       c.back  ?? '',
      frontImage: c.frontImage,
      backImage:  c.backImage,
      tags:       Array.isArray(c.tags) ? c.tags : [],
    })),
  })

  res.status(201).json({ id })
})

// ─── DELETE /api/shared-decks/:id ────────────────────────────────────────────

router.delete('/:id', requireAuth, (req, res) => {
  const deck = getSharedDeck(req.params.id as string)
  if (!deck) { res.status(404).json({ error: 'Deck nicht gefunden' }); return }

  const user = r(req).user
  if (deck.owner_id !== user.sub && user.role !== 'admin') {
    res.status(403).json({ error: 'Nur der Ersteller kann dieses Deck löschen' }); return
  }

  deleteSharedDeck(deck.id)
  res.json({ ok: true })
})

// ─── POST /api/shared-decks/:id/clone ────────────────────────────────────────
// Creates copies of all cards under the calling user's flashcards namespace.
// Each clone gets fresh SM-2 state; the user picks which module to assign to.

router.post('/:id/clone', requireAuth, (req, res) => {
  const deck = getSharedDeck(req.params.id as string)
  if (!deck) { res.status(404).json({ error: 'Deck nicht gefunden' }); return }

  const { moduleId } = req.body as { moduleId?: string }
  if (!moduleId || typeof moduleId !== 'string') {
    res.status(400).json({ error: 'moduleId ist erforderlich' }); return
  }

  const userId  = r(req).user.sub
  const cards   = getSharedDeckCards(deck.id)
  const today   = new Date().toISOString().slice(0, 10)
  const nowIso  = new Date().toISOString()

  // Also create a deck entry for the user
  const newDeckId = uuidv4()
  const insertData = db.prepare(
    `INSERT INTO user_data (user_id, namespace, item_id, data)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, namespace, item_id) DO UPDATE SET data = excluded.data, updated_at = unixepoch()`
  )

  db.transaction(() => {
    // Insert the deck itself
    const deckData = JSON.stringify({
      id:          newDeckId,
      moduleId,
      name:        deck.name,
      description: deck.description ?? undefined,
      createdAt:   nowIso,
    })
    insertData.run(userId, 'flashcard_decks', newDeckId, deckData)

    // Insert each card with fresh SM-2 state
    for (const c of cards) {
      const cardId   = uuidv4()
      const cardData = JSON.stringify({
        id:             cardId,
        moduleId,
        front:          c.front,
        back:           c.back,
        frontImage:     c.front_image ?? undefined,
        backImage:      c.back_image ?? undefined,
        tags:           JSON.parse(c.tags),
        interval:       0,
        repetitions:    0,
        easeFactor:     2.5,
        dueDate:        today,
        createdAt:      nowIso,
      })
      insertData.run(userId, 'flashcards', cardId, cardData)
    }
  })()

  res.status(201).json({ ok: true, deckId: newDeckId, cardCount: cards.length })
})

export default router

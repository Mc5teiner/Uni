/**
 * Anki Import / Export
 *
 * Format: Anki "Notes in Plain Text" (.txt)
 *   #separator:tab
 *   #html:true
 *   #tags column:3
 *
 *   Front<TAB>Back<TAB>tag1 tag2
 *
 * Compatible with: Anki 2.1+ (File → Import)
 * Export from Anki: File → Export → "Notes in Plain Text (.txt)", include tags
 */

import type { Flashcard } from '../types'

// ── HTML helpers ──────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}

function unescHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
}

/** Strip all HTML tags, keeping inner text */
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '')
}

/** Extract the first data-URL <img src="…"> from an HTML string */
function extractImgSrc(html: string): string | undefined {
  const m = html.match(/<img[^>]+src="(data:[^"]+)"/)
  return m?.[1]
}

/** Remove <img> tags from HTML string */
function removeImgTags(html: string): string {
  return html.replace(/<img[^>]*>/gi, '')
}

// ── Export ────────────────────────────────────────────────────────────────────

export interface ExportOptions {
  /** Module-number tag prefix, e.g. "FernUni" → tag "FernUni::31041" */
  tagPrefix?: string
  /** Include base64 images as embedded data-URLs (increases file size) */
  includeImages?: boolean
}

/**
 * Export flashcards as an Anki-compatible tab-separated text file.
 * The returned string should be downloaded as a .txt file.
 */
export function exportToAnkiTxt(
  cards: Flashcard[],
  moduleMap: Record<string, { name: string; moduleNumber: string }>,
  opts: ExportOptions = {},
): string {
  const { includeImages = true } = opts

  const lines: string[] = [
    '#separator:tab',
    '#html:true',
    '#tags column:3',
    '# Exportiert von FernUni Study Organizer',
    '# Importieren in Anki: Datei → Importieren → diese Datei auswählen',
    '',
  ]

  for (const card of cards) {
    const mod = moduleMap[card.moduleId]

    // ─ Front
    let front = escHtml(card.front)
    if (includeImages && card.frontImage) {
      front += `<br><img src="${card.frontImage}">`
    }

    // ─ Back
    let back = escHtml(card.back)
    if (includeImages && card.backImage) {
      back += `<br><img src="${card.backImage}">`
    }

    // ─ Tags: user tags + module number tag
    const tags: string[] = card.tags.map(t => t.replace(/\s+/g, '_'))
    if (mod?.moduleNumber) {
      tags.push(mod.moduleNumber.replace(/\s+/g, '_'))
    }

    // Remove tab characters from fields (would break the format)
    const safeF = front.replace(/\t/g, '    ')
    const safeB = back.replace(/\t/g, '    ')
    const tagStr = tags.join(' ')

    lines.push(`${safeF}\t${safeB}\t${tagStr}`)
  }

  return lines.join('\n')
}

/** Trigger a browser download of the export file */
export function downloadAnkiExport(
  cards: Flashcard[],
  moduleMap: Record<string, { name: string; moduleNumber: string }>,
  opts: ExportOptions = {},
): void {
  const content = exportToAnkiTxt(cards, moduleMap, opts)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `anki-karteikarten-${new Date().toISOString().slice(0, 10)}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Import ────────────────────────────────────────────────────────────────────

export interface ImportedCard {
  front:       string
  back:        string
  tags:        string[]
  frontImage?: string
  backImage?:  string
  /** Module number extracted from tags, if any matched a known module */
  detectedModuleNumber?: string
}

export interface ImportResult {
  cards:    ImportedCard[]
  skipped:  number
  warnings: string[]
}

/**
 * Parse an Anki plain-text export (.txt) and return card data.
 * Supports both the app's own exports and native Anki exports.
 */
export async function parseAnkiTxt(file: File): Promise<ImportResult> {
  const text = await file.text()
  const rawLines = text.split(/\r?\n/)

  // ─ Parse header directives
  let separator = '\t'
  let isHtml    = false
  let tagsCol   = 2   // default: 3rd column (0-indexed)

  const dataLines: string[] = []

  for (const line of rawLines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#separator:')) {
      const val = trimmed.slice('#separator:'.length).trim()
      separator = val === 'tab' ? '\t' : val === 'semicolon' ? ';' : val
    } else if (trimmed.startsWith('#html:')) {
      isHtml = trimmed.includes('true')
    } else if (trimmed.startsWith('#tags column:')) {
      tagsCol = parseInt(trimmed.slice('#tags column:'.length).trim(), 10) - 1
    } else if (trimmed.startsWith('#')) {
      // other comment / directive — ignore
    } else if (trimmed) {
      dataLines.push(line)
    }
  }

  const cards: ImportedCard[]  = []
  const warnings: string[]     = []
  let skipped = 0

  for (let i = 0; i < dataLines.length; i++) {
    const parts = dataLines[i].split(separator)

    if (parts.length < 2) {
      skipped++
      continue
    }

    let frontRaw = parts[0] ?? ''
    let backRaw  = parts[1] ?? ''
    const tagsRaw = tagsCol < parts.length ? (parts[tagsCol] ?? '') : ''

    // ─ Extract images before stripping HTML
    let frontImage: string | undefined
    let backImage:  string | undefined

    if (isHtml) {
      frontImage = extractImgSrc(frontRaw)
      backImage  = extractImgSrc(backRaw)
      // Remove img tags, then decode HTML to plain text
      frontRaw = unescHtml(removeImgTags(frontRaw))
      backRaw  = unescHtml(removeImgTags(backRaw))
    } else {
      // Plain text — just strip any stray HTML (shouldn't be any)
      frontRaw = stripTags(frontRaw).trim()
      backRaw  = stripTags(backRaw).trim()
    }

    const front = frontRaw.trim()
    const back  = backRaw.trim()

    if (!front || !back) {
      skipped++
      continue
    }

    // ─ Tags: split on whitespace, filter empty
    const tags = tagsRaw
      .split(/\s+/)
      .map(t => t.replace(/_/g, ' ').trim())
      .filter(Boolean)

    // ─ Detect module number from tags (pattern: digits, 5 chars like "31041")
    const moduleNumberPattern = /^\d{5}$/
    const detectedModuleNumber = tags.find(t => moduleNumberPattern.test(t.replace(/\s/g, '')))
    const cleanTags = tags.filter(t => !moduleNumberPattern.test(t.replace(/\s/g, '')))

    cards.push({
      front,
      back,
      tags:        cleanTags,
      frontImage,
      backImage,
      detectedModuleNumber,
    })
  }

  if (warnings.length === 0 && cards.length === 0) {
    warnings.push('Keine gültigen Karten in der Datei gefunden.')
  }

  return { cards, skipped, warnings }
}

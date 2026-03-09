/**
 * Minimal CalDAV client — no heavy dependencies.
 * Uses REPORT (calendar-query) over Basic Auth, then parses VEVENT from iCalendar.
 */
import type { CaldavEvent } from '../types'

// ─── iCal helpers ────────────────────────────────────────────────────────────

/** Unfold iCal lines (RFC 5545 §3.1) */
function unfold(ical: string): string {
  return ical.replace(/\r?\n[ \t]/g, '')
}

function icalProp(block: string, name: string): string | undefined {
  // Match PROPNAME or PROPNAME;PARAM=...: VALUE
  const re = new RegExp(`^${name}(?:;[^:]*)?:(.+)$`, 'm')
  return block.match(re)?.[1]?.trim()
}

/** Convert iCal DTSTART / DTEND to { date, time? } */
function parseIcalDt(value: string | undefined): { date: string; time?: string } | null {
  if (!value) return null
  // DATE-TIME: 20251012T083000Z or 20251012T083000
  // DATE only: 20251012
  const dt = value.replace(/Z$/, '')
  if (dt.length >= 15 && dt[8] === 'T') {
    const date = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`
    const time = `${dt.slice(9, 11)}:${dt.slice(11, 13)}`
    return { date, time }
  }
  if (dt.length === 8) {
    return { date: `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` }
  }
  return null
}

function parseVEvents(ical: string): CaldavEvent[] {
  const events: CaldavEvent[] = []
  const unfolded = unfold(ical)
  const blocks = unfolded.split(/BEGIN:VEVENT/)
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0]
    const uid     = icalProp(block, 'UID')
    const summary = icalProp(block, 'SUMMARY')
    const dtstart = parseIcalDt(icalProp(block, 'DTSTART'))
    const dtend   = parseIcalDt(icalProp(block, 'DTEND'))
    const desc    = icalProp(block, 'DESCRIPTION')?.replace(/\\n/g, '\n').replace(/\\,/g, ',')
    if (!uid || !dtstart) continue
    events.push({
      uid,
      title: summary ?? '(Kein Titel)',
      date: dtstart.date,
      time: dtstart.time,
      endTime: dtend?.time,
      description: desc,
    })
  }
  return events
}

// ─── CalDAV REPORT ───────────────────────────────────────────────────────────

function basicAuth(username: string, password: string): string {
  return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
}

/** Extract calendar-data values from a multistatus XML response */
function extractCalendarData(xml: string): string[] {
  const matches: string[] = []
  const re = /<(?:[^:>]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?calendar-data>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    // Decode XML entities
    matches.push(m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
  }
  return matches
}

const REPORT_BODY = `<?xml version="1.0" encoding="utf-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag/>
    <c:calendar-data/>
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT"/>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`

export async function fetchCalendarEvents(settings: {
  server_url: string
  username: string
  password: string
  calendar_url?: string | null
}): Promise<CaldavEvent[]> {
  const calUrl = settings.calendar_url || settings.server_url
  const auth   = basicAuth(settings.username, settings.password)

  const res = await fetch(calUrl, {
    method: 'REPORT',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/xml; charset=utf-8',
      Depth: '1',
      Accept: 'text/xml',
    },
    body: REPORT_BODY,
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    throw new Error(`CalDAV REPORT fehlgeschlagen: ${res.status} ${res.statusText}`)
  }

  const xml    = await res.text()
  const icals  = extractCalendarData(xml)
  const events = icals.flatMap(parseVEvents)
  return events
}

/** PROPFIND to discover calendar-home-set URL */
export async function discoverCalendarUrl(
  serverUrl: string,
  username: string,
  password: string
): Promise<string | null> {
  const auth = basicAuth(username, password)
  const body = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <c:calendar-home-set/>
    <d:current-user-principal/>
  </d:prop>
</d:propfind>`

  try {
    const res = await fetch(serverUrl, {
      method: 'PROPFIND',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/xml',
        Depth: '0',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const xml = await res.text()
    // Extract calendar-home-set href
    const m = xml.match(/<(?:[^:>]+:)?calendar-home-set[^>]*>\s*<(?:[^:>]+:)?href[^>]*>([^<]+)</)
    return m ? m[1].trim() : null
  } catch {
    return null
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function sendNotification(title: string, body: string, tag?: string): void {
  if (Notification.permission !== 'granted') return
  new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag,
    badge: '/favicon.ico',
  })
}

export function scheduleStudyReminder(minutesFromNow: number, moduleTitle: string): void {
  setTimeout(() => {
    sendNotification(
      'Lernzeit!',
      `Zeit für ${moduleTitle} – du hast einen Lernblock geplant.`,
      'study-reminder'
    )
  }, minutesFromNow * 60 * 1000)
}

// ─── Smart daily reminders ────────────────────────────────────────────────────

const LAST_NOTIFIED_KEY = 'studyreminder_last_notified'
const COOLDOWN_MS       = 12 * 60 * 60 * 1000  // 12 hours between checks

function canNotify(tag: string): boolean {
  if (Notification.permission !== 'granted') return false
  try {
    const stored = JSON.parse(localStorage.getItem(LAST_NOTIFIED_KEY) ?? '{}') as Record<string, number>
    const last   = stored[tag] ?? 0
    return Date.now() - last > COOLDOWN_MS
  } catch { return true }
}

function markNotified(tag: string): void {
  try {
    const stored = JSON.parse(localStorage.getItem(LAST_NOTIFIED_KEY) ?? '{}') as Record<string, number>
    stored[tag]  = Date.now()
    localStorage.setItem(LAST_NOTIFIED_KEY, JSON.stringify(stored))
  } catch { /* ignore */ }
}

export interface ReminderContext {
  dueCards:     number
  upcomingExams: { title: string; daysUntil: number }[]
}

export function checkAndSendReminders(ctx: ReminderContext): void {
  if (Notification.permission !== 'granted') return

  // Due flashcards
  if (ctx.dueCards > 0 && canNotify('due-cards')) {
    sendNotification(
      `${ctx.dueCards} Karteikarte${ctx.dueCards > 1 ? 'n' : ''} fällig`,
      'Deine Wiederholungen warten auf dich. Jetzt kurz lernen!',
      'due-cards'
    )
    markNotified('due-cards')
  }

  // Exams within 7 days
  for (const exam of ctx.upcomingExams) {
    if (exam.daysUntil <= 7) {
      const tag = `exam-${exam.title}`
      if (canNotify(tag)) {
        const when = exam.daysUntil === 0 ? 'Heute!' : exam.daysUntil === 1 ? 'Morgen!' : `in ${exam.daysUntil} Tagen`
        sendNotification(
          `Prüfung ${when}`,
          exam.title,
          tag
        )
        markNotified(tag)
      }
    }
  }
}

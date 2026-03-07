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
      'Lernzeit! 📚',
      `Zeit für ${moduleTitle} – du hast einen Lernblock geplant.`,
      'study-reminder'
    )
  }, minutesFromNow * 60 * 1000)
}

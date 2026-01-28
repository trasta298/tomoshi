// Generate unique ID
export function generateId(): string {
  return crypto.randomUUID()
}

// Get today's date string (YYYY-MM-DD)
export function getTodayDate(timezone = 'Asia/Tokyo'): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: timezone })
}

// Parse date string to Date object
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

// Format time for display (HH:mm)
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

// Check if date is today
export function isToday(dateStr: string, timezone = 'Asia/Tokyo'): boolean {
  return dateStr === getTodayDate(timezone)
}

// Get days between two dates
export function daysBetween(date1: string, date2: string): number {
  const d1 = parseDate(date1)
  const d2 = parseDate(date2)
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

// Get last N days as array of date strings
export function getLastNDays(n: number, timezone = 'Asia/Tokyo'): string[] {
  const days: string[] = []
  const today = new Date()

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('sv-SE', { timeZone: timezone }))
  }

  return days
}

// Session token generation
export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

// Cookie parsing
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...v] = c.trim().split('=')
      return [key, v.join('=')]
    })
  )
}

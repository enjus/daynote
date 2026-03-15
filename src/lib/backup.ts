const KEY = 'daynote-last-backup'
const THRESHOLD_DAYS = 30

export function daysSinceBackup(): number | null {
  const last = localStorage.getItem(KEY)
  if (!last) return null
  return Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000)
}

export function recordBackup() {
  localStorage.setItem(KEY, new Date().toISOString())
}

export function shouldPromptBackup(): boolean {
  const days = daysSinceBackup()
  return days === null || days >= THRESHOLD_DAYS
}

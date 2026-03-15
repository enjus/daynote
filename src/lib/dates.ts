import { format, parse, addDays, subDays } from 'date-fns'
import { TZDate } from '@date-fns/tz'

function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function getTimezone(): string {
  return localStorage.getItem('daynote-timezone') ?? getBrowserTimezone()
}

export function setTimezone(tz: string): void {
  localStorage.setItem('daynote-timezone', tz)
}

export function getToday(): string {
  const now = new TZDate(new Date(), getTimezone())
  return format(now, 'yyyy-MM-dd')
}

export function formatDateTitle(dateKey: string): string {
  const date = parse(dateKey, 'yyyy-MM-dd', new Date())
  return format(date, 'EEEE, MMMM d, yyyy')
}

export function dateKeyToPath(dateKey: string): string {
  return dateKey.replace(/-/g, '/')
}

export function pathToDateKey(path: string): string {
  return path.replace(/\//g, '-')
}

export function getNextDay(dateKey: string): string {
  const date = parse(dateKey, 'yyyy-MM-dd', new Date())
  return format(addDays(date, 1), 'yyyy-MM-dd')
}

export function getPrevDay(dateKey: string): string {
  const date = parse(dateKey, 'yyyy-MM-dd', new Date())
  return format(subDays(date, 1), 'yyyy-MM-dd')
}

export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split('-').map(Number)
  return { year, month, day }
}

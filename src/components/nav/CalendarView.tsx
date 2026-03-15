import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { dateKeyToPath, getMonthRange, parseDateKey } from '../../lib/dates'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday } from 'date-fns'

interface CalendarViewProps {
  currentDateKey: string
  onClose: () => void
}

export function CalendarView({ currentDateKey, onClose }: CalendarViewProps) {
  const navigate = useNavigate()
  const { year, month } = parseDateKey(currentDateKey)
  const [viewYear, setViewYear] = useState(year)
  const [viewMonth, setViewMonth] = useState(month)
  const [noteDates, setNoteDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    const { start, end } = getMonthRange(viewYear, viewMonth)
    api.getNotesInRange(start, end).then((notes) => {
      setNoteDates(new Set(notes.map((n) => n.date_key)))
    }).catch(console.error)
  }, [viewYear, viewMonth])

  const weeks = useMemo(() => {
    const monthStart = new Date(viewYear, viewMonth - 1, 1)
    const monthEnd = endOfMonth(monthStart)
    const calStart = startOfWeek(startOfMonth(monthStart))
    const calEnd = endOfWeek(monthEnd)

    const rows: Date[][] = []
    let day = calStart
    while (day <= calEnd) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(day)
        day = addDays(day, 1)
      }
      rows.push(week)
    }
    return rows
  }, [viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1)
      setViewMonth(12)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1)
      setViewMonth(1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  function handleDayClick(date: Date) {
    const key = format(date, 'yyyy-MM-dd')
    navigate(`/${dateKeyToPath(key)}`)
    onClose()
  }

  const refDate = new Date(viewYear, viewMonth - 1, 1)

  return (
    <div className="p-4 max-w-xs">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={prevMonth} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3l-5 5 5 5"/></svg>
        </button>
        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {format(refDate, 'MMMM yyyy')}
        </span>
        <button type="button" onClick={nextMonth} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0 text-center text-xs text-neutral-500 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-0">
          {week.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const inMonth = isSameMonth(day, refDate)
            const hasNote = noteDates.has(key)
            const today = isToday(day)
            const selected = key === currentDateKey

            return (
              <button
                type="button"
                key={key}
                onClick={() => handleDayClick(day)}
                className={`
                  relative py-1.5 text-xs rounded
                  ${inMonth ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-300 dark:text-neutral-600'}
                  ${selected ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : ''}
                  ${today && !selected ? 'font-bold' : ''}
                  hover:bg-neutral-100 dark:hover:bg-neutral-800
                  ${selected ? 'hover:bg-neutral-900 dark:hover:bg-neutral-100' : ''}
                `}
              >
                {format(day, 'd')}
                {hasNote && !selected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { dateKeyToPath, formatDateTitle } from '../../lib/dates'

interface DayNavProps {
  dateKey: string
}

export function DayNav({ dateKey }: DayNavProps) {
  const navigate = useNavigate()
  const [prevDate, setPrevDate] = useState<string | null>(null)
  const [nextDate, setNextDate] = useState<string | null>(null)

  useEffect(() => {
    api.getAdjacentDate(dateKey, 'prev').then(setPrevDate).catch(() => setPrevDate(null))
    api.getAdjacentDate(dateKey, 'next').then(setNextDate).catch(() => setNextDate(null))
  }, [dateKey])

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => prevDate && navigate(`/${dateKeyToPath(prevDate)}`)}
        disabled={!prevDate}
        className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-default"
        aria-label="Previous note"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 4l-6 6 6 6" />
        </svg>
      </button>

      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 text-center">
        {formatDateTitle(dateKey)}
      </h1>

      <button
        type="button"
        onClick={() => nextDate && navigate(`/${dateKeyToPath(nextDate)}`)}
        disabled={!nextDate}
        className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-default"
        aria-label="Next note"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 4l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}

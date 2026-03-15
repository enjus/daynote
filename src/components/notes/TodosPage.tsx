import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCrypto } from '../../hooks/useCrypto'
import { useTodos, type TodoItem } from '../../hooks/useTodos'
import { dateKeyToPath, formatDateTitle } from '../../lib/dates'

export function TodosPage() {
  const { masterKey } = useCrypto()
  const { todos, loading, load, toggleTodo } = useTodos(masterKey)
  const navigate = useNavigate()
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    load()
  }, [load])

  const unchecked = todos.filter((t) => !t.checked)
  const checked = todos.filter((t) => t.checked)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4l-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">To-dos</h1>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ml-auto p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 disabled:opacity-40"
          aria-label="Refresh"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'animate-spin' : ''}>
            <path d="M14 8A6 6 0 1 1 8 2" />
            <path d="M14 2v4h-4" />
          </svg>
        </button>
      </div>

      {loading && todos.length === 0 && (
        <p className="text-sm text-neutral-500">Scanning notes...</p>
      )}

      {!loading && todos.length === 0 && (
        <p className="text-sm text-neutral-400">No to-dos found. Add checkboxes to any note with <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">- [ ] text</code>.</p>
      )}

      {todos.length > 0 && (
        <>
          {unchecked.length === 0 ? (
            <p className="text-sm text-neutral-400 mb-8">All done.</p>
          ) : (
            <ul className="space-y-3 mb-8">
              {unchecked.map((todo, i) => (
                <TodoRow key={`${todo.dateKey}-${todo.indexInNote}-${i}`} todo={todo} onToggle={toggleTodo} />
              ))}
            </ul>
          )}

          {checked.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-2 text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3 hover:text-neutral-700 dark:hover:text-neutral-300"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  {showDone ? <path d="M2 4l4 4 4-4" /> : <path d="M4 2l4 4-4 4" />}
                </svg>
                Done ({checked.length})
              </button>
              {showDone && (
                <ul className="space-y-3">
                  {checked.map((todo, i) => (
                    <TodoRow key={`${todo.dateKey}-${todo.indexInNote}-${i}`} todo={todo} onToggle={toggleTodo} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TodoRow({
  todo,
  onToggle,
}: {
  todo: TodoItem
  onToggle: (dateKey: string, indexInNote: number, newChecked: boolean) => void
}) {
  return (
    <li className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => onToggle(todo.dateKey, todo.indexInNote, !todo.checked)}
        className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
          todo.checked
            ? 'bg-neutral-400 border-neutral-400 dark:bg-neutral-500 dark:border-neutral-500'
            : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-500 dark:hover:border-neutral-400'
        }`}
        aria-label={todo.checked ? 'Mark incomplete' : 'Mark complete'}
      >
        {todo.checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${todo.checked ? 'line-through text-neutral-400 dark:text-neutral-500' : 'text-neutral-800 dark:text-neutral-200'}`}>
          {todo.text}
        </span>
        <Link
          to={`/${dateKeyToPath(todo.dateKey)}`}
          className="block text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 mt-0.5"
        >
          {formatDateTitle(todo.dateKey)}
        </Link>
      </div>
    </li>
  )
}

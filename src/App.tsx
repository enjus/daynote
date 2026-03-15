import { useState, useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from 'react-router-dom'
import { CryptoProvider, useCrypto } from './hooks/useCrypto'
import { useTags } from './hooks/useTags'
import { SetupScreen } from './components/auth/SetupScreen'
import { UnlockScreen } from './components/auth/UnlockScreen'
import { DayPage } from './components/notes/DayPage'
import { TagPage } from './components/notes/TagPage'
import { TodosPage } from './components/notes/TodosPage'
import { CalendarView } from './components/nav/CalendarView'
import { SearchDialog } from './components/nav/SearchDialog'
import { ExportDialog } from './components/notes/ExportDialog'
import { getToday, dateKeyToPath } from './lib/dates'
import { warmUpCache, clearCache } from './lib/search'
import { shouldPromptBackup, daysSinceBackup } from './lib/backup'

function AppContent() {
  const { isSetup, isUnlocked, lock, masterKey } = useCrypto()
  const { tags, removeTag } = useTags(masterKey)
  const [showCalendar, setShowCalendar] = useState(false)

  // Pre-warm search cache after unlock; clear it on lock
  useEffect(() => {
    if (masterKey) warmUpCache(masterKey)
    else clearCache()
  }, [masterKey])

  // Cmd+K / Ctrl+K opens search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  const [showSearch, setShowSearch] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [backupDismissed, setBackupDismissed] = useState(false)
  const showBackupBanner = isUnlocked && !backupDismissed && shouldPromptBackup()

  if (isSetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-sm text-neutral-500">Loading...</div>
      </div>
    )
  }

  if (!isSetup) return <SetupScreen />
  if (!isUnlocked) return <UnlockScreen />

  const todayPath = dateKeyToPath(getToday())

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur">
          <Link
            to={`/${todayPath}`}
            className="text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Daynote
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              aria-label="Search"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="8" cy="8" r="5.5" />
                <path d="M12 12l4 4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
              aria-label="Calendar"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="14" height="13" rx="2" />
                <path d="M2 7h14M6 1v4M12 1v4" />
              </svg>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                aria-label="Menu"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <circle cx="9" cy="4" r="1.5" />
                  <circle cx="9" cy="9" r="1.5" />
                  <circle cx="9" cy="14" r="1.5" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50">
                  <button
                    type="button"
                    onClick={() => { setShowTags(true); setShowMenu(false) }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 lg:hidden"
                  >
                    Tags
                  </button>
                  <Link
                    to="/todos"
                    onClick={() => setShowMenu(false)}
                    className="block px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                  >
                    To-dos
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setShowExport(true); setShowMenu(false) }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                  >
                    Export notes
                  </button>
                  <button
                    type="button"
                    onClick={() => { lock(); setShowMenu(false) }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                  >
                    Lock
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Backup nudge banner */}
        {showBackupBanner && (
          <div className={`flex items-center justify-between gap-4 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 lg:transition-all lg:duration-200 ${sidebarOpen ? 'lg:ml-48' : 'lg:ml-10'}`}>
            <span>
              {daysSinceBackup() === null
                ? "You haven't backed up your notes yet."
                : `It's been ${daysSinceBackup()} days since your last backup.`}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setShowExport(true); setBackupDismissed(true) }}
                className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
              >
                Export now
              </button>
              <button
                type="button"
                onClick={() => setBackupDismissed(true)}
                className="text-amber-600 dark:text-amber-500 hover:text-amber-800 dark:hover:text-amber-300"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Calendar popover */}
        {showCalendar && (
          <div className="absolute right-4 top-12 z-50 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700">
            <CalendarView
              currentDateKey={getToday()}
              onClose={() => setShowCalendar(false)}
            />
          </div>
        )}

        {/* Tags sidebar — hidden on mobile, collapsible on desktop */}
        <div className={`hidden lg:block fixed left-0 top-12 bottom-0 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto transition-all duration-200 ${sidebarOpen ? 'w-48' : 'w-10'}`}>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-3 right-2 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen
                ? <path d="M9 2L4 7l5 5"/>
                : <path d="M5 2l5 5-5 5"/>}
            </svg>
          </button>
          {sidebarOpen && (
            <div className="p-4">
              <Link
                to="/todos"
                className="block text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mb-4"
              >
                To-dos
              </Link>
              <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                Tags
              </h3>
              {tags.length === 0 && (
                <p className="text-xs text-neutral-400">No tags yet</p>
              )}
              {tags.map((tag) => (
                <div key={tag.id} className="group flex items-center justify-between py-1">
                  <Link
                    to={`/tags/${encodeURIComponent(tag.name)}`}
                    className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 truncate"
                  >
                    #{tag.name}
                  </Link>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                    {tag.count > 0 && (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 group-hover:hidden">
                        {tag.count}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeTag(tag.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-neutral-400 hover:text-red-500 dark:hover:text-red-400"
                      aria-label={`Delete tag ${tag.name}`}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 2l8 8M10 2l-8 8"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <main className={`lg:transition-all lg:duration-200 ${sidebarOpen ? 'lg:ml-48' : 'lg:ml-10'}`}>
          <Routes>
            <Route path="/:year/:month/:day" element={<DayPage />} />
            <Route path="/tags/:tagName" element={<TagPage />} />
            <Route path="/todos" element={<TodosPage />} />
            <Route
              path="*"
              element={<Navigate to={`/${todayPath}`} replace />}
            />
          </Routes>
        </main>

        {/* Modals */}
        {showSearch && <SearchDialog onClose={() => setShowSearch(false)} />}
        {showExport && (
          <ExportDialog
            onClose={() => setShowExport(false)}
            currentDateKey={getToday()}
          />
        )}
        {showTags && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/50 lg:hidden" onClick={() => setShowTags(false)}>
            <div
              className="w-full bg-white dark:bg-neutral-900 rounded-t-xl border-t border-neutral-200 dark:border-neutral-700 p-6 max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-4">Tags</h2>
              {tags.length === 0 && (
                <p className="text-sm text-neutral-400">No tags yet</p>
              )}
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <Link
                    to={`/tags/${encodeURIComponent(tag.name)}`}
                    className="text-sm text-neutral-700 dark:text-neutral-300"
                    onClick={() => setShowTags(false)}
                  >
                    #{tag.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    {tag.count > 0 && (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        {tag.count}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeTag(tag.id)}
                      className="p-1.5 rounded text-neutral-400 hover:text-red-500 dark:hover:text-red-400"
                      aria-label={`Delete tag ${tag.name}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 2l8 8M10 2l-8 8"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </BrowserRouter>
  )
}

function App() {
  return (
    <CryptoProvider>
      <AppContent />
    </CryptoProvider>
  )
}

export default App

import { useState } from 'react'
import { useCrypto } from '../../hooks/useCrypto'

export function UnlockScreen() {
  const { unlock, unlockWithRecovery } = useCrypto()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [useRecovery, setUseRecovery] = useState(false)

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const success = useRecovery
        ? await unlockWithRecovery(password)
        : await unlock(password)
      if (!success) {
        setError(
          useRecovery ? 'Invalid recovery key' : 'Incorrect password'
        )
      }
    } catch {
      setError('Failed to unlock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
      <form onSubmit={handleUnlock} className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Daynote
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {useRecovery
              ? 'Enter your recovery key to unlock.'
              : 'Enter your password to unlock.'}
          </p>
        </div>

        <div>
          <input
            type={useRecovery ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder={useRecovery ? 'Recovery key' : 'Password'}
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>

        <button
          type="button"
          onClick={() => {
            setUseRecovery(!useRecovery)
            setPassword('')
            setError('')
          }}
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          {useRecovery ? 'Use password instead' : 'Use recovery key'}
        </button>
      </form>
    </div>
  )
}

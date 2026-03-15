import { useState } from 'react'
import { useCrypto } from '../../hooks/useCrypto'

type Step = 'password' | 'recovery'

export function SetupScreen() {
  const { setup, generateRecoveryKey } = useCrypto()
  const [step, setStep] = useState<Step>('password')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    // Generate recovery key now and show it before any crypto work
    setRecoveryKey(generateRecoveryKey())
    setStep('recovery')
  }

  async function handleConfirmRecovery() {
    setLoading(true)
    try {
      await setup(password, recoveryKey)
      // useCrypto will set isUnlocked, transitioning away from this screen
    } catch (err) {
      setError(String(err))
      setStep('password')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'recovery') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              Save your recovery key
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              This is the only way to recover your notes if you forget your
              password. Store it somewhere safe — it will not be shown again.
            </p>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <code className="text-sm break-all text-amber-900 dark:text-amber-100 select-all">
              {recoveryKey}
            </code>
          </div>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(recoveryKey)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="btn-secondary"
          >
            {copied ? 'Copied' : 'Copy to clipboard'}
          </button>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="button"
            onClick={handleConfirmRecovery}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Creating vault...' : "I've saved my recovery key"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-950">
      <form onSubmit={handlePasswordSubmit} className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Daynote
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Set a password to encrypt your notes.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
            >
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button type="submit" className="btn-primary w-full">
          Continue
        </button>
      </form>
    </div>
  )
}

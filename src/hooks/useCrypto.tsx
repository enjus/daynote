import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import {
  deriveKeyFromPassword,
  deriveKeyFromRecovery,
  generateSalt,
  generateRecoveryKey,
  generateMasterKey,
  wrapMasterKey,
  unwrapMasterKey,
  saveKeyToSession,
  loadKeyFromSession,
  clearKeyFromSession,
} from '../lib/crypto'
import { api, type SettingsResponse } from '../lib/api'

interface CryptoState {
  isSetup: boolean | null // null = loading
  isUnlocked: boolean
  masterKey: CryptoKey | null
  unlock: (password: string) => Promise<boolean>
  unlockWithRecovery: (recoveryKey: string) => Promise<boolean>
  setup: (password: string, recoveryKey: string) => Promise<void>
  generateRecoveryKey: () => string
  lock: () => void
}

const CryptoContext = createContext<CryptoState | null>(null)

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [isSetup, setIsSetup] = useState<boolean | null>(null)
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null)
  const [settings, setSettings] = useState<SettingsResponse | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const s = await api.getSettings()
        setSettings(s)
        setIsSetup(s !== null)
        if (s !== null) {
          const sessionKey = await loadKeyFromSession()
          if (sessionKey) setMasterKey(sessionKey)
        }
      } catch {
        setIsSetup(false)
      }
    }
    init()
  }, [])

  const unlock = useCallback(
    async (password: string): Promise<boolean> => {
      if (!settings) return false
      try {
        const wrappingKey = await deriveKeyFromPassword(password, settings.salt)
        const key = await unwrapMasterKey(
          settings.wrapped_master_key,
          settings.wrapped_master_key_iv,
          wrappingKey
        )
        setMasterKey(key)
        await saveKeyToSession(key)
        return true
      } catch {
        return false
      }
    },
    [settings]
  )

  const unlockWithRecovery = useCallback(
    async (recoveryKey: string): Promise<boolean> => {
      if (!settings) return false
      try {
        const wrappingKey = await deriveKeyFromRecovery(
          recoveryKey,
          settings.recovery_salt
        )
        const key = await unwrapMasterKey(
          settings.wrapped_master_key_recovery,
          settings.wrapped_master_key_recovery_iv,
          wrappingKey
        )
        setMasterKey(key)
        await saveKeyToSession(key)
        return true
      } catch {
        return false
      }
    },
    [settings]
  )

  const setup = useCallback(async (password: string, recoveryKey: string): Promise<void> => {
    const salt = generateSalt()
    const recoverySalt = generateSalt()

    // Generate the master key
    const newMasterKey = await generateMasterKey()

    // Derive wrapping keys
    const passwordWrappingKey = await deriveKeyFromPassword(password, salt)
    const recoveryWrappingKey = await deriveKeyFromRecovery(
      recoveryKey,
      recoverySalt
    )

    // Wrap the master key with both
    const passwordWrapped = await wrapMasterKey(
      newMasterKey,
      passwordWrappingKey
    )
    const recoveryWrapped = await wrapMasterKey(
      newMasterKey,
      recoveryWrappingKey
    )

    const newSettings: SettingsResponse = {
      salt,
      recovery_salt: recoverySalt,
      wrapped_master_key: passwordWrapped.wrapped,
      wrapped_master_key_iv: passwordWrapped.iv,
      wrapped_master_key_recovery: recoveryWrapped.wrapped,
      wrapped_master_key_recovery_iv: recoveryWrapped.iv,
      timezone: 'America/Los_Angeles',
    }

    await api.saveSettings(newSettings)
    setSettings(newSettings)
    setMasterKey(newMasterKey)
    await saveKeyToSession(newMasterKey)
    setIsSetup(true)
  }, [])

  const lock = useCallback(() => {
    setMasterKey(null)
    clearKeyFromSession()
  }, [])

  return (
    <CryptoContext.Provider
      value={{
        isSetup,
        isUnlocked: masterKey !== null,
        masterKey,
        generateRecoveryKey,
        unlock,
        unlockWithRecovery,
        setup,
        lock,
      }}
    >
      {children}
    </CryptoContext.Provider>
  )
}

export function useCrypto(): CryptoState {
  const ctx = useContext(CryptoContext)
  if (!ctx) throw new Error('useCrypto must be inside CryptoProvider')
  return ctx
}

const PBKDF2_ITERATIONS = 600_000

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(32))
  return bufferToBase64(salt.buffer)
}

export function generateRecoveryKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32))
  return bufferToBase64(key.buffer)
}

// Derive a wrapping key from a password or recovery key
async function deriveWrappingKey(
  secret: string,
  salt: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: base64ToBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )
}

// Generate the master key used to encrypt/decrypt all notes
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable so it can be wrapped
    ['encrypt', 'decrypt']
  )
}

// Wrap (encrypt) the master key with a wrapping key
export async function wrapMasterKey(
  masterKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrapped: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrapped = await crypto.subtle.wrapKey(
    'raw',
    masterKey,
    wrappingKey,
    { name: 'AES-GCM', iv }
  )
  return {
    wrapped: bufferToBase64(wrapped),
    iv: bufferToBase64(iv.buffer),
  }
}

// Unwrap (decrypt) the master key using a wrapping key
export async function unwrapMasterKey(
  wrapped: string,
  iv: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    base64ToBuffer(wrapped),
    wrappingKey,
    { name: 'AES-GCM', iv: base64ToBuffer(iv) },
    { name: 'AES-GCM', length: 256 },
    true, // extractable so it can be persisted to sessionStorage
    ['encrypt', 'decrypt']
  )
}

export async function deriveKeyFromPassword(
  password: string,
  salt: string
): Promise<CryptoKey> {
  return deriveWrappingKey(password, salt)
}

export async function deriveKeyFromRecovery(
  recoveryKey: string,
  salt: string
): Promise<CryptoKey> {
  return deriveWrappingKey(recoveryKey, salt)
}

// Encrypt plaintext with the master key
export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )
  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer),
  }
}

// Decrypt ciphertext with the master key
export async function decrypt(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(iv) },
    key,
    base64ToBuffer(ciphertext)
  )
  return new TextDecoder().decode(decrypted)
}

const SESSION_KEY = 'daynote-session-key'

export async function saveKeyToSession(key: CryptoKey): Promise<void> {
  const raw = await crypto.subtle.exportKey('raw', key)
  sessionStorage.setItem(SESSION_KEY, bufferToBase64(raw))
}

export async function loadKeyFromSession(): Promise<CryptoKey | null> {
  const stored = sessionStorage.getItem(SESSION_KEY)
  if (!stored) return null
  try {
    return await crypto.subtle.importKey(
      'raw',
      base64ToBuffer(stored),
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearKeyFromSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(content))
  return bufferToBase64(hash)
}

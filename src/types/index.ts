export interface NoteRecord {
  id: string
  user_id: string
  date_key: string
  encrypted_content: string
  iv: string
  content_hash: string
  created_at: string
  updated_at: string
}

export interface UserSettings {
  user_id: string
  salt: string
  recovery_salt: string
  verification_token: string
  timezone: string
  created_at: string
}

export interface TagRecord {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface DecryptedNote {
  date_key: string
  content: string
  updated_at: string
}

export interface SearchResult {
  date_key: string
  context: string
  matchIndex: number
}

export interface TagOccurrence {
  date_key: string
  context: string
}

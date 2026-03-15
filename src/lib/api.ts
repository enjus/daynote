// API client for Cloudflare Pages Functions + D1 backend
const API_BASE = '/api'

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

export interface SettingsResponse {
  salt: string
  recovery_salt: string
  wrapped_master_key: string
  wrapped_master_key_iv: string
  wrapped_master_key_recovery: string
  wrapped_master_key_recovery_iv: string
  timezone: string
}

export interface NoteResponse {
  id: string
  date_key: string
  encrypted_content: string
  iv: string
  content_hash: string
  updated_at: string
}

export const api = {
  // Notes
  async getNote(dateKey: string) {
    return apiRequest<NoteResponse | null>(`/notes/${dateKey}`)
  },

  async upsertNote(data: {
    date_key: string
    encrypted_content: string
    iv: string
    content_hash: string
  }) {
    return apiRequest<{ id: string }>('/notes', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async listNoteDates(): Promise<string[]> {
    return apiRequest<string[]>('/notes/dates')
  },

  async getAdjacentDate(
    dateKey: string,
    direction: 'prev' | 'next'
  ): Promise<string | null> {
    return apiRequest<string | null>(
      `/notes/adjacent?date=${dateKey}&direction=${direction}`
    )
  },

  async getNotesInRange(start: string, end: string) {
    return apiRequest<NoteResponse[]>(`/notes?start=${start}&end=${end}`)
  },

  async getAllNotes() {
    return apiRequest<NoteResponse[]>('/notes/all')
  },

  // Settings
  async getSettings() {
    return apiRequest<SettingsResponse | null>('/settings')
  },

  async saveSettings(data: SettingsResponse) {
    return apiRequest<{ ok: boolean }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Tags
  async getTags(): Promise<{ id: string; name: string }[]> {
    return apiRequest<{ id: string; name: string }[]>('/tags')
  },

  async createTag(name: string): Promise<{ id: string }> {
    return apiRequest<{ id: string }>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  },

  async deleteTag(id: string): Promise<void> {
    await fetch(`${API_BASE}/tags/${id}`, { method: 'DELETE' })
  },
}

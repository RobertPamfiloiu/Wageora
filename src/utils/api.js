const AUTH_KEY = 'wageora_user'

export function getToken() {
  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')
    return stored?.token || null
  } catch { return null }
}

export function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...options.headers,
  }
  return fetch(url, { ...options, headers })
}

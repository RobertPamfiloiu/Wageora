import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AuthContext = createContext(null)

const AUTH_KEY = 'wageora_user'
const INACTIVITY_MS = 1 * 60 * 1000  // 15 minutes

async function callAuth(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.detail || 'Something went wrong.' }
    }
    const data = await res.json()
    // data = { access_token, token_type, user }
    return { ok: true, token: data.access_token, user: data.user }
  } catch {
    return { ok: false, error: 'Could not reach the server.' }
  }
}

function loadStored() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return { user: null, token: null }
    const parsed = JSON.parse(raw)
    // Support both old format {id,name,...} and new format {token, user}
    if (parsed && parsed.token) return { user: parsed.user, token: parsed.token }
    // Legacy format - discard (user must log in again to get a JWT)
    return { user: null, token: null }
  } catch { return { user: null, token: null } }
}

function persist(user, token) {
  if (user && token) localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }))
  else localStorage.removeItem(AUTH_KEY)
}

export function AuthProvider({ children }) {
  const initial = loadStored()
  const [user, setUser] = useState(initial.user)
  const [token, setToken] = useState(initial.token)
  const inactivityTimer = useRef(null)

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    persist(null, null)
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
  }, [])

  // Inactivity auto-logout
  useEffect(() => {
    if (!user) return

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      inactivityTimer.current = setTimeout(() => {
        logout()
        // Redirect to login after inactivity timeout
        window.location.href = '/login'
      }, INACTIVITY_MS)
    }

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()  // start the timer

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [user, logout])

  const setAndPersist = (u, t) => {
    setUser(u)
    setToken(t)
    persist(u, t)
  }

  const adminLogin = async (email, password) => {
    const result = await callAuth('/api/auth/admin/login', { email, password })
    if (result.ok) setAndPersist(result.user, result.token)
    return result
  }

  const adminRegister = async (name, email, password) => {
    const result = await callAuth('/api/auth/admin/register', { name, email, password })
    if (result.ok) setAndPersist(result.user, result.token)
    return result
  }

  const employeeLogin = async (email, password) => {
    const result = await callAuth('/api/auth/employee/login', { email, password })
    if (result.ok) setAndPersist(result.user, result.token)
    return result
  }

  const employeeRegister = async (name, email, password) => {
    const result = await callAuth('/api/auth/employee/register', { name, email, password })
    if (result.ok) setAndPersist(result.user, result.token)
    return result
  }

  return (
    <AuthContext.Provider value={{ user, token, adminLogin, adminRegister, employeeLogin, employeeRegister, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

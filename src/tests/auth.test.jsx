import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import { AuthProvider, useAuth } from '../context/AuthContext'

//Helpers

function TestConsumer() {
  const { user, token, employeeLogin, adminLogin, logout } = useAuth()
  return (
    <div>
      <span data-testid="user">{user ? user.name : 'none'}</span>
      <span data-testid="token">{token ? 'has-token' : 'no-token'}</span>
      <button onClick={() => employeeLogin('emp@test.com', 'pass123')} data-testid="emp-login">
        Employee Login
      </button>
      <button onClick={() => adminLogin('admin@test.com', 'pass123')} data-testid="admin-login">
        Admin Login
      </button>
      <button onClick={logout} data-testid="logout">
        Logout
      </button>
    </div>
  )
}

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

// ── Token storage format ───────────────────────────────────────────────────────

describe('AuthContext – token storage', () => {
  beforeEach(() => localStorage.clear())

  it('stores token and user together in localStorage after login', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'header.payload.sig',
        token_type: 'bearer',
        user: { id: 'u1', name: 'Alice', email: 'a@b.com', account_type: 'employee', permissions: [] },
      }),
    })

    wrap(<AuthProvider><TestConsumer /></AuthProvider>)
    await userEvent.click(screen.getByTestId('emp-login'))

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Alice'))
    expect(screen.getByTestId('token').textContent).toBe('has-token')

    const stored = JSON.parse(localStorage.getItem('wageora_user'))
    expect(stored.token).toBe('header.payload.sig')
    expect(stored.user.name).toBe('Alice')
  })

  it('clears localStorage on logout', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'tok',
        token_type: 'bearer',
        user: { id: 'u1', name: 'Alice', email: 'a@b.com', account_type: 'employee', permissions: [] },
      }),
    })

    wrap(<AuthProvider><TestConsumer /></AuthProvider>)
    await userEvent.click(screen.getByTestId('emp-login'))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Alice'))

    await userEvent.click(screen.getByTestId('logout'))
    expect(screen.getByTestId('user').textContent).toBe('none')
    expect(screen.getByTestId('token').textContent).toBe('no-token')
    expect(localStorage.getItem('wageora_user')).toBeNull()
  })

  it('does not restore legacy format (plain user object without token)', () => {
    // Simulate old format stored before JWT migration
    localStorage.setItem('wageora_user', JSON.stringify({
      id: 'old', name: 'Old User', email: 'old@x.com', account_type: 'employee', permissions: [],
    }))
    wrap(<AuthProvider><TestConsumer /></AuthProvider>)
    expect(screen.getByTestId('user').textContent).toBe('none')
    expect(screen.getByTestId('token').textContent).toBe('no-token')
  })

  it('restores valid JWT session from localStorage on mount', () => {
    localStorage.setItem('wageora_user', JSON.stringify({
      token: 'h.p.s',
      user: { id: 'u2', name: 'Bob', email: 'b@c.com', account_type: 'admin', permissions: ['view_logs'] },
    }))
    wrap(<AuthProvider><TestConsumer /></AuthProvider>)
    expect(screen.getByTestId('user').textContent).toBe('Bob')
    expect(screen.getByTestId('token').textContent).toBe('has-token')
  })
})

// ── Error handling ────────────────────────────────────────────────────────────

describe('AuthContext – login error handling', () => {
  beforeEach(() => localStorage.clear())

  it('returns error when server responds with 401', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Incorrect email or password.' }),
    })

    let result
    function Capture() {
      const { employeeLogin } = useAuth()
      return <button onClick={async () => { result = await employeeLogin('x@y.com', 'wrong') }}>go</button>
    }
    wrap(<AuthProvider><Capture /></AuthProvider>)
    await userEvent.click(screen.getByText('go'))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Incorrect/i)
  })

  it('returns error when server is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    let result
    function Capture() {
      const { employeeLogin } = useAuth()
      return <button onClick={async () => { result = await employeeLogin('x@y.com', 'pass') }}>go</button>
    }
    wrap(<AuthProvider><Capture /></AuthProvider>)
    await userEvent.click(screen.getByText('go'))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Could not reach/i)
  })
})

// ── Authorization header ──────────────────────────────────────────────────────

describe('api.js – authHeaders', () => {
  beforeEach(() => localStorage.clear())

  it('returns empty object when no token is stored', async () => {
    const { authHeaders } = await import('../utils/api')
    expect(authHeaders()).toEqual({})
  })

  it('returns Authorization header when token is stored', async () => {
    localStorage.setItem('wageora_user', JSON.stringify({ token: 'my.jwt.token', user: {} }))
    // Re-import to pick up fresh localStorage state
    vi.resetModules()
    const { authHeaders } = await import('../utils/api')
    const headers = authHeaders()
    expect(headers.Authorization).toBe('Bearer my.jwt.token')
  })
})

// ── Inactivity logout (unit-level) ────────────────────────────────────────────

describe('AuthContext – inactivity logout timer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('sets up activity listeners when user is logged in', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    localStorage.setItem('wageora_user', JSON.stringify({
      token: 't.o.k',
      user: { id: 'u1', name: 'Alice', email: 'a@b.com', account_type: 'admin', permissions: [] },
    }))
    wrap(<AuthProvider><TestConsumer /></AuthProvider>)
    // Activity events should be registered
    const eventNames = addSpy.mock.calls.map(c => c[0])
    expect(eventNames).toContain('mousemove')
    expect(eventNames).toContain('keypress')
    addSpy.mockRestore()
  })
})

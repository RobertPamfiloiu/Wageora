import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../context/AuthContext'

const ADMIN_USER = { id: 'abc123', name: 'Alice', email: 'alice@test.com', account_type: 'admin', permissions: [] }
const EMP_USER   = { id: 'def456', name: 'Bob',   email: 'bob@test.com',   account_type: 'employee', permissions: [] }

// Login/register now return { access_token, token_type, user }
const adminTokenResp = { access_token: 'header.payload.sig', token_type: 'bearer', user: ADMIN_USER }
const empTokenResp   = { access_token: 'header.payload2.sig', token_type: 'bearer', user: EMP_USER }

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  })
}

function AuthUI() {
  const { user, adminLogin, adminRegister, employeeLogin, employeeRegister, logout } = useAuth()
  const [msg, setMsg] = React.useState('')
  return (
    <div>
      <span data-testid="user">{user?.name ?? 'none'}</span>
      <span data-testid="type">{user?.account_type ?? ''}</span>
      <button onClick={async () => { const r = await adminLogin('a@b.com', 'pass'); setMsg(r.ok ? 'ok' : r.error) }}>AdminLogin</button>
      <button onClick={async () => { const r = await adminRegister('Alice', 'a@b.com', 'pass123'); setMsg(r.ok ? 'ok' : r.error) }}>AdminReg</button>
      <button onClick={async () => { const r = await employeeLogin('b@b.com', 'pass'); setMsg(r.ok ? 'ok' : r.error) }}>EmpLogin</button>
      <button onClick={async () => { const r = await employeeRegister('Bob', 'b@b.com', 'pass123'); setMsg(r.ok ? 'ok' : r.error) }}>EmpReg</button>
      <button onClick={logout}>Logout</button>
      <span data-testid="msg">{msg}</span>
    </div>
  )
}
const renderAuth = () => render(<AuthProvider><AuthUI /></AuthProvider>)

beforeEach(() => localStorage.clear())
afterEach(() => { vi.restoreAllMocks(); localStorage.clear() })

describe('AuthContext – admin', () => {
  it('adminLogin sets user on success', async () => {
    vi.stubGlobal('fetch', mockFetch(200, adminTokenResp))
    const user = userEvent.setup()
    renderAuth()
    await user.click(screen.getByText('AdminLogin'))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Alice'))
    expect(screen.getByTestId('type').textContent).toBe('admin')
  })

  it('adminLogin returns error on failure', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { detail: 'Incorrect email or password.' }))
    const user = userEvent.setup()
    renderAuth()
    await user.click(screen.getByText('AdminLogin'))
    await waitFor(() => expect(screen.getByTestId('msg').textContent).toContain('Incorrect'))
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  it('adminRegister sets user on success', async () => {
    vi.stubGlobal('fetch', mockFetch(201, adminTokenResp))
    const user = userEvent.setup()
    renderAuth()
    await user.click(screen.getByText('AdminReg'))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Alice'))
  })

  it('adminRegister returns error on duplicate', async () => {
    vi.stubGlobal('fetch', mockFetch(409, { detail: 'Email already registered.' }))
    const user = userEvent.setup()
    renderAuth()
    await user.click(screen.getByText('AdminReg'))
    await waitFor(() => expect(screen.getByTestId('msg').textContent).toContain('already registered'))
  })
})

describe('AuthContext – employee', () => {
  it('employeeLogin sets user on success', async () => {
    vi.stubGlobal('fetch', mockFetch(200, empTokenResp))
    const user = userEvent.setup()
    renderAuth()
    await user.click(screen.getByText('EmpLogin'))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Bob'))
    expect(screen.getByTestId('type').textContent).toBe('employee')
  })

  it('employeeLogin returns error on failure', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { detail: 'Incorrect email or password.' }))
    const user = userEvent.setup()
    renderAuth()
    await user.click(screen.getByText('EmpLogin'))
    await waitFor(() => expect(screen.getByTestId('msg').textContent).toContain('Incorrect'))
  })

  it('employeeRegister sets user on success', async () => {
    vi.stubGlobal('fetch', mockFetch(201, empTokenResp))
    const user = userEvent.setup()
    renderAuth()
    await user.click(screen.getByText('EmpReg'))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Bob'))
  })
})

describe('AuthContext – logout', () => {
  it('logout clears user', async () => {
    vi.stubGlobal('fetch', mockFetch(200, adminTokenResp))
    const user = userEvent.setup()
    renderAuth()
    await user.click(screen.getByText('AdminLogin'))
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Alice'))
    await user.click(screen.getByText('Logout'))
    expect(screen.getByTestId('user').textContent).toBe('none')
  })
})

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { authHeaders } from '../utils/api'

export default function StructurePage() {
  const [roles, setRoles] = useState([])
  const [newRole, setNewRole] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const fetchRoles = () =>
    fetch('/api/structure/roles', { headers: authHeaders() }).then(r => r.json()).then(setRoles)

  useEffect(() => { fetchRoles() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    if (newRole.trim().length < 2) { setError('Role name must be at least 2 characters.'); return }
    const res = await fetch('/api/structure/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: newRole.trim() }),
    })
    if (!res.ok) {
      const body = await res.json()
      setError(body.detail || 'Failed to add role.')
    } else {
      setNewRole('')
      fetchRoles()
    }
  }

  const handleDelete = async (name) => {
    if (!confirm(`Delete role "${name}"?`)) return
    await fetch(`/api/structure/roles/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    fetchRoles()
  }

  return (
    <div className="emp-page">
      <Navbar />
      <div className="emp-content animate-in">
        <div className="emp-header">
          <h1 className="emp-page-title">Structure Management</h1>
          <p className="emp-page-sub">Customise roles and positions</p>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--navy)' }}>Roles &amp; Positions</h2>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <input
              className="input"
              placeholder="New role name…"
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-accent">+ Add Role</button>
          </form>
          {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {roles.map(role => (
              <div key={role} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
                <span style={{ fontWeight: 500 }}>{role}</span>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ padding: '2px 8px', fontSize: 12 }}
                  onClick={() => handleDelete(role)}
                >✕</button>
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/employees')}>← Back to Employees</button>
      </div>
    </div>
  )
}

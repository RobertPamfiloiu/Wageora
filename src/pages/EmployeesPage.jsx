/**
 * Gold Challenge – infinite scroll with server-side pagination + prefetching.
 *
 * How it works:
 *  1. The component fetches page 1 on mount (or when search changes).
 *  2. An IntersectionObserver watches a sentinel <div> at the bottom of the
 *     list.  When the user scrolls near it, page N+1 is requested and its
 *     items are appended.
 *  3. While page N loads, page N+1 is prefetched silently and stored in a ref
 *     so the next scroll event is served instantly from cache.
 *
 * Silver offline mode: when the browser reports it is offline, the component
 * falls back to the full list stored in EmployeeContext (which was cached in
 * localStorage) and does client-side filtering.
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import EmployeeModal from '../components/EmployeeModal'
import DetailModal from '../components/DetailModal'
import { useEmployees } from '../context/EmployeeContext'
import { useAuth } from '../context/AuthContext'
import { authHeaders } from '../utils/api'
import './EmployeesPage.css'

const PAGE_SIZE = 7

async function fetchPage(page, search) {
  const params = new URLSearchParams({ page, page_size: PAGE_SIZE })
  if (search) params.set('search', search)
  const res = await fetch(`/api/employees?${params}`, { headers: authHeaders() })
  return res.json()
}

// Faker live-feed toggle

function FakerControls() {
  const [running, setRunning] = useState(false)

  const toggle = async () => {
    const endpoint = running ? '/api/faker/stop' : '/api/faker/start'
    await fetch(endpoint, { method: 'POST' })
    setRunning(r => !r)
  }

  return (
    <div className="faker-controls">
      <span className="faker-label">Live Feed</span>
      <button
        className={`btn btn-sm ${running ? 'btn-danger' : 'btn-primary'}`}
        onClick={toggle}
      >
        {running ? 'Stop' : 'Start'}
      </button>
      {running && <span className="faker-pulse">● Generating…</span>}
    </div>
  )
}

// Main page

export default function EmployeesPage() {
  const {
    employees: ctxEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    isOnline,
    syncVersion,
  } = useEmployees()
  const { user } = useAuth()
  const isAdmin = user?.account_type === 'admin'

  // Local state for server-paginated results (used when online)
  const [items,      setItems]      = useState([])
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(true)
  const [loading,    setLoading]    = useState(false)
  const [search,     setSearch]     = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState(null)

  const loaderRef   = useRef(null)   // sentinel div watched by the observer
  const prefetchRef = useRef(null)   // { page, search, data } for the next page
  const prevCtxLen  = useRef(ctxEmployees.length)
  const navigate    = useNavigate()

  // Reset pagination whenever the search term changes
  useEffect(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    prefetchRef.current = null
  }, [search])

  // After offline queue is flushed and server is synced, re-fetch page 1
  useEffect(() => {
    if (syncVersion === 0) return   // skip initial mount
    setItems([])
    setPage(1)
    setHasMore(true)
    prefetchRef.current = null
  }, [syncVersion])

  // Load a page whenever `page` or `search` changes (online only)
  useEffect(() => {
    if (!isOnline) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        // Use prefetched data if it matches the requested page + search
        let data
        const pf = prefetchRef.current
        if (pf && pf.page === page && pf.search === search) {
          data = pf.data
          prefetchRef.current = null
        } else {
          data = await fetchPage(page, search)
        }

        if (!cancelled) {
          setItems(prev => page === 1 ? data.items : [...prev, ...data.items])
          setHasMore(page < data.total_pages)

          // Silently prefetch the next page so scrolling feels instant
          if (page < data.total_pages) {
            fetchPage(page + 1, search)
              .then(next => { prefetchRef.current = { page: page + 1, search, data: next } })
              .catch(() => {})
          }
        }
      } catch {
        // Network error mid-scroll — stop trying to load more
        if (!cancelled) setHasMore(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [page, search, isOnline, refreshKey])

  // IntersectionObserver: trigger next page when sentinel enters the viewport
  useEffect(() => {
    const el = loaderRef.current
    if (!el || !isOnline) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          setPage(p => p + 1)
        }
      },
      { rootMargin: '150px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loading, isOnline])

  // When the WebSocket adds employees (ctxEmployees grows), reset to show them
  useEffect(() => {
    if (isOnline && ctxEmployees.length > prevCtxLen.current) {
      setItems([])
      setPage(1)
      setHasMore(true)
    }
    prevCtxLen.current = ctxEmployees.length
  }, [ctxEmployees.length, isOnline])

  // Derived display list

  // When offline: filter the cached full list client-side
  const displayItems = isOnline
    ? items
    : ctxEmployees.filter(e => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
          e.name?.toLowerCase().includes(q) ||
          e.role?.toLowerCase().includes(q) ||
          e.id?.toLowerCase().includes(q)
        )
      })

  //  Handlers

  const handleAdd = async (data) => {
    await addEmployee(data)
    setAddOpen(false)
    if (isOnline) { setItems([]); setPage(1); setHasMore(true); setRefreshKey(k => k + 1) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee?')) return
    await deleteEmployee(id)
    if (isOnline) {
      setItems(prev => prev.filter(e => e.id !== id))
    }
  }

  // Render

  return (
    <div className="emp-page">
      <Navbar />
      <div className="emp-content animate-in">

        {/* Silver: offline notice */}
        {!isOnline && (
          <div className="offline-banner">
            Offline — showing cached data. Changes will sync when reconnected.
          </div>
        )}

        <div className="emp-header">
          <h1 className="emp-page-title">Employees</h1>
          <p className="emp-page-sub">{ctxEmployees.length} total</p>
        </div>

        <div className="emp-toolbar">
          <input
            className="input search-input"
            placeholder="Search by name, role or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="emp-toolbar-right">
            {/* Silver: faker live-feed controls — admin only */}
            {isOnline && isAdmin && <FakerControls />}
            <button className="btn btn-accent" onClick={() => setAddOpen(true)}>+ Add Employee</button>
            <button className="btn btn-primary" onClick={() => navigate('/charts')}>View Charts</button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="emp-table-wrap card emp-desktop">
          <table className="emp-table">
            <thead>
              <tr>
                <th>ID Number</th>
                <th>Name</th>
                <th>Employment Type</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>
                    No employees found.
                  </td>
                </tr>
              ) : displayItems.map(emp => (
                <tr key={emp.id} className={`emp-row${emp._offline ? ' emp-row-offline' : ''}`}>
                  <td className="emp-id">{emp.id}</td>
                  <td className="emp-name">
                    {emp.name}
                    {emp._offline && <span className="offline-tag"> ⏳</span>}
                  </td>
                  <td>
                    <span className={`badge badge-${emp.employmentType?.toLowerCase()}`}>
                      {emp.employmentType}
                    </span>
                  </td>
                  <td>{emp.role}</td>
                  <td className="emp-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setDetailTarget(emp)}>View/Edit</button>
                    <button className="btn btn-sm" style={{ background: '#f0f4ff', color: 'var(--navy)' }}
                      onClick={() => navigate(`/payslips/${emp.id}`)}>
                      Payslips
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="emp-cards emp-mobile">
          {displayItems.length === 0 && !loading ? (
            <p className="emp-empty">No employees found.</p>
          ) : displayItems.map(emp => (
            <div key={emp.id} className={`emp-card card${emp._offline ? ' emp-card-offline' : ''}`}>
              <div className="emp-card-top">
                <span className="emp-id">{emp.id}</span>
                <span className={`badge badge-${emp.employmentType?.toLowerCase()}`}>{emp.employmentType}</span>
              </div>
              <p className="emp-card-name">{emp.name}{emp._offline && ' ⏳'}</p>
              <p className="emp-card-role">{emp.role}</p>
              <div className="emp-card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => setDetailTarget(emp)}>View/Edit</button>
                <button className="btn btn-outline btn-sm" onClick={() => navigate(`/payslips/${emp.id}`)}>Payslips</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* Gold: infinite-scroll sentinel + status */}
        {isOnline && (
          <div ref={loaderRef} className="emp-scroll-sentinel">
            {loading && <span className="emp-loading-text">Loading…</span>}
            {!hasMore && items.length > 0 && (
              <span className="emp-end-text">All employees loaded</span>
            )}
          </div>
        )}
      </div>

      {addOpen && (
        <EmployeeModal title="Add Employee" onSave={handleAdd} onClose={() => setAddOpen(false)} />
      )}

      {detailTarget && (
        <DetailModal
          employee={detailTarget}
          onEdit={async (data) => { await updateEmployee(detailTarget.id, data); setDetailTarget(null) }}
          onDelete={() => { handleDelete(detailTarget.id); setDetailTarget(null) }}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { authHeaders } from '../utils/api'
import './AdminLogsPage.css'

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([])
  const [suspicious, setSuspicious] = useState([])
  const [tab, setTab] = useState('suspicious')
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    const headers = authHeaders()
    const [logsRes, susRes] = await Promise.all([
      fetch('/api/admin/logs', { headers }),
      fetch('/api/admin/suspicious', { headers }),
    ])
    if (logsRes.ok) setLogs(await logsRes.json())
    if (susRes.ok) setSuspicious(await susRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const dismiss = async (id) => {
    await fetch(`/api/admin/suspicious/${id}`, { method: 'DELETE', headers: authHeaders() })
    setSuspicious(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="logs-container">
        <h1 className="logs-title">Security & Audit</h1>

        <div className="logs-tabs">
          <button className={`tab-btn ${tab === 'suspicious' ? 'active' : ''}`} onClick={() => setTab('suspicious')}>
            Suspicious Users {suspicious.length > 0 && <span className="badge">{suspicious.length}</span>}
          </button>
          <button className={`tab-btn ${tab === 'logs' ? 'active' : ''}`} onClick={() => setTab('logs')}>
            Action Logs
          </button>
        </div>

        {loading ? (
          <div className="logs-loading">Loading…</div>
        ) : tab === 'suspicious' ? (
          suspicious.length === 0 ? (
            <div className="logs-empty">No suspicious users detected.</div>
          ) : (
            <div className="sus-list">
              {suspicious.map(s => (
                <div key={s.id} className="sus-card">
                  <div className="sus-info">
                    <span className="sus-name">{s.user_name || s.user_id}</span>
                    <span className="sus-email">{s.user_email}</span>
                    <span className="sus-reason">{s.reason}</span>
                    <span className="sus-meta">
                      Flagged {new Date(s.flagged_at).toLocaleString()} · {s.action_count} flag(s)
                    </span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => dismiss(s.id)}>
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="logs-table-wrap">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Group</th>
                  <th>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td className="log-ts">{new Date(l.timestamp).toLocaleString()}</td>
                    <td>{l.user_name || l.user_id}</td>
                    <td><span className={`group-badge ${l.group_name.toLowerCase()}`}>{l.group_name}</span></td>
                    <td className="log-action">{l.action}</td>
                    <td className="log-detail">{l.action_detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

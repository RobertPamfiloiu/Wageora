/**
 * Gold Challenge – "Be Diligent":  1-to-many relationship (Employee → Payslips).
 * "Be Ambitious":  all data fetching and mutations go through the /graphql endpoint.
 *
 * Each employee can have many payslips (one per pay period).
 * This page shows full CRUD + a stats panel with a monthly bar chart.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Navbar from '../components/Navbar'
import { authHeaders } from '../utils/api'
import './PayslipsPage.css'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── GraphQL helper ────────────────────────────────────────────────────────────

async function gql(query, variables = {}) {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

// ── GraphQL documents ─────────────────────────────────────────────────────────

const Q_PAYSLIPS = `
  query GetPayslips($employeeId: String!) {
    payslips(employeeId: $employeeId) {
      id employeeId month year grossPay deductions netPay status periodLabel
    }
    payslipStats(employeeId: $employeeId) {
      totalPayslips totalPaid totalPending
      byMonth { period netPay }
    }
  }
`

const Q_EMPLOYEE = `
  query GetEmployee($id: String!) {
    employee(id: $id) { id name role }
  }
`

const M_CREATE = `
  mutation CreatePayslip(
    $employeeId: String! $month: Int! $year: Int!
    $grossPay: Float! $deductions: Float! $status: String!
  ) {
    createPayslip(
      employeeId: $employeeId month: $month year: $year
      grossPay: $grossPay deductions: $deductions status: $status
    ) { id periodLabel }
  }
`

const M_UPDATE = `
  mutation UpdatePayslip($id: String! $grossPay: Float $deductions: Float $status: String) {
    updatePayslip(id: $id grossPay: $grossPay deductions: $deductions status: $status) {
      id periodLabel
    }
  }
`

const M_DELETE = `
  mutation DeletePayslip($id: String!) { deletePayslip(id: $id) }
`

// ── Add / Edit form ───────────────────────────────────────────────────────────

function PayslipForm({ initial, employeeId, onSave, onClose }) {
  const now = new Date()
  const [month,      setMonth]      = useState(initial?.month      ?? now.getMonth() + 1)
  const [year,       setYear]       = useState(initial?.year       ?? now.getFullYear())
  const [grossPay,   setGrossPay]   = useState(initial?.grossPay   ?? '')
  const [deductions, setDeductions] = useState(initial?.deductions ?? 0)
  const [status,     setStatus]     = useState(initial?.status     ?? 'Pending')
  const [error,      setError]      = useState('')
  const [saving,     setSaving]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!grossPay || Number(grossPay) <= 0)   { setError('Gross pay must be a positive number.'); return }
    if (Number(deductions) < 0)               { setError('Deductions cannot be negative.'); return }
    setSaving(true)
    try {
      await onSave({
        employeeId,
        month:      Number(month),
        year:       Number(year),
        grossPay:   Number(grossPay),
        deductions: Number(deductions),
        status,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{initial ? 'Edit Payslip' : 'Add Payslip'}</h2>
        <form onSubmit={handleSubmit} className="payslip-form">
          <div className="form-row-2">
            <label className="form-label">
              Month
              <select className="input" value={month} onChange={e => setMonth(e.target.value)}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </label>
            <label className="form-label">
              Year
              <input
                className="input"
                type="number"
                value={year}
                min={2000}
                max={2100}
                onChange={e => setYear(e.target.value)}
              />
            </label>
          </div>

          <label className="form-label">
            Gross Pay ($)
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder="e.g. 5000"
              value={grossPay}
              onChange={e => setGrossPay(e.target.value)}
            />
          </label>

          <label className="form-label">
            Deductions ($)
            <input
              className="input"
              type="number"
              step="0.01"
              min={0}
              value={deductions}
              onChange={e => setDeductions(e.target.value)}
            />
          </label>

          <label className="form-label">
            Status
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Payslip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const fmt = v =>
  `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PayslipsPage() {
  const { empId }    = useParams()
  const navigate     = useNavigate()
  const [employee,   setEmployee]   = useState(null)
  const [payslips,   setPayslips]   = useState([])
  const [stats,      setStats]      = useState(null)
  const [formOpen,   setFormOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [error,      setError]      = useState('')

  // Fetch employee info and payslips (both via GraphQL)
  const load = async () => {
    try {
      const data = await gql(Q_PAYSLIPS, { employeeId: empId })
      setPayslips(data.payslips)
      setStats(data.payslipStats)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    gql(Q_EMPLOYEE, { id: empId })
      .then(d => setEmployee(d.employee))
      .catch(() => {})
    load()
  }, [empId])

  const handleCreate = async (vars) => {
    await gql(M_CREATE, vars)
    setFormOpen(false)
    load()
  }

  const handleUpdate = async (vars) => {
    await gql(M_UPDATE, { id: editTarget.id, ...vars })
    setEditTarget(null)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this payslip?')) return
    await gql(M_DELETE, { id })
    load()
  }

  return (
    <div className="pay-page">
      <Navbar />
      <div className="pay-content animate-in">

        {/* Header */}
        <div className="pay-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/employees')}>
            ← Employees
          </button>
          <div className="pay-header-titles">
            <h1 className="pay-title">Payslips</h1>
            {employee && (
              <p className="pay-sub">{employee.name} · {employee.role}</p>
            )}
          </div>
          <button className="btn btn-accent" onClick={() => setFormOpen(true)}>
            + Add Payslip
          </button>
        </div>

        {error && <div className="pay-error">{error}</div>}

        {/* Stats cards */}
        {stats && (
          <div className="pay-stats-row">
            <div className="stat-card card">
              <p className="stat-label">Total Payslips</p>
              <p className="stat-val">{stats.totalPayslips}</p>
            </div>
            <div className="stat-card card">
              <p className="stat-label">Total Paid</p>
              <p className="stat-val stat-green">{fmt(stats.totalPaid)}</p>
            </div>
            <div className="stat-card card">
              <p className="stat-label">Total Pending</p>
              <p className="stat-val stat-amber">{fmt(stats.totalPending)}</p>
            </div>
          </div>
        )}

        {/* Monthly bar chart */}
        {stats?.byMonth?.length > 0 && (
          <div className="card pay-chart-card">
            <h3 className="pay-chart-title">Monthly Net Pay</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats.byMonth}
                margin={{ top: 8, right: 16, left: 10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`}
                />
                <Tooltip formatter={v => [fmt(v), 'Net Pay']} />
                <Bar dataKey="netPay" fill="#0c2d5a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Payslips table */}
        <div className="card pay-table-card">
          <table className="emp-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Period</th>
                <th>Gross Pay</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>
                    No payslips yet — click &ldquo;Add Payslip&rdquo; to create one.
                  </td>
                </tr>
              ) : payslips.map(p => (
                <tr key={p.id} className="emp-row">
                  <td className="emp-id">{p.id}</td>
                  <td style={{ fontWeight: 600 }}>{p.periodLabel}</td>
                  <td>{fmt(p.grossPay)}</td>
                  <td>{fmt(p.deductions)}</td>
                  <td><strong>{fmt(p.netPay)}</strong></td>
                  <td>
                    <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>
                  </td>
                  <td className="emp-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setEditTarget(p)}>Edit</button>
                    <button className="btn btn-danger btn-sm"  onClick={() => handleDelete(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <PayslipForm
          employeeId={empId}
          onSave={handleCreate}
          onClose={() => setFormOpen(false)}
        />
      )}

      {editTarget && (
        <PayslipForm
          initial={editTarget}
          employeeId={empId}
          onSave={handleUpdate}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}

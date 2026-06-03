import { useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import Navbar from '../components/Navbar'
import EmployeeModal from '../components/EmployeeModal'
import { useEmployees } from '../context/EmployeeContext'
import './ChartsPage.css'

const COLOR_LIST = ['#e8990a', '#0c2d5a', '#1456a4', '#22c55e', '#ef4444', '#8b5cf6']

function roleToDept(role) {
  if (['Software Engineer', 'IT Support Specialist'].includes(role)) return 'Software / IT'
  if (['HR Manager'].includes(role)) return 'HR'
  if (['Accountant', 'Cashier'].includes(role)) return 'Accounting'
  if (['Cleaner'].includes(role)) return 'Maintenance'
  if (['Manager', 'CEO'].includes(role)) return 'CEO / Mgmt'
  return 'Other'
}

function buildDeptData(employees) {
  const map = {}
  employees.forEach(e => {
    const dept = roleToDept(e.role)
    if (!map[dept]) map[dept] = { spend: 0, count: 0 }
    map[dept].spend += (e.monthlyPay ?? 0)
    map[dept].count += 1
  })
  const totalSpend = Object.values(map).reduce((s, d) => s + d.spend, 0) || 1
  return Object.entries(map)
    .sort((a, b) => b[1].spend - a[1].spend)
    .map(([name, { spend, count }]) => ({
      name,
      value: Math.round(spend),
      count,
      pct: ((spend / totalSpend) * 100).toFixed(1),
    }))
}

const fmt = (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function ChartsPage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useEmployees()
  const [activeView, setActiveView] = useState('pie')
  const [editTarget, setEditTarget] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const deptData = buildDeptData(employees)
  const totalSpend = deptData.reduce((s, d) => s + d.value, 0)

  const handleSaveEdit = async (data) => { await updateEmployee(editTarget.id, data); setEditTarget(null) }
  const handleAdd = async (data) => { await addEmployee(data); setShowAdd(false) }
  const handleDelete = async (id) => { if (window.confirm('Delete this employee?')) await deleteEmployee(id) }

  return (
    <div className="charts-page">
      <Navbar />
      <div className="charts-content animate-in">
        <div className="charts-header">
          <h1 className="charts-title">Analytics</h1>
          <p className="charts-sub">
            Total monthly payroll: <strong>${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
            &nbsp;· Charts update live as you edit the table below
          </p>
        </div>

        {/* ── Analytics panel ── */}
        <div className="analytics-panel card">
          <div className="analytics-chart-area">

            {/* PIE VIEW */}
            {activeView === 'pie' && (
              <div className="chart-viz">
                <ResponsiveContainer width="100%" height={270}>
                  <PieChart>
                    <Pie
                      data={deptData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={105}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {deptData.map((_, i) => <Cell key={i} fill={COLOR_LIST[i % COLOR_LIST.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Monthly spend']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {deptData.map((d, i) => (
                    <div key={d.name} className="pie-legend-row">
                      <span className="legend-dot" style={{ background: COLOR_LIST[i % COLOR_LIST.length] }} />
                      <span className="legend-name">{d.name}</span>
                      <span className="legend-val">${d.value.toLocaleString()} <span className="legend-pct">({d.pct}%)</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BAR VIEW */}
            {activeView === 'bar' && (
              <div className="chart-viz">
                <ResponsiveContainer width="100%" height={290}>
                  <BarChart data={deptData} margin={{ top: 8, right: 16, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                    <Tooltip formatter={(v) => [`$${v.toLocaleString()}`, 'Monthly spend']} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {deptData.map((_, i) => <Cell key={i} fill={COLOR_LIST[i % COLOR_LIST.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* TABULAR VIEW */}
            {activeView === 'tabular' && (
              <div className="chart-viz tabular-viz">
                <table className="emp-table analytics-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Employees</th>
                      <th>Monthly spend</th>
                      <th>% of payroll</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptData.map((d, i) => (
                      <tr key={d.name}>
                        <td>
                          <span className="legend-dot" style={{ background: COLOR_LIST[i % COLOR_LIST.length], display: 'inline-block', marginRight: 6 }} />
                          {d.name}
                        </td>
                        <td style={{ textAlign: 'center' }}>{d.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>${d.value.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>{d.pct}%</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '2px solid var(--gray-300)', fontWeight: 700 }}>
                      <td>Total</td>
                      <td style={{ textAlign: 'center' }}>{employees.length}</td>
                      <td style={{ textAlign: 'right' }}>${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td style={{ textAlign: 'center' }}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Toggle buttons */}
          <div className="analytics-controls">
            <button className={`view-btn ${activeView === 'pie' ? 'active' : ''}`} onClick={() => setActiveView('pie')}>Pie chart</button>
            <button className={`view-btn ${activeView === 'bar' ? 'active' : ''}`} onClick={() => setActiveView('bar')}>Bar chart</button>
            <button className={`view-btn ${activeView === 'tabular' ? 'active' : ''}`} onClick={() => setActiveView('tabular')}>Tabular</button>
          </div>
        </div>

        {/* ── Live-edit table ── */}
        <div className="card charts-table-card">
          <div className="charts-table-toolbar">
            <h3 style={{ fontWeight: 700, color: 'var(--navy)' }}>Edit Employees</h3>
            <button className="btn btn-accent btn-sm" onClick={() => setShowAdd(true)}>+ Add</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="emp-table">
              <thead>
                <tr><th>ID</th><th>Name</th><th>Type</th><th>Role</th><th>Dept</th><th>Monthly Est.</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="emp-row">
                    <td className="emp-id">{emp.id}</td>
                    <td className="emp-name">{emp.name}</td>
                    <td><span className={`badge badge-${emp.employmentType?.toLowerCase()}`}>{emp.employmentType}</span></td>
                    <td>{emp.role}</td>
                    <td>{roleToDept(emp.role)}</td>
                    <td><strong>${Math.round(emp.monthlyPay ?? 0).toLocaleString()}</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditTarget(emp)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editTarget && <EmployeeModal title={`Edit – ${editTarget.name}`} initial={editTarget} onSave={handleSaveEdit} onClose={() => setEditTarget(null)} />}
      {showAdd && <EmployeeModal title="Add Employee" onSave={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
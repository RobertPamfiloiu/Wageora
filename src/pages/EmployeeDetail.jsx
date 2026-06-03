import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import EmployeeModal from '../components/EmployeeModal'
import { useEmployees } from '../context/EmployeeContext'
import './EmployeeDetail.css'

export default function EmployeeDetail() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { getEmployee, updateEmployee, deleteEmployee } = useEmployees()

  const emp = getEmployee(id)
  const [showEdit, setShowEdit] = useState(false)
  const [showPay,  setShowPay]  = useState(false)

  if (!emp) return (
    <div className="detail-page">
      <Navbar />
      <div className="detail-content" style={{ textAlign:'center', paddingTop:80 }}>
        <h2>Employee not found.</h2>
        <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => navigate('/employees')}>← Back</button>
      </div>
    </div>
  )

  const monthly  = emp.monthlyPay ?? 0
  const annual   = monthly * 12
  const netPay   = monthly * 0.85
  const otPay    = emp.employmentType === 'Hourly' ? (emp.hourlyRate || 0) * 1.5 * (emp.overtimeHours || 0) : 0

  const handleSave   = async (data) => { await updateEmployee(id, data); setShowEdit(false) }
  const handleDelete = async () => {
    if (confirm(`Delete ${emp.name}?`)) {
      await deleteEmployee(id)
      navigate('/employees')
    }
  }

  return (
    <div className="detail-page">
      <Navbar />
      <div className="detail-content animate-in">
        <button className="btn btn-ghost btn-sm back-btn" onClick={() => navigate('/employees')}>← Back to Employees</button>

        <div className="detail-layout">
          {/* Main info */}
          <div className="card detail-card">
            <div className="detail-hero">
              <div className="detail-avatar">{emp.name.charAt(0)}</div>
              <div className="detail-hero-info">
                <h1 className="detail-name">{emp.name}</h1>
                <p className="detail-role">{emp.role}</p>
                <span className={`badge badge-${emp.employmentType?.toLowerCase()}`}>{emp.employmentType}</span>
              </div>
              <span className="detail-id-chip">{emp.id}</span>
            </div>

            <div className="detail-grid">
              <div className="df2"><label>ID Number</label><span>{emp.id}</span></div>
              <div className="df2"><label>Employment Type</label><span>{emp.employmentType}</span></div>
              <div className="df2"><label>Role</label><span>{emp.role}</span></div>
              <div className="df2"><label>Hours Worked</label><span>{emp.hoursWorked} hrs</span></div>
              <div className="df2"><label>Overtime Hours</label><span>{emp.overtimeHours} hrs</span></div>
              {emp.employmentType === 'Salary'  && <div className="df2"><label>Annual Salary</label><span>${(emp.salary||0).toLocaleString()}</span></div>}
              {emp.employmentType === 'Hourly'  && <div className="df2"><label>Hourly Rate</label><span>${emp.hourlyRate||0}/hr</span></div>}
              {emp.employmentType === 'Weekly'  && <div className="df2"><label>Weekly Rate</label><span>${emp.weeklyRate||0}/wk</span></div>}
              <div className="df2 pay-field"><label>Monthly Pay</label><span>${monthly.toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>
              <div className="df2 pay-field"><label>Annual Pay</label><span>${annual.toLocaleString(undefined,{maximumFractionDigits:0})}</span></div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="detail-sidebar">
            <div className="card sidebar-panel">
              <h3 className="sidebar-heading">Actions</h3>
              <div className="sidebar-btns">
                <button className="btn btn-accent" onClick={() => setShowPay(p => !p)}>Pay Slips</button>
                <button className="btn btn-primary" onClick={() => setShowEdit(true)}>Edit</button>
                <button className="btn btn-ghost"   onClick={() => navigate('/charts')}>Follow</button>
                <button className="btn btn-danger"  onClick={handleDelete}>Delete</button>
              </div>
            </div>

            {showPay && (
              <div className="card payslip-card">
                <h3 className="sidebar-heading">Pay Slip</h3>
                <div className="ps-r"><span>Base Pay</span><strong>${monthly.toLocaleString(undefined,{maximumFractionDigits:0})}</strong></div>
                {otPay > 0 && <div className="ps-r"><span>Overtime (1.5×)</span><strong>+${otPay.toLocaleString(undefined,{maximumFractionDigits:0})}</strong></div>}
                <div className="ps-r"><span>Tax (15%)</span><strong className="text-danger">-${(monthly*0.15).toLocaleString(undefined,{maximumFractionDigits:0})}</strong></div>
                <div className="ps-r ps-net"><span>Net Pay</span><strong>${netPay.toLocaleString(undefined,{maximumFractionDigits:0})}</strong></div>
              </div>
            )}

            <div className="card pay-summary-card">
              <h3 className="sidebar-heading">Summary</h3>
              <div className="ps-r"><span>Monthly</span><strong>${monthly.toLocaleString(undefined,{maximumFractionDigits:0})}</strong></div>
              <div className="ps-r"><span>Annual</span><strong>${annual.toLocaleString(undefined,{maximumFractionDigits:0})}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && <EmployeeModal title={`Edit – ${emp.name}`} initial={emp} onSave={handleSave} onClose={() => setShowEdit(false)} />}
    </div>
  )
}

import { useState } from 'react'
import EmployeeModal from './EmployeeModal'

export default function DetailModal({ employee: emp, onEdit, onDelete, onClose }) {
  const [showEdit, setShowEdit] = useState(false)
  const [showPay,  setShowPay]  = useState(false)

  const monthly = emp.monthlyPay ?? 0
  const annual  = monthly * 12
  const netPay  = monthly * 0.85

  if (showEdit) return (
    <EmployeeModal title={`Edit – ${emp.name}`} initial={emp}
      onSave={(data) => { onEdit(data); setShowEdit(false) }} onClose={() => setShowEdit(false)} />
  )

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal detail-modal animate-scale">
        <div className="modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div className="detail-avatar-sm">{emp.name.charAt(0)}</div>
            <div>
              <h2 className="modal-title" style={{ marginBottom:2 }}>{emp.name}</h2>
              <span className={`badge badge-sm badge-${emp.employmentType?.toLowerCase()}`}>{emp.employmentType}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="detail-fields">
          <div className="df"><label>ID</label><span>{emp.id}</span></div>
          <div className="df"><label>Role</label><span>{emp.role}</span></div>
          <div className="df"><label>Hrs Worked</label><span>{emp.hoursWorked} hrs</span></div>
          <div className="df"><label>Overtime</label><span>{emp.overtimeHours} hrs</span></div>
          <div className="df"><label>Monthly Pay</label><span className="pay-hi">${monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
          <div className="df"><label>Annual Pay</label><span className="pay-hi">${annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
        </div>

        {showPay && (
          <div className="payslip-box">
            <div className="ps-row"><span>Base Pay</span><strong>${monthly.toLocaleString(undefined,{maximumFractionDigits:0})}</strong></div>
            <div className="ps-row"><span>Tax (15%)</span><strong>-${(monthly*0.15).toLocaleString(undefined,{maximumFractionDigits:0})}</strong></div>
            <div className="ps-row net"><span>Net Pay</span><strong>${netPay.toLocaleString(undefined,{maximumFractionDigits:0})}</strong></div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onDelete}>Delete</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowPay(p => !p)}>Pay Slips</button>
          <button className="btn btn-accent btn-sm" onClick={() => setShowEdit(true)}>Edit</button>
        </div>
      </div>
    </div>
  )
}

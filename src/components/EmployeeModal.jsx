import { useState, useEffect } from 'react'
import { ROLES, EMPLOYMENT_TYPES } from '../data/employees'
import { authHeaders } from '../utils/api'
import './EmployeeModal.css'

const EMPTY = {
  name: '',
  employmentType: 'Salary',
  role: '',
  salary: '',
  hourlyRate: '',
  weeklyRate: '',
  hoursWorked: 160,
  overtimeHours: 0,
}

function validate(form) {
  const errors = {}
  if (!form.name || form.name.trim().length < 2)
    errors.name = 'Name must be at least 2 characters.'
  if (!form.role)
    errors.role = 'Role is required.'
  if (!form.employmentType)
    errors.employmentType = 'Employment type is required.'
  if (form.employmentType === 'Salary') {
    const v = Number(form.salary)
    if (!form.salary || isNaN(v) || v <= 0)
      errors.salary = 'Annual salary must be a positive number.'
  }
  if (form.employmentType === 'Hourly') {
    const v = Number(form.hourlyRate)
    if (!form.hourlyRate || isNaN(v) || v <= 0)
      errors.hourlyRate = 'Hourly rate must be a positive number.'
  }
  if (form.employmentType === 'Weekly') {
    const v = Number(form.weeklyRate)
    if (!form.weeklyRate || isNaN(v) || v <= 0)
      errors.weeklyRate = 'Weekly rate must be a positive number.'
  }
  const hrs = Number(form.hoursWorked)
  if (isNaN(hrs) || hrs < 0)
    errors.hoursWorked = 'Hours worked must be 0 or more.'
  return errors
}

export default function EmployeeModal({ title = 'Add Employee', initial = {}, onSave, onClose }) {
  const [form, setForm]     = useState({ ...EMPTY, ...initial })
  const [errors, setErrors] = useState({})
  const [roles, setRoles] = useState(ROLES)

  useEffect(() => {
    fetch('/api/structure/roles', { headers: authHeaders() })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRoles(data) })
      .catch(() => {})
  }, [])

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: '' }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({
      name:          form.name.trim(),
      employmentType: form.employmentType,
      role:          form.role,
      salary:        Number(form.salary)        || 0,
      hourlyRate:    Number(form.hourlyRate)    || 0,
      weeklyRate:    Number(form.weeklyRate)    || 0,
      hoursWorked:   Number(form.hoursWorked)   || 0,
      overtimeHours: Number(form.overtimeHours) || 0,
    })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-grid">
            <div className="form-group full-span">
              <label>Full Name</label>
              <input
                className={`input ${errors.name ? 'error' : ''}`}
                value={form.name}
                placeholder="e.g. Ana Popescu"
                onChange={e => set('name', e.target.value)}
              />
              {errors.name && <p className="error-msg">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label>Employment Type</label>
              <select
                className="input"
                value={form.employmentType}
                onChange={e => set('employmentType', e.target.value)}
              >
                {EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                className={`input ${errors.role ? 'error' : ''}`}
                value={form.role}
                onChange={e => set('role', e.target.value)}
              >
                <option value="">Select role…</option>
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
              {errors.role && <p className="error-msg">{errors.role}</p>}
            </div>

            {form.employmentType === 'Salary' && (
              <div className="form-group">
                <label>Annual Salary ($)</label>
                <input
                  type="number" min="1"
                  className={`input ${errors.salary ? 'error' : ''}`}
                  value={form.salary} placeholder="e.g. 65000"
                  onChange={e => set('salary', e.target.value)}
                />
                {errors.salary && <p className="error-msg">{errors.salary}</p>}
              </div>
            )}
            {form.employmentType === 'Hourly' && (
              <div className="form-group">
                <label>Hourly Rate ($/hr)</label>
                <input
                  type="number" min="1"
                  className={`input ${errors.hourlyRate ? 'error' : ''}`}
                  value={form.hourlyRate} placeholder="e.g. 35"
                  onChange={e => set('hourlyRate', e.target.value)}
                />
                {errors.hourlyRate && <p className="error-msg">{errors.hourlyRate}</p>}
              </div>
            )}
            {form.employmentType === 'Weekly' && (
              <div className="form-group">
                <label>Weekly Rate ($)</label>
                <input
                  type="number" min="1"
                  className={`input ${errors.weeklyRate ? 'error' : ''}`}
                  value={form.weeklyRate} placeholder="e.g. 1400"
                  onChange={e => set('weeklyRate', e.target.value)}
                />
                {errors.weeklyRate && <p className="error-msg">{errors.weeklyRate}</p>}
              </div>
            )}

            <div className="form-group">
              <label>Hours Worked / Month</label>
              <input
                type="number" min="0"
                className={`input ${errors.hoursWorked ? 'error' : ''}`}
                value={form.hoursWorked}
                onChange={e => set('hoursWorked', e.target.value)}
              />
              {errors.hoursWorked && <p className="error-msg">{errors.hoursWorked}</p>}
            </div>

            <div className="form-group">
              <label>Overtime Hours</label>
              <input
                type="number" min="0"
                className="input"
                value={form.overtimeHours}
                onChange={e => set('overtimeHours', e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-accent">Save Employee</button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import './AuthPages.css'

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverErr, setServerErr] = useState('')
  const { adminLogin } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.'
    if (!form.password) e.password = 'Password is required.'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setServerErr('')
    const result = await adminLogin(form.email, form.password)
    if (!result.ok) {
      setServerErr(result.error || 'Incorrect email or password.')
    } else {
      navigate('/employees')
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-center">
        <div className="auth-card animate-scale">
          <div className="auth-brand">
            <span className="auth-brand-name">Admin</span>
            <div className="auth-coin">
              <div className="coin-inner"><span className="coin-symbol">★</span></div>
            </div>
          </div>
          <div className="auth-form-panel">
            <h2 className="auth-title">Admin Sign In</h2>
            {serverErr && <div className="auth-server-err">{serverErr}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  className={`input ${errors.email ? 'error' : ''}`}
                  placeholder="Email address"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                />
                {errors.email && <p className="input-error-msg">{errors.email}</p>}
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className={`input ${errors.password ? 'error' : ''}`}
                  placeholder="Password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                />
                {errors.password && <p className="input-error-msg">{errors.password}</p>}
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}>
                Sign in as Admin
              </button>
            </form>
            <p className="auth-switch">
              No admin account? <Link to="/admin/signup">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

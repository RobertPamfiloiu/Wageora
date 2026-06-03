import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import './AuthPages.css'

export default function AdminSignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverErr, setServerErr] = useState('')
  const { adminRegister } = useAuth()
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!form.name || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.'
    if (!form.email) e.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.'
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters.'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setServerErr('')
    const result = await adminRegister(form.name, form.email, form.password)
    if (!result.ok) {
      setServerErr(result.error || 'Registration failed.')
    } else {
      navigate('/employees')
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="auth-page signup-page">
      <Navbar />
      <div className="auth-center">
        <div className="signup-card animate-scale">
          <h2 className="signup-title">Admin Sign Up</h2>
          <p className="signup-sub">Create your admin account</p>
          {serverErr && <div className="auth-server-err">{serverErr}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                className={`input ${errors.name ? 'error' : ''}`}
                placeholder="Full name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
              {errors.name && <p className="error-msg">{errors.name}</p>}
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                className={`input ${errors.email ? 'error' : ''}`}
                placeholder="Email address"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
              {errors.email && <p className="error-msg">{errors.email}</p>}
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                className={`input ${errors.password ? 'error' : ''}`}
                placeholder="Create a password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
              />
              {errors.password && <p className="error-msg">{errors.password}</p>}
            </div>
            <button type="submit" className="btn btn-accent" style={{ width: '100%', justifyContent: 'center' }}>
              Create Admin Account
            </button>
          </form>
          <p className="auth-switch" style={{ textAlign: 'center', marginTop: 16 }}>
            Already have an account? <Link to="/admin/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

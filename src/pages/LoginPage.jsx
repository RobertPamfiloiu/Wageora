import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './AuthPages.css';

const MAX_ATTEMPTS   = 6
const SHORT_COOLDOWN = 5        // seconds between attempts
const LONG_COOLDOWN  = 60       // seconds after MAX_ATTEMPTS

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [serverErr, setServerErr] = useState('');
  const [cooldown, setCooldown] = useState(0)   // seconds remaining
  const attemptsRef  = useRef(0)
  const lastAttemptRef = useRef(0)
  const timerRef     = useRef(null)
  const { employeeLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => () => clearInterval(timerRef.current), [])

  const startCooldown = (seconds) => {
    setCooldown(seconds)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.password) e.password = 'Password is required.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;

    const now = Date.now()
    const secsSinceLast = (now - lastAttemptRef.current) / 1000
    if (lastAttemptRef.current > 0 && secsSinceLast < SHORT_COOLDOWN) {
      startCooldown(Math.ceil(SHORT_COOLDOWN - secsSinceLast))
      return
    }

    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setServerErr('');

    lastAttemptRef.current = Date.now()
    const result = await employeeLogin(form.email, form.password);
    if (!result.ok) {
      attemptsRef.current += 1
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        attemptsRef.current = 0
        startCooldown(LONG_COOLDOWN)
        setServerErr(`Too many failed attempts. Please wait ${LONG_COOLDOWN} seconds.`)
      } else {
        startCooldown(SHORT_COOLDOWN)
        setServerErr('Incorrect email or password.')
      }
    } else {
      attemptsRef.current = 0
      navigate('/employees');
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-center">
        <div className="auth-card animate-scale">
          {/* Left brand panel */}
          <div className="auth-brand">
            <span className="auth-brand-name">Wageora</span>
            <div className="auth-coin">
              <div className="coin-inner"><span className="coin-symbol">$</span></div>
            </div>
          </div>

          {/* Right form panel */}
          <div className="auth-form-panel">
            <h2 className="auth-title">Nice to see you again</h2>

            {serverErr && <div className="auth-server-err">{serverErr}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email">Enter your email address</label>
                <input
                  id="email"
                  type="email"
                  className={`input ${errors.email ? 'error' : ''}`}
                  placeholder="Email address"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                />
                {errors.email && <p className="input-error-msg">{errors.email}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className={`input ${errors.password ? 'error' : ''}`}
                  placeholder="Password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                />
                {errors.password && <p className="input-error-msg">{errors.password}</p>}
              </div>

              <div className="auth-remember">
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.remember} onChange={e => set('remember', e.target.checked)} />
                  Remember me
                </label>
                <a href="#" className="auth-forgot">Forgot password?</a>
              </div>

              <button type="submit" className="btn btn-primary" disabled={cooldown > 0}
                style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}>
                {cooldown > 0 ? `Wait ${cooldown}s…` : 'Sign in'}
              </button>

              <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </form>

            <p className="auth-switch">
              Already have an account? <Link to="/signup">Create account now</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './LandingPage.css'

export default function LandingPage() {
  return (
    <div className="landing">
      <Navbar />
      <section className="hero">
        <div className="hero-text">
          <h1 className="hero-headline">Seamless Payroll &amp; Time Tracking for Every Role.</h1>
          <p className="hero-sub">
            Manage employees, track hours, and generate payslips with a system built for
            Admins, Secretaries, and Employees.
          </p>
          <div className="hero-cta">
            <Link to="/admin/login" className="btn btn-ghost" style={{ color: 'white', border: '1.5px solid rgba(255,255,255,.5)' }}>Admin login</Link>
            <Link to="/login" className="btn btn-accent btn-lg">Employee login</Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="logo-display">
            <span className="logo-script">Wageora</span>
          </div>
          <div className="coin-icon">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="54" fill="white" fillOpacity=".12" stroke="white" strokeWidth="2" />
              <circle cx="60" cy="60" r="42" fill="white" fillOpacity=".08" stroke="white" strokeWidth="1.5" strokeDasharray="6 4" />
              <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="44" fill="white" fontFamily="serif" fontWeight="bold">$</text>
            </svg>
          </div>
        </div>
      </section>

      <section className="cta-banner">
        <p className="cta-text">Ready to get started?</p>
        <Link to="/signup" className="btn btn-accent btn-lg">Sign up now!</Link>
      </section>

      <footer className="landing-footer">© 2026 Wageora. All rights reserved.</footer>
    </div>
  )
}
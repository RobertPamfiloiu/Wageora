import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <Link to={user ? '/employees' : '/'} className="navbar-logo">
        <div className="navbar-logo-icon">W</div>
        <span>Wageora</span>
      </Link>

      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/employees" className={`nav-link ${isActive('/employees')}`}>Employees</Link>
            <Link to="/charts" className={`nav-link ${isActive('/charts')}`}>Charts</Link>
            <Link to="/chat" className={`nav-link ${isActive('/chat')}`}>Chat</Link>
            {user.account_type === 'admin' && (
              <>
                <Link to="/structure" className={`nav-link ${isActive('/structure')}`}>Structure</Link>
                <Link to="/admin/logs" className={`nav-link ${isActive('/admin/logs')}`}>Security</Link>
              </>
            )}
            <span style={{ fontSize: 11, padding: '2px 8px', background: user.account_type === 'admin' ? 'var(--accent)' : 'var(--primary)', color: 'white', borderRadius: 4, fontWeight: 600 }}>
              {user.account_type === 'admin' ? 'Admin' : 'Employee'}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <Link to="/" className={`nav-link ${isActive('/')}`}>Home</Link>
            <Link to="/login" className={`nav-link ${isActive('/login')}`}>Sign in</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}

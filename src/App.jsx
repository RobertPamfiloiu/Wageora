import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import ProtectedRoute    from './components/ProtectedRoute'
import LandingPage       from './pages/LandingPage'
import LoginPage         from './pages/LoginPage'
import SignUpPage        from './pages/SignUpPage'
import AdminLoginPage    from './pages/AdminLoginPage'
import AdminSignupPage   from './pages/AdminSignupPage'
import EmployeesPage     from './pages/EmployeesPage'
import EmployeeDetail    from './pages/EmployeeDetail'
import ChartsPage        from './pages/ChartsPage'
import StructurePage     from './pages/StructurePage'
import PayslipsPage      from './pages/PayslipsPage'
import ChatPage          from './pages/ChatPage'
import AdminLogsPage     from './pages/AdminLogsPage'
import './index.css'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"               element={<LandingPage />} />
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/signup"         element={<SignUpPage />} />
          <Route path="/admin/login"    element={<AdminLoginPage />} />
          <Route path="/admin/signup"   element={<AdminSignupPage />} />
          <Route path="/employees"      element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
          <Route path="/employees/:id"  element={<ProtectedRoute><EmployeeDetail /></ProtectedRoute>} />
          <Route path="/charts"         element={<ProtectedRoute><ChartsPage /></ProtectedRoute>} />
          <Route path="/structure"      element={<ProtectedRoute requireAdmin><StructurePage /></ProtectedRoute>} />
          <Route path="/payslips/:empId" element={<ProtectedRoute><PayslipsPage /></ProtectedRoute>} />
          <Route path="/chat"           element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/admin/logs"     element={<ProtectedRoute requireAdmin><AdminLogsPage /></ProtectedRoute>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

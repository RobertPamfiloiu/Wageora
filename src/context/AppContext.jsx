import { createContext, useContext } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import { EmployeeProvider, useEmployees } from './EmployeeContext'
import { trackActivity } from '../utils/cookies'

const AppContext = createContext(null)

function AppContextBridge({ children }) {
  const auth = useAuth()
  const emp  = useEmployees()

  const value = {
    authUser:       auth.user,
    adminLogin:     auth.adminLogin,
    adminRegister:  auth.adminRegister,
    employeeLogin:  auth.employeeLogin,
    employeeRegister: auth.employeeRegister,
    logout:         () => { auth.logout(); trackActivity('logout') },
    employees:      emp.employees,
    addEmployee:    async (d) => { const e = await emp.addEmployee(d); trackActivity('add_employee'); return e },
    updateEmployee: async (id, d) => { await emp.updateEmployee(id, d); trackActivity('update_employee') },
    deleteEmployee: async (id) => { await emp.deleteEmployee(id); trackActivity('delete_employee') },
    getEmployee:    emp.getEmployee,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function AppProvider({ children }) {
  return (
    <AuthProvider>
      <EmployeeProvider>
        <AppContextBridge>{children}</AppContextBridge>
      </EmployeeProvider>
    </AuthProvider>
  )
}

export const useApp = () => useContext(AppContext)

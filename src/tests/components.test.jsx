import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'

import EmployeeModal  from '../components/EmployeeModal'
import DetailModal    from '../components/DetailModal'
import Navbar         from '../components/Navbar'
import ProtectedRoute from '../components/ProtectedRoute'

// ── Helpers ───────────────────────────────────────────────────────────────────
const withRouter = (ui) =>
  render(<MemoryRouter><AuthProvider>{ui}</AuthProvider></MemoryRouter>)

const sampleEmployee = {
  id: 'EMP001', name: 'Ana Pop', employmentType: 'Salary',
  role: 'Accountant', salary: 72000, hoursWorked: 160, overtimeHours: 0, monthlyPay: 6000,
}

// ── EmployeeModal ─────────────────────────────────────────────────────────────
describe('EmployeeModal', () => {
  it('renders the modal title', () => {
    render(<EmployeeModal title="Add Employee" onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Add Employee')).toBeDefined()
  })

  it('shows name placeholder and salary field by default (Salary type)', () => {
    render(<EmployeeModal onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText('e.g. Ana Popescu')).toBeDefined()
    expect(screen.getByPlaceholderText('e.g. 65000')).toBeDefined()
  })

  it('shows hourly rate field when Hourly type is selected', async () => {
    const user = userEvent.setup()
    render(<EmployeeModal onSave={vi.fn()} onClose={vi.fn()} />)
    await user.selectOptions(screen.getByDisplayValue('Salary'), 'Hourly')
    expect(screen.getByPlaceholderText('e.g. 35')).toBeDefined()
  })

  it('shows weekly rate field when Weekly type is selected', async () => {
    const user = userEvent.setup()
    render(<EmployeeModal onSave={vi.fn()} onClose={vi.fn()} />)
    await user.selectOptions(screen.getByDisplayValue('Salary'), 'Weekly')
    expect(screen.getByPlaceholderText('e.g. 1400')).toBeDefined()
  })

  it('shows name and role errors when submitted empty', async () => {
    const user = userEvent.setup()
    render(<EmployeeModal onSave={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByText('Save Employee'))
    expect(screen.getByText('Name must be at least 2 characters.')).toBeDefined()
    expect(screen.getByText('Role is required.')).toBeDefined()
  })

  it('shows salary error when salary is empty', async () => {
    const user = userEvent.setup()
    render(<EmployeeModal onSave={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('e.g. Ana Popescu'), 'Valid Name')
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'Accountant')
    const salaryInput = screen.getByPlaceholderText('e.g. 65000')
    await user.clear(salaryInput)
    await user.click(screen.getByText('Save Employee'))
    expect(screen.getByText('Annual salary must be a positive number.')).toBeDefined()
  })

  it('calls onSave with correct data for a valid salary employee', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<EmployeeModal onSave={onSave} onClose={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('e.g. Ana Popescu'), 'Test User')
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'Accountant')
    const salaryInput = screen.getByPlaceholderText('e.g. 65000')
    await user.clear(salaryInput)
    await user.type(salaryInput, '60000')
    await user.click(screen.getByText('Save Employee'))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].name).toBe('Test User')
    expect(onSave.mock.calls[0][0].salary).toBe(60000)
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<EmployeeModal onSave={vi.fn()} onClose={onClose} />)
    await user.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('pre-fills fields from initial prop (edit mode)', () => {
    render(<EmployeeModal initial={sampleEmployee} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByDisplayValue('Ana Pop')).toBeDefined()
    expect(screen.getByDisplayValue('72000')).toBeDefined()
  })
})

// ── DetailModal ───────────────────────────────────────────────────────────────
describe('DetailModal', () => {
  const props = { employee: sampleEmployee, onEdit: vi.fn(), onDelete: vi.fn(), onClose: vi.fn() }

  it('renders employee name and role', () => {
    render(<DetailModal {...props} />)
    expect(screen.getByText('Ana Pop')).toBeDefined()
    expect(screen.getByText('Accountant')).toBeDefined()
  })

  it('renders employee ID', () => {
    render(<DetailModal {...props} />)
    expect(screen.getByText('EMP001')).toBeDefined()
  })

  it('renders hours worked', () => {
    render(<DetailModal {...props} />)
    expect(screen.getByText('160 hrs')).toBeDefined()
  })

  it('payslip is hidden by default', () => {
    render(<DetailModal {...props} />)
    expect(screen.queryByText('Net Pay')).toBeNull()
  })

  it('toggles payslip on Pay Slips click', async () => {
    const user = userEvent.setup()
    render(<DetailModal {...props} />)
    await user.click(screen.getByText('Pay Slips'))
    expect(screen.getByText('Net Pay')).toBeDefined()
    expect(screen.getByText('Tax (15%)')).toBeDefined()
    await user.click(screen.getByText('Pay Slips'))
    expect(screen.queryByText('Net Pay')).toBeNull()
  })

  it('calls onDelete when Delete is clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<DetailModal {...props} onDelete={onDelete} />)
    await user.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('switches to EmployeeModal when Edit is clicked', async () => {
    const user = userEvent.setup()
    render(<DetailModal {...props} />)
    await user.click(screen.getByText('Edit'))
    expect(screen.getByText(/Edit – Ana Pop/)).toBeDefined()
  })
})

// ── Navbar ────────────────────────────────────────────────────────────────────
describe('Navbar – logged out', () => {
  it('shows Home, Sign in, Sign up', () => {
    withRouter(<Navbar />)
    expect(screen.getByText('Sign in')).toBeDefined()
    expect(screen.getByText('Sign up')).toBeDefined()
    expect(screen.getByText('Home')).toBeDefined()
  })

  it('shows Wageora brand', () => {
    withRouter(<Navbar />)
    expect(screen.getAllByText('Wageora').length).toBeGreaterThan(0)
  })

  it('does not show Log out button', () => {
    withRouter(<Navbar />)
    expect(screen.queryByText('Log out')).toBeNull()
  })
})

// ── ProtectedRoute ─────────────────────────────────────────────────────────────
describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <Routes>
            <Route path="/protected" element={<ProtectedRoute><div>Secret</div></ProtectedRoute>} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.queryByText('Secret')).toBeNull()
    expect(screen.getByText('Login Page')).toBeDefined()
  })
})

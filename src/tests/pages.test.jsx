import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import LandingPage   from '../pages/LandingPage'
import LoginPage     from '../pages/LoginPage'
import SignUpPage    from '../pages/SignUpPage'
import EmployeesPage from '../pages/EmployeesPage'

// ── Mock EmployeeContext so EmployeesPage never calls the API in tests ─────────
vi.mock('../context/EmployeeContext', () => {
  const employees = [
    { id: 'EMP001', name: 'Marco Rosario',   employmentType: 'Salary', role: 'HR Manager',            salary: 85000,  hoursWorked: 160, overtimeHours: 5,  monthlyPay: 7117 },
    { id: 'EMP002', name: 'Maria Rosario',   employmentType: 'Salary', role: 'Accountant',            salary: 72000,  hoursWorked: 160, overtimeHours: 0,  monthlyPay: 6000 },
    { id: 'EMP003', name: 'Ornell Antonio',  employmentType: 'Hourly', role: 'Accountant',            hourlyRate: 35, hoursWorked: 152, overtimeHours: 8,  monthlyPay: 5740 },
    { id: 'EMP004', name: 'Sophie Martino',  employmentType: 'Hourly', role: 'Cleaner',               hourlyRate: 18, hoursWorked: 120, overtimeHours: 0,  monthlyPay: 2160 },
    { id: 'EMP005', name: "Jack O'Connor",   employmentType: 'Salary', role: 'Cashier',               salary: 44000,  hoursWorked: 160, overtimeHours: 2,  monthlyPay: 3674 },
    { id: 'EMP006', name: 'Emma Moore',      employmentType: 'Hourly', role: 'Cleaner',               hourlyRate: 18, hoursWorked: 100, overtimeHours: 0,  monthlyPay: 1800 },
    { id: 'EMP007', name: 'Elena Blumberg',  employmentType: 'Hourly', role: 'Software Engineer',     hourlyRate: 60, hoursWorked: 160, overtimeHours: 20, monthlyPay: 11400 },
    { id: 'EMP008', name: 'Elara Davy',      employmentType: 'Weekly', role: 'Software Engineer',     weeklyRate: 2200, hoursWorked: 160, overtimeHours: 10, monthlyPay: 8800 },
    { id: 'EMP009', name: 'Mabel Dominguez', employmentType: 'Weekly', role: 'IT Support Specialist', weeklyRate: 1400, hoursWorked: 160, overtimeHours: 4,  monthlyPay: 5600 },
    { id: 'EMP010', name: 'Janette Rosati',  employmentType: 'Hourly', role: 'Software Engineer',     hourlyRate: 55, hoursWorked: 150, overtimeHours: 12, monthlyPay: 9240 },
  ]
  return {
    EmployeeProvider: ({ children }) => children,
    useEmployees: () => ({
      employees,
      addEmployee:    vi.fn().mockResolvedValue({}),
      updateEmployee: vi.fn().mockResolvedValue(undefined),
      deleteEmployee: vi.fn().mockResolvedValue(undefined),
      getEmployee:    (id) => employees.find(e => e.id === id),
      isOnline:       false,
      syncVersion:    0,
    }),
  }
})

vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn().mockReturnValue({
    user: null,
    employeeLogin: vi.fn().mockResolvedValue({ ok: false, error: 'Incorrect email or password.' }),
    employeeRegister: vi.fn().mockResolvedValue({ ok: false, error: 'An account with this email already exists.' }),
    adminLogin: vi.fn(),
    adminRegister: vi.fn(),
    logout: vi.fn(),
  }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────
const wrap = (ui) =>
  render(<MemoryRouter>{ui}</MemoryRouter>)

// ── LandingPage ───────────────────────────────────────────────────────────────
describe('LandingPage', () => {
  it('renders the hero headline', () => {
    wrap(<LandingPage />)
    expect(screen.getByText(/Seamless Payroll/i)).toBeDefined()
  })

  it('renders the Wageora logo text', () => {
    wrap(<LandingPage />)
    expect(screen.getAllByText('Wageora').length).toBeGreaterThan(0)
  })

  it('has Admin login button', () => {
    wrap(<LandingPage />)
    expect(screen.getByRole('link', { name: 'Admin login' })).toBeDefined()
  })

  it('has Employee login link', () => {
    wrap(<LandingPage />)
    expect(screen.getByRole('link', { name: 'Employee login' })).toBeDefined()
  })

  it('has Sign up now CTA in banner', () => {
    wrap(<LandingPage />)
    expect(screen.getByRole('link', { name: 'Sign up now!' })).toBeDefined()
  })

  it('renders footer copyright', () => {
    wrap(<LandingPage />)
    expect(screen.getByText(/Wageora. All rights reserved/i)).toBeDefined()
  })
})

// ── LoginPage ─────────────────────────────────────────────────────────────────
describe('LoginPage', () => {
  it('renders the email and password inputs', () => {
    wrap(<LoginPage />)
    expect(screen.getByPlaceholderText('Email address')).toBeDefined()
    expect(screen.getByPlaceholderText('Password')).toBeDefined()
  })

  it('renders Sign in submit button', () => {
    wrap(<LoginPage />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDefined()
  })

  it('shows email validation error when submitted empty', async () => {
    const user = userEvent.setup()
    wrap(<LoginPage />)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Email is required.')).toBeDefined()
  })

  it('shows password validation error when only email filled', async () => {
    const user = userEvent.setup()
    wrap(<LoginPage />)
    await user.type(screen.getByPlaceholderText('Email address'), 'a@b.com')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Password is required.')).toBeDefined()
  })

  it('shows server error for wrong credentials', async () => {
    const user = userEvent.setup()
    wrap(<LoginPage />)
    await user.type(screen.getByPlaceholderText('Email address'), 'nobody@test.com')
    await user.type(screen.getByPlaceholderText('Password'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Incorrect email or password.')).toBeDefined()
  })

  it('has a link to the signup page', () => {
    wrap(<LoginPage />)
    expect(screen.getByRole('link', { name: 'Create account now' })).toBeDefined()
  })
})

// ── SignUpPage ────────────────────────────────────────────────────────────────
describe('SignUpPage', () => {
  it('renders name, email, password inputs', () => {
    wrap(<SignUpPage />)
    expect(screen.getByPlaceholderText('Full name')).toBeDefined()
    expect(screen.getByPlaceholderText('Email address')).toBeDefined()
    expect(screen.getByPlaceholderText('Create a password')).toBeDefined()
  })

  it('renders Sign up submit button', () => {
    wrap(<SignUpPage />)
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeDefined()
  })

  it('shows name error when name is too short', async () => {
    const user = userEvent.setup()
    wrap(<SignUpPage />)
    await user.type(screen.getByPlaceholderText('Full name'), 'A')
    await user.type(screen.getByPlaceholderText('Email address'), 'a@b.com')
    await user.type(screen.getByPlaceholderText('Create a password'), 'pass123')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(screen.getByText('Name must be at least 2 characters.')).toBeDefined()
  })

  it('shows email error for invalid email', async () => {
    const user = userEvent.setup()
    wrap(<SignUpPage />)
    await user.type(screen.getByPlaceholderText('Full name'), 'Valid Name')
    await user.type(screen.getByPlaceholderText('Email address'), 'notanemail')
    await user.type(screen.getByPlaceholderText('Create a password'), 'pass123')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(screen.getByText('Enter a valid email.')).toBeDefined()
  })

  it('shows password error for short password', async () => {
    const user = userEvent.setup()
    wrap(<SignUpPage />)
    await user.type(screen.getByPlaceholderText('Full name'), 'Valid Name')
    await user.type(screen.getByPlaceholderText('Email address'), 'a@b.com')
    await user.type(screen.getByPlaceholderText('Create a password'), '123')
    await user.click(screen.getByRole('button', { name: 'Sign up' }))
    expect(screen.getByText('Password must be at least 6 characters.')).toBeDefined()
  })

  it('has a Sign in link in the footer', () => {
    wrap(<SignUpPage />)
    const links = screen.getAllByRole('link', { name: 'Sign in' })
    expect(links.length).toBeGreaterThan(0)
  })
})

// ── EmployeesPage ─────────────────────────────────────────────────────────────
describe('EmployeesPage', () => {
  it('renders the Employees title', () => {
    wrap(<EmployeesPage />)
    expect(screen.getByRole('heading', { name: 'Employees' })).toBeDefined()
  })

  it('shows total employee count in subtitle', () => {
    wrap(<EmployeesPage />)
    expect(screen.getByText(/10 total/)).toBeDefined()
  })

  it('renders the search input', () => {
    wrap(<EmployeesPage />)
    expect(screen.getByPlaceholderText('Search by name, role or ID…')).toBeDefined()
  })

  it('renders all cached employees in offline mode', () => {
    wrap(<EmployeesPage />)
    const rows = document.querySelectorAll('tbody tr')
    expect(rows.length).toBe(10)
  })

  it('shows Add Employee button', () => {
    wrap(<EmployeesPage />)
    expect(screen.getByRole('button', { name: '+ Add Employee' })).toBeDefined()
  })

  it('opens add modal when button is clicked', async () => {
    const user = userEvent.setup()
    wrap(<EmployeesPage />)
    await user.click(screen.getByRole('button', { name: '+ Add Employee' }))
    expect(screen.getByText('Add Employee')).toBeDefined()
  })

  it('filters rows by search term', async () => {
    const user = userEvent.setup()
    wrap(<EmployeesPage />)
    await user.type(screen.getByPlaceholderText('Search by name, role or ID…'), 'Marco')
    const rows = document.querySelectorAll('tbody tr')
    expect(rows.length).toBe(1)
  })

  it('shows empty state when search has no matches', async () => {
    const user = userEvent.setup()
    wrap(<EmployeesPage />)
    await user.type(screen.getByPlaceholderText('Search by name, role or ID…'), 'zzznomatch')
    expect(screen.getAllByText('No employees found.').length).toBeGreaterThan(0)
  })

  it('opens detail modal when View/Edit is clicked', async () => {
    const user = userEvent.setup()
    wrap(<EmployeesPage />)
    await user.click(screen.getAllByRole('button', { name: 'View/Edit' })[0])
    expect(screen.getByText('Pay Slips')).toBeDefined()
  })
})

import { describe, it, expect } from 'vitest'
import { validateLogin, validateSignup } from '../utils/validation'

// validateEmployee, calcMonthlyPay, calcAnnualPay have been moved to the backend.
// See backend/tests/test_employees.py and backend/tests/test_statistics.py.

// ── validateLogin ─────────────────────────────────────────────────────────────
describe('validateLogin', () => {
  it('passes for valid credentials',  () => expect(validateLogin({ email: 'a@b.com', password: 'secret123' })).toEqual({}))
  it('fails for invalid email',       () => expect(validateLogin({ email: 'notanemail', password: 'secret123' }).email).toBeDefined())
  it('fails for empty email',         () => expect(validateLogin({ email: '', password: 'secret123' }).email).toBeDefined())
  it('fails for short password',      () => expect(validateLogin({ email: 'a@b.com', password: '123' }).password).toBeDefined())
  it('fails for missing password',    () => expect(validateLogin({ email: 'a@b.com', password: '' }).password).toBeDefined())
})

// ── validateSignup ────────────────────────────────────────────────────────────
describe('validateSignup', () => {
  it('passes for valid data',              () => expect(validateSignup({ name: 'Ana Pop', email: 'a@b.com', password: 'secret123' })).toEqual({}))
  it('fails when name is missing',         () => expect(validateSignup({ name: '', email: 'a@b.com', password: 'secret123' }).name).toBeDefined())
  it('fails when name is too short',       () => expect(validateSignup({ name: 'A', email: 'a@b.com', password: 'secret123' }).name).toBeDefined())
  it('validates email and password too',   () => {
    const e = validateSignup({ name: 'Ana', email: 'bad', password: '1' })
    expect(e.email).toBeDefined()
    expect(e.password).toBeDefined()
  })
})

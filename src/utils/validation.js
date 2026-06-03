// Auth-only validation - employee/pay-calc validation lives in the backend.

export const validateLogin = ({ email, password }) => {
  const errors = {}
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Please enter a valid email address.'
  if (!password || password.length < 6)
    errors.password = 'Password must be at least 6 characters.'
  return errors
}

export const validateSignup = ({ name, email, password }) => {
  const errors = validateLogin({ email, password })
  if (!name || name.trim().length < 2)
    errors.name = 'Name must be at least 2 characters.'
  return errors
}

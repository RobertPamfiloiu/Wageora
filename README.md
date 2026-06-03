# Wageora – Payroll Management App

A full-stack payroll management application. React + Vite frontend, FastAPI backend (in-memory storage).

## Tech Stack

**Frontend**
- React 18 + React Router v6
- Recharts (donut + bar charts)
- Vitest + Testing Library (unit tests)
- Playwright (E2E tests)

**Backend**
- FastAPI + Pydantic v2
- In-memory storage (no database)
- pytest + httpx (unit tests)

---

## Quick Start

Both servers must be running simultaneously. Open two terminals.

### 1. Backend

```bash
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Start server
uvicorn main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### 2. Frontend

```bash
# From project root

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
# → http://localhost:5173
```

The frontend proxies `/employees`, `/auth`, `/structure`, `/statistics`, and `/health` to `http://localhost:8000`.

---

## Project Structure

```
Wageora/
├── backend/
│   ├── main.py                  ← FastAPI app, CORS, router registration
│   ├── store.py                 ← EmployeeStore (in-memory, seeded with 10 employees)
│   ├── auth_store.py            ← AuthStore (separate admin + employee pools)
│   ├── structure_store.py       ← StructureStore (custom roles list)
│   ├── services.py              ← Pay calculation logic
│   ├── models/
│   │   ├── employee.py          ← Pydantic models: Create, Update, Response, Paginated
│   │   └── auth.py              ← UserCreate, UserResponse
│   ├── routers/
│   │   ├── employees.py         ← CRUD + pagination + search
│   │   ├── auth.py              ← /auth/admin/* and /auth/employee/*
│   │   ├── structure.py         ← /structure/roles CRUD
│   │   └── statistics.py        ← /statistics summary endpoint
│   ├── tests/
│   │   ├── conftest.py          ← fixtures (seeded store, test client)
│   │   ├── test_employees.py
│   │   ├── test_auth.py
│   │   ├── test_structure.py
│   │   └── test_statistics.py
│   ├── pytest.ini
│   └── requirements.txt
│
├── src/
│   ├── context/
│   │   ├── AuthContext.jsx      ← auth state, login/register calls
│   │   ├── EmployeeContext.jsx  ← employee state, fetch-based CRUD
│   │   └── AppContext.jsx       ← combines auth + employee contexts
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── EmployeeModal.jsx    ← add/edit employee modal
│   │   ├── DetailModal.jsx      ← pay slip popup
│   │   └── ProtectedRoute.jsx  ← guards routes by auth + account type
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx        ← employee login
│   │   ├── SignUpPage.jsx       ← employee registration
│   │   ├── AdminLoginPage.jsx
│   │   ├── AdminSignupPage.jsx
│   │   ├── EmployeesPage.jsx    ← paginated table + CRUD
│   │   ├── EmployeeDetail.jsx   ← individual employee view
│   │   ├── ChartsPage.jsx       ← donut + bar charts
│   │   └── StructurePage.jsx    ← admin role management
│   ├── utils/
│   │   ├── validation.js        ← login/signup form validation
│   │   └── cookies.js           ← activity tracking
│   └── tests/
│       ├── pages.test.jsx
│       ├── appContext.test.jsx
│       ├── components.test.jsx
│       └── validation.test.js
│
├── e2e/
│   └── wageora.spec.js          ← Playwright E2E scenarios
└── vite.config.js
```

---

## Testing

### Backend (pytest)

```bash
cd backend

# Run all tests with coverage
py -m pytest

# Run without coverage
py -m pytest --no-cov

# Run a specific file
py -m pytest tests/test_employees.py
```

Coverage report prints to terminal after each run.

### Frontend (Vitest)

```bash
# From project root

# Run once
npm test

# Run with coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

### E2E (Playwright)

```bash
# Install browsers (first time only)
npx playwright install

# Run E2E tests (both servers must be running)
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui
```

---

## Accounts

Admin and employee accounts are independent pools — the same email address can hold both an admin account and an employee account.

- **Admin** – full access: employee CRUD, charts, role management via Structure page
- **Employee** – limited access (login/dashboard only)

The backend is in-memory only. All data resets when the backend server restarts.

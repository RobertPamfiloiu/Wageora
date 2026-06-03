# Wageora - Payroll Management App

A full-stack payroll management application built with React + Vite and FastAPI.

**Live:** https://wageora.onrender.com

## Tech Stack

**Frontend**
- React 18 + React Router v6
- Recharts (pie + bar charts)
- WebSockets (real-time employee feed)
- Vitest + Testing Library (unit tests)
- Playwright (E2E tests)

**Backend**
- FastAPI + Pydantic v2
- SQLAlchemy + SQLite
- JWT authentication (python-jose + bcrypt)
- Strawberry GraphQL (payslips)
- WebSockets (chat + live faker feed)
- pytest + httpx (unit tests)

## Quick Start

Both servers must be running simultaneously. Open two terminals.

### 1. Backend

```bash
cd backend

# Install dependencies (first time only)
pip install -r requirements.txt

# Start server
uvicorn main:app --reload
# -> http://localhost:8000
# -> http://localhost:8000/docs  (Swagger UI)
```

### 2. Frontend

```bash
# From project root

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
# -> http://localhost:5173
```

The frontend proxies all `/api/*` requests to `http://localhost:8000` in development.

## Project Structure

```
Wageora/
├── backend/
│   ├── main.py                  <- FastAPI app, CORS, JWT middleware, router registration
│   ├── database.py              <- SQLAlchemy engine + session setup
│   ├── db_models.py             <- ORM models (User, Employee, Payslip, etc.)
│   ├── jwt_utils.py             <- JWT encode/decode, password hashing
│   ├── graphql_schema.py        <- Strawberry GraphQL schema (payslips)
│   ├── websocket_manager.py     <- WebSocket connection manager
│   ├── seed.py                  <- Seed data (employees, roles)
│   ├── services.py              <- Pay calculation logic
│   ├── crud/
│   │   ├── employees.py         <- Employee CRUD
│   │   ├── users.py             <- User registration + login
│   │   ├── payslips.py          <- Payslip CRUD
│   │   ├── roles.py             <- Role management
│   │   ├── logs.py              <- Action logging + suspicious activity detection
│   │   └── chat.py              <- Chat message persistence
│   ├── models/
│   │   ├── employee.py          <- Pydantic models: Create, Update, Response
│   │   ├── auth.py              <- UserCreate, UserResponse
│   │   └── payslip.py           <- Payslip models
│   ├── routers/
│   │   ├── auth.py              <- /api/auth/admin/* and /api/auth/employee/*
│   │   ├── employees.py         <- CRUD + pagination + search
│   │   ├── payslips.py          <- Payslip endpoints + GraphQL
│   │   ├── structure.py         <- /api/structure/roles CRUD
│   │   ├── statistics.py        <- /api/statistics summary
│   │   ├── chat.py              <- WebSocket chat
│   │   ├── faker_gen.py         <- Live employee generator (WebSocket)
│   │   └── admin_logs.py        <- Action logs + suspicious user management
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_employees.py
│   │   ├── test_payslips.py
│   │   ├── test_structure.py
│   │   ├── test_statistics.py
│   │   └── test_logs.py
│   ├── pytest.ini
│   └── requirements.txt
│
├── src/
│   ├── main.jsx                 <- Entry point, global fetch override for production
│   ├── App.jsx                  <- Routes
│   ├── context/
│   │   ├── AuthContext.jsx      <- Auth state, login/register/logout
│   │   ├── EmployeeContext.jsx  <- Employee state, CRUD, offline queue, WebSocket
│   │   └── AppContext.jsx       <- Combines contexts
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── EmployeeModal.jsx    <- Add/edit employee modal
│   │   ├── DetailModal.jsx      <- Employee detail popup
│   │   └── ProtectedRoute.jsx  <- Route guards by auth + account type
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── LoginPage.jsx        <- Employee login
│   │   ├── SignUpPage.jsx       <- Employee registration
│   │   ├── AdminLoginPage.jsx
│   │   ├── AdminSignupPage.jsx
│   │   ├── EmployeesPage.jsx    <- Infinite scroll table + CRUD
│   │   ├── EmployeeDetail.jsx   <- Individual employee view
│   │   ├── ChartsPage.jsx       <- Pie + bar charts + live edit table
│   │   ├── PayslipsPage.jsx     <- Payslip management (GraphQL)
│   │   ├── ChatPage.jsx         <- Real-time WebSocket chat
│   │   ├── StructurePage.jsx    <- Role management
│   │   └── AdminLogsPage.jsx    <- Action logs + suspicious activity
│   └── utils/
│       ├── api.js               <- authHeaders(), apiFetch()
│       ├── validation.js        <- Login/signup form validation
│       └── cookies.js           <- Activity tracking
│
├── e2e/
│   └── wageora.spec.js          <- Playwright E2E scenarios
└── vite.config.js
```

## Testing

### Backend (pytest)

```bash
cd backend

# Run all tests with coverage
py -m pytest

# Run without coverage
py -m pytest --no-cov

# Run a specific file
py -m pytest tests/test_auth.py
```

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

## Accounts

Admin and employee accounts are independent pools - the same email can hold both an admin and an employee account.

- **Admin** - full access: employee CRUD, charts, payslips, role management, chat, security logs
- **Employee** - restricted access: view employees, view own payslips, charts, chat

On first startup the backend seeds the database with sample employees and roles.

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `JWT_SECRET` | Backend | Secret key for signing JWT tokens. Set a strong random value in production. |
| `VITE_BACKEND_URL` | Frontend (build time) | Backend base URL. Required when frontend and backend are on different domains. |

## Deployment

The app is deployed on Render as two separate services:

- **Backend** - Web Service (Python), root directory: `backend`, start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Frontend** - Static Site, build command: `npm install && npm run build`, publish directory: `dist`

The static site requires a Redirect/Rewrite rule (`/*` -> `/index.html`, Rewrite) for React Router to work correctly on page refresh.

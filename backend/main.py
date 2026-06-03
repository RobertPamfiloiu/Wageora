from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import SessionLocal, init_db
from graphql_schema import graphql_app
from jwt_utils import decode_token
from routers.admin_logs import router as admin_logs_router
from routers.auth import router as auth_router
from routers.chat import router as chat_router
from routers.employees import router as employees_router
from routers.faker_gen import router as faker_router
from routers.payslips import router as payslips_router
from routers.statistics import router as statistics_router
from routers.structure import router as structure_router

app = FastAPI(title="Wageora API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

# Paths that do not require a JWT token
_PUBLIC_PATHS = {
    "/", "/api/health", "/docs", "/redoc", "/openapi.json",
    "/api/auth/admin/register", "/api/auth/admin/login",
    "/api/auth/employee/register", "/api/auth/employee/login",
}

# Paths that require admin role
_ADMIN_PREFIXES = ("/api/admin/", "/api/structure/", "/api/faker/")


@app.middleware("http")
async def jwt_auth_middleware(request: Request, call_next):
    # CORS preflight and explicitly public paths bypass auth
    if request.method == "OPTIONS":
        return await call_next(request)
    if request.url.path in _PUBLIC_PATHS:
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return JSONResponse(
            {"detail": "Not authenticated. Please log in."},
            status_code=401,
        )

    payload = decode_token(auth[7:])
    if payload is None:
        return JSONResponse(
            {"detail": "Token invalid or expired. Please log in again."},
            status_code=401,
        )

    request.state.user = {
        "id": payload.get("sub", ""),
        "name": payload.get("name", ""),
        "account_type": payload.get("account_type", ""),
        "permissions": payload.get("permissions", []),
    }

    if any(request.url.path.startswith(p) for p in _ADMIN_PREFIXES):
        if request.state.user.get("account_type") != "admin":
            return JSONResponse({"detail": "Admin access required."}, status_code=403)

    return await call_next(request)


app.include_router(employees_router,  prefix="/api")
app.include_router(statistics_router, prefix="/api")
app.include_router(auth_router,       prefix="/api")
app.include_router(structure_router,  prefix="/api")
app.include_router(faker_router,      prefix="/api")
app.include_router(payslips_router,   prefix="/api")
app.include_router(chat_router,       prefix="/api")
app.include_router(admin_logs_router, prefix="/api")
app.include_router(graphql_app,       prefix="/api/graphql")


@app.on_event("startup")
def startup() -> None:
    init_db()
    db = SessionLocal()
    try:
        from crud.roles import seed_roles
        from crud.users import seed_groups_and_permissions
        from seed import seed_employees
        seed_roles(db)
        seed_groups_and_permissions(db)
        seed_employees(db)
    finally:
        db.close()


@app.get("/", include_in_schema=False)
def root() -> JSONResponse:
    return JSONResponse({"message": "Wageora API — frontend is at http://localhost:5173",
                         "docs": "http://localhost:8000/docs"})


@app.get("/api/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}

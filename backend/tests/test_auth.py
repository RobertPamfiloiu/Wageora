import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import db_models  # noqa
from database import Base, get_db
from main import app


def _fresh_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = Session()
    from crud.roles import seed_roles
    from crud.users import seed_groups_and_permissions
    seed_roles(db)
    seed_groups_and_permissions(db)
    return db


@pytest.fixture
def auth_client():
    """Unauthenticated client used to test auth endpoints (login / register)."""
    db = _fresh_db()

    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    yield TestClient(app)
    app.dependency_overrides.clear()
    db.close()


ADMIN = {"name": "Alice Admin", "email": "alice@test.com", "password": "pass123"}
EMP = {"name": "Bob Worker", "email": "bob@test.com", "password": "pass456"}

# Register

def test_admin_register_success(auth_client):
    r = auth_client.post("/api/auth/admin/register", json=ADMIN)
    assert r.status_code == 201
    body = r.json()
    assert body["user"]["name"] == "Alice Admin"
    assert body["user"]["account_type"] == "admin"
    assert "password" not in body["user"]


def test_admin_register_returns_token(auth_client):
    body = auth_client.post("/api/auth/admin/register", json=ADMIN).json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 20


def test_admin_register_returns_user_id(auth_client):
    body = auth_client.post("/api/auth/admin/register", json=ADMIN).json()
    assert "id" in body["user"] and len(body["user"]["id"]) > 0


def test_admin_register_duplicate_email(auth_client):
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    assert auth_client.post("/api/auth/admin/register", json=ADMIN).status_code == 409


def test_admin_register_short_name(auth_client):
    assert auth_client.post("/api/auth/admin/register", json={**ADMIN, "name": "A"}).status_code == 422


def test_admin_register_invalid_email(auth_client):
    assert auth_client.post("/api/auth/admin/register", json={**ADMIN, "email": "notanemail"}).status_code == 422


def test_admin_register_short_password(auth_client):
    assert auth_client.post("/api/auth/admin/register", json={**ADMIN, "password": "12"}).status_code == 422


# Login

def test_admin_login_success(auth_client):
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    r = auth_client.post("/api/auth/admin/login", json={"email": ADMIN["email"], "password": ADMIN["password"]})
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["account_type"] == "admin"
    assert "access_token" in body


def test_admin_login_returns_jwt(auth_client):
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    body = auth_client.post("/api/auth/admin/login", json={"email": ADMIN["email"], "password": ADMIN["password"]}).json()
    token = body["access_token"]
    # JWT is three base64 segments separated by dots
    assert token.count(".") == 2


def test_admin_login_case_insensitive_email(auth_client):
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    r = auth_client.post("/api/auth/admin/login", json={"email": ADMIN["email"].upper(), "password": ADMIN["password"]})
    assert r.status_code == 200


def test_admin_login_wrong_password(auth_client):
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    assert auth_client.post("/api/auth/admin/login", json={"email": ADMIN["email"], "password": "wrong"}).status_code == 401


def test_admin_login_nonexistent(auth_client):
    assert auth_client.post("/api/auth/admin/login", json={"email": "nobody@test.com", "password": "pass"}).status_code == 401


def test_employee_register_success(auth_client):
    r = auth_client.post("/api/auth/employee/register", json=EMP)
    assert r.status_code == 201
    assert r.json()["user"]["account_type"] == "employee"


def test_employee_register_duplicate(auth_client):
    auth_client.post("/api/auth/employee/register", json=EMP)
    assert auth_client.post("/api/auth/employee/register", json=EMP).status_code == 409


def test_employee_login_success(auth_client):
    auth_client.post("/api/auth/employee/register", json=EMP)
    r = auth_client.post("/api/auth/employee/login", json={"email": EMP["email"], "password": EMP["password"]})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_employee_login_wrong_password(auth_client):
    auth_client.post("/api/auth/employee/register", json=EMP)
    assert auth_client.post("/api/auth/employee/login", json={"email": EMP["email"], "password": "wrong"}).status_code == 401


def test_same_email_can_be_admin_and_employee(auth_client):
    shared = {"name": "Shared User", "email": "shared@test.com", "password": "pass123"}
    assert auth_client.post("/api/auth/admin/register", json=shared).status_code == 201
    assert auth_client.post("/api/auth/employee/register", json=shared).status_code == 201


def test_admin_credentials_rejected_for_employee_login(auth_client):
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    assert auth_client.post("/api/auth/employee/login", json={"email": ADMIN["email"], "password": ADMIN["password"]}).status_code == 401


def test_employee_credentials_rejected_for_admin_login(auth_client):
    auth_client.post("/api/auth/employee/register", json=EMP)
    assert auth_client.post("/api/auth/admin/login", json={"email": EMP["email"], "password": EMP["password"]}).status_code == 401


# Permissions

def test_admin_has_full_permissions(auth_client):
    body = auth_client.post("/api/auth/admin/register", json=ADMIN).json()
    perms = body["user"]["permissions"]
    for p in ["manage_employees", "view_employees", "manage_payslips",
              "view_payslips", "manage_roles", "view_statistics",
              "view_logs", "use_chat"]:
        assert p in perms, f"Admin missing permission: {p}"


def test_employee_has_restricted_permissions(auth_client):
    body = auth_client.post("/api/auth/employee/register", json=EMP).json()
    perms = body["user"]["permissions"]
    assert "view_employees" in perms
    assert "view_payslips" in perms
    for restricted in ["manage_employees", "manage_payslips", "manage_roles", "view_logs"]:
        assert restricted not in perms, f"Employee should not have: {restricted}"


def test_login_returns_permissions(auth_client):
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    body = auth_client.post("/api/auth/admin/login", json={"email": ADMIN["email"], "password": ADMIN["password"]}).json()
    assert "permissions" in body["user"]
    assert len(body["user"]["permissions"]) > 0


# JWT token validation & protected routes

def test_protected_route_without_token_returns_401(auth_client):
    assert auth_client.get("/api/employees").status_code == 401


def test_protected_route_with_invalid_token_returns_401(auth_client):
    r = auth_client.get("/api/employees", headers={"Authorization": "Bearer not.a.real.token"})
    assert r.status_code == 401


def test_protected_route_with_valid_token_succeeds(auth_client):
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    token_body = auth_client.post("/api/auth/admin/login", json={"email": ADMIN["email"], "password": ADMIN["password"]}).json()
    token = token_body["access_token"]
    r = auth_client.get("/api/employees", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def test_employee_token_cannot_access_admin_route(auth_client):
    auth_client.post("/api/auth/employee/register", json=EMP)
    token = auth_client.post("/api/auth/employee/login", json={"email": EMP["email"], "password": EMP["password"]}).json()["access_token"]
    r = auth_client.get("/api/admin/logs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403


def test_admin_token_can_access_admin_route(auth_client):
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    token = auth_client.post("/api/auth/admin/login", json={"email": ADMIN["email"], "password": ADMIN["password"]}).json()["access_token"]
    r = auth_client.get("/api/admin/logs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200


def test_me_endpoint_returns_user(auth_client):
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    token = auth_client.post("/api/auth/admin/login", json={"email": ADMIN["email"], "password": ADMIN["password"]}).json()["access_token"]
    r = auth_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["account_type"] == "admin"


def test_password_is_hashed_not_stored_plain(auth_client):
    """Verify the stored hash is a bcrypt hash, not plain text."""
    from database import get_db as real_get_db
    from db_models import User
    auth_client.post("/api/auth/admin/register", json=ADMIN)
    # Override is active - grab DB from override
    db = next(auth_client.app.dependency_overrides[real_get_db]())
    user = db.query(User).filter(User.email == ADMIN["email"]).first()
    assert user is not None
    assert user.password_hash.startswith("$2b$"), "Password should be bcrypt-hashed"
    assert user.password_hash != ADMIN["password"]

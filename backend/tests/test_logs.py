"""Tests for Gold challenge: action logging and suspicious-user detection."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import db_models  # noqa – register ORM models
from database import Base, get_db
from main import app

_SETUP_ADMIN = {"name": "Log Setup Admin", "email": "logsetup@test.com", "password": "setup123"}


@pytest.fixture
def log_client():
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
    from seed import seed_employees
    seed_roles(db)
    seed_groups_and_permissions(db)
    seed_employees(db)

    def _override():
        yield db

    app.dependency_overrides[get_db] = _override

    setup = TestClient(app)
    setup.post("/api/auth/admin/register", json=_SETUP_ADMIN)
    resp = setup.post("/api/auth/admin/login", json={"email": _SETUP_ADMIN["email"], "password": _SETUP_ADMIN["password"]})
    token = resp.json()["access_token"]

    yield TestClient(app, headers={"Authorization": f"Bearer {token}"})
    app.dependency_overrides.clear()
    db.close()


ADMIN = {"name": "Log Admin", "email": "logadmin@test.com", "password": "pass123"}


def test_register_creates_log(log_client):
    log_client.post("/api/auth/admin/register", json=ADMIN)
    r = log_client.get("/api/admin/logs")
    assert r.status_code == 200
    logs = r.json()
    assert any(l["action"] == "register" for l in logs)


def test_login_creates_log(log_client):
    log_client.post("/api/auth/admin/register", json=ADMIN)
    log_client.post("/api/auth/admin/login", json={"email": ADMIN["email"], "password": ADMIN["password"]})
    logs = log_client.get("/api/admin/logs").json()
    assert any(l["action"] == "login" for l in logs)


def test_failed_login_creates_log(log_client):
    log_client.post("/api/auth/admin/register", json=ADMIN)
    log_client.post("/api/auth/admin/login", json={"email": ADMIN["email"], "password": "wrongpass"})
    logs = log_client.get("/api/admin/logs").json()
    assert any(l["action"] == "login_failed" for l in logs)


def test_create_employee_creates_log(log_client):
    log_client.post("/api/employees", json={
        "name": "Test User", "role": "Manager",
        "employmentType": "Salary", "salary": 60000
    })
    logs = log_client.get("/api/admin/logs").json()
    assert any(l["action"] == "create_employee" for l in logs)


def test_delete_employee_creates_log(log_client):
    log_client.delete("/api/employees/EMP001")
    logs = log_client.get("/api/admin/logs").json()
    assert any(l["action"] == "delete_employee" for l in logs)


def test_log_entries_have_required_fields(log_client):
    log_client.post("/api/auth/admin/register", json=ADMIN)
    log = log_client.get("/api/admin/logs").json()[0]
    for field in ("user_id", "group_name", "action", "timestamp"):
        assert field in log, f"Missing field: {field}"


def test_suspicious_users_endpoint(log_client):
    r = log_client.get("/api/admin/suspicious")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_dismiss_suspicious_not_found(log_client):
    assert log_client.delete("/api/admin/suspicious/9999").status_code == 404


def test_logs_ordered_by_timestamp_desc(log_client):
    log_client.post("/api/auth/admin/register", json=ADMIN)
    log_client.post("/api/auth/admin/login", json={"email": ADMIN["email"], "password": ADMIN["password"]})
    logs = log_client.get("/api/admin/logs").json()
    if len(logs) >= 2:
        assert logs[0]["timestamp"] >= logs[1]["timestamp"]

"""
Test configuration.

Every fixture creates a fresh in-memory SQLite database so tests are fully
isolated.  StaticPool is required so all SQLAlchemy sessions share one
connection (SQLite in-memory DBs vanish when the connection closes).

Protected routes now require a Bearer token.  The `client` and `empty_client`
fixtures automatically register + login an admin user and inject the token into
every request, so existing tests need no changes.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app

import db_models  # noqa – register all ORM models with Base before any create_all

_TEST_ADMIN = {"name": "Test Admin", "email": "testadmin@wageora.test", "password": "testpass123"}


def _make_db(with_employees: bool = True):
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
    if with_employees:
        from seed import seed_employees
        seed_employees(db)
    return db


def _authenticated_client(db, extra_headers: dict | None = None) -> TestClient:
    """Return a TestClient pre-configured with an admin Bearer token."""
    def _override():
        yield db

    app.dependency_overrides[get_db] = _override

    # Use a plain (no-auth) client to obtain the token
    setup = TestClient(app, raise_server_exceptions=True)
    setup.post("/api/auth/admin/register", json=_TEST_ADMIN)
    resp = setup.post(
        "/api/auth/admin/login",
        json={"email": _TEST_ADMIN["email"], "password": _TEST_ADMIN["password"]},
    )
    assert resp.status_code == 200, f"Test admin login failed: {resp.text}"
    token = resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    if extra_headers:
        headers.update(extra_headers)
    return TestClient(app, headers=headers, raise_server_exceptions=True)


@pytest.fixture
def client() -> TestClient:
    db = _make_db(with_employees=True)
    yield _authenticated_client(db)
    app.dependency_overrides.clear()
    db.close()


@pytest.fixture
def empty_client() -> TestClient:
    db = _make_db(with_employees=False)
    yield _authenticated_client(db)
    app.dependency_overrides.clear()
    db.close()

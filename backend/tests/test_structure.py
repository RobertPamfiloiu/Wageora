import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import db_models  # noqa – register ORM models
from database import Base, get_db
from main import app

_SETUP_ADMIN = {"name": "Str Setup Admin", "email": "strsetup@test.com", "password": "setup123"}


@pytest.fixture
def str_client():
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


def test_list_roles_returns_defaults(str_client):
    roles = str_client.get("/api/structure/roles").json()
    assert isinstance(roles, list)
    assert "HR Manager" in roles
    assert "Software Engineer" in roles


def test_list_roles_count(str_client):
    assert len(str_client.get("/api/structure/roles").json()) == 8


def test_add_role_success(str_client):
    r = str_client.post("/api/structure/roles", json={"name": "Data Scientist"})
    assert r.status_code == 201
    assert r.json() == "Data Scientist"


def test_add_role_appears_in_list(str_client):
    str_client.post("/api/structure/roles", json={"name": "New Role"})
    assert "New Role" in str_client.get("/api/structure/roles").json()


def test_add_role_duplicate(str_client):
    assert str_client.post("/api/structure/roles", json={"name": "HR Manager"}).status_code == 409


def test_add_role_too_short(str_client):
    assert str_client.post("/api/structure/roles", json={"name": "X"}).status_code == 422


def test_add_role_whitespace_trimmed(str_client):
    r = str_client.post("/api/structure/roles", json={"name": "  Analyst  "})
    assert r.status_code == 201
    assert "Analyst" in str_client.get("/api/structure/roles").json()


def test_delete_role_success(str_client):
    assert str_client.delete("/api/structure/roles/HR Manager").status_code == 204


def test_delete_role_removed_from_list(str_client):
    str_client.delete("/api/structure/roles/HR Manager")
    assert "HR Manager" not in str_client.get("/api/structure/roles").json()


def test_delete_role_not_found(str_client):
    assert str_client.delete("/api/structure/roles/NonExistentRole").status_code == 404


def test_roles_count_after_add_and_delete(str_client):
    str_client.post("/api/structure/roles", json={"name": "Analyst"})
    str_client.delete("/api/structure/roles/Analyst")
    assert len(str_client.get("/api/structure/roles").json()) == 8

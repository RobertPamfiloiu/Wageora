from __future__ import annotations

import uuid
from typing import List, Optional

from sqlalchemy.orm import Session

from db_models import GroupPermission, Permission, User, UserGroup
from jwt_utils import hash_password, verify_password

# Seed data for groups & permissions

ADMIN_PERMISSIONS = [
    ("manage_employees",  "Create, edit and delete employees"),
    ("view_employees",    "View employee list and details"),
    ("manage_payslips",   "Create, edit and delete payslips"),
    ("view_payslips",     "View payslips"),
    ("manage_roles",      "Add and remove employee roles"),
    ("view_statistics",   "Access the analytics dashboard"),
    ("view_logs",         "View action logs and suspicious users"),
    ("use_chat",          "Send and receive chat messages"),
]

EMPLOYEE_PERMISSIONS = [
    ("view_employees",  "View employee list and details"),
    ("view_payslips",   "View payslips"),
    ("view_statistics", "Access the analytics dashboard"),
    ("use_chat",        "Send and receive chat messages"),
]


def seed_groups_and_permissions(db: Session) -> None:
    if db.query(UserGroup).count() > 0:
        return

    perm_map: dict[str, Permission] = {}
    for pname, pdesc in ADMIN_PERMISSIONS:
        perm_map[pname] = Permission(name=pname, description=pdesc)
        db.add(perm_map[pname])

    for pname, pdesc in EMPLOYEE_PERMISSIONS:
        if pname not in perm_map:
            perm_map[pname] = Permission(name=pname, description=pdesc)
            db.add(perm_map[pname])

    db.flush()

    admin_group = UserGroup(name="admin", description="Full access")
    employee_group = UserGroup(name="employee", description="Restricted access")
    db.add(admin_group)
    db.add(employee_group)
    db.flush()

    for pname, _ in ADMIN_PERMISSIONS:
        db.add(GroupPermission(group_id=admin_group.id, permission_id=perm_map[pname].id))
    for pname, _ in EMPLOYEE_PERMISSIONS:
        db.add(GroupPermission(group_id=employee_group.id, permission_id=perm_map[pname].id))

    db.commit()


# Helpers

def _group_for_type(db: Session, account_type: str) -> UserGroup:
    group = db.query(UserGroup).filter(UserGroup.name == account_type).first()
    if group is None:
        raise RuntimeError(f"Group '{account_type}' not seeded – call seed_groups_and_permissions first.")
    return group


def _public(user: User) -> dict:
    perms = [p.name for p in user.group.permissions]
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "account_type": user.group.name,
        "permissions": perms,
    }


# CRUD

def register(db: Session, account_type: str, name: str, email: str, password: str) -> dict:
    group = _group_for_type(db, account_type)
    existing = (
        db.query(User)
        .filter(User.email == email.lower(), User.group_id == group.id)
        .first()
    )
    if existing:
        raise ValueError("Email already registered.")
    user = User(
        id=uuid.uuid4().hex[:8],
        name=name,
        email=email.lower(),
        password_hash=hash_password(password),
        group_id=group.id,
    )
    db.add(user)
    db.flush()
    db.refresh(user)
    return _public(user)


def login(db: Session, account_type: str, email: str, password: str) -> Optional[dict]:
    group = _group_for_type(db, account_type)
    user = (
        db.query(User)
        .filter(User.email == email.strip().lower(), User.group_id == group.id)
        .first()
    )
    if user is None or not verify_password(password, user.password_hash):
        return None
    return _public(user)


def get_by_id(db: Session, user_id: str) -> Optional[dict]:
    user = db.query(User).filter(User.id == user_id).first()
    return _public(user) if user else None


def get_all(db: Session) -> List[dict]:
    return [_public(u) for u in db.query(User).all()]

from __future__ import annotations

from typing import List

from sqlalchemy.orm import Session

from db_models import Employee, EmployeeRole

_DEFAULT_ROLES = [
    "HR Manager", "Accountant", "Cleaner", "Cashier",
    "Software Engineer", "IT Support Specialist", "Manager", "Other",
]


def seed_roles(db: Session) -> None:
    if db.query(EmployeeRole).count() > 0:
        return
    for name in _DEFAULT_ROLES:
        db.add(EmployeeRole(name=name))
    db.commit()


def get_all(db: Session) -> List[str]:
    return [r.name for r in db.query(EmployeeRole).order_by(EmployeeRole.name).all()]


def add_role(db: Session, name: str) -> str:
    name = name.strip()
    if len(name) < 2:
        raise ValueError("Role name must be at least 2 characters.")
    if db.query(EmployeeRole).filter(EmployeeRole.name == name).first():
        raise ValueError(f'Role "{name}" already exists.')
    db.add(EmployeeRole(name=name))
    db.flush()
    return name


def delete_role(db: Session, name: str) -> bool:
    role = db.query(EmployeeRole).filter(EmployeeRole.name == name).first()
    if role is None:
        return False
    db.delete(role)
    db.flush()
    return True

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from db_models import Employee, EmployeeRole


# Helpers
def _get_or_create_role(db: Session, name: str) -> EmployeeRole:
    role = db.query(EmployeeRole).filter(EmployeeRole.name == name).first()
    if role is None:
        role = EmployeeRole(name=name)
        db.add(role)
        db.flush()
    return role


def _next_id(db: Session) -> str:
    max_id: Optional[str] = db.query(func.max(Employee.id)).scalar()
    if max_id is None:
        return "EMP001"
    num = int(max_id[3:]) + 1
    return f"EMP{num:03d}"


def _to_dict(emp: Employee) -> dict:
    return {
        "id": emp.id,
        "name": emp.name,
        "role": emp.role_obj.name,
        "employmentType": emp.employment_type,
        "salary": emp.salary,
        "hourlyRate": emp.hourly_rate,
        "weeklyRate": emp.weekly_rate,
        "hoursWorked": emp.hours_worked,
        "overtimeHours": emp.overtime_hours,
    }


# CRUD
def get_all(db: Session, search: Optional[str] = None) -> List[dict]:
    q = db.query(Employee)
    emps = q.all()
    result = [_to_dict(e) for e in emps]
    if search:
        s = search.lower()
        result = [
            e for e in result
            if s in e["name"].lower() or s in e["role"].lower() or s in e["id"].lower()
        ]
    return result


def get_one(db: Session, emp_id: str) -> Optional[dict]:
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    return _to_dict(emp) if emp else None


def create(db: Session, data: dict) -> dict:
    role = _get_or_create_role(db, data["role"])
    emp_id = _next_id(db)
    emp = Employee(
        id=emp_id,
        name=data["name"],
        role_id=role.id,
        employment_type=data["employmentType"],
        salary=data.get("salary"),
        hourly_rate=data.get("hourlyRate"),
        weekly_rate=data.get("weeklyRate"),
        hours_worked=data.get("hoursWorked", 160.0),
        overtime_hours=data.get("overtimeHours", 0.0),
    )
    db.add(emp)
    db.flush()
    db.refresh(emp)
    return _to_dict(emp)


def update(db: Session, emp_id: str, patch: dict) -> Optional[dict]:
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if emp is None:
        return None
    if "role" in patch:
        emp.role_id = _get_or_create_role(db, patch.pop("role")).id
    field_map = {
        "name": "name",
        "employmentType": "employment_type",
        "salary": "salary",
        "hourlyRate": "hourly_rate",
        "weeklyRate": "weekly_rate",
        "hoursWorked": "hours_worked",
        "overtimeHours": "overtime_hours",
    }
    for api_key, col in field_map.items():
        if api_key in patch:
            setattr(emp, col, patch[api_key])
    db.flush()
    db.refresh(emp)
    return _to_dict(emp)


def delete(db: Session, emp_id: str) -> Optional[dict]:
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if emp is None:
        return None
    d = _to_dict(emp)
    db.delete(emp)
    db.flush()
    return d

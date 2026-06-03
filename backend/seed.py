"""Seed the relational database with the 10 initial employees."""
from __future__ import annotations

from sqlalchemy.orm import Session

from crud.employees import _get_or_create_role
from db_models import Employee

_SEED = [
    {"id": "EMP001", "name": "Marco Rosario",   "employmentType": "Salary", "role": "HR Manager",            "salary": 85000,  "hourlyRate": None, "weeklyRate": None, "hoursWorked": 160, "overtimeHours": 5},
    {"id": "EMP002", "name": "Maria Rosario",   "employmentType": "Salary", "role": "Accountant",            "salary": 72000,  "hourlyRate": None, "weeklyRate": None, "hoursWorked": 160, "overtimeHours": 0},
    {"id": "EMP003", "name": "Ornell Antonio",  "employmentType": "Hourly", "role": "Accountant",            "salary": None,   "hourlyRate": 35,   "weeklyRate": None, "hoursWorked": 152, "overtimeHours": 8},
    {"id": "EMP004", "name": "Sophie Martino",  "employmentType": "Hourly", "role": "Cleaner",               "salary": None,   "hourlyRate": 18,   "weeklyRate": None, "hoursWorked": 120, "overtimeHours": 0},
    {"id": "EMP005", "name": "Jack O'Connor",   "employmentType": "Salary", "role": "Cashier",               "salary": 44000,  "hourlyRate": None, "weeklyRate": None, "hoursWorked": 160, "overtimeHours": 2},
    {"id": "EMP006", "name": "Emma Moore",      "employmentType": "Hourly", "role": "Cleaner",               "salary": None,   "hourlyRate": 18,   "weeklyRate": None, "hoursWorked": 100, "overtimeHours": 0},
    {"id": "EMP007", "name": "Elena Blumberg",  "employmentType": "Hourly", "role": "Software Engineer",     "salary": None,   "hourlyRate": 60,   "weeklyRate": None, "hoursWorked": 160, "overtimeHours": 20},
    {"id": "EMP008", "name": "Elara Davy",      "employmentType": "Weekly", "role": "Software Engineer",     "salary": None,   "hourlyRate": None, "weeklyRate": 2200, "hoursWorked": 160, "overtimeHours": 10},
    {"id": "EMP009", "name": "Mabel Dominguez", "employmentType": "Weekly", "role": "IT Support Specialist", "salary": None,   "hourlyRate": None, "weeklyRate": 1400, "hoursWorked": 160, "overtimeHours": 4},
    {"id": "EMP010", "name": "Janette Rosati",  "employmentType": "Hourly", "role": "Software Engineer",     "salary": None,   "hourlyRate": 55,   "weeklyRate": None, "hoursWorked": 150, "overtimeHours": 12},
]


def seed_employees(db: Session) -> None:
    if db.query(Employee).count() > 0:
        return
    for emp in _SEED:
        role = _get_or_create_role(db, emp["role"])
        db.add(Employee(
            id=emp["id"],
            name=emp["name"],
            role_id=role.id,
            employment_type=emp["employmentType"],
            salary=emp.get("salary"),
            hourly_rate=emp.get("hourlyRate"),
            weekly_rate=emp.get("weeklyRate"),
            hours_worked=emp.get("hoursWorked", 160.0),
            overtime_hours=emp.get("overtimeHours", 0.0),
        ))
    db.commit()

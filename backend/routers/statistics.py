from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import crud.employees as emp_crud
from database import get_db
from models.employee import EmploymentType
from services import calc_monthly_pay, get_department

router = APIRouter(prefix="/statistics", tags=["statistics"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get("")
def get_statistics(db: DbDep) -> dict:
    employees = emp_crud.get_all(db)
    total = len(employees)
    total_monthly_payroll = sum(calc_monthly_pay(e) for e in employees)

    by_type: dict[str, int] = {et.value: 0 for et in EmploymentType}
    for emp in employees:
        et = emp.get("employmentType")
        if et in by_type:
            by_type[et] += 1

    dept_map: dict[str, dict] = {}
    for emp in employees:
        dept = get_department(emp["role"])
        pay = calc_monthly_pay(emp)
        if dept not in dept_map:
            dept_map[dept] = {"name": dept, "count": 0, "monthly_spend": 0.0}
        dept_map[dept]["count"] += 1
        dept_map[dept]["monthly_spend"] += pay

    by_department = sorted(dept_map.values(), key=lambda d: d["monthly_spend"], reverse=True)
    for dept in by_department:
        pct = (dept["monthly_spend"] / total_monthly_payroll * 100) if total_monthly_payroll else 0.0
        dept["pct"] = round(pct, 1)
        dept["monthly_spend"] = round(dept["monthly_spend"], 2)

    return {
        "total_employees": total,
        "total_monthly_payroll": round(total_monthly_payroll, 2),
        "by_employment_type": by_type,
        "by_department": by_department,
    }

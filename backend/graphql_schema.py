"""
Gold Challenge – GraphQL interface (Strawberry).

Exposes the same employees and payslips data already maintained by the REST
layer, through a /graphql endpoint.  The frontend's PayslipsPage uses this
exclusively for payslip CRUD + stats to demonstrate GraphQL in action.
"""
from __future__ import annotations

from typing import Optional

import strawberry
from strawberry.fastapi import GraphQLRouter

import crud.employees as emp_crud
import crud.payslips as pay_crud
from database import SessionLocal
from models.employee import EmployeeCreate
from models.payslip import PayslipCreate
from services import to_response


def _db():
    return SessionLocal()


# GraphQL types

@strawberry.type
class EmployeeType:
    id: str
    name: str
    role: str
    employment_type: str
    salary: Optional[float]
    hourly_rate: Optional[float]
    weekly_rate: Optional[float]
    hours_worked: float
    overtime_hours: float
    monthly_pay: float


@strawberry.type
class EmployeePage:
    items: list[EmployeeType]
    total: int
    page: int
    page_size: int
    total_pages: int


@strawberry.type
class PayslipType:
    id: str
    employee_id: str
    month: int
    year: int
    gross_pay: float
    deductions: float
    net_pay: float
    status: str
    period_label: str


@strawberry.type
class MonthEntry:
    period: str
    net_pay: float


@strawberry.type
class PayslipStats:
    total_payslips: int
    total_paid: float
    total_pending: float
    by_month: list[MonthEntry]


# Conversion helpers

def _emp_to_gql(emp: dict) -> EmployeeType:
    r = to_response(emp)
    return EmployeeType(
        id=r["id"],
        name=r["name"],
        role=r["role"],
        employment_type=r["employmentType"],
        salary=r.get("salary"),
        hourly_rate=r.get("hourlyRate"),
        weekly_rate=r.get("weeklyRate"),
        hours_worked=r["hoursWorked"],
        overtime_hours=r["overtimeHours"],
        monthly_pay=r["monthlyPay"],
    )


def _pay_to_gql(p: dict) -> PayslipType:
    return PayslipType(**p)


# Query

@strawberry.type
class Query:
    @strawberry.field
    def employees(
        self,
        page: int = 1,
        page_size: int = 10,
        search: str = "",
    ) -> EmployeePage:
        db = _db()
        try:
            all_emps = emp_crud.get_all(db, search=search or None)
            total = len(all_emps)
            total_pages = max(1, -(-total // page_size))
            start = (page - 1) * page_size
            items = [_emp_to_gql(to_response(e)) for e in all_emps[start: start + page_size]]
            return EmployeePage(items=items, total=total, page=page,
                                page_size=page_size, total_pages=total_pages)
        finally:
            db.close()

    @strawberry.field
    def employee(self, id: str) -> Optional[EmployeeType]:
        db = _db()
        try:
            emp = emp_crud.get_one(db, id)
            return _emp_to_gql(to_response(emp)) if emp else None
        finally:
            db.close()

    @strawberry.field
    def payslips(self, employee_id: str) -> list[PayslipType]:
        db = _db()
        try:
            return [_pay_to_gql(p) for p in pay_crud.get_all_for_employee(db, employee_id)]
        finally:
            db.close()

    @strawberry.field
    def payslip_stats(self, employee_id: str) -> PayslipStats:
        db = _db()
        try:
            s = pay_crud.stats(db, employee_id)
            return PayslipStats(
                total_payslips=s["total_payslips"],
                total_paid=s["total_paid"],
                total_pending=s["total_pending"],
                by_month=[MonthEntry(**m) for m in s["by_month"]],
            )
        finally:
            db.close()


# Mutation

@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_employee(
        self,
        name: str,
        role: str,
        employment_type: str,
        salary: Optional[float] = None,
        hourly_rate: Optional[float] = None,
        weekly_rate: Optional[float] = None,
        hours_worked: float = 160.0,
        overtime_hours: float = 0.0,
    ) -> EmployeeType:
        data = {
            "name": name, "role": role,
            "employmentType": employment_type,
            "salary": salary,
            "hourlyRate": hourly_rate,
            "weeklyRate": weekly_rate,
            "hoursWorked": hours_worked,
            "overtimeHours": overtime_hours,
        }
        EmployeeCreate(**data)
        db = _db()
        try:
            emp = emp_crud.create(db, data)
            db.commit()
            return _emp_to_gql(to_response(emp))
        finally:
            db.close()

    @strawberry.mutation
    def delete_employee(self, id: str) -> bool:
        db = _db()
        try:
            result = emp_crud.delete(db, id)
            db.commit()
            return result is not None
        finally:
            db.close()

    @strawberry.mutation
    def create_payslip(
        self,
        employee_id: str,
        month: int,
        year: int,
        gross_pay: float,
        deductions: float = 0.0,
        status: str = "Pending",
    ) -> PayslipType:
        data = {
            "employee_id": employee_id,
            "month": month, "year": year,
            "gross_pay": gross_pay,
            "deductions": deductions,
            "status": status,
        }
        PayslipCreate(**data)
        db = _db()
        try:
            if emp_crud.get_one(db, employee_id) is None:
                raise ValueError("Employee not found.")
            p = pay_crud.create(db, data)
            db.commit()
            return _pay_to_gql(p)
        finally:
            db.close()

    @strawberry.mutation
    def update_payslip(
        self,
        id: str,
        gross_pay: Optional[float] = None,
        deductions: Optional[float] = None,
        status: Optional[str] = None,
    ) -> Optional[PayslipType]:
        patch = {k: v for k, v in {"gross_pay": gross_pay, "deductions": deductions, "status": status}.items() if v is not None}
        db = _db()
        try:
            p = pay_crud.update(db, id, patch)
            db.commit()
            return _pay_to_gql(p) if p else None
        finally:
            db.close()

    @strawberry.mutation
    def delete_payslip(self, id: str) -> bool:
        db = _db()
        try:
            result = pay_crud.delete(db, id)
            db.commit()
            return result is not None
        finally:
            db.close()


# Assemble

schema = strawberry.Schema(query=Query, mutation=Mutation)
graphql_app = GraphQLRouter(schema)
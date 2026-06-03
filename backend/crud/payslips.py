from __future__ import annotations

import calendar
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from db_models import Payslip


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _next_id(db: Session) -> str:
    max_id: Optional[str] = db.query(func.max(Payslip.id)).scalar()
    if max_id is None:
        return "PAY0001"
    num = int(max_id[3:]) + 1
    return f"PAY{num:04d}"


def _enrich(p: Payslip) -> dict:
    return {
        "id": p.id,
        "employee_id": p.employee_id,
        "month": p.month,
        "year": p.year,
        "gross_pay": p.gross_pay,
        "deductions": p.deductions,
        "net_pay": round(p.gross_pay - p.deductions, 2),
        "status": p.status,
        "period_label": f"{calendar.month_abbr[p.month]} {p.year}",
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def get_all_for_employee(db: Session, employee_id: str) -> List[dict]:
    rows = db.query(Payslip).filter(Payslip.employee_id == employee_id).all()
    return [_enrich(p) for p in rows]


def get_one(db: Session, payslip_id: str) -> Optional[dict]:
    p = db.query(Payslip).filter(Payslip.id == payslip_id).first()
    return _enrich(p) if p else None


def create(db: Session, data: dict) -> dict:
    pid = _next_id(db)
    p = Payslip(
        id=pid,
        employee_id=data["employee_id"],
        month=data["month"],
        year=data["year"],
        gross_pay=data["gross_pay"],
        deductions=data.get("deductions", 0.0),
        status=data.get("status", "Pending"),
    )
    db.add(p)
    db.flush()
    db.refresh(p)
    return _enrich(p)


def update(db: Session, payslip_id: str, patch: dict) -> Optional[dict]:
    p = db.query(Payslip).filter(Payslip.id == payslip_id).first()
    if p is None:
        return None
    for field in ("gross_pay", "deductions", "status"):
        if field in patch:
            setattr(p, field, patch[field])
    db.flush()
    db.refresh(p)
    return _enrich(p)


def delete(db: Session, payslip_id: str) -> Optional[dict]:
    p = db.query(Payslip).filter(Payslip.id == payslip_id).first()
    if p is None:
        return None
    d = _enrich(p)
    db.delete(p)
    db.flush()
    return d


def stats(db: Session, employee_id: str) -> dict:
    payslips = get_all_for_employee(db, employee_id)
    paid = sum(p["net_pay"] for p in payslips if p["status"] == "Paid")
    pending = sum(p["net_pay"] for p in payslips if p["status"] == "Pending")
    monthly: dict[str, float] = {}
    for p in payslips:
        lbl = p["period_label"]
        monthly[lbl] = round(monthly.get(lbl, 0) + p["net_pay"], 2)
    return {
        "total_payslips": len(payslips),
        "total_paid": round(paid, 2),
        "total_pending": round(pending, 2),
        "by_month": [{"period": k, "net_pay": v} for k, v in sorted(monthly.items())],
    }

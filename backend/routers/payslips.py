from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud.employees as emp_crud
import crud.payslips as pay_crud
from database import get_db
from models.payslip import PayslipCreate, PayslipResponse, PayslipStatsResponse, PayslipUpdate

router = APIRouter(prefix="/payslips", tags=["payslips"])

DbDep = Annotated[Session, Depends(get_db)]


def _require_employee(emp_id: str, db: Session) -> None:
    if emp_crud.get_one(db, emp_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")


@router.get("/employee/{emp_id}", response_model=list[PayslipResponse])
def list_payslips(emp_id: str, db: DbDep) -> list[PayslipResponse]:
    _require_employee(emp_id, db)
    return pay_crud.get_all_for_employee(db, emp_id)


@router.get("/employee/{emp_id}/stats", response_model=PayslipStatsResponse)
def payslip_stats(emp_id: str, db: DbDep) -> PayslipStatsResponse:
    _require_employee(emp_id, db)
    return pay_crud.stats(db, emp_id)


@router.post("", response_model=PayslipResponse, status_code=status.HTTP_201_CREATED)
def create_payslip(payload: PayslipCreate, db: DbDep) -> PayslipResponse:
    _require_employee(payload.employee_id, db)
    result = pay_crud.create(db, payload.model_dump())
    db.commit()
    return result


@router.put("/{payslip_id}", response_model=PayslipResponse)
def update_payslip(payslip_id: str, payload: PayslipUpdate, db: DbDep) -> PayslipResponse:
    updated = pay_crud.update(db, payslip_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payslip not found.")
    db.commit()
    return updated


@router.delete("/{payslip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payslip(payslip_id: str, db: DbDep) -> None:
    if pay_crud.delete(db, payslip_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payslip not found.")
    db.commit()
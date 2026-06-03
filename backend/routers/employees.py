from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

import crud.employees as emp_crud
import crud.logs as log_crud
from database import get_db
from models.employee import (
    EmployeeCreate, EmployeeResponse, EmployeeUpdate, PaginatedResponse,
)
from services import to_response

router = APIRouter(prefix="/employees", tags=["employees"])

DbDep = Annotated[Session, Depends(get_db)]


def _ctx(req: Request) -> tuple[str, str, str]:
    u = getattr(req.state, "user", None) or {}
    if u:
        return u.get("id", "anonymous"), u.get("name", "anonymous"), u.get("account_type", "user").upper()
    uid   = req.headers.get("X-User-Id",    "anonymous")
    uname = req.headers.get("X-User-Name",  "anonymous")
    gname = req.headers.get("X-User-Group", "user").upper()
    return uid, uname, gname


@router.get("", response_model=PaginatedResponse)
def list_employees(
    db: DbDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=7, ge=1, le=100),
    search: Optional[str] = Query(default=None),
) -> PaginatedResponse:
    employees = emp_crud.get_all(db, search=search)
    total = len(employees)
    total_pages = max(1, -(-total // page_size))
    start = (page - 1) * page_size
    items = [to_response(e) for e in employees[start: start + page_size]]
    return PaginatedResponse(items=items, total=total, page=page,
                             page_size=page_size, total_pages=total_pages)


@router.get("/{emp_id}", response_model=EmployeeResponse)
def get_employee(emp_id: str, db: DbDep) -> EmployeeResponse:
    emp = emp_crud.get_one(db, emp_id)
    if emp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    return to_response(emp)


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(request: Request, payload: EmployeeCreate, db: DbDep) -> EmployeeResponse:
    emp = emp_crud.create(db, payload.model_dump())
    db.commit()
    uid, uname, gname = _ctx(request)
    log_crud.log_action(db, uid, uname, gname, "create_employee", {"employee_id": emp["id"]})
    log_crud.check_suspicious(db, uid, uname, "", "create_employee")
    db.commit()
    return to_response(emp)


@router.put("/{emp_id}", response_model=EmployeeResponse)
def update_employee(request: Request, emp_id: str, payload: EmployeeUpdate, db: DbDep) -> EmployeeResponse:
    existing = emp_crud.get_one(db, emp_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    patch = payload.model_dump(exclude_unset=True)
    merged = {**existing, **patch}
    try:
        EmployeeCreate(**{k: v for k, v in merged.items() if k != "id"})
    except ValidationError as exc:
        detail = [{"type": e["type"], "msg": e["msg"]} for e in exc.errors()]
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)
    updated = emp_crud.update(db, emp_id, patch)
    db.commit()
    uid, uname, gname = _ctx(request)
    log_crud.log_action(db, uid, uname, gname, "update_employee", {"employee_id": emp_id})
    db.commit()
    return to_response(updated)


@router.delete("/{emp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(request: Request, emp_id: str, db: DbDep) -> None:
    deleted = emp_crud.delete(db, emp_id)
    if deleted is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found.")
    db.commit()
    uid, uname, gname = _ctx(request)
    log_crud.log_action(db, uid, uname, gname, "delete_employee", {"employee_id": emp_id})
    log_crud.check_suspicious(db, uid, uname, "", "delete_employee")
    db.commit()

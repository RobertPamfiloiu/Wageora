"""
Gold Challenge – Admin-only endpoints for the logging system and
suspicious-user observation list.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud.logs as log_crud
from database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

DbDep = Annotated[Session, Depends(get_db)]


@router.get("/logs")
def get_logs(db: DbDep, limit: int = 200) -> list:
    return log_crud.get_all_logs(db, limit)


@router.get("/suspicious")
def get_suspicious(db: DbDep) -> list:
    return log_crud.get_suspicious_users(db)


@router.delete("/suspicious/{sus_id}", status_code=status.HTTP_204_NO_CONTENT)
def dismiss_suspicious(sus_id: int, db: DbDep) -> None:
    if not log_crud.dismiss_suspicious(db, sus_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found.")
    db.commit()

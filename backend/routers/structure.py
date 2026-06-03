from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

import crud.roles as role_crud
from database import get_db

router = APIRouter(prefix="/structure", tags=["structure"])

DbDep = Annotated[Session, Depends(get_db)]


class RoleRequest(BaseModel):
    name: str


@router.get("/roles", response_model=list[str])
def list_roles(db: DbDep) -> list[str]:
    return role_crud.get_all(db)


@router.post("/roles", response_model=str, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleRequest, db: DbDep) -> str:
    try:
        name = role_crud.add_role(db, payload.name)
        db.commit()
        return name
    except ValueError as exc:
        code = status.HTTP_409_CONFLICT if "already exists" in str(exc) else status.HTTP_422_UNPROCESSABLE_ENTITY
        raise HTTPException(status_code=code, detail=str(exc))


@router.delete("/roles/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(name: str, db: DbDep) -> None:
    if not role_crud.delete_role(db, name):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f'Role "{name}" not found.')
    db.commit()

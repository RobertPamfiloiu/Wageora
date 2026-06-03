from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import crud.logs as log_crud
import crud.users as user_crud
from database import get_db
from jwt_utils import create_access_token
from models.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

DbDep = Annotated[Session, Depends(get_db)]


def _make_token(user: dict) -> TokenResponse:
    payload = {
        "sub": user["id"],
        "name": user["name"],
        "account_type": user["account_type"],
        "permissions": user["permissions"],
    }
    token = create_access_token(payload)
    return TokenResponse(access_token=token, token_type="bearer", user=UserResponse(**user))


def _register(account_type: str, payload: RegisterRequest, db: DbDep) -> TokenResponse:
    try:
        user = user_crud.register(db, account_type, payload.name, payload.email, payload.password)
        db.commit()
        log_crud.log_action(db, user["id"], user["name"], account_type.upper(),
                            "register", {"email": user["email"]})
        db.commit()
        return _make_token(user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


def _login(account_type: str, payload: LoginRequest, db: DbDep, request: Request) -> TokenResponse:
    ip = request.client.host if request.client else ""
    user = user_crud.login(db, account_type, payload.email, payload.password)
    if user is None:
        fake_id = payload.email[:8]
        log_crud.log_action(db, fake_id, payload.email, account_type.upper(),
                            "login_failed", {"email": payload.email}, ip)
        log_crud.check_suspicious(db, fake_id, payload.email, payload.email, "login_failed")
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect email or password.")
    log_crud.log_action(db, user["id"], user["name"], account_type.upper(),
                        "login", {"email": user["email"]}, ip)
    log_crud.check_suspicious(db, user["id"], user["name"], user["email"], "login")
    db.commit()
    return _make_token(user)


@router.post("/admin/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def admin_register(payload: RegisterRequest, db: DbDep) -> TokenResponse:
    return _register("admin", payload, db)


@router.post("/admin/login", response_model=TokenResponse)
def admin_login(payload: LoginRequest, db: DbDep, request: Request) -> TokenResponse:
    return _login("admin", payload, db, request)


@router.post("/employee/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def employee_register(payload: RegisterRequest, db: DbDep) -> TokenResponse:
    return _register("employee", payload, db)


@router.post("/employee/login", response_model=TokenResponse)
def employee_login(payload: LoginRequest, db: DbDep, request: Request) -> TokenResponse:
    return _login("employee", payload, db, request)


@router.get("/me", response_model=UserResponse)
def get_me(request: Request) -> UserResponse:
    """Return the current authenticated user decoded from the JWT."""
    u = getattr(request.state, "user", None)
    if not u:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return UserResponse(
        id=u["id"],
        name=u["name"],
        email=u.get("email", ""),
        account_type=u["account_type"],
        permissions=u.get("permissions", []),
    )

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from db_models import ActionLog, SuspiciousUser

# Thresholds for malevolent behaviour detection
_FAILED_LOGIN_LIMIT = 5          # failed logins in 10 min
_FAILED_LOGIN_WINDOW = 10        # minutes
_DELETE_LIMIT = 10               # delete actions in 5 min
_DELETE_WINDOW = 5               # minutes
_RAPID_CALLS_LIMIT = 50          # any action in 1 min
_RAPID_CALLS_WINDOW = 1          # minutes


def log_action(
    db: Session,
    user_id: str,
    user_name: str,
    group_name: str,
    action: str,
    action_detail: Optional[dict] = None,
    ip_address: str = "",
) -> ActionLog:
    entry = ActionLog(
        user_id=user_id,
        user_name=user_name,
        group_name=group_name.upper(),
        action=action,
        action_detail=json.dumps(action_detail or {}),
        ip_address=ip_address,
        timestamp=datetime.utcnow(),
    )
    db.add(entry)
    db.flush()
    return entry


def _flag_suspicious(
    db: Session,
    user_id: str,
    user_name: str,
    user_email: str,
    reason: str,
) -> None:
    existing = (
        db.query(SuspiciousUser)
        .filter(SuspiciousUser.user_id == user_id, SuspiciousUser.is_active == True)
        .first()
    )
    if existing:
        existing.action_count += 1
        existing.reason = reason
        existing.flagged_at = datetime.utcnow()
    else:
        db.add(SuspiciousUser(
            user_id=user_id,
            user_name=user_name,
            user_email=user_email,
            reason=reason,
        ))
    db.flush()


def check_suspicious(
    db: Session,
    user_id: str,
    user_name: str,
    user_email: str,
    action: str,
) -> None:
    now = datetime.utcnow()

    # rapid calls check (any action)
    rapid_cutoff = now - timedelta(minutes=_RAPID_CALLS_WINDOW)
    rapid_count = (
        db.query(ActionLog)
        .filter(ActionLog.user_id == user_id, ActionLog.timestamp >= rapid_cutoff)
        .count()
    )
    if rapid_count >= _RAPID_CALLS_LIMIT:
        _flag_suspicious(
            db, user_id, user_name, user_email,
            f"Excessive API calls: {rapid_count} actions in {_RAPID_CALLS_WINDOW} min",
        )
        return

    # delete-heavy check
    if "delete" in action.lower():
        del_cutoff = now - timedelta(minutes=_DELETE_WINDOW)
        del_count = (
            db.query(ActionLog)
            .filter(
                ActionLog.user_id == user_id,
                ActionLog.action.ilike("%delete%"),
                ActionLog.timestamp >= del_cutoff,
            )
            .count()
        )
        if del_count >= _DELETE_LIMIT:
            _flag_suspicious(
                db, user_id, user_name, user_email,
                f"Mass deletion: {del_count} delete actions in {_DELETE_WINDOW} min",
            )
            return

    # failed login check
    if "login_failed" in action.lower():
        login_cutoff = now - timedelta(minutes=_FAILED_LOGIN_WINDOW)
        fail_count = (
            db.query(ActionLog)
            .filter(
                ActionLog.user_id == user_id,
                ActionLog.action == "login_failed",
                ActionLog.timestamp >= login_cutoff,
            )
            .count()
        )
        if fail_count >= _FAILED_LOGIN_LIMIT:
            _flag_suspicious(
                db, user_id, user_name, user_email,
                f"Brute-force attempt: {fail_count} failed logins in {_FAILED_LOGIN_WINDOW} min",
            )


def get_all_logs(db: Session, limit: int = 200) -> List[dict]:
    rows = db.query(ActionLog).order_by(ActionLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": r.user_name,
            "group_name": r.group_name,
            "action": r.action,
            "action_detail": r.action_detail,
            "ip_address": r.ip_address,
            "timestamp": r.timestamp.isoformat(),
        }
        for r in rows
    ]


def get_suspicious_users(db: Session) -> List[dict]:
    rows = (
        db.query(SuspiciousUser)
        .filter(SuspiciousUser.is_active == True)
        .order_by(SuspiciousUser.flagged_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": r.user_name,
            "user_email": r.user_email,
            "reason": r.reason,
            "action_count": r.action_count,
            "flagged_at": r.flagged_at.isoformat(),
            "is_active": r.is_active,
        }
        for r in rows
    ]


def dismiss_suspicious(db: Session, sus_id: int) -> bool:
    row = db.query(SuspiciousUser).filter(SuspiciousUser.id == sus_id).first()
    if row is None:
        return False
    row.is_active = False
    db.flush()
    return True

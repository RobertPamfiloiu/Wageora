from __future__ import annotations

import asyncio
import random
from typing import Optional

from faker import Faker
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services import to_response
from websocket_manager import manager

router = APIRouter(tags=["faker"])
fake = Faker()

_ROLES = [
    "Software Engineer",
    "HR Manager",
    "Accountant",
    "Cashier",
    "Cleaner",
    "IT Support Specialist",
]
_TYPES = ["Salary", "Hourly", "Weekly"]

_task: Optional[asyncio.Task] = None


def _make_employee() -> dict:
    t = random.choice(_TYPES)
    return {
        "name": fake.name(),
        "role": random.choice(_ROLES),
        "employmentType": t,
        "salary":     round(random.uniform(40_000, 130_000), 2) if t == "Salary" else None,
        "hourlyRate": round(random.uniform(15, 90), 2)          if t == "Hourly" else None,
        "weeklyRate": round(random.uniform(800, 3_500), 2)      if t == "Weekly" else None,
        "hoursWorked":    round(random.uniform(80, 160), 1),
        "overtimeHours":  round(random.uniform(0, 20), 1),
    }


async def _generate_loop(batch_size: int, interval: float) -> None:
    from database import SessionLocal
    import crud.employees as emp_crud
    while True:
        db = SessionLocal()
        try:
            batch = [to_response(emp_crud.create(db, _make_employee())) for _ in range(batch_size)]
            db.commit()
        finally:
            db.close()
        await manager.broadcast({"event": "new_employees", "employees": batch})
        await asyncio.sleep(interval)


@router.post("/faker/start")
async def start_faker(batch_size: int = 3, interval: float = 5.0) -> dict:
    """Start the async loop that generates fake employees and pushes them via WebSocket."""
    global _task
    if _task and not _task.done():
        return {"status": "already_running"}
    _task = asyncio.create_task(_generate_loop(batch_size, interval))
    return {"status": "started", "batch_size": batch_size, "interval_seconds": interval}


@router.post("/faker/stop")
async def stop_faker() -> dict:
    """Stop the fake-employee generation loop."""
    global _task
    if _task and not _task.done():
        _task.cancel()
        return {"status": "stopped"}
    return {"status": "not_running"}


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    """WebSocket endpoint — clients connect here to receive live employee updates."""
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()   # keep connection alive; we only push, not receive
    except WebSocketDisconnect:
        manager.disconnect(ws)
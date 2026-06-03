"""
Silver Challenge – Real-time chat using TinyDB (NoSQL) + WebSockets.
Two (or more) logged-in users can chat in real time.
Messages are persisted in TinyDB, a document-oriented NoSQL database.
"""
from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from crud.chat import get_messages, save_message

router = APIRouter(prefix="/chat", tags=["chat"])

# In-memory connection registry: room -> list of (user_id, user_name, ws)
_rooms: dict[str, list[tuple[str, str, WebSocket]]] = {}


async def _broadcast_room(room: str, message: dict) -> None:
    dead = []
    for uid, uname, ws in _rooms.get(room, []):
        try:
            await ws.send_json(message)
        except Exception:
            dead.append((uid, uname, ws))
    for entry in dead:
        _rooms[room].remove(entry)


# REST endpoint to fetch chat history
@router.get("/history")
def chat_history(room: str = "general", limit: int = 50) -> list:
    return get_messages(room, limit)

# WebSocket endpoint
@router.websocket("/ws/{user_id}")
async def chat_ws(ws: WebSocket, user_id: str, user_name: Optional[str] = "User", room: str = "general") -> None:
    await ws.accept()
    _rooms.setdefault(room, []).append((user_id, user_name, ws))

    # Send chat history on connect
    history = get_messages(room)
    await ws.send_json({"type": "history", "messages": history})

    # Announce join
    join_msg = {"type": "system", "message": f"{user_name} joined the chat", "room": room}
    await _broadcast_room(room, join_msg)

    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            text = str(data.get("message", "")).strip()
            if not text:
                continue

            # Persist to TinyDB (NoSQL document store)
            saved = save_message(user_id, user_name, text, room)

            broadcast_payload = {
                "type": "message",
                "id": saved["id"],
                "sender_id": user_id,
                "sender_name": user_name,
                "message": text,
                "timestamp": saved["timestamp"],
                "room": room,
            }
            await _broadcast_room(room, broadcast_payload)

    except WebSocketDisconnect:
        conns = _rooms.get(room, [])
        _rooms[room] = [(u, n, w) for u, n, w in conns if w is not ws]
        leave_msg = {"type": "system", "message": f"{user_name} left the chat", "room": room}
        await _broadcast_room(room, leave_msg)

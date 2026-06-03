"""
NoSQL chat persistence using TinyDB – a lightweight document-oriented database.
TinyDB stores documents as JSON, making it a genuine NoSQL document store.
Each chat message is a document; no fixed schema is enforced.
"""
from __future__ import annotations

from datetime import datetime
from typing import List

from tinydb import Query, TinyDB

_db = TinyDB("chat_messages.json")
_messages_table = _db.table("messages")


def save_message(sender_id: str, sender_name: str, message: str, room: str = "general") -> dict:
    doc = {
        "sender_id": sender_id,
        "sender_name": sender_name,
        "message": message,
        "room": room,
        "timestamp": datetime.utcnow().isoformat(),
    }
    doc_id = _messages_table.insert(doc)
    return {**doc, "id": doc_id}


def get_messages(room: str = "general", limit: int = 50) -> List[dict]:
    Msg = Query()
    rows = _messages_table.search(Msg.room == room)
    # sort by timestamp descending, take last `limit`, return chronologically
    rows.sort(key=lambda x: x["timestamp"])
    rows = rows[-limit:]
    return [{**r, "id": r.doc_id} for r in rows]

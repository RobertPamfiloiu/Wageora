from __future__ import annotations
import uuid
from typing import Dict, Optional


class AuthStore:
    def __init__(self) -> None:
        self._admins: Dict[str, dict] = {}
        self._employees: Dict[str, dict] = {}

    def _pool(self, account_type: str) -> Dict[str, dict]:
        return self._admins if account_type == "admin" else self._employees

    def register(self, account_type: str, name: str, email: str, password: str) -> dict:
        pool = self._pool(account_type)
        if email in pool:
            raise ValueError("Email already registered.")
        user = {
            "id": uuid.uuid4().hex[:8],
            "name": name,
            "email": email,
            "password": password,
            "account_type": account_type,
        }
        pool[email] = user
        return self._public(user)

    def login(self, account_type: str, email: str, password: str) -> Optional[dict]:
        user = self._pool(account_type).get(email)
        if user is None or user["password"] != password:
            return None
        return self._public(user)

    @staticmethod
    def _public(user: dict) -> dict:
        return {k: v for k, v in user.items() if k != "password"}


_auth_store = AuthStore()


def get_auth_store() -> AuthStore:
    return _auth_store

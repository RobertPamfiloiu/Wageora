from __future__ import annotations
from typing import List

_DEFAULT_ROLES: List[str] = [
    "HR Manager", "Accountant", "Cleaner", "Cashier",
    "Software Engineer", "IT Support Specialist", "Manager", "Other",
]


class StructureStore:
    def __init__(self) -> None:
        self._roles: List[str] = list(_DEFAULT_ROLES)

    def get_roles(self) -> List[str]:
        return list(self._roles)

    def add_role(self, name: str) -> str:
        name = name.strip()
        if len(name) < 2:
            raise ValueError("Role name must be at least 2 characters.")
        if name in self._roles:
            raise ValueError(f'Role "{name}" already exists.')
        self._roles.append(name)
        return name

    def delete_role(self, name: str) -> bool:
        if name not in self._roles:
            return False
        self._roles.remove(name)
        return True


_structure_store = StructureStore()


def get_structure_store() -> StructureStore:
    return _structure_store

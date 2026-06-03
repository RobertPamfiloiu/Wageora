from __future__ import annotations

from typing import Dict, List, Optional

_SEED: List[dict] = [
    {"id": "EMP001", "name": "Marco Rosario",   "employmentType": "Salary", "role": "HR Manager",            "salary": 85000,    "hourlyRate": None, "weeklyRate": None, "hoursWorked": 160, "overtimeHours": 5},
    {"id": "EMP002", "name": "Maria Rosario",   "employmentType": "Salary", "role": "Accountant",            "salary": 72000,    "hourlyRate": None, "weeklyRate": None, "hoursWorked": 160, "overtimeHours": 0},
    {"id": "EMP003", "name": "Ornell Antonio",  "employmentType": "Hourly", "role": "Accountant",            "salary": None,     "hourlyRate": 35,   "weeklyRate": None, "hoursWorked": 152, "overtimeHours": 8},
    {"id": "EMP004", "name": "Sophie Martino",  "employmentType": "Hourly", "role": "Cleaner",               "salary": None,     "hourlyRate": 18,   "weeklyRate": None, "hoursWorked": 120, "overtimeHours": 0},
    {"id": "EMP005", "name": "Jack O'Connor",   "employmentType": "Salary", "role": "Cashier",               "salary": 44000,    "hourlyRate": None, "weeklyRate": None, "hoursWorked": 160, "overtimeHours": 2},
    {"id": "EMP006", "name": "Emma Moore",      "employmentType": "Hourly", "role": "Cleaner",               "salary": None,     "hourlyRate": 18,   "weeklyRate": None, "hoursWorked": 100, "overtimeHours": 0},
    {"id": "EMP007", "name": "Elena Blumberg",  "employmentType": "Hourly", "role": "Software Engineer",     "salary": None,     "hourlyRate": 60,   "weeklyRate": None, "hoursWorked": 160, "overtimeHours": 20},
    {"id": "EMP008", "name": "Elara Davy",      "employmentType": "Weekly", "role": "Software Engineer",     "salary": None,     "hourlyRate": None, "weeklyRate": 2200, "hoursWorked": 160, "overtimeHours": 10},
    {"id": "EMP009", "name": "Mabel Dominguez", "employmentType": "Weekly", "role": "IT Support Specialist", "salary": None,     "hourlyRate": None, "weeklyRate": 1400, "hoursWorked": 160, "overtimeHours": 4},
    {"id": "EMP010", "name": "Janette Rosati",  "employmentType": "Hourly", "role": "Software Engineer",     "salary": None,     "hourlyRate": 55,   "weeklyRate": None, "hoursWorked": 150, "overtimeHours": 12},
]


class EmployeeStore:
    def __init__(self, seed: bool = True) -> None:
        self._data: Dict[str, dict] = {}
        self._counter: int = 0
        if seed:
            self._load_seed()

    def _load_seed(self) -> None:
        for emp in _SEED:
            self._data[emp["id"]] = dict(emp)
            num = int(emp["id"][3:])
            if num > self._counter:
                self._counter = num

    def _next_id(self) -> str:
        self._counter += 1
        return f"EMP{self._counter:03d}"

    def all(self) -> List[dict]:
        return list(self._data.values())

    def get(self, emp_id: str) -> Optional[dict]:
        return self._data.get(emp_id)

    def create(self, data: dict) -> dict:
        emp_id = self._next_id()
        employee = {"id": emp_id, **data}
        self._data[emp_id] = employee
        return dict(employee)

    def update(self, emp_id: str, patch: dict) -> Optional[dict]:
        if emp_id not in self._data:
            return None
        self._data[emp_id].update(patch)
        return dict(self._data[emp_id])

    def delete(self, emp_id: str) -> Optional[dict]:
        return self._data.pop(emp_id, None)


_store = EmployeeStore()


def get_store() -> EmployeeStore:
    return _store

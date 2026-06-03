from __future__ import annotations

_DEPT_MAP: dict[str, str] = {
    "Software Engineer":     "Software / IT",
    "IT Support Specialist": "Software / IT",
    "HR Manager":            "HR",
    "Accountant":            "Accounting",
    "Cashier":               "Accounting",
    "Cleaner":               "Maintenance",
    "Manager":               "CEO / Mgmt",
}


def calc_monthly_pay(emp: dict) -> float:
    t = emp.get("employmentType")
    if t == "Salary":
        salary = emp.get("salary") or 0
        base = salary / 12
        overtime = (salary / 12 / 160 * 1.5) * (emp.get("overtimeHours") or 0)
        return base + overtime
    if t == "Hourly":
        rate = emp.get("hourlyRate") or 0
        base = rate * (emp.get("hoursWorked") or 0)
        overtime = rate * 1.5 * (emp.get("overtimeHours") or 0)
        return base + overtime
    if t == "Weekly":
        return (emp.get("weeklyRate") or 0) * 4
    return 0.0


def get_department(role: str) -> str:
    return _DEPT_MAP.get(role, "Other")


def to_response(emp: dict) -> dict:
    return {**emp, "monthlyPay": calc_monthly_pay(emp)}

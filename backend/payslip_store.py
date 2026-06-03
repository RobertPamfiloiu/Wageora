from __future__ import annotations

import calendar
from typing import Dict, List, Optional


class PayslipStore:
    """In-memory store for payslips - one employee can have many payslips."""

    def __init__(self) -> None:
        self._data: Dict[str, dict] = {}
        self._counter: int = 0

    def _next_id(self) -> str:
        self._counter += 1
        return f"PAY{self._counter:04d}"

    @staticmethod
    def _enrich(p: dict) -> dict:
        p = dict(p)
        p["net_pay"] = round(p["gross_pay"] - p["deductions"], 2)
        p["period_label"] = f"{calendar.month_abbr[p['month']]} {p['year']}"
        return p

    def all_for_employee(self, employee_id: str) -> List[dict]:
        return [
            self._enrich(p)
            for p in self._data.values()
            if p["employee_id"] == employee_id
        ]

    def get(self, payslip_id: str) -> Optional[dict]:
        p = self._data.get(payslip_id)
        return self._enrich(p) if p else None

    def create(self, data: dict) -> dict:
        pid = self._next_id()
        entry = {"id": pid, **data}
        self._data[pid] = entry
        return self._enrich(entry)

    def update(self, payslip_id: str, patch: dict) -> Optional[dict]:
        if payslip_id not in self._data:
            return None
        self._data[payslip_id].update(patch)
        return self._enrich(self._data[payslip_id])

    def delete(self, payslip_id: str) -> Optional[dict]:
        return self._data.pop(payslip_id, None)

    def stats(self, employee_id: str) -> dict:
        payslips = self.all_for_employee(employee_id)
        paid = sum(p["net_pay"] for p in payslips if p["status"] == "Paid")
        pending = sum(p["net_pay"] for p in payslips if p["status"] == "Pending")
        monthly: dict[str, float] = {}
        for p in payslips:
            lbl = p["period_label"]
            monthly[lbl] = round(monthly.get(lbl, 0) + p["net_pay"], 2)
        return {
            "total_payslips": len(payslips),
            "total_paid": round(paid, 2),
            "total_pending": round(pending, 2),
            "by_month": [{"period": k, "net_pay": v} for k, v in sorted(monthly.items())],
        }


_store = PayslipStore()


def get_payslip_store() -> PayslipStore:
    return _store
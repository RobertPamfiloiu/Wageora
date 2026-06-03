from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, field_validator


class PayslipStatus(str, Enum):
    pending = "Pending"
    paid = "Paid"


class PayslipCreate(BaseModel):
    employee_id: str
    month: int
    year: int
    gross_pay: float
    deductions: float = 0.0
    status: PayslipStatus = PayslipStatus.pending

    @field_validator("month")
    @classmethod
    def valid_month(cls, v: int) -> int:
        if not 1 <= v <= 12:
            raise ValueError("Month must be between 1 and 12.")
        return v

    @field_validator("year")
    @classmethod
    def valid_year(cls, v: int) -> int:
        if not 2000 <= v <= 2100:
            raise ValueError("Year must be between 2000 and 2100.")
        return v

    @field_validator("gross_pay")
    @classmethod
    def positive_gross(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Gross pay must be a positive number.")
        return v

    @field_validator("deductions")
    @classmethod
    def non_negative_ded(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Deductions cannot be negative.")
        return v


class PayslipUpdate(BaseModel):
    gross_pay: Optional[float] = None
    deductions: Optional[float] = None
    status: Optional[PayslipStatus] = None

    @field_validator("gross_pay")
    @classmethod
    def positive_gross(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Gross pay must be a positive number.")
        return v

    @field_validator("deductions")
    @classmethod
    def non_negative_ded(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Deductions cannot be negative.")
        return v


class PayslipResponse(BaseModel):
    id: str
    employee_id: str
    month: int
    year: int
    gross_pay: float
    deductions: float
    net_pay: float
    status: PayslipStatus
    period_label: str


class PayslipStatsResponse(BaseModel):
    total_payslips: int
    total_paid: float
    total_pending: float
    by_month: list[dict]
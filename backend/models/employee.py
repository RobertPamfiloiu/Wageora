from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator


class EmploymentType(str, Enum):
    salary = "Salary"
    hourly = "Hourly"
    weekly = "Weekly"


class EmployeeCreate(BaseModel):
    name: str
    role: str
    employmentType: EmploymentType
    salary: Optional[float] = None
    hourlyRate: Optional[float] = None
    weeklyRate: Optional[float] = None
    hoursWorked: float = 160.0
    overtimeHours: float = 0.0

    @field_validator("name")
    @classmethod
    def name_min_length(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters.")
        return v

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Role must be at least 2 characters.")
        return v

    @field_validator("hoursWorked")
    @classmethod
    def hours_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Hours worked must be 0 or more.")
        return v

    @field_validator("overtimeHours")
    @classmethod
    def overtime_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Overtime hours must be 0 or more.")
        return v

    @model_validator(mode="after")
    def rate_matches_type(self) -> EmployeeCreate:
        t = self.employmentType
        if t == EmploymentType.salary:
            if self.salary is None or self.salary <= 0:
                raise ValueError("Annual salary must be a positive number.")
        elif t == EmploymentType.hourly:
            if self.hourlyRate is None or self.hourlyRate <= 0:
                raise ValueError("Hourly rate must be a positive number.")
        elif t == EmploymentType.weekly:
            if self.weeklyRate is None or self.weeklyRate <= 0:
                raise ValueError("Weekly rate must be a positive number.")
        return self


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    employmentType: Optional[EmploymentType] = None
    salary: Optional[float] = None
    hourlyRate: Optional[float] = None
    weeklyRate: Optional[float] = None
    hoursWorked: Optional[float] = None
    overtimeHours: Optional[float] = None

    @field_validator("name")
    @classmethod
    def name_min_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Name must be at least 2 characters.")
        return v

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Role must be at least 2 characters.")
        return v

    @field_validator("hoursWorked")
    @classmethod
    def hours_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Hours worked must be 0 or more.")
        return v

    @field_validator("overtimeHours")
    @classmethod
    def overtime_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Overtime hours must be 0 or more.")
        return v


class EmployeeResponse(BaseModel):
    id: str
    name: str
    role: str
    employmentType: EmploymentType
    salary: Optional[float] = None
    hourlyRate: Optional[float] = None
    weeklyRate: Optional[float] = None
    hoursWorked: float
    overtimeHours: float
    monthlyPay: float


class PaginatedResponse(BaseModel):
    items: list[EmployeeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

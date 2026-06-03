from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

# Normalised employee roles  (3NF: role name lives here, not in employees)
class EmployeeRole(Base):
    __tablename__ = "employee_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    employees: Mapped[List["Employee"]] = relationship("Employee", back_populates="role_obj")


# Employees
class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("employee_roles.id"), nullable=False)
    employment_type: Mapped[str] = mapped_column(String(20), nullable=False)
    salary: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hourly_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weekly_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    hours_worked: Mapped[float] = mapped_column(Float, default=160.0)
    overtime_hours: Mapped[float] = mapped_column(Float, default=0.0)

    role_obj: Mapped["EmployeeRole"] = relationship("EmployeeRole", back_populates="employees")
    payslips: Mapped[List["Payslip"]] = relationship(
        "Payslip", back_populates="employee", cascade="all, delete-orphan"
    )

# User groups (admin / employee) + permissions  – Silver challenge
class UserGroup(Base):
    __tablename__ = "user_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(200), default="")

    users: Mapped[List["User"]] = relationship("User", back_populates="group")
    permissions: Mapped[List["Permission"]] = relationship(
        "Permission", secondary="group_permissions", back_populates="groups"
    )


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(200), default="")

    groups: Mapped[List["UserGroup"]] = relationship(
        "UserGroup", secondary="group_permissions", back_populates="permissions"
    )


class GroupPermission(Base):
    __tablename__ = "group_permissions"

    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("user_groups.id"), primary_key=True)
    permission_id: Mapped[int] = mapped_column(Integer, ForeignKey("permissions.id"), primary_key=True)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", "group_id", name="uq_email_group"),)

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(300), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    group_id: Mapped[int] = mapped_column(Integer, ForeignKey("user_groups.id"), nullable=False)

    group: Mapped["UserGroup"] = relationship("UserGroup", back_populates="users")


# Payslips  (1-to-many with Employee)
class Payslip(Base):
    __tablename__ = "payslips"

    id: Mapped[str] = mapped_column(String(10), primary_key=True)
    employee_id: Mapped[str] = mapped_column(
        String(10), ForeignKey("employees.id"), nullable=False
    )
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    gross_pay: Mapped[float] = mapped_column(Float, nullable=False)
    deductions: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="Pending")

    employee: Mapped["Employee"] = relationship("Employee", back_populates="payslips")

# Action logs  – Gold challenge
class ActionLog(Base):
    __tablename__ = "action_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(16), nullable=False)
    user_name: Mapped[str] = mapped_column(String(200), default="")
    group_name: Mapped[str] = mapped_column(String(50), nullable=False)  # ADMIN / USER
    action: Mapped[str] = mapped_column(String(200), nullable=False)
    action_detail: Mapped[str] = mapped_column(Text, default="")        # JSON blob
    ip_address: Mapped[str] = mapped_column(String(50), default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# Suspicious users observation list  – Gold challenge
class SuspiciousUser(Base):
    __tablename__ = "suspicious_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(16), nullable=False)
    user_name: Mapped[str] = mapped_column(String(200), default="")
    user_email: Mapped[str] = mapped_column(String(300), default="")
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    action_count: Mapped[int] = mapped_column(Integer, default=1)
    flagged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

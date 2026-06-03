"""Tests for payslip CRUD operations and stats – Bronze database tests."""
import pytest
from fastapi.testclient import TestClient


PAYSLIP_PAYLOAD = {
    "employee_id": "EMP001",
    "month": 3,
    "year": 2025,
    "gross_pay": 7500.0,
    "deductions": 500.0,
    "status": "Pending",
}


def test_create_payslip(client: TestClient) -> None:
    r = client.post("/api/payslips", json=PAYSLIP_PAYLOAD)
    assert r.status_code == 201
    body = r.json()
    assert body["employee_id"] == "EMP001"
    assert body["gross_pay"] == 7500.0
    assert body["net_pay"] == 7000.0


def test_create_payslip_id_format(client: TestClient) -> None:
    body = client.post("/api/payslips", json=PAYSLIP_PAYLOAD).json()
    assert body["id"].startswith("PAY")


def test_create_payslip_period_label(client: TestClient) -> None:
    body = client.post("/api/payslips", json=PAYSLIP_PAYLOAD).json()
    assert body["period_label"] == "Mar 2025"


def test_create_payslip_bad_employee(client: TestClient) -> None:
    bad = {**PAYSLIP_PAYLOAD, "employee_id": "EMP999"}
    assert client.post("/api/payslips", json=bad).status_code == 404


def test_create_payslip_bad_month(client: TestClient) -> None:
    assert client.post("/api/payslips", json={**PAYSLIP_PAYLOAD, "month": 13}).status_code == 422


def test_create_payslip_zero_gross(client: TestClient) -> None:
    assert client.post("/api/payslips", json={**PAYSLIP_PAYLOAD, "gross_pay": 0}).status_code == 422


def test_create_payslip_negative_deductions(client: TestClient) -> None:
    assert client.post("/api/payslips", json={**PAYSLIP_PAYLOAD, "deductions": -1}).status_code == 422


def test_list_payslips_for_employee(client: TestClient) -> None:
    client.post("/api/payslips", json=PAYSLIP_PAYLOAD)
    r = client.get("/api/payslips/employee/EMP001")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_list_payslips_bad_employee(client: TestClient) -> None:
    assert client.get("/api/payslips/employee/EMP999").status_code == 404


def test_update_payslip_status(client: TestClient) -> None:
    pid = client.post("/api/payslips", json=PAYSLIP_PAYLOAD).json()["id"]
    r = client.put(f"/api/payslips/{pid}", json={"status": "Paid"})
    assert r.status_code == 200
    assert r.json()["status"] == "Paid"


def test_update_payslip_gross(client: TestClient) -> None:
    pid = client.post("/api/payslips", json=PAYSLIP_PAYLOAD).json()["id"]
    r = client.put(f"/api/payslips/{pid}", json={"gross_pay": 9000.0})
    assert r.json()["gross_pay"] == 9000.0


def test_update_payslip_net_recalculated(client: TestClient) -> None:
    pid = client.post("/api/payslips", json=PAYSLIP_PAYLOAD).json()["id"]
    r = client.put(f"/api/payslips/{pid}", json={"gross_pay": 8000.0, "deductions": 1000.0})
    assert r.json()["net_pay"] == pytest.approx(7000.0)


def test_update_payslip_not_found(client: TestClient) -> None:
    assert client.put("/api/payslips/PAY9999", json={"status": "Paid"}).status_code == 404


def test_delete_payslip(client: TestClient) -> None:
    pid = client.post("/api/payslips", json=PAYSLIP_PAYLOAD).json()["id"]
    assert client.delete(f"/api/payslips/{pid}").status_code == 204


def test_delete_payslip_not_found(client: TestClient) -> None:
    assert client.delete("/api/payslips/PAY9999").status_code == 404


def test_payslip_stats(client: TestClient) -> None:
    client.post("/api/payslips", json=PAYSLIP_PAYLOAD)
    client.post("/api/payslips", json={**PAYSLIP_PAYLOAD, "month": 4, "status": "Paid"})
    r = client.get("/api/payslips/employee/EMP001/stats")
    assert r.status_code == 200
    body = r.json()
    assert body["total_payslips"] >= 2
    assert "total_paid" in body
    assert "total_pending" in body
    assert "by_month" in body


def test_payslip_stats_empty(client: TestClient) -> None:
    r = client.get("/api/payslips/employee/EMP002/stats")
    assert r.status_code == 200
    body = r.json()
    assert body["total_payslips"] == 0
    assert body["total_paid"] == 0.0
    assert body["total_pending"] == 0.0


def test_delete_employee_cascades_payslips(client: TestClient) -> None:
    client.post("/api/payslips", json=PAYSLIP_PAYLOAD)
    client.delete("/api/employees/EMP001")
    # employee is gone; stats endpoint should 404
    assert client.get("/api/payslips/employee/EMP001/stats").status_code == 404

import pytest
from fastapi.testclient import TestClient

SALARY_PAYLOAD = {
    "name": "New Employee",
    "role": "Manager",
    "employmentType": "Salary",
    "salary": 60000,
}


# ── Basic response ─────────────────────────────────────────────────────────────

def test_statistics_200(client: TestClient) -> None:
    assert client.get("/api/statistics").status_code == 200


def test_statistics_has_required_keys(client: TestClient) -> None:
    body = client.get("/api/statistics").json()
    assert "total_employees" in body
    assert "total_monthly_payroll" in body
    assert "by_employment_type" in body
    assert "by_department" in body


# ── Totals ─────────────────────────────────────────────────────────────────────

def test_total_employees_matches_seed(client: TestClient) -> None:
    assert client.get("/api/statistics").json()["total_employees"] == 10


def test_total_monthly_payroll_positive(client: TestClient) -> None:
    assert client.get("/api/statistics").json()["total_monthly_payroll"] > 0


def test_total_monthly_payroll_is_sum_of_individual(client: TestClient) -> None:
    stats = client.get("/api/statistics").json()["total_monthly_payroll"]
    individual_sum = sum(
        e["monthlyPay"] for e in client.get("/api/employees?page_size=100").json()["items"]
    )
    assert stats == pytest.approx(individual_sum, rel=1e-4)


# ── Employment type breakdown ──────────────────────────────────────────────────

def test_by_type_has_all_keys(client: TestClient) -> None:
    by_type = client.get("/api/statistics").json()["by_employment_type"]
    assert set(by_type.keys()) == {"Salary", "Hourly", "Weekly"}


def test_by_type_salary_count(client: TestClient) -> None:
    # Seed: EMP001, EMP002, EMP005 → 3
    assert client.get("/api/statistics").json()["by_employment_type"]["Salary"] == 3


def test_by_type_hourly_count(client: TestClient) -> None:
    # Seed: EMP003, EMP004, EMP006, EMP007, EMP010 → 5
    assert client.get("/api/statistics").json()["by_employment_type"]["Hourly"] == 5


def test_by_type_weekly_count(client: TestClient) -> None:
    # Seed: EMP008, EMP009 → 2
    assert client.get("/api/statistics").json()["by_employment_type"]["Weekly"] == 2


def test_by_type_counts_sum_to_total(client: TestClient) -> None:
    body = client.get("/api/statistics").json()
    total = sum(body["by_employment_type"].values())
    assert total == body["total_employees"]


# ── Department breakdown ───────────────────────────────────────────────────────

def test_by_department_sorted_descending_by_spend(client: TestClient) -> None:
    depts = client.get("/api/statistics").json()["by_department"]
    spends = [d["monthly_spend"] for d in depts]
    assert spends == sorted(spends, reverse=True)


def test_by_department_has_required_fields(client: TestClient) -> None:
    dept = client.get("/api/statistics").json()["by_department"][0]
    assert "name" in dept
    assert "count" in dept
    assert "monthly_spend" in dept
    assert "pct" in dept


def test_by_department_pct_sums_to_100(client: TestClient) -> None:
    depts = client.get("/api/statistics").json()["by_department"]
    assert sum(d["pct"] for d in depts) == pytest.approx(100.0, abs=0.6)


def test_by_department_counts_sum_to_total(client: TestClient) -> None:
    body = client.get("/api/statistics").json()
    assert sum(d["count"] for d in body["by_department"]) == body["total_employees"]


# ── Edge cases ────────────────────────────────────────────────────────────────

def test_statistics_empty_store(empty_client: TestClient) -> None:
    body = empty_client.get("/api/statistics").json()
    assert body["total_employees"] == 0
    assert body["total_monthly_payroll"] == 0.0
    assert body["by_department"] == []
    assert all(v == 0 for v in body["by_employment_type"].values())


def test_statistics_reflects_new_employee(client: TestClient) -> None:
    before = client.get("/api/statistics").json()["total_employees"]
    client.post("/api/employees", json=SALARY_PAYLOAD)
    assert client.get("/api/statistics").json()["total_employees"] == before + 1


def test_statistics_reflects_deleted_employee(client: TestClient) -> None:
    before = client.get("/api/statistics").json()["total_employees"]
    client.delete("/api/employees/EMP001")
    assert client.get("/api/statistics").json()["total_employees"] == before - 1


def test_statistics_payroll_changes_after_salary_update(client: TestClient) -> None:
    before = client.get("/api/statistics").json()["total_monthly_payroll"]
    client.put("/api/employees/EMP001", json={"salary": 1200000})  # big raise
    after = client.get("/api/statistics").json()["total_monthly_payroll"]
    assert after > before

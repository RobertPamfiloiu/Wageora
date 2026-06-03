import pytest
from fastapi.testclient import TestClient

# Helpers

SALARY_PAYLOAD = {
    "name": "John Doe",
    "role": "Manager",
    "employmentType": "Salary",
    "salary": 60000,
    "hoursWorked": 160,
    "overtimeHours": 0,
}

HOURLY_PAYLOAD = {
    "name": "Jane Smith",
    "role": "Cleaner",
    "employmentType": "Hourly",
    "hourlyRate": 20,
    "hoursWorked": 160,
    "overtimeHours": 0,
}

WEEKLY_PAYLOAD = {
    "name": "Bob Brown",
    "role": "Manager",
    "employmentType": "Weekly",
    "weeklyRate": 1000,
    "hoursWorked": 160,
    "overtimeHours": 0,
}


# Health

def test_health(client: TestClient) -> None:
    assert client.get("/api/health").status_code == 200


# LIST / PAGINATION

def test_list_default_pagination(client: TestClient) -> None:
    body = client.get("/api/employees").json()
    assert body["total"] == 10
    assert body["page"] == 1
    assert body["page_size"] == 7
    assert body["total_pages"] == 2
    assert len(body["items"]) == 7


def test_list_second_page(client: TestClient) -> None:
    body = client.get("/api/employees?page=2&page_size=7").json()
    assert len(body["items"]) == 3


def test_list_custom_page_size(client: TestClient) -> None:
    body = client.get("/api/employees?page_size=5").json()
    assert len(body["items"]) == 5
    assert body["total_pages"] == 2


def test_list_single_page_when_all_fit(client: TestClient) -> None:
    body = client.get("/api/employees?page_size=100").json()
    assert body["total_pages"] == 1
    assert len(body["items"]) == 10


def test_list_response_includes_monthly_pay(client: TestClient) -> None:
    item = client.get("/api/employees").json()["items"][0]
    assert "monthlyPay" in item
    assert item["monthlyPay"] > 0


def test_list_search_by_name(client: TestClient) -> None:
    body = client.get("/api/employees?search=marco").json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Marco Rosario"


def test_list_search_by_role(client: TestClient) -> None:
    body = client.get("/api/employees?search=accountant").json()
    assert body["total"] == 2


def test_list_search_by_id(client: TestClient) -> None:
    body = client.get("/api/employees?search=EMP001").json()
    assert body["total"] == 1


def test_list_search_case_insensitive(client: TestClient) -> None:
    body = client.get("/api/employees?search=MARCO").json()
    assert body["total"] == 1


def test_list_search_no_results(client: TestClient) -> None:
    body = client.get("/api/employees?search=zzznomatch").json()
    assert body["total"] == 0
    assert body["items"] == []


def test_list_search_resets_to_first_page(client: TestClient) -> None:
    body = client.get("/api/employees?search=engineer&page=1").json()
    assert body["page"] == 1


def test_list_invalid_page_zero(client: TestClient) -> None:
    assert client.get("/api/employees?page=0").status_code == 422


def test_list_page_size_too_large(client: TestClient) -> None:
    assert client.get("/api/employees?page_size=101").status_code == 422


def test_list_page_size_zero(client: TestClient) -> None:
    assert client.get("/api/employees?page_size=0").status_code == 422


# ── GET SINGLE ─────────────────────────────────────────────────────────────────

def test_get_existing_employee(client: TestClient) -> None:
    r = client.get("/api/employees/EMP001")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == "EMP001"
    assert body["name"] == "Marco Rosario"
    assert body["employmentType"] == "Salary"
    assert "monthlyPay" in body


def test_get_not_found(client: TestClient) -> None:
    assert client.get("/api/employees/EMP999").status_code == 404


def test_get_not_found_message(client: TestClient) -> None:
    body = client.get("/api/employees/EMP999").json()
    assert "not found" in body["detail"].lower()


# ── CREATE ─────────────────────────────────────────────────────────────────────

def test_create_salary_employee(client: TestClient) -> None:
    r = client.post("/api/employees", json=SALARY_PAYLOAD)
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "John Doe"
    assert body["id"].startswith("EMP")
    assert body["monthlyPay"] == pytest.approx(5000.0)


def test_create_hourly_employee(client: TestClient) -> None:
    r = client.post("/api/employees", json=HOURLY_PAYLOAD)
    assert r.status_code == 201
    assert r.json()["monthlyPay"] == pytest.approx(3200.0)


def test_create_weekly_employee(client: TestClient) -> None:
    r = client.post("/api/employees", json=WEEKLY_PAYLOAD)
    assert r.status_code == 201
    assert r.json()["monthlyPay"] == pytest.approx(4000.0)


def test_create_salary_with_overtime(client: TestClient) -> None:
    payload = {**SALARY_PAYLOAD, "salary": 120000, "overtimeHours": 10}
    r = client.post("/api/employees", json=payload)
    expected = 120000 / 12 + (120000 / 12 / 160 * 1.5) * 10
    assert r.json()["monthlyPay"] == pytest.approx(expected, rel=1e-4)


def test_create_hourly_with_overtime(client: TestClient) -> None:
    payload = {**HOURLY_PAYLOAD, "hourlyRate": 30, "hoursWorked": 160, "overtimeHours": 8}
    r = client.post("/api/employees", json=payload)
    expected = 30 * 160 + 30 * 1.5 * 8
    assert r.json()["monthlyPay"] == pytest.approx(expected, rel=1e-4)


def test_create_increments_id(client: TestClient) -> None:
    id1 = client.post("/api/employees", json=SALARY_PAYLOAD).json()["id"]
    id2 = client.post("/api/employees", json=SALARY_PAYLOAD).json()["id"]
    assert int(id2[3:]) == int(id1[3:]) + 1


def test_create_appears_in_list(client: TestClient) -> None:
    client.post("/api/employees", json=SALARY_PAYLOAD)
    total = client.get("/api/employees").json()["total"]
    assert total == 11


# Validation: name
def test_create_name_too_short(client: TestClient) -> None:
    assert client.post("/api/employees", json={**SALARY_PAYLOAD, "name": "A"}).status_code == 422


def test_create_name_whitespace_only(client: TestClient) -> None:
    assert client.post("/api/employees", json={**SALARY_PAYLOAD, "name": "  "}).status_code == 422


def test_create_name_missing(client: TestClient) -> None:
    payload = {k: v for k, v in SALARY_PAYLOAD.items() if k != "name"}
    assert client.post("/api/employees", json=payload).status_code == 422


# Validation: role
def test_create_invalid_role(client: TestClient) -> None:
    assert client.post("/api/employees", json={**SALARY_PAYLOAD, "role": "X"}).status_code == 422


def test_create_missing_role(client: TestClient) -> None:
    payload = {k: v for k, v in SALARY_PAYLOAD.items() if k != "role"}
    assert client.post("/api/employees", json=payload).status_code == 422


# Validation: salary/rate
def test_create_salary_missing_salary(client: TestClient) -> None:
    payload = {k: v for k, v in SALARY_PAYLOAD.items() if k != "salary"}
    assert client.post("/api/employees", json=payload).status_code == 422


def test_create_salary_zero(client: TestClient) -> None:
    assert client.post("/api/employees", json={**SALARY_PAYLOAD, "salary": 0}).status_code == 422


def test_create_salary_negative(client: TestClient) -> None:
    assert client.post("/api/employees", json={**SALARY_PAYLOAD, "salary": -1000}).status_code == 422


def test_create_hourly_missing_rate(client: TestClient) -> None:
    payload = {k: v for k, v in HOURLY_PAYLOAD.items() if k != "hourlyRate"}
    assert client.post("/api/employees", json=payload).status_code == 422


def test_create_hourly_zero_rate(client: TestClient) -> None:
    assert client.post("/api/employees", json={**HOURLY_PAYLOAD, "hourlyRate": 0}).status_code == 422


def test_create_weekly_missing_rate(client: TestClient) -> None:
    payload = {k: v for k, v in WEEKLY_PAYLOAD.items() if k != "weeklyRate"}
    assert client.post("/api/employees", json=payload).status_code == 422


# Validation: hours
def test_create_negative_hours_worked(client: TestClient) -> None:
    assert client.post("/api/employees", json={**SALARY_PAYLOAD, "hoursWorked": -1}).status_code == 422


def test_create_negative_overtime(client: TestClient) -> None:
    assert client.post("/api/employees", json={**SALARY_PAYLOAD, "overtimeHours": -1}).status_code == 422


def test_create_zero_hours_allowed(client: TestClient) -> None:
    assert client.post("/api/employees", json={**SALARY_PAYLOAD, "hoursWorked": 0}).status_code == 201


# UPDATE

def test_update_name(client: TestClient) -> None:
    r = client.put("/api/employees/EMP001", json={"name": "Marco Updated"})
    assert r.status_code == 200
    assert r.json()["name"] == "Marco Updated"


def test_update_salary(client: TestClient) -> None:
    r = client.put("/api/employees/EMP001", json={"salary": 90000})
    assert r.status_code == 200
    assert r.json()["salary"] == 90000


def test_update_overtime(client: TestClient) -> None:
    r = client.put("/api/employees/EMP001", json={"overtimeHours": 10})
    assert r.status_code == 200
    assert r.json()["overtimeHours"] == 10


def test_update_monthly_pay_recalculated(client: TestClient) -> None:
    client.put("/api/employees/EMP001", json={"salary": 120000, "overtimeHours": 0})
    pay = client.get("/api/employees/EMP001").json()["monthlyPay"]
    assert pay == pytest.approx(10000.0, rel=1e-4)


def test_update_persists_across_requests(client: TestClient) -> None:
    client.put("/api/employees/EMP001", json={"name": "Persistent Name"})
    assert client.get("/api/employees/EMP001").json()["name"] == "Persistent Name"


def test_update_not_found(client: TestClient) -> None:
    assert client.put("/api/employees/EMP999", json={"name": "Ghost"}).status_code == 404


def test_update_invalid_name_too_short(client: TestClient) -> None:
    assert client.put("/api/employees/EMP001", json={"name": "X"}).status_code == 422


def test_update_invalid_role(client: TestClient) -> None:
    assert client.put("/api/employees/EMP001", json={"role": "X"}).status_code == 422


def test_update_type_without_rate_fails(client: TestClient) -> None:
    # Changing to Hourly without providing hourlyRate should fail cross-field validation
    r = client.put("/api/employees/EMP001", json={"employmentType": "Hourly"})
    assert r.status_code == 422


def test_update_type_with_rate_succeeds(client: TestClient) -> None:
    r = client.put("/api/employees/EMP001", json={"employmentType": "Hourly", "hourlyRate": 40})
    assert r.status_code == 200
    assert r.json()["employmentType"] == "Hourly"


# DELETE

def test_delete_existing(client: TestClient) -> None:
    assert client.delete("/api/employees/EMP001").status_code == 204


def test_delete_not_found(client: TestClient) -> None:
    assert client.delete("/api/employees/EMP999").status_code == 404


def test_delete_removes_from_store(client: TestClient) -> None:
    client.delete("/api/employees/EMP001")
    assert client.get("/api/employees/EMP001").status_code == 404


def test_delete_reduces_total(client: TestClient) -> None:
    before = client.get("/api/employees").json()["total"]
    client.delete("/api/employees/EMP001")
    assert client.get("/api/employees").json()["total"] == before - 1


def test_delete_same_id_twice(client: TestClient) -> None:
    client.delete("/api/employees/EMP001")
    assert client.delete("/api/employees/EMP001").status_code == 404


# PAY CALCULATIONS (seeded data)

def test_monthly_pay_salary_emp001(client: TestClient) -> None:
    # EMP001: salary=85000, overtimeHours=5
    emp = client.get("/api/employees/EMP001").json()
    expected = 85000 / 12 + (85000 / 12 / 160 * 1.5) * 5
    assert emp["monthlyPay"] == pytest.approx(expected, rel=1e-4)


def test_monthly_pay_hourly_emp003(client: TestClient) -> None:
    # EMP003: hourlyRate=35, hoursWorked=152, overtimeHours=8
    emp = client.get("/api/employees/EMP003").json()
    expected = 35 * 152 + 35 * 1.5 * 8
    assert emp["monthlyPay"] == pytest.approx(expected, rel=1e-4)


def test_monthly_pay_weekly_emp008(client: TestClient) -> None:
    # EMP008: weeklyRate=2200
    emp = client.get("/api/employees/EMP008").json()
    assert emp["monthlyPay"] == pytest.approx(2200 * 4, rel=1e-4)


def test_monthly_pay_salary_no_overtime(client: TestClient) -> None:
    # EMP002: salary=72000, overtimeHours=0
    emp = client.get("/api/employees/EMP002").json()
    assert emp["monthlyPay"] == pytest.approx(72000 / 12, rel=1e-4)

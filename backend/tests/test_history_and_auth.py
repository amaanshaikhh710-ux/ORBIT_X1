"""
Orbital Twin — History & Authentication Integration Tests
Validates PostgreSQL/SQLite persistence, bcrypt auth, JWT tokens, and history endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.auth import create_access_token, UserRole

client = TestClient(app)
_admin_token = create_access_token({"sub": "mission_admin", "role": UserRole.MISSION_ADMINISTRATOR.value})
client.headers["Authorization"] = f"Bearer {_admin_token}"


def test_auth_registration_and_jwt_validation():
    # 0. Clean up any existing test user record
    from backend.db.session import SessionLocal
    from backend.db.models import User
    db = SessionLocal()
    try:
        db.query(User).filter_by(username="chief_flight_officer").delete()
        db.commit()
    finally:
        db.close()

    # 1. Register a new operator
    new_user_data = {
        "username": "chief_flight_officer",
        "password": "StationPassword456!",
        "role": "Flight Director",
    }
    reg_res = client.post("/auth/register", json=new_user_data)
    assert reg_res.status_code == 200
    reg_json = reg_res.json()
    assert reg_json["status"] == "success"
    assert "token" in reg_json
    assert reg_json["user"]["username"] == "chief_flight_officer"
    assert reg_json["user"]["role"] == "Flight Director"

    # 2. Login with correct password
    login_res = client.post(
        "/auth/login",
        json={"username": "chief_flight_officer", "password": "StationPassword456!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["token"]

    # 3. Access /auth/me with Bearer token
    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_json = me_res.json()
    assert me_json["username"] == "chief_flight_officer"
    assert me_json["authenticated"] is True

    # 4. Reject incorrect password
    bad_login = client.post(
        "/auth/login",
        json={"username": "chief_flight_officer", "password": "WrongPassword123"},
    )
    assert bad_login.status_code == 401


def test_persistent_simulation_history_workflow():
    run_id = "test-persistent-hist-01"

    # 1. Initialize run
    client.post(f"/simulation/runs?run_id={run_id}")

    # 2. Inject fault
    client.post(
        f"/simulation/runs/{run_id}/faults",
        json={
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.70,
            "start_time_s": 0.0,
            "duration_s": 600.0,
        },
    )

    # 3. Step run
    client.post(f"/simulation/runs/{run_id}/step")
    client.post(f"/simulation/runs/{run_id}/step")

    # 4. Apply recovery policy
    client.post(
        f"/simulation/runs/{run_id}/recovery/apply",
        json={"policy_id": "R-004"},
    )

    # 5. Generate report
    rep_res = client.post(f"/simulation/runs/{run_id}/reports")
    assert rep_res.status_code == 200

    # 6. Verify run appears in /history/runs
    hist_list_res = client.get("/history/runs")
    assert hist_list_res.status_code == 200
    runs = hist_list_res.json()
    assert any(r["id"] == run_id for r in runs)

    # 7. Verify detailed run history
    run_detail_res = client.get(f"/history/runs/{run_id}")
    assert run_detail_res.status_code == 200
    detail = run_detail_res.json()
    assert detail["id"] == run_id
    assert len(detail["fault_events"]) >= 1
    assert detail["fault_events"][0]["fault_id"] == "F-SOLAR-001"
    assert len(detail["recovery_actions"]) >= 1
    assert detail["recovery_actions"][0]["policy_id"] == "R-004"
    assert len(detail["reports"]) >= 1


def test_mission_admin_hackathon_demo_flow():
    # 1. Unauthenticated requests receive HTTP 401
    unauth_client = TestClient(app)
    unauth_res = unauth_client.get("/admin/users")
    assert unauth_res.status_code == 401

    # 2. mission_admin logs in without role specification
    login_res = client.post(
        "/auth/login",
        json={"username": "mission_admin", "password": "admin123"},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.json()}"
    data = login_res.json()
    assert data["status"] == "success"
    assert "token" in data
    assert data["user"]["username"] == "mission_admin"
    assert data["user"]["role"] == UserRole.MISSION_ADMINISTRATOR.value

    token = data["token"]
    admin_hdr = {"Authorization": f"Bearer {token}"}

    # 3. /auth/me returns Mission Administrator
    me_res = client.get("/auth/me", headers=admin_hdr)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == UserRole.MISSION_ADMINISTRATOR.value

    # 4. Access protected telemetry & state
    state_res = client.get("/spacecraft/sat-3u-01/state", headers=admin_hdr)
    assert state_res.status_code == 200
    assert "simulation_time_s" in state_res.json()

    # 5. Access fault catalog
    cat_res = client.get("/faults/catalog", headers=admin_hdr)
    assert cat_res.status_code == 200
    assert len(cat_res.json()) >= 5

    # 6. Fault injection
    run_id = "hackathon-demo-run-01"
    client.post(f"/simulation/runs?run_id={run_id}", headers=admin_hdr)
    inject_res = client.post(
        f"/simulation/runs/{run_id}/faults",
        json={
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.70,
            "start_time_s": 0.0,
            "duration_s": 300.0,
        },
        headers=admin_hdr,
    )
    assert inject_res.status_code == 200

    # 7. Recovery simulation
    sim_res = client.post(
        f"/simulation/runs/{run_id}/recovery/simulate",
        json={"duration_s": 60.0, "policies": ["R-001", "R-002"]},
        headers=admin_hdr,
    )
    assert sim_res.status_code == 200
    assert "report" in sim_res.json()

    # 8. Live recovery execution
    apply_res = client.post(
        f"/simulation/runs/{run_id}/recovery/apply",
        json={"policy_id": "R-002"},
        headers=admin_hdr,
    )
    assert apply_res.status_code == 200
    assert apply_res.json()["status"] == "applied"

    # 9. Fault clearing
    clear_res = client.delete(f"/simulation/runs/{run_id}/faults/F-SOLAR-001", headers=admin_hdr)
    assert clear_res.status_code == 200

    # 10. Generate report and check history
    rep_res = client.post(f"/simulation/runs/{run_id}/reports", headers=admin_hdr)
    assert rep_res.status_code == 200

    hist_res = client.get(f"/history/runs/{run_id}", headers=admin_hdr)
    assert hist_res.status_code == 200

    # 11. Admin users endpoint
    users_res = client.get("/admin/users", headers=admin_hdr)
    assert users_res.status_code == 200


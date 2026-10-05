"""
Orbital Twin — Production RBAC & Authorization Test Suite
Validates the authoritative 4-role model, backend server-side enforcement,
HTTP 401 Unauthorized for unauthenticated callers, HTTP 403 Forbidden for
unauthorized role actions, and comprehensive permission matrix.
"""
import pytest
from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.auth import create_access_token, UserRole
from backend.db.session import init_db

# Initialize database ensuring all demo accounts are seeded
init_db()

client = TestClient(app)

# Helper to create Authorization header for a given role
def auth_header(username: str, role: UserRole) -> dict:
    token = create_access_token({"sub": username, "role": role.value})
    return {"Authorization": f"Bearer {token}"}

RUN_ID = "rbac-test-run"


@pytest.fixture(autouse=True)
def setup_rbac_run():
    # Setup test run using admin token
    admin_hdr = auth_header("mission_admin", UserRole.MISSION_ADMINISTRATOR)
    client.post(f"/simulation/runs?run_id={RUN_ID}", headers=admin_hdr)


# =========================================================================
# 1. Unauthenticated Requests Return HTTP 401 Unauthorized
# =========================================================================

def test_unauthenticated_requests_return_401():
    # Protected monitoring
    res = client.get("/missions")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # Protected history
    res = client.get("/history/runs")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # Protected fault injection
    res = client.post(
        f"/simulation/runs/{RUN_ID}/faults",
        json={
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.5,
            "start_time_s": 0.0,
            "duration_s": 100.0,
        },
    )
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # Protected recovery application
    res = client.post(
        f"/simulation/runs/{RUN_ID}/recovery/apply",
        json={"policy_id": "R-001"},
    )
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    # Protected admin endpoint
    res = client.get("/admin/users")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"


# =========================================================================
# 2. Mission Administrator Has Full Access to All Capabilities
# =========================================================================

def test_mission_administrator_full_access():
    admin_hdr = auth_header("mission_admin", UserRole.MISSION_ADMINISTRATOR)

    # 1. Monitoring / missions
    res = client.get("/missions", headers=admin_hdr)
    assert res.status_code == 200

    # 2. Admin user listing
    res = client.get("/admin/users", headers=admin_hdr)
    assert res.status_code == 200
    assert len(res.json()) >= 4

    # 3. Fault injection
    res = client.post(
        f"/simulation/runs/{RUN_ID}/faults",
        json={
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.7,
            "start_time_s": 0.0,
            "duration_s": 300.0,
        },
        headers=admin_hdr,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "injected"

    # 4. Recovery simulation
    res = client.post(
        f"/simulation/runs/{RUN_ID}/recovery/simulate",
        json={"duration_s": 100.0, "policies": ["R-001", "R-002"]},
        headers=admin_hdr,
    )
    assert res.status_code == 200

    # 5. Recovery application
    res = client.post(
        f"/simulation/runs/{RUN_ID}/recovery/apply",
        json={"policy_id": "R-001"},
        headers=admin_hdr,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "applied"


# =========================================================================
# 3. Mission Operator: Read/Monitoring Allowed, Privileged Actions Blocked (403)
# =========================================================================

def test_mission_operator_permissions_and_restrictions():
    op_hdr = auth_header("mission_operator", UserRole.MISSION_OPERATOR)

    # Allowed: Monitoring & Telemetry
    assert client.get("/missions", headers=op_hdr).status_code == 200
    assert client.get("/history/runs", headers=op_hdr).status_code == 200
    assert client.get("/spacecraft/sat-3u-01/state", headers=op_hdr).status_code == 200
    assert client.get(f"/simulation/runs/{RUN_ID}/telemetry", headers=op_hdr).status_code == 200
    assert client.get("/faults/catalog", headers=op_hdr).status_code == 200
    assert client.get("/recovery/strategies", headers=op_hdr).status_code == 200

    # Forbidden: Fault Injection (HTTP 403)
    fault_res = client.post(
        f"/simulation/runs/{RUN_ID}/faults",
        json={
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.5,
            "start_time_s": 0.0,
            "duration_s": 100.0,
        },
        headers=op_hdr,
    )
    assert fault_res.status_code == 403, f"Expected 403, got {fault_res.status_code}"

    # Forbidden: Clear Fault (HTTP 403)
    clear_res = client.delete(f"/simulation/runs/{RUN_ID}/faults/F-SOLAR-001", headers=op_hdr)
    assert clear_res.status_code == 403, f"Expected 403, got {clear_res.status_code}"

    # Forbidden: Recovery Application (HTTP 403)
    rec_res = client.post(
        f"/simulation/runs/{RUN_ID}/recovery/apply",
        json={"policy_id": "R-001"},
        headers=op_hdr,
    )
    assert rec_res.status_code == 403, f"Expected 403, got {rec_res.status_code}"

    # Forbidden: Admin User Listing (HTTP 403)
    admin_res = client.get("/admin/users", headers=op_hdr)
    assert admin_res.status_code == 403, f"Expected 403, got {admin_res.status_code}"


# =========================================================================
# 4. Flight Director: Recovery Actions Allowed, Fault & Admin Blocked (403)
# =========================================================================

def test_flight_director_permissions_and_restrictions():
    fd_hdr = auth_header("flight_director", UserRole.FLIGHT_DIRECTOR)

    # Allowed: Monitoring & History
    assert client.get("/missions", headers=fd_hdr).status_code == 200
    assert client.get("/history/runs", headers=fd_hdr).status_code == 200

    # Allowed: Recovery Simulation Comparison
    sim_rec = client.post(
        f"/simulation/runs/{RUN_ID}/recovery/simulate",
        json={"duration_s": 100.0, "policies": ["R-001", "R-002"]},
        headers=fd_hdr,
    )
    assert sim_rec.status_code == 200

    # Allowed: Recovery Application
    apply_res = client.post(
        f"/simulation/runs/{RUN_ID}/recovery/apply",
        json={"policy_id": "R-002"},
        headers=fd_hdr,
    )
    assert apply_res.status_code == 200
    assert apply_res.json()["status"] == "applied"

    # Forbidden: Fault Injection (HTTP 403)
    fault_res = client.post(
        f"/simulation/runs/{RUN_ID}/faults",
        json={
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.5,
            "start_time_s": 0.0,
            "duration_s": 100.0,
        },
        headers=fd_hdr,
    )
    assert fault_res.status_code == 403, f"Expected 403, got {fault_res.status_code}"

    # Forbidden: Admin User Listing (HTTP 403)
    admin_res = client.get("/admin/users", headers=fd_hdr)
    assert admin_res.status_code == 403, f"Expected 403, got {admin_res.status_code}"


# =========================================================================
# 5. Simulation Engineer: Fault Testing Allowed, Recovery Apply & Admin Blocked (403)
# =========================================================================

def test_simulation_engineer_permissions_and_restrictions():
    se_hdr = auth_header("simulation_engineer", UserRole.SIMULATION_ENGINEER)

    # Allowed: Monitoring & Telemetry
    assert client.get("/missions", headers=se_hdr).status_code == 200

    # Allowed: Fault Injection
    fault_res = client.post(
        f"/simulation/runs/{RUN_ID}/faults",
        json={
            "fault_id": "F-BATT-001",
            "subsystem": "Battery",
            "parameter": "usable_capacity",
            "severity": 0.3,
            "start_time_s": 0.0,
            "duration_s": 200.0,
        },
        headers=se_hdr,
    )
    assert fault_res.status_code == 200
    assert fault_res.json()["status"] == "injected"

    # Allowed: Preset demo
    preset_res = client.post(f"/simulation/runs/{RUN_ID}/preset/v003-demo", headers=se_hdr)
    assert preset_res.status_code == 200

    # Allowed: Recovery Simulation comparison
    sim_rec = client.post(
        f"/simulation/runs/{RUN_ID}/recovery/simulate",
        json={"duration_s": 100.0, "policies": ["R-001"]},
        headers=se_hdr,
    )
    assert sim_rec.status_code == 200

    # Forbidden: Live Recovery Application (HTTP 403)
    apply_res = client.post(
        f"/simulation/runs/{RUN_ID}/recovery/apply",
        json={"policy_id": "R-001"},
        headers=se_hdr,
    )
    assert apply_res.status_code == 403, f"Expected 403, got {apply_res.status_code}"

    # Forbidden: Admin User Listing (HTTP 403)
    admin_res = client.get("/admin/users", headers=se_hdr)
    assert admin_res.status_code == 403, f"Expected 403, got {admin_res.status_code}"


# =========================================================================
# 6. Database Authoritative Role & Demo Account Credentials
# =========================================================================

def test_demo_account_logins_and_authoritative_roles():
    accounts = [
        ("mission_admin", "admin123", UserRole.MISSION_ADMINISTRATOR.value),
        ("mission_operator", "password123", UserRole.MISSION_OPERATOR.value),
        ("flight_director", "password123", UserRole.FLIGHT_DIRECTOR.value),
        ("simulation_engineer", "password123", UserRole.SIMULATION_ENGINEER.value),
    ]

    for username, password, expected_role in accounts:
        # Attempt login with client-specified spoofed role to test authoritative DB check
        login_res = client.post(
            "/auth/login",
            json={
                "username": username,
                "password": password,
                "role": "NonExistentSpoofedRole",
            },
        )
        assert login_res.status_code == 200, f"Login failed for {username}"
        data = login_res.json()
        assert data["user"]["role"] == expected_role, f"Expected {expected_role}, got {data['user']['role']}"
        token = data["token"]

        # Call /auth/me to verify token identity matches database role
        me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["role"] == expected_role

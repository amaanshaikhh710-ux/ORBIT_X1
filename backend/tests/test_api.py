"""
Orbital Twin — FastAPI Endpoints Test Suite
Validates all REST endpoints defined in 07_API_CONTRACT.md.
"""

import pytest
from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.auth import create_access_token, UserRole

client = TestClient(app)
_admin_token = create_access_token({"sub": "mission_admin", "role": UserRole.MISSION_ADMINISTRATOR.value})
client.headers["Authorization"] = f"Bearer {_admin_token}"


def test_api_auth_endpoints():
    login_res = client.post("/auth/login", json={"username": "flight_dir", "password": "securepassword"})
    assert login_res.status_code == 200
    data = login_res.json()
    assert data["status"] == "success"
    assert data["user"]["username"] == "flight_dir"
    assert "token" in data

    me_res = client.get("/auth/me")
    assert me_res.status_code == 200
    assert "role" in me_res.json()

    logout_res = client.post("/auth/logout")
    assert logout_res.status_code == 200


def test_api_missions_and_spacecraft():
    missions_res = client.get("/missions")
    assert missions_res.status_code == 200
    assert len(missions_res.json()) >= 1
    m_id = missions_res.json()[0]["id"]

    obj_res = client.get(f"/missions/{m_id}/objectives")
    assert obj_res.status_code == 200
    assert len(obj_res.json()) >= 2

    sc_res = client.get("/spacecraft/sat-3u-01")
    assert sc_res.status_code == 200
    assert sc_res.json()["bus_class"] == "3U"

    state_res = client.get("/spacecraft/sat-3u-01/state")
    assert state_res.status_code == 200
    assert "battery_soc_pct" in state_res.json()


def test_api_simulation_control_lifecycle():
    run_id = "test-api-run"
    create_res = client.post(f"/simulation/runs?run_id={run_id}")
    assert create_res.status_code == 200

    # Step simulation
    step_res = client.post(f"/simulation/runs/{run_id}/step")
    assert step_res.status_code == 200
    assert step_res.json()["simulation_time_s"] == 10.0

    # Set speed
    speed_res = client.post(f"/simulation/runs/{run_id}/speed", json={"speed": 5})
    assert speed_res.status_code == 200
    assert speed_res.json()["speed"] == 5

    # Pause and Reset
    pause_res = client.post(f"/simulation/runs/{run_id}/pause")
    assert pause_res.status_code == 200

    reset_res = client.post(f"/simulation/runs/{run_id}/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["simulation_time_s"] == 0.0


def test_api_faults_and_causal_graph():
    run_id = "test-fault-run"
    client.post(f"/simulation/runs?run_id={run_id}")

    # Catalog
    cat_res = client.get("/faults/catalog")
    assert cat_res.status_code == 200
    assert len(cat_res.json()) >= 5

    # Inject
    inject_res = client.post(
        f"/simulation/runs/{run_id}/faults",
        json={
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.70,
            "start_time_s": 0.0,
            "duration_s": 100.0,
        },
    )
    assert inject_res.status_code == 200

    # Step and verify causal graph export
    client.post(f"/simulation/runs/{run_id}/step")
    graph_res = client.get(f"/simulation/runs/{run_id}/faults/causal-graph")
    assert graph_res.status_code == 200
    data = graph_res.json()
    assert "nodes" in data
    assert "edges" in data


def test_api_recovery_simulate_and_compare():
    run_id = "test-rec-run"
    client.post(f"/simulation/runs?run_id={run_id}")
    client.post(
        f"/simulation/runs/{run_id}/faults",
        json={
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.70,
            "start_time_s": 0.0,
            "duration_s": 300.0,
        },
    )

    strategies_res = client.get("/recovery/strategies")
    assert strategies_res.status_code == 200
    assert len(strategies_res.json()) >= 5

    # Simulate multi-scenario recovery comparison
    rec_res = client.post(
        f"/simulation/runs/{run_id}/recovery/simulate",
        json={"duration_s": 300.0, "policies": ["R-001", "R-002", "R-003"]},
    )
    assert rec_res.status_code == 200
    data = rec_res.json()
    assert "comparison_id" in data
    assert "report" in data
    assert "unmitigated_baseline" in data["report"]
    assert len(data["report"]["recovery_scenarios"]) == 3


def test_api_telemetry_and_reports():
    run_id = "test-telemetry-run"
    client.post(f"/simulation/runs?run_id={run_id}")
    client.post(f"/simulation/runs/{run_id}/step")

    # Latest telemetry
    latest_res = client.get(f"/simulation/runs/{run_id}/telemetry/latest")
    assert latest_res.status_code == 200
    assert len(latest_res.json()) > 10

    # History
    hist_res = client.get(f"/simulation/runs/{run_id}/telemetry")
    assert hist_res.status_code == 200

    # Timeline
    timeline_res = client.get(f"/simulation/runs/{run_id}/timeline")
    assert timeline_res.status_code == 200
    assert "events" in timeline_res.json()

    # Reports
    rep_res = client.post(f"/simulation/runs/{run_id}/reports")
    assert rep_res.status_code == 200
    report_id = rep_res.json()["report_id"]

    get_rep_res = client.get(f"/simulation/runs/{run_id}/reports/{report_id}")
    assert get_rep_res.status_code == 200
    assert get_rep_res.json()["summary"]["final_battery_soc"] > 0


def test_websocket_streaming():
    run_id = "test-ws-run"
    client.post(f"/simulation/runs?run_id={run_id}")
    with client.websocket_connect(f"/ws/simulation/{run_id}") as websocket:
        # Receive initial state
        init_data = websocket.receive_json()
        assert init_data["type"] == "INITIAL_STATE"
        assert init_data["run_id"] == run_id
        assert "state" in init_data
        assert "telemetry" in init_data

        # Send step command through websocket
        websocket.send_json({"command": "step"})
        update_data = websocket.receive_json()
        assert update_data["type"] == "SIMULATION_UPDATE"
        assert update_data["simulation_time_s"] == 10.0
        assert "state" in update_data
        assert "causal_graph" in update_data


def test_api_csv_export_and_recovery_application():
    run_id = "test-csv-rec-run"
    client.post(f"/simulation/runs?run_id={run_id}")
    client.post(f"/simulation/runs/{run_id}/step")
    client.post(f"/simulation/runs/{run_id}/step")

    # CSV Export
    csv_res = client.get(f"/simulation/runs/{run_id}/telemetry/export.csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    csv_text = csv_res.text
    assert "timestamp,simulation_time,environment_state" in csv_text
    assert "battery_soc_pct" in csv_text
    assert "payload_state" in csv_text
    lines = csv_text.strip().split("\n")
    # Header + at least 3 states (t=0, t=10, t=20)
    assert len(lines) >= 4

    # Environment override
    env_res = client.post(
        f"/simulation/runs/{run_id}/environment",
        json={"state": "ECLIPSE", "duration_s": 300.0},
    )
    assert env_res.status_code == 200
    step_res = client.post(f"/simulation/runs/{run_id}/step")
    assert step_res.json()["state"]["environment_state"] == "ECLIPSE"

    # Recovery policy application
    rec_apply_res = client.post(
        f"/simulation/runs/{run_id}/recovery/apply",
        json={"policy_id": "R-002"},
    )
    assert rec_apply_res.status_code == 200
    data = rec_apply_res.json()
    assert data["status"] == "applied"
    assert data["policy_id"] == "R-002"


def test_timestep_and_auth_safeguards():
    # 1. Test invalid login is properly rejected with 401
    bad_login = client.post("/auth/login", json={"username": "non_existent_operator_xyz", "password": "anypassword"})
    assert bad_login.status_code == 401
    assert "Invalid operator credentials" in bad_login.text

    # 2. Test timestep endpoint
    run_id = "test-timestep-run"
    client.post(f"/simulation/runs?run_id={run_id}")
    for ts in [5.0, 10.0, 15.0, 20.0]:
        ts_res = client.post(f"/simulation/runs/{run_id}/timestep", json={"timestep_s": ts})
        assert ts_res.status_code == 200
        assert ts_res.json()["timestep_s"] == ts

    # 3. Test token query parameter authorization for CSV export
    unauth_client = TestClient(app)
    unauth_csv = unauth_client.get(f"/simulation/runs/{run_id}/telemetry/export.csv")
    assert unauth_csv.status_code == 401

    token_csv = unauth_client.get(f"/simulation/runs/{run_id}/telemetry/export.csv?token={_admin_token}")
    assert token_csv.status_code == 200
    assert "text/csv" in token_csv.headers["content-type"]




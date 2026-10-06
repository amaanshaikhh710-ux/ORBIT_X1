"""
Orbital Twin — Simulation Lifecycle, Mission History & Timeline Tests
Validates:
- Mission Start, Pause, Resume, End lifecycle
- Real wall-clock timestamps (started_at, completed_at)
- Simulation-time clock independence
- Manual time advancement (seconds, minutes, hours)
- Timeline event persistence per mission
- Mission History persistence and isolation
- Reset behavior preserving completed/aborted runs
"""

import time
import pytest
from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.auth import create_access_token, UserRole
from backend.db.history import HistoryService

client = TestClient(app)
_admin_token = create_access_token({"sub": "mission_admin", "role": UserRole.MISSION_ADMINISTRATOR.value})
client.headers["Authorization"] = f"Bearer {_admin_token}"


def test_mission_start_pause_resume_lifecycle():
    # TEST A: START
    run_id = f"test-lifecycle-{int(time.time())}"
    create_res = client.post(f"/simulation/runs?run_id={run_id}")
    assert create_res.status_code == 200

    start_res = client.post(f"/simulation/runs/{run_id}/start")
    assert start_res.status_code == 200
    start_data = start_res.json()
    assert start_data["status"] == "started"
    assert start_data["run_id"] == run_id
    assert start_data["real_started_at"] is not None

    real_started_at = start_data["real_started_at"]

    # Check session info
    get_res = client.get(f"/simulation/runs/{run_id}")
    assert get_res.status_code == 200
    info = get_res.json()
    assert info["status"] == "RUNNING"
    assert info["is_running"] is True
    assert info["real_started_at"] == real_started_at

    # TEST B: PAUSE / RESUME
    pause_res = client.post(f"/simulation/runs/{run_id}/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "paused"

    info_paused = client.get(f"/simulation/runs/{run_id}").json()
    assert info_paused["is_running"] is False
    assert info_paused["status"] == "PAUSED"
    assert info_paused["real_started_at"] == real_started_at

    resume_res = client.post(f"/simulation/runs/{run_id}/resume")
    assert resume_res.status_code == 200
    resume_data = resume_res.json()
    assert resume_data["status"] == "resumed"
    assert resume_data["run_id"] == run_id
    assert resume_data["real_started_at"] == real_started_at

    # Clean up pause
    client.post(f"/simulation/runs/{run_id}/pause")


def test_manual_simulation_time_advance():
    # TEST C: MANUAL TIME ADVANCE
    run_id = f"test-advance-{int(time.time())}"
    client.post(f"/simulation/runs?run_id={run_id}")

    # Initial time is 0.0s
    info = client.get(f"/simulation/runs/{run_id}").json()
    assert info["simulation_time_s"] == 0.0

    # Advance 60 seconds (1 minute)
    adv_60 = client.post(
        f"/simulation/runs/{run_id}/advance",
        json={"seconds": 60.0},
    )
    assert adv_60.status_code == 200
    data_60 = adv_60.json()
    assert data_60["status"] == "advanced"
    assert data_60["advanced_seconds"] == 60.0
    assert data_60["simulation_time_s"] == 60.0

    # Advance 5 minutes using amount and unit
    adv_5m = client.post(
        f"/simulation/runs/{run_id}/advance",
        json={"amount": 5.0, "unit": "Minutes"},
    )
    assert adv_5m.status_code == 200
    data_5m = adv_5m.json()
    assert data_5m["advanced_seconds"] == 300.0
    assert data_5m["simulation_time_s"] == 360.0  # 60s + 300s

    # Advance 1 hour using amount and unit
    adv_1h = client.post(
        f"/simulation/runs/{run_id}/advance",
        json={"amount": 1.0, "unit": "Hours"},
    )
    assert adv_1h.status_code == 200
    data_1h = adv_1h.json()
    assert data_1h["advanced_seconds"] == 3600.0
    assert data_1h["simulation_time_s"] == 3960.0  # 360s + 3600s

    # Verify timeline events were generated with appropriate simulation timestamps
    timeline_res = client.get(f"/simulation/runs/{run_id}/timeline")
    assert timeline_res.status_code == 200
    tl = timeline_res.json()
    assert len(tl["events"]) > 0
    # Every event must have a simulation timestamp <= current simulation_time_s
    for ev in tl["events"]:
        sim_ts = ev.get("simulation_time_s", ev.get("timestamp_s"))
        assert sim_ts <= 3960.0


def test_mission_fault_timeline_and_end_simulation():
    # TEST D & TEST E: FAULT, TIMELINE & END SIMULATION
    run_id = f"test-fault-end-{int(time.time())}"
    client.post(f"/simulation/runs?run_id={run_id}")
    client.post(f"/simulation/runs/{run_id}/start")

    # Advance 10s
    client.post(f"/simulation/runs/{run_id}/advance", json={"seconds": 10.0})

    # Inject fault at T=10s
    fault_payload = {
        "fault_id": "F-SOLAR-001",
        "subsystem": "Solar",
        "parameter": "solar_health",
        "severity": 0.70,
        "start_time_s": 10.0,
        "duration_s": 300.0,
    }
    inj_res = client.post(f"/simulation/runs/{run_id}/faults", json=fault_payload)
    assert inj_res.status_code == 200

    # Advance 50s
    client.post(f"/simulation/runs/{run_id}/advance", json={"seconds": 50.0})

    # End simulation
    end_res = client.post(f"/simulation/runs/{run_id}/end")
    assert end_res.status_code == 200
    end_data = end_res.json()
    assert end_data["status"] == "completed"
    assert end_data["run_id"] == run_id
    assert end_data["real_started_at"] is not None
    assert end_data["real_completed_at"] is not None
    assert end_data["simulation_time_s"] == 60.0

    # Verify session is no longer running and marked COMPLETED
    session_info = client.get(f"/simulation/runs/{run_id}").json()
    assert session_info["is_running"] is False
    assert session_info["status"] == "COMPLETED"

    # TEST F: MISSION HISTORY PERSISTENCE
    history_res = client.get("/history/runs")
    assert history_res.status_code == 200
    all_runs = history_res.json()
    matching = [r for r in all_runs if r["id"] == run_id]
    assert len(matching) == 1
    stored_run = matching[0]
    assert stored_run["status"] == "COMPLETED"
    assert stored_run["duration_s"] == 60.0
    assert stored_run["started_at"] is not None
    assert stored_run["completed_at"] is not None
    assert stored_run["active_faults_count"] >= 1

    # TEST G: HISTORICAL TIMELINE IS PERSISTED
    tl_res = client.get(f"/simulation/runs/{run_id}/timeline")
    assert tl_res.status_code == 200
    hist_tl = tl_res.json()
    assert hist_tl["run_id"] == run_id
    assert hist_tl["simulation_time_s"] == 60.0


def test_multiple_independent_missions():
    # TEST J: MULTIPLE MISSIONS DO NOT OVERWRITE EACH OTHER
    run_a = f"test-multi-a-{int(time.time())}"
    client.post(f"/simulation/runs?run_id={run_a}")
    client.post(f"/simulation/runs/{run_a}/start")
    client.post(f"/simulation/runs/{run_a}/advance", json={"seconds": 30.0})
    client.post(f"/simulation/runs/{run_a}/end")

    time.sleep(0.05)  # slight real time gap

    run_b = f"test-multi-b-{int(time.time())}"
    client.post(f"/simulation/runs?run_id={run_b}")
    client.post(f"/simulation/runs/{run_b}/start")
    client.post(f"/simulation/runs/{run_b}/advance", json={"seconds": 30.0})
    client.post(f"/simulation/runs/{run_b}/end")

    # Verify both missions appear separately in history
    hist_runs = client.get("/history/runs").json()
    run_a_record = next((r for r in hist_runs if r["id"] == run_a), None)
    run_b_record = next((r for r in hist_runs if r["id"] == run_b), None)

    assert run_a_record is not None
    assert run_b_record is not None
    assert run_a_record["id"] != run_b_record["id"]
    assert run_a_record["status"] == "COMPLETED"
    assert run_b_record["status"] == "COMPLETED"
    # Even though both simulated exactly 30s:
    assert run_a_record["duration_s"] == 30.0
    assert run_b_record["duration_s"] == 30.0


def test_reset_preserves_completed_and_aborts_active():
    # TEST I: RESET BEHAVIOR
    # 1. Reset on a completed mission does not delete it
    run_comp = f"test-reset-comp-{int(time.time())}"
    client.post(f"/simulation/runs?run_id={run_comp}")
    client.post(f"/simulation/runs/{run_comp}/start")
    client.post(f"/simulation/runs/{run_comp}/advance", json={"seconds": 20.0})
    client.post(f"/simulation/runs/{run_comp}/end")

    # User resets the session
    reset_res = client.post(f"/simulation/runs/{run_comp}/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["simulation_time_s"] == 0.0

    # Historical record is still in history!
    hist = client.get("/history/runs").json()
    found = [r for r in hist if r["id"] == run_comp]
    assert len(found) == 1
    assert found[0]["status"] == "COMPLETED"
    assert found[0]["duration_s"] == 20.0

    # 2. Reset while a mission is active (running/paused) with progress preserves it as ABORTED
    run_active = f"test-reset-active-{int(time.time())}"
    client.post(f"/simulation/runs?run_id={run_active}")
    client.post(f"/simulation/runs/{run_active}/start")
    client.post(f"/simulation/runs/{run_active}/advance", json={"seconds": 40.0})
    # Reset without calling end
    client.post(f"/simulation/runs/{run_active}/reset")

    hist_after = client.get("/history/runs").json()
    found_active = [r for r in hist_after if r["id"] == run_active]
    assert len(found_active) == 1
    assert found_active[0]["status"] == "ABORTED"
    assert found_active[0]["duration_s"] == 40.0
    assert found_active[0]["completed_at"] is not None


def test_end_mission_resets_active_session_to_t0_preserving_archive():
    # TEST: After End Mission, active session resets to T+00:00:00 while archived mission retains final duration
    run_id = f"test-end-archive-{int(time.time())}"
    client.post(f"/simulation/runs?run_id={run_id}")
    client.post(f"/simulation/runs/{run_id}/start")
    client.post(f"/simulation/runs/{run_id}/advance", json={"seconds": 160.0})

    # Verify simulation time is 160s before end
    info_before = client.get(f"/simulation/runs/{run_id}").json()
    assert info_before["simulation_time_s"] == 160.0

    # End mission
    end_res = client.post(f"/simulation/runs/{run_id}/end")
    assert end_res.status_code == 200
    end_data = end_res.json()
    assert end_data["status"] == "completed"
    assert end_data["run_id"] == run_id
    assert end_data["active_run_id"] is not None
    assert end_data["active_state"]["simulation_time_s"] == 0.0

    # Check active-run endpoint: Must be at T+0s and READY
    active_info = client.get("/simulation/active-run").json()
    assert active_info["simulation_time_s"] == 0.0
    assert active_info["status"] == "READY"
    assert active_info["is_running"] is False

    # Check history endpoint: Archived mission must retain its 160.0s simulation duration
    archived_details = client.get(f"/history/runs/{run_id}").json()
    assert archived_details["id"] == run_id
    assert archived_details["duration_s"] == 160.0
    assert archived_details["status"] == "COMPLETED"


def test_recovery_execution_changes_state_and_emits_events():
    # TEST: Applying recovery policy changes live state and records timeline events
    run_id = f"test-recovery-{int(time.time())}"
    client.post(f"/simulation/runs?run_id={run_id}")
    client.post(f"/simulation/runs/{run_id}/start")

    # Inject solar fault
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

    # Step once
    client.post(f"/simulation/runs/{run_id}/step")
    state_before_rec = client.get(f"/simulation/runs/{run_id}").json()["state"]

    # Flight Director applies Payload Safe Mode (R-002)
    rec_res = client.post(
        f"/simulation/runs/{run_id}/recovery/apply",
        json={"policy_id": "R-002"},
    )
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["status"] == "applied"
    assert rec_data["policy_id"] == "R-002"

    state_after_rec = client.get(f"/simulation/runs/{run_id}").json()["state"]
    # Power margin should improve after shedding optical payload
    assert state_after_rec["recovery_mode"] == "R-002"
    assert state_after_rec["payload_state"] == "IDLE"
    assert state_after_rec["payload_load_w"] == 0.0
    assert state_after_rec["power_margin_w"] >= state_before_rec["power_margin_w"]

    # Test multi-policy comparison simulator returns authoritative baseline comparison
    sim_res = client.post(
        f"/simulation/runs/{run_id}/recovery/simulate",
        json={"policies": ["R-001", "R-002", "R-003"], "duration_s": 300.0},
    )
    assert sim_res.status_code == 200
    sim_report = sim_res.json()["report"]
    assert "unmitigated_baseline" in sim_report
    assert len(sim_report["recovery_scenarios"]) == 3

    # Verify timeline events recorded
    tl_events = client.get(f"/simulation/runs/{run_id}/timeline").json()["events"]
    event_messages = [e["message"] for e in tl_events]
    assert any("R-002" in m or "Payload Safe Mode" in m for m in event_messages)


def test_timeline_event_creation_endpoint():
    # TEST: Timeline event posting endpoint
    run_id = f"test-event-post-{int(time.time())}"
    client.post(f"/simulation/runs?run_id={run_id}")

    post_ev = client.post(
        f"/simulation/runs/{run_id}/events",
        json={
            "event_type": "RECOVERY_OPTION_SELECTED",
            "message": "Operator selected candidate option: Payload Safe Mode",
            "subsystem": "RECOVERY",
            "severity": "INFO",
        },
    )
    assert post_ev.status_code == 200
    ev_data = post_ev.json()
    assert ev_data["status"] == "recorded"
    assert ev_data["event"]["event_type"] == "RECOVERY_OPTION_SELECTED"

    # Verify it appears in timeline
    tl = client.get(f"/simulation/runs/{run_id}/timeline").json()
    matching = [e for e in tl["events"] if "Operator selected candidate option" in e["message"]]
    assert len(matching) == 1


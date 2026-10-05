"""
Orbital Twin — Phase 10 End-to-End Demo Walkthrough & Regression Test Suite
Validates the complete operational workflow defined in 13_DEMO_SCENARIO.md and 24_ANTIGRAVITY_IMPLEMENTATION_CONTRACT.md.
Tests physical coupling: Environment -> Solar -> Power -> Battery -> Scheduler -> Payload -> Causal Graph -> Recovery Branching -> Recovery Execution -> Re-simulation -> CSV Export -> Reset.
"""

import pytest
import io
import csv
from fastapi.testclient import TestClient

from backend.api.main import app, get_session
from backend.simulation.engine import SimulationEngine
from backend.simulation.core.types import EnvironmentState, PowerState, PayloadState
from backend.simulation.core import constants as const
from backend.simulation.recovery.policies import RecoveryPolicyRegistry
from backend.simulation.recovery.simulator import RecoverySimulator
from backend.api.auth import create_access_token, UserRole


client = TestClient(app)
_admin_token = create_access_token({"sub": "mission_admin", "role": UserRole.MISSION_ADMINISTRATOR.value})
client.headers["Authorization"] = f"Bearer {_admin_token}"


def test_complete_demo_scenario_workflow():
    """
    Executes the entire end-to-end interactive demo scenario:
    HEALTHY MISSION -> NOMINAL ORBIT -> ECLIPSE -> RETURN TO SUNLIGHT ->
    SOLAR FAULT INJECTION -> POWER DEGRADATION -> BATTERY SOC DECLINE ->
    LOW-POWER STATE -> PAYLOAD IMPACT -> CAUSAL FAULT ANALYSIS ->
    MULTI-SCENARIO RECOVERY COMPARISON -> SELECT RECOVERY -> EXECUTE RECOVERY ->
    RE-SIMULATE -> VERIFY IMPROVED OUTCOME -> CSV EXPORT -> RESET.
    """
    run_id = "test-demo-e2e"
    # Create clean session
    resp = client.post(f"/simulation/runs?run_id={run_id}")
    assert resp.status_code == 200
    session = get_session(run_id)
    session.reset()

    # -------------------------------------------------------------------------
    # 1. HEALTHY MISSION & NOMINAL ORBIT
    # -------------------------------------------------------------------------
    initial_st = session.engine.state
    assert initial_st.simulation_time_s == 0.0
    assert initial_st.battery_soc_pct == pytest.approx(const.INITIAL_SOC_PCT, abs=0.1)
    assert initial_st.power_state == PowerState.NORMAL
    assert initial_st.solar_health == 1.0
    assert initial_st.environment_state == EnvironmentState.SUNLIGHT
    assert initial_st.solar_generation_w > 20.0  # nominal ~22.0 W peak

    # Step nominal orbit (30 seconds)
    for _ in range(3):
        session.engine.step()
    assert session.engine.state.simulation_time_s == 30.0
    pre_eclipse_soc = session.engine.state.battery_soc_pct
    assert session.engine.state.solar_generation_w > 20.0

    # -------------------------------------------------------------------------
    # 2. ECLIPSE
    # -------------------------------------------------------------------------
    # Trigger eclipse window via API
    resp = client.post(
        f"/simulation/runs/{run_id}/environment",
        json={"state": "ECLIPSE", "duration_s": 300.0},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "environment_updated"

    # Advance 3 steps in eclipse
    for _ in range(3):
        session.engine.step()

    eclipse_st = session.engine.state
    assert eclipse_st.environment_state == EnvironmentState.ECLIPSE
    assert eclipse_st.illumination_factor == 0.0
    # Solar generation must drop to 0.0 W
    assert eclipse_st.solar_generation_w == pytest.approx(0.0, abs=1e-3)
    # Power margin must be negative (net power deficit)
    assert eclipse_st.power_margin_w < 0.0
    # Battery power must be positive (discharging)
    assert eclipse_st.battery_power_w > 0.0
    # Battery SOC must decrease from pre-eclipse level
    assert eclipse_st.battery_soc_pct < pre_eclipse_soc

    # -------------------------------------------------------------------------
    # 3. RETURN TO SUNLIGHT
    # -------------------------------------------------------------------------
    resp = client.post(
        f"/simulation/runs/{run_id}/environment",
        json={"state": "SUNLIGHT", "duration_s": 600.0},
    )
    assert resp.status_code == 200

    session.engine.step()
    sun_st = session.engine.state
    assert sun_st.environment_state == EnvironmentState.SUNLIGHT
    assert sun_st.illumination_factor == 1.0
    # Solar generation restored according to physical model
    assert sun_st.solar_generation_w > 20.0
    assert sun_st.power_margin_w > 0.0

    # -------------------------------------------------------------------------
    # 4. SOLAR FAULT INJECTION (F-SOLAR-001, 70% severity)
    # -------------------------------------------------------------------------
    fault_start = sun_st.simulation_time_s
    resp = client.post(
        f"/simulation/runs/{run_id}/faults",
        json={
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.70,
            "start_time_s": fault_start,
            "duration_s": 1200.0,
        },
    )
    assert resp.status_code == 200
    assert len(session.engine.active_faults) == 1

    # -------------------------------------------------------------------------
    # 5. POWER DEGRADATION & BATTERY SOC DECLINE
    # -------------------------------------------------------------------------
    session.engine.step()
    faulted_st = session.engine.state
    assert faulted_st.solar_health == pytest.approx(0.30, abs=0.01)
    # 70% degradation drops 24W down to 7.2W
    assert faulted_st.solar_generation_w == pytest.approx(7.20, abs=0.1)

    # Set battery crossing threshold (24.9% SOC) to observe transition into LOW_POWER (<=25.0%)
    session.engine.state.battery_soc_pct = 24.9
    session.engine.state.battery_energy_wh = const.BATTERY_USABLE_CAPACITY_WH * 0.249

    st = session.engine.step()
    assert st.power_state == PowerState.LOW_POWER, f"Expected LOW_POWER, got {st.power_state}"
    assert st.battery_soc_pct <= 25.0

    # -------------------------------------------------------------------------
    # 6. PAYLOAD / MISSION IMPACT
    # -------------------------------------------------------------------------
    # In LOW_POWER, optical payload tasks must be deferred/shed
    session.engine.payload_model.trigger_image_task("img-lowpower-test")
    session.engine.step()

    low_power_st = session.engine.state
    assert low_power_st.power_state == PowerState.LOW_POWER
    assert low_power_st.images_deferred > 0

    # -------------------------------------------------------------------------
    # 7. CAUSAL FAULT ANALYSIS
    # -------------------------------------------------------------------------
    causal_resp = client.get(f"/simulation/runs/{run_id}/faults/causal-graph")
    assert causal_resp.status_code == 200
    cgraph = causal_resp.json()
    assert len(cgraph["nodes"]) >= 3
    assert len(cgraph["edges"]) >= 2

    # Verify causal chain contains Solar, Power, Battery/Scheduler, Payload
    node_subsystems = [n["subsystem"] for n in cgraph["nodes"]]
    assert any("Solar" in s for s in node_subsystems)
    assert any("Power" in s or "Battery" in s for s in node_subsystems)
    assert any("Mission Scheduler" in s or "Payload" in s for s in node_subsystems)

    # -------------------------------------------------------------------------
    # 8. MULTI-SCENARIO RECOVERY COMPARISON
    # -------------------------------------------------------------------------
    rec_resp = client.post(
        f"/simulation/runs/{run_id}/recovery/simulate",
        json={
            "duration_s": 600.0,
            "policies": ["R-001", "R-002", "R-003", "R-004", "R-006"],
        },
    )
    assert rec_resp.status_code == 200
    rec_data = rec_resp.json()
    report = rec_data["report"]

    unmitigated = report["unmitigated_baseline"]
    scenarios = report["recovery_scenarios"]
    assert len(scenarios) == 5

    # Verification: unmitigated baseline suffers deeper battery SOC loss than R-002 (Payload Safe Mode)
    r002_scenario = next(s for s in scenarios if s["policy_id"] == "R-002")
    assert r002_scenario["min_battery_soc_pct"] >= unmitigated["min_battery_soc_pct"]

    # -------------------------------------------------------------------------
    # 9. SELECT & EXECUTE RECOVERY (Policy R-002: Payload Safe Mode)
    # -------------------------------------------------------------------------
    apply_resp = client.post(
        f"/simulation/runs/{run_id}/recovery/apply",
        json={"policy_id": "R-002"},
    )
    assert apply_resp.status_code == 200
    assert apply_resp.json()["status"] == "applied"
    assert session.engine.recovery_policy.policy_id == "R-002"
    assert session.engine.state.recovery_mode == "R-002"

    # -------------------------------------------------------------------------
    # 10. RE-SIMULATE & VERIFY IMPROVED/CHANGED OUTCOME
    # -------------------------------------------------------------------------
    soc_before_recovery = session.engine.state.battery_soc_pct
    # Under R-002, payload is disabled (load=0W), so total consumption is just housekeeping (~4.0W)
    # With degraded solar generating ~6.6W, 6.6W > 4.0W => power margin is POSITIVE!
    # Battery will stabilize or recharge!
    for _ in range(12):  # 2 minutes of simulation
        session.engine.step()

    post_recovery_st = session.engine.state
    assert post_recovery_st.payload_load_w == 0.0
    assert post_recovery_st.total_power_consumption_w < 10.0
    # Positive margin achieved despite 70% degraded solar panels!
    assert post_recovery_st.power_margin_w > 0.0
    # Battery stops draining and charges
    assert post_recovery_st.battery_soc_pct >= soc_before_recovery

    # -------------------------------------------------------------------------
    # 11. TIMELINE VERIFICATION
    # -------------------------------------------------------------------------
    timeline_resp = client.get(f"/simulation/runs/{run_id}/timeline")
    assert timeline_resp.status_code == 200
    tl_data = timeline_resp.json()
    assert len(tl_data["events"]) > 5
    event_types = [e["event_type"] for e in tl_data["events"]]
    assert "ENVIRONMENT_TRANSITION" in event_types
    assert "FAULT_INJECTED" in event_types
    assert "POWER_STATE_TRANSITION" in event_types
    assert "RECOVERY_POLICY_APPLIED" in event_types

    # -------------------------------------------------------------------------
    # 12. TELEMETRY CSV EXPORT
    # -------------------------------------------------------------------------
    csv_resp = client.get(f"/simulation/runs/{run_id}/telemetry/export.csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    csv_text = csv_resp.text

    # Read and validate CSV contents
    reader = csv.DictReader(io.StringIO(csv_text))
    rows = list(reader)
    assert len(rows) == len(session.engine.state_history)
    assert len(rows) >= 20

    required_headers = [
        "timestamp",
        "simulation_time",
        "environment_state",
        "solar_generation_w",
        "power_consumption_w",
        "power_margin_w",
        "battery_soc_pct",
        "battery_power_w",
        "internal_temp_c",
        "external_temp_c",
        "communication_state",
        "signal_strength_dbm",
        "packet_loss_pct",
        "downlink_rate_mbps",
        "storage_used_gb",
        "storage_free_gb",
        "payload_state",
        "images_completed",
        "obc_cpu_pct",
        "attitude_error_deg",
        "mission_objective_status",
        "active_faults",
        "recovery_mode",
    ]
    for h in required_headers:
        assert h in reader.fieldnames, f"Missing required CSV header: {h}"

    # Check that initial row and post-recovery row reflect true telemetry
    first_row = rows[0]
    assert first_row["environment_state"] == "SUNLIGHT"
    assert float(first_row["battery_soc_pct"]) == pytest.approx(const.INITIAL_SOC_PCT, abs=0.1)

    last_row = rows[-1]
    assert last_row["recovery_mode"] == "R-002"

    # -------------------------------------------------------------------------
    # 13. RESET VERIFICATION
    # -------------------------------------------------------------------------
    reset_resp = client.post(f"/simulation/runs/{run_id}/reset")
    assert reset_resp.status_code == 200
    assert session.engine.state.simulation_time_s == 0.0
    assert session.engine.state.battery_soc_pct == pytest.approx(const.INITIAL_SOC_PCT, abs=0.1)
    assert session.engine.state.power_state == PowerState.NORMAL
    assert session.engine.state.solar_health == 1.0
    assert session.engine.recovery_policy.policy_id == "R-NONE"
    assert session.engine.state.recovery_mode is None
    assert len(session.engine.active_faults) == 0
    assert len(session.engine.state_history) == 1

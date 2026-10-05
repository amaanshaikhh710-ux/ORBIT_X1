from fastapi.testclient import TestClient
from backend.api.main import app
from backend.api.auth import create_access_token, UserRole

def test_v003_hackathon_demo_flow():
    client = TestClient(app)
    _admin_token = create_access_token({"sub": "mission_admin", "role": UserRole.MISSION_ADMINISTRATOR.value})
    client.headers["Authorization"] = f"Bearer {_admin_token}"
    
    # 1. Reset Simulation
    res = client.post("/simulation/runs/run-default/reset")
    assert res.status_code == 200, res.text
    initial_state = client.get("/spacecraft/sat-3u-01/state").json()
    assert initial_state["battery_capacity_wh"] == 72.0
    assert initial_state["power_state"] == "NORMAL"

    # 2. Activate V-003 Demo Preset
    res = client.post("/simulation/runs/run-default/preset/v003-demo")
    assert res.status_code == 200, res.text
    demo_state = res.json()["state"]
    assert abs(demo_state["battery_soc_pct"] - 25.08) < 0.05
    assert len(demo_state["active_faults"]) == 1
    assert demo_state["demo_mode"] == "V-003_DEMO"

    # 3. Step Simulation to demonstrate LOW_POWER and Load Shedding in live pacing
    reached_low_power = False
    for step_num in range(1, 6):
        res = client.post("/simulation/runs/run-default/step")
        assert res.status_code == 200, res.text
        s = res.json()["state"]
        if step_num == 1:
            assert abs(s["solar_generation_w"] - 7.2) < 0.5
        if s["power_state"] == "LOW_POWER":
            reached_low_power = True

    assert reached_low_power, "Expected simulation to reach LOW_POWER"
    assert s["images_deferred"] >= 1, f"Expected deferred images, got {s['images_deferred']}"

    # 4. Verify Causal Graph Connectivity
    res = client.get("/simulation/runs/run-default/faults/causal-graph")
    assert res.status_code == 200, res.text
    cg = res.json()
    node_ids = {n["id"] for n in cg["nodes"]}
    for edge in cg["edges"]:
        assert edge["from"] in node_ids
        assert edge["to"] in node_ids
    assert len(cg["edges"]) >= 3

    # 5. Verify Timeline Events Timestamps
    res = client.get("/simulation/runs/run-default/timeline")
    assert res.status_code == 200, res.text
    tl = res.json()
    for ev in tl["events"]:
        assert ev.get("simulation_time_s") is not None or ev.get("timestamp_s") is not None

    # 6. Multi-Scenario Recovery Simulator for all 7 Policies
    res = client.post("/simulation/runs/run-default/recovery/simulate", json={
        "duration_s": 300,
        "policies": ["R-001", "R-002", "R-003", "R-004", "R-005", "R-006", "R-007"]
    })
    assert res.status_code == 200, res.text
    report = res.json()["report"]
    assert len(report["recovery_scenarios"]) == 7
    for scen in report["recovery_scenarios"]:
        assert scen["final_battery_soc_pct"] > 0

    # 7. Apply Recovery Policy (R-002 Payload Safe Mode)
    res = client.post("/simulation/runs/run-default/recovery/apply", json={"policy_id": "R-002"})
    assert res.status_code == 200, res.text
    res = client.post("/simulation/runs/run-default/step")
    applied_state = res.json()["state"]
    assert applied_state["payload_state"] in ["IDLE", "SAFE_MODE", "STORED"]

    # 8. Generate Mission Report
    res = client.post("/simulation/runs/run-default/reports")
    assert res.status_code == 200, res.text
    rep = res.json()["report"]
    assert rep["simulation_duration_s"] > 0
    assert rep["summary"]["total_events_logged"] > 0

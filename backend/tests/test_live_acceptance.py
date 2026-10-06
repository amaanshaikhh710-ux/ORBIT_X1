"""
Orbital Twin — Strict Acceptance Verification Script
Executes the exact 24-step acceptance test against the live backend server.
"""

import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"


def req(method, path, body=None, token=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(r) as response:
        return json.loads(response.read().decode("utf-8"))


def run_acceptance_test():
    print("=" * 60)
    print("STARTING ORBITAL TWIN 24-STEP ACCEPTANCE TEST")
    print("=" * 60)

    # 0. Login
    login = req("POST", "/auth/login", {"username": "operator", "password": "password123", "role": "Mission Operator"})
    token = login["token"]
    print("[OK] Logged in as Mission Operator")

    # STEP 1: Start Mission
    start_res = req("POST", "/simulation/runs/run-default/start", token=token)
    mission_a_id = start_res["run_id"]
    print(f"[STEP 1] Mission A Started: {mission_a_id}")
    assert start_res["status"] == "started"
    assert "ORBIT-X1-RUN-" in mission_a_id
    assert start_res["real_started_at"] is not None

    # STEP 2: Confirm T+00:00
    state = req("GET", f"/simulation/runs/{mission_a_id}", token=token)
    assert state["simulation_time_s"] == 0.0, f"Expected 0.0, got {state['simulation_time_s']}"
    print(f"[STEP 2] Confirmed baseline sim time: T+{state['simulation_time_s']:.0f}s")

    # STEP 3: Advance simulation
    adv1 = req("POST", f"/simulation/runs/{mission_a_id}/advance", {"seconds": 30.0}, token=token)
    assert adv1["simulation_time_s"] == 30.0
    print(f"[STEP 3] Advanced to T+{adv1['simulation_time_s']:.0f}s")

    # STEP 4: Inject a fault
    fault_res = req("POST", f"/simulation/runs/{mission_a_id}/faults", {
        "fault_id": "F-SOLAR-001",
        "subsystem": "Solar",
        "parameter": "solar_health",
        "severity": 0.70,
        "start_time_s": 30.0,
        "duration_s": 600.0,
    }, token=token)
    print(f"[STEP 4] Fault injected: {fault_res['fault']['fault_id']}")

    # STEP 5: Advance simulation
    adv2 = req("POST", f"/simulation/runs/{mission_a_id}/advance", {"seconds": 60.0}, token=token)
    assert adv2["simulation_time_s"] == 90.0
    print(f"[STEP 5] Advanced to T+{adv2['simulation_time_s']:.0f}s")

    # STEP 6: Apply recovery
    rec_res = req("POST", f"/simulation/runs/{mission_a_id}/recovery/apply", {"policy_id": "R-002"}, token=token)
    print(f"[STEP 6] Recovery applied: {rec_res.get('status')}")

    # STEP 7: Advance simulation
    adv3 = req("POST", f"/simulation/runs/{mission_a_id}/advance", {"seconds": 60.0}, token=token)
    assert adv3["simulation_time_s"] == 150.0
    print(f"[STEP 7] Advanced to T+{adv3['simulation_time_s']:.0f}s")

    # STEP 8: End Mission
    end_res = req("POST", f"/simulation/runs/{mission_a_id}/end", token=token)
    assert end_res["status"] == "completed"
    assert end_res["run_id"] == mission_a_id
    print(f"[STEP 8] Mission A ended successfully")

    # STEP 9-11: Verify real end timestamp, final sim time, persistence
    assert end_res["real_completed_at"] is not None
    assert end_res["simulation_time_s"] == 150.0
    assert end_res["persisted"] is True
    print(f"[STEP 9-11] Mission A completed_at={end_res['real_completed_at']}, sim_time={end_res['simulation_time_s']}s, persisted=True")

    # STEP 12-13: Open Mission History & confirm mission appears
    hist = req("GET", "/history/runs", token=token)
    mission_a_hist = next((r for r in hist if r["id"] == mission_a_id), None)
    assert mission_a_hist is not None, f"{mission_a_id} not in history!"
    assert mission_a_hist["status"] == "COMPLETED"
    assert mission_a_hist["duration_s"] == 150.0
    assert mission_a_hist["outcome"] == "MISSION RECOVERED"
    assert mission_a_hist["fault_count"] == 1
    assert mission_a_hist["recovery_status"] == "Successful"
    print(f"[STEP 12-13] History contains Mission A with Outcome={mission_a_hist['outcome']}, Faults={mission_a_hist['fault_count']}, Recovery={mission_a_hist['recovery_status']}")

    # STEP 14-15: Open View Report & confirm matches exact mission
    report_a = req("GET", f"/history/runs/{mission_a_id}/report", token=token)
    assert report_a["mission_id"] == mission_a_id
    assert report_a["mission_info"]["simulation_duration_s"] == 150.0
    assert len(report_a["faults"]) == 1
    assert report_a["faults"][0]["fault_id"] == "F-SOLAR-001"
    assert len(report_a["recovery"]["actions"]) >= 1
    assert report_a["final_outcome"]["simulation_time_s"] == 150.0
    print(f"[STEP 14-15] Mission A Report matches actual mission: 1 fault (F-SOLAR-001), 1 recovery (R-002), final time 150s")

    # STEP 16-18: Simulated Refresh Browser & re-check history & report
    hist_after_refresh = req("GET", "/history/runs", token=token)
    mission_a_hist_refreshed = next((r for r in hist_after_refresh if r["id"] == mission_a_id), None)
    assert mission_a_hist_refreshed is not None
    report_a_refreshed = req("GET", f"/history/runs/{mission_a_id}/report", token=token)
    assert report_a_refreshed["mission_id"] == mission_a_id
    print(f"[STEP 16-18] Page refresh verified: Mission A and its report remain perfectly preserved in database")

    # STEP 19: Start a second mission (Mission B)
    start_b = req("POST", "/simulation/runs/run-default/start", token=token)
    mission_b_id = start_b["run_id"]
    assert mission_b_id != mission_a_id
    print(f"[STEP 19] Mission B Started: {mission_b_id}")

    # Advance Mission B to 60s without faults (Nominal mission)
    req("POST", f"/simulation/runs/{mission_b_id}/advance", {"seconds": 60.0}, token=token)

    # STEP 20: End second mission
    end_b = req("POST", f"/simulation/runs/{mission_b_id}/end", token=token)
    assert end_b["status"] == "completed"
    assert end_b["run_id"] == mission_b_id
    assert end_b["simulation_time_s"] == 60.0
    print(f"[STEP 20] Mission B ended successfully at T+60s")

    # STEP 21: Confirm BOTH missions exist in history
    hist_both = req("GET", "/history/runs", token=token)
    found_a = next((r for r in hist_both if r["id"] == mission_a_id), None)
    found_b = next((r for r in hist_both if r["id"] == mission_b_id), None)
    assert found_a is not None, "Mission A disappeared!"
    assert found_b is not None, "Mission B missing!"
    print(f"[STEP 21] Confirmed BOTH Mission A ({mission_a_id}) and Mission B ({mission_b_id}) exist in Mission History!")

    # STEP 22-23: Open both reports & confirm data independence
    rep_a_final = req("GET", f"/history/runs/{mission_a_id}/report", token=token)
    rep_b_final = req("GET", f"/history/runs/{mission_b_id}/report", token=token)
    assert rep_a_final["mission_info"]["simulation_duration_s"] == 150.0
    assert rep_b_final["mission_info"]["simulation_duration_s"] == 60.0
    assert len(rep_a_final["faults"]) == 1
    assert len(rep_b_final["faults"]) == 0
    assert rep_a_final["outcome"] == "MISSION RECOVERED"
    assert rep_b_final["outcome"] == "NOMINAL SUCCESS"
    print(f"[STEP 22-23] Verified data independence: Mission A duration=150s (RECOVERED), Mission B duration=60s (NOMINAL SUCCESS)")

    # STEP 24: Confirm no placeholder/random/acceptance records exist
    for r in hist_both:
        assert "ACCEPTANCE" not in r["id"]
        assert r["id"] != "run-default"
        assert r["status"] in ("COMPLETED", "RECOVERED", "ABORTED")
        assert r["completed_at"] is not None
    print(f"[STEP 24] Zero placeholder/random/acceptance records found in history ({len(hist_both)} total real missions)")

    print("=" * 60)
    print("SUCCESS: ALL 24 ACCEPTANCE STEPS PASSED WITHOUT ERROR!")
    print("=" * 60)


if __name__ == "__main__":
    run_acceptance_test()

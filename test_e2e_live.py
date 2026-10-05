import requests
import io
import csv

BASE_URL = "http://127.0.0.1:8000"

print("==================================================")
print("  ORBITAL TWIN — E2E LIVE API & FEATURE VERIFICATION")
print("==================================================")

# 1. Test Authentication
print("\n--- 1. Testing Authentication Flow ---")
# 1a. Invalid credentials
r_bad = requests.post(f"{BASE_URL}/auth/login", json={"username": "mission_admin", "password": "wrongpassword"})
assert r_bad.status_code == 401, f"Expected 401 on bad credentials, got {r_bad.status_code}"
print("[PASS] Invalid credentials correctly rejected (HTTP 401)")

# 1b. Missing credentials to protected endpoint
r_unauth = requests.get(f"{BASE_URL}/missions")
assert r_unauth.status_code == 401, f"Expected 401 on unauthenticated request, got {r_unauth.status_code}"
print("[PASS] Unauthenticated access to protected endpoint correctly rejected (HTTP 401)")

# 1c. Valid credentials
r_login = requests.post(f"{BASE_URL}/auth/login", json={"username": "mission_admin", "password": "admin123"})
assert r_login.status_code == 200, f"Expected 200 on login, got {r_login.status_code}"
login_data = r_login.json()
token = login_data["token"]
user_role = login_data["user"]["role"]
assert user_role == "Mission Administrator"
headers = {"Authorization": f"Bearer {token}"}
print(f"[PASS] Valid login successful! User: {login_data['user']['username']}, Role: {user_role}")

# 2. Test V-003 Demo Flow
print("\n--- 2. Testing V-003 Solar Degradation Flow ---")
# Reset to baseline first
r_reset1 = requests.post(f"{BASE_URL}/simulation/runs/run-default/reset", headers=headers)
assert r_reset1.status_code == 200
base_st = r_reset1.json()["state"]
assert base_st["battery_soc_pct"] == 85.0
assert base_st["solar_generation_w"] == 24.0
assert base_st["power_state"] == "NORMAL"
print(f"[PASS] Spacecraft at baseline: SOC={base_st['battery_soc_pct']}%, Solar={base_st['solar_generation_w']}W, PowerState={base_st['power_state']}")

# Activate V-003 Preset
r_v003 = requests.post(f"{BASE_URL}/simulation/runs/run-default/preset/v003-demo", headers=headers)
assert r_v003.status_code == 200
v003_st = r_v003.json()["state"]
assert abs(v003_st["battery_soc_pct"] - 25.08) < 0.05
assert v003_st["demo_mode"] == "V-003_DEMO"
assert len(v003_st["active_faults"]) >= 1
print(f"[PASS] V-003 Preset Activated: Staged SOC={v003_st['battery_soc_pct']}%, Faults={len(v003_st['active_faults'])}, Mode={v003_st['demo_mode']}")

# Step simulation to demonstrate fault propagation
reached_low_power = False
for step_idx in range(1, 6):
    r_step = requests.post(f"{BASE_URL}/simulation/runs/run-default/step", headers=headers)
    assert r_step.status_code == 200
    st = r_step.json()["state"]
    print(f"   Step {step_idx}: T+{st['simulation_time_s']:.0f}s | Solar={st['solar_generation_w']:.2f}W | Load={st['total_power_consumption_w']:.2f}W | SOC={st['battery_soc_pct']:.2f}% | PowerState={st['power_state']}")
    if st["power_state"] == "LOW_POWER":
        reached_low_power = True

assert reached_low_power, "V-003 should transition to LOW_POWER when SOC drops below 25.0%"
print(f"[PASS] Fault propagated: Low power triggered, load shed, deferred images = {st['images_deferred']}")

# Verify Causal Graph
r_cg = requests.get(f"{BASE_URL}/simulation/runs/run-default/faults/causal-graph", headers=headers)
assert r_cg.status_code == 200
cg = r_cg.json()
assert len(cg["nodes"]) >= 2
assert len(cg["edges"]) >= 1
print(f"[PASS] Causal graph populated: {len(cg['nodes'])} nodes, {len(cg['edges'])} directed edges")

# 3. Test Recovery Simulator & Application
print("\n--- 3. Testing Recovery Simulation and Execution ---")
r_rec_sim = requests.post(
    f"{BASE_URL}/simulation/runs/run-default/recovery/simulate",
    headers=headers,
    json={"duration_s": 300, "policies": ["R-001", "R-002", "R-003", "R-004", "R-005", "R-006", "R-007"]},
)
assert r_rec_sim.status_code == 200
report = r_rec_sim.json()["report"]
assert len(report["recovery_scenarios"]) == 7
print(f"[PASS] Multi-scenario recovery resimulation completed for all 7 policies")

# Apply R-002
r_apply = requests.post(
    f"{BASE_URL}/simulation/runs/run-default/recovery/apply",
    headers=headers,
    json={"policy_id": "R-002"},
)
assert r_apply.status_code == 200
print(f"[PASS] Recovery policy R-002 applied to live spacecraft flight software")

# 4. Test V-003 Reset and Re-run
print("\n--- 4. Testing V-003 Reset and Deterministic Re-run ---")
r_reset2 = requests.post(f"{BASE_URL}/simulation/runs/run-default/reset", headers=headers)
assert r_reset2.status_code == 200
reset_st = r_reset2.json()["state"]
assert reset_st["battery_soc_pct"] == 85.0
assert reset_st["solar_generation_w"] == 24.0
assert reset_st["power_state"] == "NORMAL"
assert reset_st["demo_mode"] is None
assert len(reset_st["active_faults"]) == 0
print(f"[PASS] Reset verified: Restored to nominal baseline (SOC={reset_st['battery_soc_pct']}%, Faults={len(reset_st['active_faults'])}, Mode={reset_st['demo_mode']})")

# Re-activate V-003 to test second run
r_v003_second = requests.post(f"{BASE_URL}/simulation/runs/run-default/preset/v003-demo", headers=headers)
assert r_v003_second.status_code == 200
assert abs(r_v003_second.json()["state"]["battery_soc_pct"] - 25.08) < 0.05
print(f"[PASS] V-003 successfully re-activated for 2nd demonstration run")

# Reset again
r_reset3 = requests.post(f"{BASE_URL}/simulation/runs/run-default/reset", headers=headers)
assert r_reset3.status_code == 200
print(f"[PASS] Second reset completed cleanly")

# 5. Test Simulation Timing and Speed Controls
print("\n--- 5. Testing Simulation Timing & Speeds ---")
for spd in [1, 5, 10, 25]:
    r_spd = requests.post(f"{BASE_URL}/simulation/runs/run-default/speed", headers=headers, json={"speed": spd})
    assert r_spd.status_code == 200
    assert r_spd.json()["speed"] == spd
print("[PASS] Speed controls verified: 1x, 5x, 10x, 25x")

for ts in [5.0, 10.0, 15.0, 20.0]:
    r_ts = requests.post(f"{BASE_URL}/simulation/runs/run-default/timestep", headers=headers, json={"timestep_s": ts})
    assert r_ts.status_code == 200
    assert r_ts.json()["timestep_s"] == ts
print("[PASS] Timestep pacing verified: 5s Fast, 10s Normal, 15s Detailed, 20s Present")

# 6. Test CSV Telemetry Export
print("\n--- 6. Testing Telemetry CSV Export ---")
# First advance a few steps so telemetry history has points
for _ in range(3):
    requests.post(f"{BASE_URL}/simulation/runs/run-default/step", headers=headers)

# Export via Authorization header
r_csv_hdr = requests.get(f"{BASE_URL}/simulation/runs/run-default/telemetry/export.csv", headers=headers)
assert r_csv_hdr.status_code == 200
assert "text/csv" in r_csv_hdr.headers.get("content-type", "")
assert "attachment" in r_csv_hdr.headers.get("content-disposition", "")
csv_reader = csv.reader(io.StringIO(r_csv_hdr.text))
csv_rows = list(csv_reader)
assert len(csv_rows) >= 2, f"CSV should have at least header + 1 row, got {len(csv_rows)}"
assert len(csv_rows[0]) == 23, f"CSV header should contain 23 parameters, got {len(csv_rows[0])}"
print(f"[PASS] CSV Export (Auth Header): Valid 23-column CSV, {len(csv_rows)-1} rows, Disposition: {r_csv_hdr.headers.get('content-disposition')}")

# Export via token query param (browser direct link simulation)
r_csv_query = requests.get(f"{BASE_URL}/simulation/runs/run-default/telemetry/export.csv?token={token}")
assert r_csv_query.status_code == 200
assert "text/csv" in r_csv_query.headers.get("content-type", "")
print(f"[PASS] CSV Export (Query Token parameter): Valid direct browser download supported")

# 7. Test Reports & Admin & History
print("\n--- 7. Testing Reports, Persistent History, and Administration ---")
r_rep = requests.post(f"{BASE_URL}/simulation/runs/run-default/reports", headers=headers)
assert r_rep.status_code == 200
rep_data = r_rep.json()["report"]
assert "summary" in rep_data
print(f"[PASS] Mission verification report generated: ID={rep_data['id']}, Summary verified")

r_hist = requests.get(f"{BASE_URL}/history/runs", headers=headers)
assert r_hist.status_code == 200
hist_runs = r_hist.json()
assert len(hist_runs) >= 1
print(f"[PASS] Persistent history runs retrieved: {len(hist_runs)} records found in database")

r_admin = requests.get(f"{BASE_URL}/admin/users", headers=headers)
assert r_admin.status_code == 200
admin_users = r_admin.json()
assert len(admin_users) >= 1
admin_usernames = [u["username"] for u in admin_users]
assert "mission_admin" in admin_usernames
print(f"[PASS] Admin endpoint verified: Primary operator 'mission_admin' active in database")

# Final Cleanup: Reset spacecraft to clean nominal baseline for interactive UI use
r_final_reset = requests.post(f"{BASE_URL}/simulation/runs/run-default/reset", headers=headers)
assert r_final_reset.status_code == 200
final_st = r_final_reset.json()["state"]
assert final_st["battery_soc_pct"] == 85.0
assert final_st["power_state"] == "NORMAL"
assert len(final_st["active_faults"]) == 0
print(f"[PASS] Final state reset to nominal baseline: SOC=85.0%, Faults=0, PowerState=NORMAL")

print("\n==================================================")
print("  ALL E2E LIVE SYSTEM CHECKS PASSED PERFECTLY!")
print("==================================================")

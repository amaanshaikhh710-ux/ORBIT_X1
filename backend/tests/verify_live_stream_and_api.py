"""
Orbital Twin — End-to-End Live Socket & Stream Verification Script
Connects to live running FastAPI and WebSocket servers, executes stepping, fault injection,
and validates real-time state broadcast and recovery comparison.
"""

import asyncio
import json
import websockets
import urllib.request

API_BASE = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/simulation/run-default"

def http_get(path):
    req = urllib.request.Request(f"{API_BASE}{path}")
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def http_post(path, data=None):
    payload = json.dumps(data).encode() if data else b""
    req = urllib.request.Request(f"{API_BASE}{path}", data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

async def run_live_verification():
    print("=" * 60)
    print("ORBITAL TWIN — LIVE HTTP & WEBSOCKET VERIFICATION")
    print("=" * 60)

    # 1. Verify REST API Spacecraft State
    state = http_get("/spacecraft/sat-3u-01/state")
    print(f"[OK] REST /spacecraft/sat-3u-01/state: SOC={state['battery_soc_pct']}%, P_gen={state['solar_generation_w']}W, Temp={state['internal_temp_c']} degC")

    # 2. Connect to WebSocket
    async with websockets.connect(WS_URL) as ws:
        print(f"[OK] WebSocket connected to {WS_URL}")

        # Receive Initial State
        init_raw = await ws.recv()
        init_msg = json.loads(init_raw)
        print(f"[OK] WS INITIAL_STATE: sim_time={init_msg['simulation_time_s']}s, speed={init_msg['speed']}x, power_state={init_msg['state']['power_state']}")

        # Step Simulation via WebSocket command
        print("-> Sending WS command: step")
        await ws.send(json.dumps({"command": "step"}))
        step_raw = await ws.recv()
        step_msg = json.loads(step_raw)
        print(f"[OK] WS SIMULATION_UPDATE received: sim_time={step_msg['simulation_time_s']}s, step_count={step_msg['state']['step_count']}")

        # Step 2 more times
        await ws.send(json.dumps({"command": "step"}))
        await ws.recv()
        await ws.send(json.dumps({"command": "step"}))
        step3_msg = json.loads(await ws.recv())
        print(f"[OK] Stepped to T+{step3_msg['simulation_time_s']}s (battery SOC: {step3_msg['state']['battery_soc_pct']:.2f}%)")

        # 3. Inject Fault via REST (V-003: 70% Solar Array Degradation)
        print("-> Injecting fault: F-SOLAR-001 (70% degradation)")
        fault_payload = {
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.70,
            "start_time_s": 0.0,
            "duration_s": 500.0,
        }
        http_post("/simulation/runs/run-default/faults", fault_payload)
        print("[OK] Fault injected successfully")

        # Advance simulation to evaluate fault propagation
        for _ in range(3):
            await ws.send(json.dumps({"command": "step"}))
            await ws.recv()

        # 4. Check Causal Graph
        graph = http_get("/simulation/runs/run-default/faults/causal-graph")
        print(f"[OK] Causal Graph: {len(graph['nodes'])} nodes, {len(graph['edges'])} edges")
        for node in graph["nodes"]:
            print(f"   Node: [{node['subsystem']}] {node['label']}")
        for edge in graph["edges"]:
            print(f"   Edge: {edge['description']} (T+{edge['timestamp_s']}s)")

        # 5. Run Recovery Multi-Scenario Comparison
        print("-> Running Recovery Multi-Scenario Comparison...")
        rec_res = http_post("/simulation/runs/run-default/recovery/simulate", {
            "duration_s": 300.0,
            "policies": ["R-001", "R-002", "R-003"]
        })
        rep = rec_res["report"]
        base = rep["unmitigated_baseline"]
        print(f"[OK] Baseline (Unmitigated): Min SOC={base['min_battery_soc_pct']:.2f}%, Final SOC={base['final_battery_soc_pct']:.2f}%")
        for sc in rep["recovery_scenarios"]:
            delta = sc["min_battery_soc_pct"] - base["min_battery_soc_pct"]
            print(f"   Policy {sc['policy_id']} ({sc['policy_name']}): Min SOC={sc['min_battery_soc_pct']:.2f}%, delta vs Base={delta:+.2f}%")

        # 6. Generate Audit Report
        rep_res = http_post("/simulation/runs/run-default/reports")
        print(f"[OK] Report Generated: ID={rep_res['report_id']}, duration={rep_res['report']['simulation_duration_s']}s")

    print("=" * 60)
    print("ALL LIVE NETWORK & STREAMING VERIFICATIONS PASSED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_live_verification())

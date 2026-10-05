"""
Orbital Twin — FastAPI Mission Control & Simulation API Server
Implements REST endpoints and real-time streaming feeds defined in 07_API_CONTRACT.md.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, Response
from pydantic import BaseModel, Field
from typing import Any, AsyncGenerator, Optional
from contextlib import asynccontextmanager
import asyncio
import json
import os
import time

from backend.simulation.engine import SimulationEngine
from backend.simulation.core.state import CanonicalSpacecraftState
from backend.simulation.core import constants as const
from backend.simulation.core.types import AlertSeverity, EnvironmentState
from backend.simulation.recovery.policies import RecoveryPolicyRegistry
from backend.simulation.recovery.simulator import RecoverySimulator
from backend.simulation.telemetry import TelemetryEngine

from backend.db.session import init_db, SessionLocal
from backend.db.history import HistoryService
from backend.api.auth import (
    UserRole,
    VALID_ROLES,
    authenticate_user,
    create_access_token,
    require_authenticated_user,
    require_role,
    require_any_role,
    require_admin_role,
    get_current_user_from_header,
    hash_password,
    LoginRequest,
    RegisterRequest,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize PostgreSQL / SQLite database schema & seeds on startup
    init_db()
    yield

app = FastAPI(
    title="Orbital Twin API",
    description="Authoritative Spacecraft Digital Twin & Mission Simulation Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local dev, web client, and Render deployments
allowed_origins_env = os.getenv("CORS_ORIGINS", "*").strip()
allow_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()] if allowed_origins_env != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


# ==========================================
# In-Memory Run & State Manager
# ==========================================

class SimulationRunSession:
    def __init__(self, run_id: str, spacecraft_id: str = "sat-3u-01", mission_id: str = "eo-mission-01"):
        self.run_id = run_id
        self.spacecraft_id = spacecraft_id
        self.mission_id = mission_id
        self.engine = SimulationEngine(run_id=run_id)
        self.is_running: bool = False
        self.speed: int = 1  # 1x, 5x, 10x, 25x
        self.reports: dict[str, Any] = {}
        self.recovery_comparisons: dict[str, Any] = {}
        self._task: asyncio.Task | None = None
        self.subscribers: set[WebSocket] = set()

        # Persist initial record in PostgreSQL
        try:
            HistoryService.ensure_run_record(
                run_id=self.run_id,
                initial_soc=self.engine.state.battery_soc_pct,
                spacecraft_id=self.spacecraft_id,
                mission_id=self.mission_id,
            )
        except Exception:
            pass

    async def broadcast_state(self):
        """Broadcasts canonical state and telemetry snapshot to all connected WebSockets."""
        if not self.subscribers:
            return
        payload = json.dumps({
            "type": "SIMULATION_UPDATE",
            "run_id": self.run_id,
            "simulation_time_s": self.engine.state.simulation_time_s,
            "speed": self.speed,
            "is_running": self.is_running,
            "state": self.engine.state.to_dict(),
            "telemetry": TelemetryEngine.generate_snapshot(self.engine.state, self.run_id),
            "events": self.engine.state.events_this_step,
            "causal_graph": self.engine.causal_engine.export_graph(),
        })
        disconnected = set()
        for ws in self.subscribers:
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.add(ws)
        self.subscribers.difference_update(disconnected)

    async def _loop(self):
        """Background continuous stepping loop governed by simulation speed."""
        step_count = 0
        last_broadcast_time = 0.0
        try:
            while self.is_running:
                self.engine.step()
                step_count += 1
                
                now = time.monotonic()
                if self.speed <= 5 or (now - last_broadcast_time) >= 0.10:
                    await self.broadcast_state()
                    last_broadcast_time = now

                # Periodic persistent checkpoint every 6 steps (60s simulation time)
                if step_count % 6 == 0:
                    try:
                        HistoryService.update_run_checkpoint(self.run_id, self.engine.state)
                        HistoryService.record_telemetry_snapshot(self.run_id, self.engine.state)
                    except Exception:
                        pass

                delay = 1.0 / max(1, self.speed)
                await asyncio.sleep(delay)
        except asyncio.CancelledError:
            self.is_running = False

    def start(self):
        if not self.is_running:
            self.is_running = True
            try:
                HistoryService.update_run_checkpoint(self.run_id, self.engine.state, status="RUNNING")
            except Exception:
                pass
            self._task = asyncio.create_task(self._loop())

    def pause(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        try:
            HistoryService.update_run_checkpoint(self.run_id, self.engine.state, status="PAUSED")
        except Exception:
            pass

    def step(self):
        self.engine.step()
        try:
            HistoryService.update_run_checkpoint(self.run_id, self.engine.state)
        except Exception:
            pass

    def reset(self):
        self.pause()
        self.engine.reset()
        try:
            HistoryService.update_run_checkpoint(self.run_id, self.engine.state, status="NOMINAL")
        except Exception:
            pass


RUN_SESSIONS: dict[str, SimulationRunSession] = {}

# Default primary session
DEFAULT_SESSION = SimulationRunSession(run_id="run-default")
RUN_SESSIONS["run-default"] = DEFAULT_SESSION


def get_session(run_id: str) -> SimulationRunSession:
    if run_id not in RUN_SESSIONS:
        RUN_SESSIONS[run_id] = SimulationRunSession(run_id=run_id)
    return RUN_SESSIONS[run_id]


# ==========================================
# Pydantic Request Models
# ==========================================

class LoginRequest(BaseModel):
    username: str
    password: str
    role: str = "Mission Operator"


class FaultInjectRequest(BaseModel):
    fault_id: str
    subsystem: str
    parameter: str
    severity: float = Field(..., ge=0.0, le=1.0)
    start_time_s: float = Field(..., ge=0.0)
    duration_s: float = Field(..., gt=0.0)


class SpeedRequest(BaseModel):
    speed: int = Field(..., ge=1, le=25)


class TimestepRequest(BaseModel):
    timestep_s: float = Field(..., ge=1.0, le=60.0)


class RecoverySimulateRequest(BaseModel):
    duration_s: float = 600.0
    policies: list[str] = ["R-001", "R-002", "R-003", "R-004", "R-005", "R-006", "R-007"]


class RecoveryApplyRequest(BaseModel):
    policy_id: str


class EnvironmentOverrideRequest(BaseModel):
    state: str  # "SUNLIGHT", "ECLIPSE", "TRANSITION", or "ORBIT"
    duration_s: float = 600.0


# ==========================================
# 1. Auth Endpoints
# ==========================================

@app.post("/auth/login")
async def login(req: LoginRequest):
    db = SessionLocal()
    try:
        user = authenticate_user(db, req.username, req.password, req.role)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid operator credentials")

        token = create_access_token({"sub": user.username, "role": user.role})
        return {
            "status": "success",
            "token": token,
            "user": {
                "username": user.username,
                "role": user.role,
                "authenticated": True,
            }
        }
    finally:
        db.close()


@app.post("/auth/register")
async def register(req: RegisterRequest):
    db = SessionLocal()
    try:
        from backend.db.models import User
        existing = db.query(User).filter_by(username=req.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Operator username already registered")

        new_user = User(
            username=req.username,
            password_hash=hash_password(req.password),
            role=req.role,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        token = create_access_token({"sub": new_user.username, "role": new_user.role})
        return {
            "status": "success",
            "token": token,
            "user": {
                "username": new_user.username,
                "role": new_user.role,
                "authenticated": True,
            }
        }
    finally:
        db.close()


@app.post("/auth/logout")
async def logout():
    return {"status": "success", "message": "Logged out successfully"}


@app.get("/auth/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    return get_current_user_from_header(authorization)


# ==========================================
# 1b. Administration Endpoints
# ==========================================

@app.get("/admin/users", dependencies=[Depends(require_admin_role())])
async def list_admin_users():
    """Lists all registered operators and their authoritative roles. Administrator privileges required."""
    db = SessionLocal()
    try:
        from backend.db.models import User
        users = db.query(User).all()
        return [
            {
                "id": u.id,
                "username": u.username,
                "role": u.role,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    finally:
        db.close()


# ==========================================
# 2. Mission & Spacecraft Endpoints
# ==========================================

@app.get("/missions", dependencies=[Depends(require_authenticated_user)])
async def list_missions():
    return [
        {
            "id": "eo-mission-01",
            "name": "Orbital Twin Earth Observation Demo",
            "type": const.MISSION_TYPE,
            "spacecraft_id": "sat-3u-01",
            "status": "ACTIVE",
            "target_images": 20,
            "nominal_orbit_period_s": 5400.0,
        }
    ]


@app.get("/missions/{mission_id}", dependencies=[Depends(require_authenticated_user)])
async def get_mission(mission_id: str):
    return {
        "id": mission_id,
        "name": "Orbital Twin Earth Observation Demo",
        "type": const.MISSION_TYPE,
        "spacecraft_id": "sat-3u-01",
        "status": "ACTIVE",
        "description": "3U CubeSat optical remote sensing and high-rate ground station downlink mission.",
        "duration_h": 48.0,
        "primary_ground_station": "Svalbard Ground Station (78.2°N)",
    }


@app.get("/missions/{mission_id}/objectives", dependencies=[Depends(require_authenticated_user)])
async def get_mission_objectives(mission_id: str):
    session = get_session("run-default")
    return [
        {
            "id": "obj-01",
            "name": "Collect Earth Observation Imagery",
            "status": "IN_PROGRESS",
            "target": 20,
            "current": session.engine.state.images_completed,
            "unit": "scenes",
        },
        {
            "id": "obj-02",
            "name": "Downlink Stored Science Data",
            "status": "IN_PROGRESS",
            "target": 500.0,
            "current": round(session.engine.state.total_downlinked_data_mb, 2),
            "unit": "MB",
        },
        {
            "id": "obj-03",
            "name": "Maintain Battery Reserve > 25%",
            "status": "MET" if session.engine.state.battery_soc_pct > 25.0 else "WARNING",
            "current": round(session.engine.state.battery_soc_pct, 2),
            "unit": "%",
        },
    ]


@app.get("/spacecraft/{spacecraft_id}", dependencies=[Depends(require_authenticated_user)])
async def get_spacecraft_config(spacecraft_id: str):
    return {
        "id": spacecraft_id,
        "name": "Orbital-Twin-1",
        "bus_class": const.BUS_CLASS,
        "mass_kg": const.SPACECRAFT_MASS_KG,
        "solar_peak_w": const.NOMINAL_SOLAR_PEAK_W,
        "battery_capacity_wh": const.BATTERY_USABLE_CAPACITY_WH,
        "storage_capacity_gb": const.STORAGE_CAPACITY_GB,
        "downlink_rate_mbps": const.DOWNLINK_RATE_MBPS,
        "subsystems": [
            "Solar Array", "Li-Ion Battery", "EPS / Power Bus", "Thermal Control",
            "X-Band Transceiver", "High-Res Optical Imager", "OBC", "Flash Storage", "ADCS Reaction Wheels"
        ]
    }


@app.get("/spacecraft/{spacecraft_id}/state", dependencies=[Depends(require_authenticated_user)])
async def get_spacecraft_state(spacecraft_id: str):
    session = get_session("run-default")
    return session.engine.state.to_dict()


# ==========================================
# 3. Simulation Lifecycle Endpoints
# ==========================================

@app.post("/simulation/runs", dependencies=[Depends(require_authenticated_user)])
async def create_simulation_run(run_id: str = "run-new"):
    session = get_session(run_id)
    session.reset()
    return {"status": "created", "run_id": run_id}


@app.get("/simulation/runs/{run_id}", dependencies=[Depends(require_authenticated_user)])
async def get_simulation_run(run_id: str):
    session = get_session(run_id)
    return {
        "run_id": session.run_id,
        "simulation_time_s": session.engine.state.simulation_time_s,
        "step_count": session.engine.state.step_count,
        "is_running": session.is_running,
        "speed": session.speed,
        "timestep_s": session.engine.timestep_s,
        "power_state": session.engine.state.power_state.value,
        "active_faults_count": len(session.engine.active_faults),
    }


@app.post("/simulation/runs/{run_id}/start", dependencies=[Depends(require_authenticated_user)])
async def start_simulation(run_id: str):
    session = get_session(run_id)
    session.start()
    return {"status": "started", "run_id": run_id, "speed": session.speed}


@app.post("/simulation/runs/{run_id}/pause", dependencies=[Depends(require_authenticated_user)])
async def pause_simulation(run_id: str):
    session = get_session(run_id)
    session.pause()
    return {"status": "paused", "run_id": run_id}


@app.post("/simulation/runs/{run_id}/resume", dependencies=[Depends(require_authenticated_user)])
async def resume_simulation(run_id: str):
    session = get_session(run_id)
    session.start()
    return {"status": "resumed", "run_id": run_id}


@app.post("/simulation/runs/{run_id}/reset", dependencies=[Depends(require_authenticated_user)])
async def reset_simulation(run_id: str):
    session = get_session(run_id)
    session.reset()
    await session.broadcast_state()
    return {
        "status": "reset",
        "run_id": run_id,
        "simulation_time_s": 0.0,
        "state": session.engine.state.to_dict(),
        "telemetry": TelemetryEngine.generate_snapshot(session.engine.state, session.run_id),
    }


@app.post("/simulation/runs/{run_id}/step", dependencies=[Depends(require_authenticated_user)])
async def step_simulation(run_id: str):
    session = get_session(run_id)
    session.step()
    await session.broadcast_state()
    return {
        "status": "stepped",
        "simulation_time_s": session.engine.state.simulation_time_s,
        "state": session.engine.state.to_dict(),
    }


@app.post("/simulation/runs/{run_id}/speed", dependencies=[Depends(require_authenticated_user)])
async def set_simulation_speed(run_id: str, req: SpeedRequest):
    if req.speed not in const.SIMULATION_SPEEDS:
        raise HTTPException(status_code=400, detail=f"Speed must be one of {const.SIMULATION_SPEEDS}")
    session = get_session(run_id)
    session.speed = req.speed
    return {"status": "speed_updated", "speed": session.speed}


@app.post("/simulation/runs/{run_id}/timestep", dependencies=[Depends(require_authenticated_user)])
async def set_simulation_timestep(run_id: str, req: TimestepRequest):
    session = get_session(run_id)
    session.engine.timestep_s = req.timestep_s
    session.engine.state.time_step_s = req.timestep_s
    await session.broadcast_state()
    return {"status": "timestep_updated", "timestep_s": session.engine.timestep_s}


@app.post("/simulation/runs/{run_id}/environment", dependencies=[Depends(require_authenticated_user)])
async def set_simulation_environment(run_id: str, req: EnvironmentOverrideRequest):
    session = get_session(run_id)
    if req.state.upper() == "ORBIT":
        session.engine.set_environment_override(None)
    else:
        try:
            env_st = EnvironmentState(req.state.upper())
            session.engine.set_environment_override(env_st, req.duration_s)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid environment state: {req.state}")
    await session.broadcast_state()
    return {"status": "environment_updated", "state": req.state.upper()}


@app.post("/simulation/runs/{run_id}/preset/v003-demo", dependencies=[Depends(require_any_role(UserRole.SIMULATION_ENGINEER))])
async def activate_v003_demo_preset(run_id: str):
    session = get_session(run_id)
    session.pause()
    session.reset()

    # Pre-stage battery to realistic condition near the LOW_POWER threshold (25.0%)
    # Initializing at 25.08% SOC (18.057 Wh out of 72.0 Wh usable capacity)
    demo_soc = 25.08
    session.engine.state.battery_soc_pct = demo_soc
    session.engine.state.battery_energy_wh = const.BATTERY_USABLE_CAPACITY_WH * (demo_soc / 100.0)

    # Inject V-003: 70% Solar Array Degradation starting at t=0s
    session.engine.inject_fault(
        fault_id="F-SOLAR-001",
        subsystem="Solar",
        parameter="solar_health",
        severity=0.70,
        start_time_s=0.0,
        duration_s=1800.0,
    )
    session.engine.state.active_faults = list(session.engine.active_faults)

    # Queue active optical imaging task so load rises to 13.5W against 7.2W solar generation
    session.engine.payload_model.trigger_image_task("img-v003-demo")
    session.engine.next_auto_image_time_s = 60.0

    session.engine.state.demo_mode = "V-003_DEMO"
    session.engine._record_event(
        event_type="DEMO_PRESET_ACTIVATED",
        subsystem="MISSION",
        severity=AlertSeverity.INFO,
        message="V-003 Solar Degradation Demo Preset activated (Battery pre-staged at 25.08% SOC, 70% degradation active, optical imaging task active)",
    )

    # Re-initialize telemetry history and state history
    session.engine.telemetry_history = [
        TelemetryEngine.generate_snapshot(session.engine.state, session.run_id)
    ]
    session.engine.state_history = [session.engine.state.clone()]

    await session.broadcast_state()
    return {
        "status": "v003_demo_activated",
        "simulation_time_s": 0.0,
        "battery_soc_pct": demo_soc,
        "active_faults": session.engine.active_faults,
        "state": session.engine.state.to_dict(),
    }


# ==========================================
# 4. Fault Injection & Causal Analysis
# ==========================================

@app.get("/faults/catalog", dependencies=[Depends(require_authenticated_user)])
async def get_fault_catalog():
    return [
        {"fault_id": "F-SOLAR-001", "subsystem": "Solar", "parameter": "solar_health", "name": "Solar Array Degradation", "description": "Multiplicative solar cell damage reducing bus power generation.", "severity_range": "0.0 - 1.0"},
        {"fault_id": "F-BATT-001", "subsystem": "Battery", "parameter": "usable_capacity", "name": "Battery Cell Degradation", "description": "Loss of usable battery capacity accelerating discharge.", "severity_range": "0.0 - 1.0"},
        {"fault_id": "F-REG-001", "subsystem": "Power", "parameter": "fault_overhead_w", "name": "Power Regulator Resistance", "description": "Increased power loss and parasitic thermal heating.", "severity_range": "0.0 - 1.0"},
        {"fault_id": "F-THERM-001", "subsystem": "Thermal", "parameter": "heat_rejection_coefficient", "name": "Radiator Surface Degradation", "description": "Reduced thermal heat rejection coefficient causing temperature rise.", "severity_range": "0.0 - 1.0"},
        {"fault_id": "F-COMM-001", "subsystem": "Communication", "parameter": "comm_health", "name": "RF Amplifier Degradation", "description": "Reduced RF power output lowering downlink bit rate.", "severity_range": "0.0 - 1.0"},
        {"fault_id": "F-COMM-002", "subsystem": "Communication", "parameter": "packet_loss", "name": "RF Link Noise", "description": "High packet loss reducing net transmission efficiency.", "severity_range": "0.0 - 1.0"},
        {"fault_id": "F-ADCS-001", "subsystem": "ADCS", "parameter": "attitude_bias", "name": "Star Tracker Sensor Bias", "description": "Pointing offset exceeding 2.0° preventing nominal imaging.", "severity_range": "0.0 - 1.0"},
    ]


@app.post("/simulation/runs/{run_id}/faults", dependencies=[Depends(require_any_role(UserRole.SIMULATION_ENGINEER))])
async def inject_fault(run_id: str, req: FaultInjectRequest):
    session = get_session(run_id)
    session.engine.inject_fault(
        fault_id=req.fault_id,
        subsystem=req.subsystem,
        parameter=req.parameter,
        severity=req.severity,
        start_time_s=req.start_time_s,
        duration_s=req.duration_s,
    )
    try:
        HistoryService.record_fault_event(run_id, req.model_dump())
    except Exception:
        pass
    return {"status": "injected", "fault": req.model_dump()}


@app.delete("/simulation/runs/{run_id}/faults/{fault_id}", dependencies=[Depends(require_any_role(UserRole.SIMULATION_ENGINEER))])
async def clear_fault(run_id: str, fault_id: str):
    session = get_session(run_id)
    session.engine.active_faults = [f for f in session.engine.active_faults if f["fault_id"] != fault_id]
    try:
        HistoryService.record_fault_cleared(run_id, fault_id, session.engine.state.simulation_time_s)
    except Exception:
        pass
    return {"status": "cleared", "fault_id": fault_id}


@app.get("/simulation/runs/{run_id}/faults/causal-graph", dependencies=[Depends(require_authenticated_user)])
async def get_causal_graph(run_id: str):
    session = get_session(run_id)
    return session.engine.causal_engine.export_graph()


# ==========================================
# 5. Recovery & Multi-Scenario Re-simulation
# ==========================================

@app.get("/recovery/strategies", dependencies=[Depends(require_authenticated_user)])
async def list_recovery_strategies():
    policies = RecoveryPolicyRegistry.get_all_policies()
    return [
        {
            "id": p.policy_id,
            "name": p.name,
            "description": p.description,
            "actions": p.actions,
            "expected_effects": p.expected_effects,
        }
        for p in policies
    ]


@app.post("/simulation/runs/{run_id}/recovery/simulate", dependencies=[Depends(require_any_role(UserRole.FLIGHT_DIRECTOR, UserRole.SIMULATION_ENGINEER))])
async def run_recovery_comparison(run_id: str, req: RecoverySimulateRequest):
    session = get_session(run_id)
    selected_policies = [RecoveryPolicyRegistry.get_by_id(pid) for pid in req.policies if pid != "R-NONE"]

    # Execute multi-scenario branching comparison
    report = RecoverySimulator.run_comparison(
        initial_state=session.engine.state.clone(),
        faults=session.engine.active_faults,
        duration_s=req.duration_s,
        policies=selected_policies,
        environment_model=session.engine.environment_model,
        random_seed=session.engine.random_seed,
    )

    comp_id = f"comp-{int(time.time())}"
    session.recovery_comparisons[comp_id] = report.to_dict()
    return {
        "status": "completed",
        "comparison_id": comp_id,
        "report": report.to_dict(),
    }


@app.get("/simulation/runs/{run_id}/recovery/{comparison_id}", dependencies=[Depends(require_authenticated_user)])
async def get_recovery_comparison(run_id: str, comparison_id: str):
    session = get_session(run_id)
    if comparison_id not in session.recovery_comparisons:
        raise HTTPException(status_code=404, detail="Comparison report not found")
    return session.recovery_comparisons[comparison_id]


@app.post("/simulation/runs/{run_id}/recovery/apply", dependencies=[Depends(require_any_role(UserRole.FLIGHT_DIRECTOR))])
async def apply_recovery_strategy(run_id: str, req: RecoveryApplyRequest):
    session = get_session(run_id)
    try:
        policy = RecoveryPolicyRegistry.get_by_id(req.policy_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Recovery policy {req.policy_id} not found")

    session.engine.apply_recovery_policy(policy)
    try:
        HistoryService.record_recovery_action(
            run_id=run_id,
            policy_id=policy.policy_id,
            policy_name=policy.name,
            actions=policy.actions,
            expected_effects=policy.expected_effects,
            sim_time_s=session.engine.state.simulation_time_s,
        )
    except Exception:
        pass
    await session.broadcast_state()
    return {
        "status": "applied",
        "policy_id": policy.policy_id,
        "name": policy.name,
        "actions": policy.actions,
    }


# ==========================================
# 6. Telemetry & Timeline Endpoints
# ==========================================

@app.get("/simulation/runs/{run_id}/telemetry", dependencies=[Depends(require_authenticated_user)])
async def get_telemetry_history(run_id: str, limit: int = Query(50, ge=1, le=500)):
    session = get_session(run_id)
    recent = session.engine.telemetry_history[-limit:]
    flat = [pt for snapshot in recent for pt in snapshot]
    return flat


@app.get("/simulation/runs/{run_id}/telemetry/export.csv", dependencies=[Depends(require_authenticated_user)])
@app.get("/simulation/runs/{run_id}/telemetry/export-csv", dependencies=[Depends(require_authenticated_user)])
async def export_telemetry_csv(run_id: str):
    session = get_session(run_id)
    csv_content = session.engine.export_telemetry_csv()
    filename = f"orbital_twin_telemetry_{run_id}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@app.get("/simulation/runs/{run_id}/telemetry/latest", dependencies=[Depends(require_authenticated_user)])
async def get_latest_telemetry(run_id: str):
    session = get_session(run_id)
    return TelemetryEngine.generate_snapshot(session.engine.state, session.run_id)


@app.get("/simulation/runs/{run_id}/timeline", dependencies=[Depends(require_authenticated_user)])
async def get_timeline_events(run_id: str):
    session = get_session(run_id)
    return {
        "simulation_time_s": session.engine.state.simulation_time_s,
        "events": session.engine.event_log,
        "causal_events": session.engine.causal_engine.get_events_for_timeline(),
    }


# ==========================================
# 7. Reports Endpoints
# ==========================================

@app.post("/simulation/runs/{run_id}/reports", dependencies=[Depends(require_authenticated_user)])
async def generate_report(run_id: str):
    session = get_session(run_id)
    rep_id = f"rep-{int(time.time())}"
    report_data = {
        "id": rep_id,
        "run_id": run_id,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "mission": "Orbital Twin Earth Observation Demo",
        "simulation_duration_s": session.engine.state.simulation_time_s,
        "final_state": session.engine.state.to_dict(),
        "summary": {
            "images_completed": session.engine.state.images_completed,
            "images_deferred": session.engine.state.images_deferred,
            "images_failed": session.engine.state.images_failed,
            "total_downlinked_mb": round(session.engine.state.total_downlinked_data_mb, 2),
            "final_battery_soc": round(session.engine.state.battery_soc_pct, 2),
            "final_internal_temp_c": round(session.engine.state.internal_temp_c, 2),
            "active_faults": session.engine.active_faults,
            "total_events_logged": len(session.engine.event_log),
        },
        "epistemic_declarations": {
            "model_type": "Representative 3U CubeSat discrete-time simulation",
            "fidelity": "Physics-informed, not flight-certified",
            "parameters_source": "18_ENGINEERING_BASELINE.md and 19_ENGINEERING_PARAMETER_REGISTER.csv",
        }
    }
    session.reports[rep_id] = report_data
    try:
        HistoryService.record_report(run_id, report_data)
    except Exception:
        pass
    return {"status": "generated", "report_id": rep_id, "report": report_data}


@app.get("/simulation/runs/{run_id}/reports/{report_id}", dependencies=[Depends(require_authenticated_user)])
async def get_report(run_id: str, report_id: str):
    session = get_session(run_id)
    if report_id not in session.reports:
        raise HTTPException(status_code=404, detail="Report not found")
    return session.reports[report_id]


# ==========================================
# 7b. Persistent Mission History Endpoints
# ==========================================

@app.get("/history/runs", dependencies=[Depends(require_authenticated_user)])
async def list_history_runs():
    """Returns persistent history of all ORBIT-X1 simulation runs from database."""
    return HistoryService.get_all_runs()


@app.get("/history/runs/{run_id}", dependencies=[Depends(require_authenticated_user)])
async def get_history_run_details(run_id: str):
    """Returns full persistent run metrics, injected faults, recoveries, and reports."""
    details = HistoryService.get_run_details(run_id)
    if not details:
        raise HTTPException(status_code=404, detail=f"Simulation run '{run_id}' not found in database history")
    return details


# ==========================================
# 8. Real-time Streaming (WebSocket & SSE)
# ==========================================

@app.websocket("/ws/simulation/{run_id}")
async def websocket_simulation(websocket: WebSocket, run_id: str):
    await websocket.accept()
    session = get_session(run_id)
    session.subscribers.add(websocket)

    # Immediately emit current initial snapshot
    init_payload = json.dumps({
        "type": "INITIAL_STATE",
        "run_id": run_id,
        "simulation_time_s": session.engine.state.simulation_time_s,
        "speed": session.speed,
        "is_running": session.is_running,
        "state": session.engine.state.to_dict(),
        "telemetry": TelemetryEngine.generate_snapshot(session.engine.state, session.run_id),
        "events": session.engine.event_log[-20:],
        "causal_graph": session.engine.causal_engine.export_graph(),
    })
    await websocket.send_text(init_payload)

    try:
        while True:
            # Handle incoming commands from client
            msg_text = await websocket.receive_text()
            try:
                msg = json.loads(msg_text)
                cmd = msg.get("command")
                if cmd == "start":
                    session.start()
                elif cmd == "pause":
                    session.pause()
                elif cmd == "reset":
                    session.reset()
                elif cmd == "step":
                    session.step()
                elif cmd == "set_speed":
                    session.speed = msg.get("speed", 1)
                await session.broadcast_state()
            except Exception:
                pass
    except WebSocketDisconnect:
        session.subscribers.discard(websocket)


@app.get("/sse/simulation/{run_id}")
async def sse_simulation(run_id: str):
    session = get_session(run_id)

    async def event_generator() -> AsyncGenerator[str, None]:
        while True:
            data = json.dumps({
                "simulation_time_s": session.engine.state.simulation_time_s,
                "state": session.engine.state.to_dict(),
                "telemetry": TelemetryEngine.generate_snapshot(session.engine.state, session.run_id),
            })
            yield f"data: {data}\n\n"
            await asyncio.sleep(1.0)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

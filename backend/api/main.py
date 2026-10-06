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
import uuid
from datetime import datetime, timezone

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
        self.status: str = "READY"  # READY, RUNNING, PAUSED, COMPLETED, ABORTED
        self.real_started_at: datetime | None = None
        self.real_completed_at: datetime | None = None
        self.persisted_event_count: int = 0
        self.speed: int = 1  # 1x, 5x, 10x, 25x
        self.reports: dict[str, Any] = {}
        self.recovery_comparisons: dict[str, Any] = {}
        self._task: asyncio.Task | None = None
        self.subscribers: set[WebSocket] = set()

    def ensure_persisted(self):
        """Persists the initial run record in the database only when running."""
        if self.run_id == "run-default" or self.status in ("READY", "CREATED"):
            return
        try:
            HistoryService.ensure_run_record(
                run_id=self.run_id,
                initial_soc=self.engine.state.battery_soc_pct,
                spacecraft_id=self.spacecraft_id,
                mission_id=self.mission_id,
                status=self.status,
                started_at=self.real_started_at,
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
            "status": self.status,
            "real_started_at": self.real_started_at.isoformat() if self.real_started_at else None,
            "real_completed_at": self.real_completed_at.isoformat() if self.real_completed_at else None,
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
            while self.is_running and self.status == "RUNNING":
                delay = 1.0 / max(1, self.speed)
                await asyncio.sleep(delay)
                if not self.is_running or self.status != "RUNNING":
                    break

                self.engine.step()
                step_count += 1
                
                # Persist any newly generated events
                try:
                    new_events = self.engine.event_log[self.persisted_event_count:]
                    if new_events:
                        HistoryService.record_events(self.run_id, new_events)
                        self.persisted_event_count = len(self.engine.event_log)
                except Exception:
                    pass

                now = time.monotonic()
                if self.speed <= 5 or (now - last_broadcast_time) >= 0.10:
                    await self.broadcast_state()
                    last_broadcast_time = now

                # Periodic persistent checkpoint every 6 steps (60s simulation time)
                if step_count % 6 == 0:
                    try:
                        HistoryService.update_run_checkpoint(self.run_id, self.engine.state, status=self.status)
                        HistoryService.record_telemetry_snapshot(self.run_id, self.engine.state)
                    except Exception:
                        pass
        except asyncio.CancelledError:
            if self.status != "RUNNING":
                self.is_running = False

    def start(self):
        if self.status in ("COMPLETED", "ABORTED"):
            return
        if self.real_started_at is None:
            self.real_started_at = datetime.now(timezone.utc)
        self.status = "RUNNING"
        self.is_running = True
        try:
            HistoryService.start_run(self.run_id, self.engine.state, started_at=self.real_started_at)
        except Exception:
            pass
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._loop())

    def pause(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        if self.status == "RUNNING":
            self.status = "PAUSED"
        try:
            HistoryService.update_run_checkpoint(self.run_id, self.engine.state, status=self.status)
        except Exception:
            pass

    def step(self):
        self.engine.step()
        try:
            new_events = self.engine.event_log[self.persisted_event_count:]
            if new_events:
                HistoryService.record_events(self.run_id, new_events)
                self.persisted_event_count = len(self.engine.event_log)
            chk_status = self.status if self.status != "CREATED" else "RUNNING"
            HistoryService.update_run_checkpoint(self.run_id, self.engine.state, status=chk_status)
        except Exception:
            pass

    def advance(self, seconds: float):
        """Advances simulation by specified simulated seconds using discrete physics steps."""
        dt = self.engine.timestep_s or 10.0
        steps = max(1, int(round(seconds / dt)))
        for _ in range(steps):
            self.engine.step()

        self.engine.state.active_faults = list(self.engine.active_faults)
        try:
            new_events = self.engine.event_log[self.persisted_event_count:]
            if new_events:
                HistoryService.record_events(self.run_id, new_events)
                self.persisted_event_count = len(self.engine.event_log)
            chk_status = self.status if self.status != "CREATED" else "RUNNING"
            HistoryService.update_run_checkpoint(self.run_id, self.engine.state, status=chk_status)
            HistoryService.record_telemetry_snapshot(self.run_id, self.engine.state)
        except Exception:
            pass

    def end(self, status: str = "COMPLETED"):
        """Ends active simulation, records real completion time, and persists final mission state."""
        self.pause()
        self.status = status
        self.real_completed_at = datetime.now(timezone.utc)
        self.engine.state.active_faults = list(self.engine.active_faults)
        try:
            new_events = self.engine.event_log[self.persisted_event_count:]
            if new_events:
                HistoryService.record_events(self.run_id, new_events)
                self.persisted_event_count = len(self.engine.event_log)
            HistoryService.complete_run(
                self.run_id,
                self.engine.state,
                status=status,
                completed_at=self.real_completed_at,
            )
            HistoryService.record_telemetry_snapshot(self.run_id, self.engine.state)
        except Exception:
            pass

    def reset(self):
        """Resets in-memory state. Preserves in-flight mission as ABORTED if it had progress."""
        if self.status in ("RUNNING", "PAUSED") and (self.engine.state.simulation_time_s > 0 or len(self.engine.active_faults) > 0):
            self.end(status="ABORTED")
        else:
            self.pause()

        self.engine.reset()
        self.status = "READY"
        self.real_started_at = None
        self.real_completed_at = None
        self.persisted_event_count = 0


RUN_SESSIONS: dict[str, SimulationRunSession] = {}
ACTIVE_RUN_ID: str = "run-default"

# Default primary session
DEFAULT_SESSION = SimulationRunSession(run_id="run-default")
RUN_SESSIONS["run-default"] = DEFAULT_SESSION


def generate_mission_run_id() -> str:
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    base_id = f"ORBIT-X1-RUN-{now_str}"
    if base_id in RUN_SESSIONS:
        # collision prevention
        ms_str = datetime.now(timezone.utc).strftime("%f")[:3]
        return f"{base_id}-{ms_str}"
    return base_id


def get_session(run_id: str) -> SimulationRunSession:
    global ACTIVE_RUN_ID
    if run_id not in RUN_SESSIONS:
        session = SimulationRunSession(run_id=run_id)
        RUN_SESSIONS[run_id] = session
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


class AdvanceTimeRequest(BaseModel):
    seconds: Optional[float] = None
    amount: Optional[float] = None
    unit: Optional[str] = "seconds"  # "seconds", "minutes", "hours"


class TimelineEventRequest(BaseModel):
    event_type: str
    subsystem: str = "MISSION"
    severity: str = "INFO"
    message: str


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

@app.get("/simulation/active-run", dependencies=[Depends(require_authenticated_user)])
async def get_active_simulation_run():
    session = get_session(ACTIVE_RUN_ID)
    return {
        "run_id": session.run_id,
        "status": session.status,
        "is_running": session.is_running or (session.status == "RUNNING"),
        "simulation_time_s": session.engine.state.simulation_time_s,
        "step_count": session.engine.state.step_count,
        "speed": session.speed,
        "timestep_s": session.engine.timestep_s,
        "power_state": session.engine.state.power_state.value,
        "active_faults_count": len(session.engine.active_faults),
        "real_started_at": session.real_started_at.isoformat() if session.real_started_at else None,
        "real_completed_at": session.real_completed_at.isoformat() if session.real_completed_at else None,
    }


@app.post("/simulation/runs", dependencies=[Depends(require_authenticated_user)])
async def create_simulation_run(run_id: Optional[str] = None):
    global ACTIVE_RUN_ID
    if not run_id or run_id == "run-new":
        run_id = generate_mission_run_id()
    ACTIVE_RUN_ID = run_id
    session = get_session(run_id)
    session.reset()
    return {"status": "created", "run_id": run_id}


@app.get("/simulation/runs/{run_id}", dependencies=[Depends(require_authenticated_user)])
async def get_simulation_run(run_id: str):
    session = get_session(run_id)
    return {
        "run_id": session.run_id,
        "status": session.status,
        "simulation_time_s": session.engine.state.simulation_time_s,
        "step_count": session.engine.state.step_count,
        "is_running": session.is_running or (session.status == "RUNNING"),
        "speed": session.speed,
        "timestep_s": session.engine.timestep_s,
        "power_state": session.engine.state.power_state.value,
        "active_faults_count": len(session.engine.active_faults),
        "real_started_at": session.real_started_at.isoformat() if session.real_started_at else None,
        "real_completed_at": session.real_completed_at.isoformat() if session.real_completed_at else None,
        "state": session.engine.state.to_dict(),
    }


@app.post("/simulation/runs/{run_id}/start", dependencies=[Depends(require_authenticated_user)])
async def start_simulation(run_id: str):
    global ACTIVE_RUN_ID
    session = get_session(run_id)
    if session.status in ("COMPLETED", "ABORTED") or session.run_id == "run-default" or session.run_id.startswith("run-"):
        new_id = generate_mission_run_id()
        ACTIVE_RUN_ID = new_id
        old_session = session
        session = get_session(new_id)
        session.subscribers = old_session.subscribers.copy()
    else:
        ACTIVE_RUN_ID = session.run_id

    # Record real wall-clock start timestamp
    if session.real_started_at is None:
        session.real_started_at = datetime.now(timezone.utc)

    # Record MISSION_STARTED event if starting fresh
    if session.engine.state.simulation_time_s == 0.0:
        session.engine._record_event(
            event_type="MISSION_STARTED",
            subsystem="MISSION",
            severity=AlertSeverity.INFO,
            message=f"Mission {session.run_id} started at baseline T+00:00:00",
        )

    session.start()
    await session.broadcast_state()
    return {
        "status": "started",
        "run_id": session.run_id,
        "speed": session.speed,
        "real_started_at": session.real_started_at.isoformat() if session.real_started_at else None,
    }


@app.post("/simulation/runs/{run_id}/pause", dependencies=[Depends(require_authenticated_user)])
async def pause_simulation(run_id: str):
    session = get_session(run_id)
    session.pause()
    session.engine._record_event(
        event_type="SIMULATION_PAUSED",
        subsystem="MISSION",
        severity=AlertSeverity.INFO,
        message=f"Simulation paused at T+{session.engine.state.simulation_time_s:.0f}s",
    )
    await session.broadcast_state()
    return {"status": "paused", "run_id": run_id}


@app.post("/simulation/runs/{run_id}/resume", dependencies=[Depends(require_authenticated_user)])
async def resume_simulation(run_id: str):
    session = get_session(run_id)
    session.engine._record_event(
        event_type="SIMULATION_RESUMED",
        subsystem="MISSION",
        severity=AlertSeverity.INFO,
        message=f"Simulation resumed at T+{session.engine.state.simulation_time_s:.0f}s",
    )
    session.start()
    await session.broadcast_state()
    return {
        "status": "resumed",
        "run_id": run_id,
        "real_started_at": session.real_started_at.isoformat() if session.real_started_at else None,
    }


@app.post("/simulation/runs/{run_id}/end", dependencies=[Depends(require_authenticated_user)])
async def end_simulation(run_id: str):
    global ACTIVE_RUN_ID
    session = get_session(run_id)

    # If run_id is run-default, assign a real mission run ID so it can be saved properly
    if session.run_id == "run-default" or session.run_id.startswith("run-"):
        proper_id = generate_mission_run_id()
        old_session = session
        session = get_session(proper_id)
        session.subscribers = old_session.subscribers.copy()
        session.engine.state = old_session.engine.state.clone()
        session.engine.active_faults = list(old_session.engine.active_faults)
        session.engine.event_log = list(old_session.engine.event_log)
        session.real_started_at = old_session.real_started_at or datetime.now(timezone.utc)
        ACTIVE_RUN_ID = session.run_id

    # 1. Stop active simulation advancement
    session.pause()

    # 2. Capture final simulation time
    final_sim_time = session.engine.state.simulation_time_s
    final_soc = session.engine.state.battery_soc_pct

    # 3. Record formal mission ended event in simulation timeline
    session.engine._record_event(
        event_type="MISSION_ENDED",
        subsystem="MISSION",
        severity=AlertSeverity.INFO,
        message=f"Mission {session.run_id} formally concluded at T+{final_sim_time:.0f}s",
    )

    # 4. Record real wall-clock end timestamp
    now_utc = datetime.now(timezone.utc)
    if session.real_started_at is None:
        session.real_started_at = now_utc
    session.real_completed_at = now_utc
    session.status = "COMPLETED"

    # 5. Persist all newly generated events
    new_events = session.engine.event_log[session.persisted_event_count:]
    if new_events:
        HistoryService.record_events(session.run_id, new_events)
        session.persisted_event_count = len(session.engine.event_log)

    # 6. Synchronize active faults list
    session.engine.state.active_faults = list(session.engine.active_faults)

    # 7. Persist COMPLETE mission record in database
    HistoryService.complete_run(
        run_id=session.run_id,
        state=session.engine.state,
        status="COMPLETED",
        completed_at=session.real_completed_at,
        started_at=session.real_started_at,
    )
    HistoryService.record_telemetry_snapshot(session.run_id, session.engine.state)

    # 8. Compile and persist the authoritative historical report in ReportRecord
    compiled_report = HistoryService.compile_and_record_run_report(session.run_id)
    if compiled_report:
        session.reports[compiled_report["id"]] = compiled_report

    # 9. Verify persistence succeeded
    verification = HistoryService.get_run_details(session.run_id)
    if not verification:
        logger.error("Persistence verification failed for run %s", session.run_id)

    completed_run_id = session.run_id
    real_started_str = session.real_started_at.isoformat()
    real_completed_str = session.real_completed_at.isoformat()
    real_elapsed_s = max(0.0, (session.real_completed_at - session.real_started_at).total_seconds())
    events_count = len(session.engine.event_log)

    # 10. ONLY AFTER SUCCESSFUL PERSISTENCE: Reset active simulation to a fresh session at T+00:00:00 READY
    next_run_id = generate_mission_run_id()
    ACTIVE_RUN_ID = next_run_id
    next_session = get_session(next_run_id)
    next_session.status = "READY"
    next_session.subscribers = session.subscribers.copy()

    # Broadcast reset to all clients: active simulation is now at T+00:00:00 READY
    await next_session.broadcast_state()

    return {
        "status": "completed",
        "run_id": completed_run_id,
        "active_run_id": next_run_id,
        "next_active_run_id": next_run_id,
        "active_state": next_session.engine.state.to_dict(),
        "real_started_at": real_started_str,
        "real_completed_at": real_completed_str,
        "real_elapsed_s": real_elapsed_s,
        "simulation_time_s": final_sim_time,
        "duration_s": final_sim_time,
        "final_battery_soc": final_soc,
        "events_count": events_count,
        "persisted": True,
    }


@app.post("/simulation/runs/{run_id}/advance", dependencies=[Depends(require_authenticated_user)])
async def advance_simulation(run_id: str, req: AdvanceTimeRequest):
    session = get_session(run_id)
    total_seconds = 10.0
    if req.seconds is not None:
        total_seconds = float(req.seconds)
    elif req.amount is not None:
        unit = (req.unit or "seconds").lower()
        if unit in ("minute", "minutes", "min", "m"):
            total_seconds = float(req.amount) * 60.0
        elif unit in ("hour", "hours", "hr", "h"):
            total_seconds = float(req.amount) * 3600.0
        else:
            total_seconds = float(req.amount)

    if total_seconds <= 0:
        raise HTTPException(status_code=400, detail="Advance simulation time must be greater than 0 seconds")

    # If mission wasn't started yet, record real start time and baseline start event
    if session.real_started_at is None:
        session.real_started_at = datetime.now(timezone.utc)
        if session.status != "RUNNING":
            session.status = "RUNNING"
        HistoryService.start_run(session.run_id, session.engine.state, started_at=session.real_started_at)
        session.engine._record_event(
            event_type="MISSION_STARTED",
            subsystem="MISSION",
            severity=AlertSeverity.INFO,
            message=f"Mission {session.run_id} started at baseline T+00:00:00",
        )

    # Record advance event
    session.engine._record_event(
        event_type="TIME_ADVANCED",
        subsystem="MISSION",
        severity=AlertSeverity.INFO,
        message=f"Manual simulation time advancement: +{total_seconds:.0f}s ({req.amount or total_seconds} {req.unit or 'seconds'})",
    )

    session.advance(total_seconds)
    await session.broadcast_state()
    return {
        "status": "advanced",
        "run_id": session.run_id,
        "advanced_seconds": total_seconds,
        "simulation_time_s": session.engine.state.simulation_time_s,
        "state": session.engine.state.to_dict(),
        "real_started_at": session.real_started_at.isoformat() if session.real_started_at else None,
    }


@app.post("/simulation/runs/{run_id}/reset", dependencies=[Depends(require_authenticated_user)])
async def reset_simulation(run_id: str):
    session = get_session(run_id)
    session.reset()
    await session.broadcast_state()
    return {
        "status": "reset",
        "run_id": session.run_id,
        "simulation_time_s": 0.0,
        "state": session.engine.state.to_dict(),
        "telemetry": TelemetryEngine.generate_snapshot(session.engine.state, session.run_id),
    }


@app.post("/simulation/runs/{run_id}/events", dependencies=[Depends(require_authenticated_user)])
async def record_user_timeline_event(run_id: str, req: TimelineEventRequest):
    session = get_session(run_id)
    try:
        sev = AlertSeverity(req.severity)
    except Exception:
        sev = AlertSeverity.INFO
    session.engine._record_event(
        event_type=req.event_type,
        subsystem=req.subsystem,
        severity=sev,
        message=req.message,
    )
    # Persist immediately to history
    new_events = session.engine.event_log[session.persisted_event_count:]
    if new_events:
        HistoryService.record_events(session.run_id, new_events)
        session.persisted_event_count = len(session.engine.event_log)
    await session.broadcast_state()
    return {"status": "recorded", "event": session.engine.event_log[-1]}


@app.post("/simulation/runs/{run_id}/step", dependencies=[Depends(require_authenticated_user)])
async def step_simulation(run_id: str):
    session = get_session(run_id)
    if session.real_started_at is None:
        session.real_started_at = datetime.now(timezone.utc)
        if session.status != "RUNNING":
            session.status = "RUNNING"
        HistoryService.start_run(session.run_id, session.engine.state, started_at=session.real_started_at)
        session.engine._record_event(
            event_type="MISSION_STARTED",
            subsystem="MISSION",
            severity=AlertSeverity.INFO,
            message=f"Mission {session.run_id} started at baseline T+00:00:00",
        )

    session.step()
    await session.broadcast_state()
    return {
        "status": "stepped",
        "run_id": session.run_id,
        "simulation_time_s": session.engine.state.simulation_time_s,
        "state": session.engine.state.to_dict(),
        "real_started_at": session.real_started_at.isoformat() if session.real_started_at else None,
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
    if session.real_started_at is None:
        session.real_started_at = datetime.now(timezone.utc)
        if session.status != "RUNNING":
            session.status = "RUNNING"
        HistoryService.start_run(session.run_id, session.engine.state, started_at=session.real_started_at)

    session.engine.inject_fault(
        fault_id=req.fault_id,
        subsystem=req.subsystem,
        parameter=req.parameter,
        severity=req.severity,
        start_time_s=req.start_time_s,
        duration_s=req.duration_s,
    )
    try:
        HistoryService.record_fault_event(session.run_id, req.model_dump())
    except Exception:
        pass
    return {"status": "injected", "fault": req.model_dump(), "run_id": session.run_id}


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


@app.post("/simulation/runs/{run_id}/recovery/apply", dependencies=[Depends(require_any_role(UserRole.FLIGHT_DIRECTOR, UserRole.MISSION_ADMINISTRATOR))])
async def apply_recovery_strategy(run_id: str, req: RecoveryApplyRequest):
    session = get_session(run_id)
    try:
        policy = RecoveryPolicyRegistry.get_by_id(req.policy_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Recovery policy {req.policy_id} not found")

    session.engine.apply_recovery_policy(policy)
    try:
        new_events = session.engine.event_log[session.persisted_event_count:]
        if new_events:
            HistoryService.record_events(session.run_id, new_events)
            session.persisted_event_count = len(session.engine.event_log)
        HistoryService.record_recovery_action(
            run_id=run_id,
            policy_id=policy.policy_id,
            policy_name=policy.name,
            actions=policy.actions,
            expected_effects=policy.expected_effects,
            sim_time_s=session.engine.state.simulation_time_s,
        )
        HistoryService.update_run_checkpoint(run_id, session.engine.state)
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
    session = RUN_SESSIONS.get(run_id)
    if session and len(session.engine.event_log) > 0:
        events = session.engine.event_log
        causal_events = session.engine.causal_engine.get_events_for_timeline()
        sim_time = session.engine.state.simulation_time_s
    else:
        events = HistoryService.get_run_events(run_id)
        causal_events = []
        details = HistoryService.get_run_details(run_id)
        sim_time = details["duration_s"] if details else 0.0

    return {
        "run_id": run_id,
        "simulation_time_s": sim_time,
        "events": events,
        "causal_events": causal_events,
    }


# ==========================================
# 7. Reports Endpoints
# ==========================================

@app.post("/simulation/runs/{run_id}/reports", dependencies=[Depends(require_authenticated_user)])
async def generate_report(run_id: str):
    session = RUN_SESSIONS.get(run_id)
    rep = HistoryService.compile_and_record_run_report(run_id)
    if not rep and session:
        rep_id = f"rep-{run_id}-{int(time.time())}"
        rep = {
            "id": rep_id,
            "run_id": run_id,
            "mission_id": run_id,
            "status": session.status,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "real_started_at": session.real_started_at.isoformat() if session.real_started_at else None,
            "real_completed_at": session.real_completed_at.isoformat() if session.real_completed_at else None,
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
                "active_faults": list(session.engine.active_faults),
                "total_events_logged": len(session.engine.event_log),
            },
            "epistemic_declarations": {
                "model_type": "Representative 3U CubeSat discrete-time simulation",
                "fidelity": "Physics-informed, not flight-certified",
                "parameters_source": "18_ENGINEERING_BASELINE.md and 19_ENGINEERING_PARAMETER_REGISTER.csv",
            }
        }
        session.reports[rep_id] = rep
        try:
            HistoryService.record_report(run_id, rep)
        except Exception:
            pass

    if not rep:
        raise HTTPException(status_code=404, detail=f"Cannot generate report for run '{run_id}'")

    if session:
        session.reports[rep["id"]] = rep

    return {"status": "generated", "report_id": rep["id"], "report": rep}


@app.get("/simulation/runs/{run_id}/reports/{report_id}", dependencies=[Depends(require_authenticated_user)])
async def get_report(run_id: str, report_id: str):
    session = RUN_SESSIONS.get(run_id)
    if session and report_id in session.reports:
        return session.reports[report_id]
    db_report = HistoryService.get_run_report(run_id)
    if db_report:
        return db_report
    raise HTTPException(status_code=404, detail="Report not found")


@app.get("/simulation/runs/{run_id}/report", dependencies=[Depends(require_authenticated_user)])
async def get_simulation_run_report(run_id: str):
    """Retrieves authoritative report for a run."""
    report = HistoryService.get_run_report(run_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report not found for run '{run_id}'")
    return report


@app.get("/history/runs/{run_id}/report", dependencies=[Depends(require_authenticated_user)])
async def get_historical_run_report(run_id: str):
    """Retrieves authoritative persisted report for a completed historical run."""
    report = HistoryService.get_run_report(run_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Historical report not found for run '{run_id}'")
    return report


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
                elif cmd == "end":
                    session.end()
                elif cmd == "reset":
                    session.reset()
                elif cmd == "step":
                    session.step()
                elif cmd == "advance":
                    session.advance(float(msg.get("seconds", 10.0)))
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

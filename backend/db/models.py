"""
Orbital Twin SQLAlchemy Persistent History Models
Implements schema defined in 08_DATABASE_SCHEMA.md for Mission ORBIT-X1.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(64), nullable=False, default="Mission Operator")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SpacecraftModel(Base):
    __tablename__ = "spacecraft"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    bus_class = Column(String(64), nullable=False, default="3U CubeSat")
    configuration_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "bus_class": self.bus_class,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MissionModel(Base):
    __tablename__ = "missions"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    spacecraft_id = Column(String(64), ForeignKey("spacecraft.id"), nullable=False)
    status = Column(String(32), default="ACTIVE")
    mission_config_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "spacecraft_id": self.spacecraft_id,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SimulationRunRecord(Base):
    __tablename__ = "simulation_runs"

    id = Column(String(64), primary_key=True)
    scenario_id = Column(String(64), default="SCN-NOMINAL-01")
    spacecraft_id = Column(String(64), default="sat-3u-01")
    mission_id = Column(String(64), default="eo-mission-01")
    engine_version = Column(String(32), default="1.0.0")
    status = Column(String(32), default="NOMINAL")  # NOMINAL, RUNNING, PAUSED, COMPLETED, ANOMALY, RECOVERED, SAFE_MODE
    duration_s = Column(Float, default=0.0)
    initial_battery_soc = Column(Float, default=100.0)
    final_battery_soc = Column(Float, default=100.0)
    min_battery_soc = Column(Float, default=100.0)
    power_state = Column(String(32), default="NOMINAL")
    images_completed = Column(Integer, default=0)
    images_deferred = Column(Integer, default=0)
    total_downlinked_mb = Column(Float, default=0.0)
    active_faults_count = Column(Integer, default=0)
    recovery_action_taken = Column(String(128), nullable=True)
    fault_summary = Column(String(256), nullable=True)
    final_state_json = Column(Text, nullable=True)
    summary_json = Column(Text, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    fault_events = relationship("FaultEventRecord", back_populates="run", cascade="all, delete-orphan")
    recovery_actions = relationship("RecoveryActionRecord", back_populates="run", cascade="all, delete-orphan")
    reports = relationship("ReportRecord", back_populates="run", cascade="all, delete-orphan")
    telemetry_snapshots = relationship("TelemetrySnapshotRecord", back_populates="run", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "scenario_id": self.scenario_id,
            "spacecraft_id": self.spacecraft_id,
            "mission_id": self.mission_id,
            "engine_version": self.engine_version,
            "status": self.status,
            "duration_s": round(self.duration_s, 1),
            "initial_battery_soc": round(self.initial_battery_soc, 2),
            "final_battery_soc": round(self.final_battery_soc, 2),
            "min_battery_soc": round(self.min_battery_soc, 2),
            "power_state": self.power_state,
            "images_completed": self.images_completed,
            "images_deferred": self.images_deferred,
            "total_downlinked_mb": round(self.total_downlinked_mb, 2),
            "active_faults_count": self.active_faults_count,
            "recovery_action_taken": self.recovery_action_taken or "None",
            "fault_summary": self.fault_summary or "None",
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class TelemetrySnapshotRecord(Base):
    __tablename__ = "telemetry_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), ForeignKey("simulation_runs.id"), nullable=False, index=True)
    simulation_time_s = Column(Float, nullable=False)
    battery_soc_pct = Column(Float, nullable=False)
    solar_generation_w = Column(Float, nullable=False)
    battery_power_w = Column(Float, nullable=False)
    internal_temp_c = Column(Float, nullable=False)
    downlink_rate_mbps = Column(Float, default=0.0)
    power_state = Column(String(32), default="NOMINAL")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    run = relationship("SimulationRunRecord", back_populates="telemetry_snapshots")

    def to_dict(self):
        return {
            "id": self.id,
            "run_id": self.run_id,
            "simulation_time_s": self.simulation_time_s,
            "battery_soc_pct": round(self.battery_soc_pct, 2),
            "solar_generation_w": round(self.solar_generation_w, 2),
            "battery_power_w": round(self.battery_power_w, 2),
            "internal_temp_c": round(self.internal_temp_c, 2),
            "downlink_rate_mbps": round(self.downlink_rate_mbps, 2),
            "power_state": self.power_state,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class FaultEventRecord(Base):
    __tablename__ = "fault_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), ForeignKey("simulation_runs.id"), nullable=False, index=True)
    fault_id = Column(String(64), nullable=False)
    subsystem = Column(String(64), nullable=False)
    parameter = Column(String(64), nullable=False)
    severity = Column(Float, nullable=False)
    start_time_s = Column(Float, nullable=False)
    duration_s = Column(Float, nullable=False)
    cleared_at_s = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    run = relationship("SimulationRunRecord", back_populates="fault_events")

    def to_dict(self):
        return {
            "id": self.id,
            "run_id": self.run_id,
            "fault_id": self.fault_id,
            "subsystem": self.subsystem,
            "parameter": self.parameter,
            "severity": self.severity,
            "start_time_s": self.start_time_s,
            "duration_s": self.duration_s,
            "cleared_at_s": self.cleared_at_s,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RecoveryActionRecord(Base):
    __tablename__ = "recovery_actions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), ForeignKey("simulation_runs.id"), nullable=False, index=True)
    policy_id = Column(String(64), nullable=False)
    policy_name = Column(String(128), nullable=False)
    applied_at_sim_time_s = Column(Float, nullable=False)
    actions_json = Column(Text, nullable=True)
    expected_effects_json = Column(Text, nullable=True)
    outcome_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    run = relationship("SimulationRunRecord", back_populates="recovery_actions")

    def to_dict(self):
        return {
            "id": self.id,
            "run_id": self.run_id,
            "policy_id": self.policy_id,
            "policy_name": self.policy_name,
            "applied_at_sim_time_s": self.applied_at_sim_time_s,
            "actions_json": self.actions_json,
            "expected_effects_json": self.expected_effects_json,
            "outcome_json": self.outcome_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ReportRecord(Base):
    __tablename__ = "reports"

    id = Column(String(64), primary_key=True)
    run_id = Column(String(64), ForeignKey("simulation_runs.id"), nullable=False, index=True)
    report_type = Column(String(64), default="POST_FLIGHT")
    title = Column(String(128), default="Orbital Twin Simulation Report")
    simulation_duration_s = Column(Float, default=0.0)
    summary_json = Column(Text, nullable=True)
    content_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    run = relationship("SimulationRunRecord", back_populates="reports")

    def to_dict(self):
        return {
            "id": self.id,
            "run_id": self.run_id,
            "report_type": self.report_type,
            "title": self.title,
            "simulation_duration_s": self.simulation_duration_s,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

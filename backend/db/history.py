"""
Orbital Twin Persistent History Service
Records mission events, fault cascades, recovery actions, and run metrics to PostgreSQL.
Designed to run asynchronously or via quick non-blocking writes to protect the 100% in-memory physics engine.
"""
import json
import logging
from datetime import datetime, timezone
from sqlalchemy import or_
from backend.db.session import SessionLocal
from backend.db.models import (
    SimulationRunRecord,
    TelemetrySnapshotRecord,
    FaultEventRecord,
    RecoveryActionRecord,
    ReportRecord,
    MissionEventRecord,
)

logger = logging.getLogger("orbital_twin.history")


class HistoryService:
    @staticmethod
    def ensure_run_record(
        run_id: str,
        initial_soc: float = 100.0,
        spacecraft_id: str = "sat-3u-01",
        mission_id: str = "eo-mission-01",
        status: str = "CREATED",
        started_at: datetime | None = None,
    ):
        """Ensures a simulation run record exists in the database."""
        db = SessionLocal()
        try:
            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if not run:
                run = SimulationRunRecord(
                    id=run_id,
                    scenario_id="SCN-NOMINAL-01",
                    spacecraft_id=spacecraft_id,
                    mission_id=mission_id,
                    engine_version="1.0.0",
                    status=status,
                    duration_s=0.0,
                    initial_battery_soc=initial_soc,
                    final_battery_soc=initial_soc,
                    min_battery_soc=initial_soc,
                    power_state="NOMINAL",
                    started_at=started_at or datetime.now(timezone.utc),
                )
                db.add(run)
                db.commit()
            return run.id
        except Exception as e:
            db.rollback()
            logger.error("Error creating run record %s: %s", run_id, e)
        finally:
            db.close()

    @staticmethod
    def start_run(run_id: str, state, started_at: datetime | None = None):
        """Marks run as RUNNING and records real wall-clock started_at timestamp."""
        db = SessionLocal()
        try:
            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            now = started_at or datetime.now(timezone.utc)
            if not run:
                HistoryService.ensure_run_record(
                    run_id=run_id,
                    initial_soc=getattr(state, "battery_soc_pct", 100.0),
                    status="RUNNING",
                    started_at=now,
                )
            else:
                run.status = "RUNNING"
                # If run was not yet started, set real start timestamp
                if not run.started_at or run.status in ("CREATED", "NOMINAL"):
                    run.started_at = now
                run.completed_at = None
                db.commit()
        except Exception as e:
            db.rollback()
            logger.error("Error starting run %s: %s", run_id, e)
        finally:
            db.close()

    @staticmethod
    def update_run_checkpoint(run_id: str, state, status: str | None = None):
        """Updates run metrics such as battery SOC, duration, downlinked data."""
        db = SessionLocal()
        try:
            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if not run:
                HistoryService.ensure_run_record(run_id, getattr(state, "battery_soc_pct", 100.0))
                run = db.query(SimulationRunRecord).filter_by(id=run_id).first()

            if run:
                # Do not overwrite completed or aborted historical runs
                if run.status in ("COMPLETED", "ABORTED") and status not in ("COMPLETED", "ABORTED"):
                    return

                soc = getattr(state, "battery_soc_pct", run.final_battery_soc)
                run.duration_s = getattr(state, "simulation_time_s", run.duration_s)
                run.final_battery_soc = soc
                run.min_battery_soc = min(run.min_battery_soc, soc)
                run.images_completed = getattr(state, "images_completed", run.images_completed)
                run.images_deferred = getattr(state, "images_deferred", run.images_deferred)
                run.total_downlinked_mb = getattr(state, "total_downlinked_data_mb", run.total_downlinked_mb)
                run.power_state = getattr(state.power_state, "value", str(state.power_state)) if hasattr(state, "power_state") else run.power_state
                run.active_faults_count = len(getattr(state, "active_faults", []))

                if status:
                    run.status = status
                elif run.active_faults_count > 0:
                    run.status = "ANOMALY"

                db.commit()
        except Exception as e:
            db.rollback()
            logger.error("Error updating run checkpoint %s: %s", run_id, e)
        finally:
            db.close()

    @staticmethod
    def complete_run(
        run_id: str,
        state,
        status: str = "COMPLETED",
        completed_at: datetime | None = None,
        started_at: datetime | None = None,
    ):
        """Marks run as completed/ended and records real wall-clock completed_at, final state JSON and stats."""
        db = SessionLocal()
        try:
            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if not run:
                HistoryService.ensure_run_record(run_id, getattr(state, "battery_soc_pct", 100.0), started_at=started_at)
                run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if run:
                run.status = status
                if started_at and (not run.started_at or run.status in ("CREATED", "NOMINAL", "READY")):
                    run.started_at = started_at
                run.completed_at = completed_at or datetime.now(timezone.utc)
                soc = getattr(state, "battery_soc_pct", run.final_battery_soc)
                run.final_battery_soc = soc
                run.min_battery_soc = min(run.min_battery_soc, soc)
                run.duration_s = getattr(state, "simulation_time_s", run.duration_s)
                run.images_completed = getattr(state, "images_completed", run.images_completed)
                run.images_deferred = getattr(state, "images_deferred", run.images_deferred)
                run.total_downlinked_mb = getattr(state, "total_downlinked_data_mb", run.total_downlinked_mb)
                run.power_state = getattr(state.power_state, "value", str(state.power_state)) if hasattr(state, "power_state") else run.power_state
                run.active_faults_count = len(getattr(state, "active_faults", []))
                if hasattr(state, "to_dict"):
                    run.final_state_json = json.dumps(state.to_dict())
                db.commit()
        except Exception as e:
            db.rollback()
            logger.error("Error completing run %s: %s", run_id, e)
        finally:
            db.close()

    @staticmethod
    def record_fault_event(run_id: str, fault: dict):
        """Records an injected fault event."""
        db = SessionLocal()
        try:
            HistoryService.ensure_run_record(run_id)
            event = FaultEventRecord(
                run_id=run_id,
                fault_id=fault.get("fault_id", "F-UNKNOWN"),
                subsystem=fault.get("subsystem", "Unknown"),
                parameter=fault.get("parameter", "Unknown"),
                severity=fault.get("severity", 1.0),
                start_time_s=fault.get("start_time_s", 0.0),
                duration_s=fault.get("duration_s", 600.0),
                created_at=datetime.now(timezone.utc),
            )
            db.add(event)

            # Update run summary
            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if run:
                summary = f"{fault.get('fault_id')} ({int(fault.get('severity', 1.0)*100)}% {fault.get('subsystem')})"
                run.fault_summary = summary
                run.status = "ANOMALY"

            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("Error recording fault event: %s", e)
        finally:
            db.close()

    @staticmethod
    def record_fault_cleared(run_id: str, fault_id: str, cleared_at_s: float):
        """Updates fault event when cleared."""
        db = SessionLocal()
        try:
            event = db.query(FaultEventRecord).filter_by(run_id=run_id, fault_id=fault_id).order_by(FaultEventRecord.id.desc()).first()
            if event:
                event.cleared_at_s = cleared_at_s
                db.commit()
        except Exception as e:
            db.rollback()
            logger.error("Error recording cleared fault: %s", e)
        finally:
            db.close()

    @staticmethod
    def record_recovery_action(run_id: str, policy_id: str, policy_name: str, actions: list, expected_effects: list, sim_time_s: float):
        """Records an executed recovery policy."""
        db = SessionLocal()
        try:
            HistoryService.ensure_run_record(run_id)
            rec = RecoveryActionRecord(
                run_id=run_id,
                policy_id=policy_id,
                policy_name=policy_name,
                applied_at_sim_time_s=sim_time_s,
                actions_json=json.dumps(actions),
                expected_effects_json=json.dumps(expected_effects),
                created_at=datetime.now(timezone.utc),
            )
            db.add(rec)

            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if run:
                run.recovery_action_taken = f"{policy_id}: {policy_name}"
                run.status = "RECOVERED"

            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("Error recording recovery action: %s", e)
        finally:
            db.close()

    @staticmethod
    def record_report(run_id: str, report_data: dict):
        """Stores generated simulation report in database."""
        db = SessionLocal()
        try:
            HistoryService.ensure_run_record(run_id)
            rep_id = report_data.get("id", f"rep-{int(datetime.now(timezone.utc).timestamp())}")
            report = ReportRecord(
                id=rep_id,
                run_id=run_id,
                report_type="MISSION_REPORT",
                title=f"Mission ORBIT-X1 Flight Analysis ({run_id})",
                simulation_duration_s=report_data.get("simulation_duration_s", 0.0),
                summary_json=json.dumps(report_data.get("summary", {})),
                content_json=json.dumps(report_data),
                created_at=datetime.now(timezone.utc),
            )
            db.add(report)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("Error recording report: %s", e)
        finally:
            db.close()

    @staticmethod
    def record_telemetry_snapshot(run_id: str, state):
        """Saves a periodic telemetry snapshot checkpoint."""
        db = SessionLocal()
        try:
            snapshot = TelemetrySnapshotRecord(
                run_id=run_id,
                simulation_time_s=state.simulation_time_s,
                battery_soc_pct=state.battery_soc_pct,
                solar_generation_w=state.solar_generation_w,
                battery_power_w=state.battery_power_w,
                internal_temp_c=state.internal_temp_c,
                downlink_rate_mbps=state.effective_downlink_rate_mbps if hasattr(state, "effective_downlink_rate_mbps") else 0.0,
                power_state=getattr(state.power_state, "value", str(state.power_state)),
                created_at=datetime.now(timezone.utc),
            )
            db.add(snapshot)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("Error saving telemetry snapshot: %s", e)
        finally:
            db.close()

    @staticmethod
    def get_all_runs():
        """Returns all persisted completed/ended simulation runs sorted by most recent."""
        db = SessionLocal()
        try:
            runs = (
                db.query(SimulationRunRecord)
                .filter(
                    SimulationRunRecord.id != "run-default",
                    ~SimulationRunRecord.id.like("%ACCEPTANCE%"),
                    SimulationRunRecord.status.notin_(["CREATED", "READY"]),
                    or_(
                        SimulationRunRecord.status.in_(["COMPLETED", "RECOVERED", "ABORTED"]),
                        SimulationRunRecord.completed_at.isnot(None),
                        db.query(ReportRecord).filter(ReportRecord.run_id == SimulationRunRecord.id).exists(),
                    ),
                )
                .order_by(SimulationRunRecord.completed_at.desc(), SimulationRunRecord.started_at.desc())
                .all()
            )
            return [r.to_dict() for r in runs]
        finally:
            db.close()

    @staticmethod
    def get_run_report(run_id: str) -> dict | None:
        """Retrieves authoritative persisted report for a specific simulation run."""
        db = SessionLocal()
        try:
            report = (
                db.query(ReportRecord)
                .filter_by(run_id=run_id)
                .order_by(ReportRecord.created_at.desc())
                .first()
            )
            if report and report.content_json:
                try:
                    return json.loads(report.content_json)
                except Exception:
                    pass
            # If report record is missing, compile from run details if run exists
            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if not run:
                return None
            return HistoryService.compile_and_record_run_report(run_id)
        finally:
            db.close()

    @staticmethod
    def compile_and_record_run_report(run_id: str) -> dict | None:
        """Compiles and persists a complete authoritative historical report from run records."""
        db = SessionLocal()
        try:
            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if not run:
                return None

            started_iso = run.started_at.isoformat() if run.started_at else None
            completed_iso = run.completed_at.isoformat() if run.completed_at else None
            real_elapsed_s = None
            if run.started_at and run.completed_at:
                real_elapsed_s = max(0.0, (run.completed_at - run.started_at).total_seconds())

            sim_time_s = run.duration_s

            def fmt_clock(sec: float) -> str:
                s = int(max(0, sec))
                h = s // 3600; m = (s % 3600) // 60; sc = s % 60
                return f"T+{h:02d}:{m:02d}:{sc:02d}"

            def fmt_elapsed(sec: float | None) -> str:
                if sec is None:
                    return "N/A"
                s = int(max(0, sec))
                h = s // 3600; m = (s % 3600) // 60; sc = s % 60
                if h > 0: return f"{h}h {m}m {sc}s"
                if m > 0: return f"{m}m {sc}s"
                return f"{sc}s"

            events = [
                {
                    "simulation_time_s": ev.simulation_time_s,
                    "simulation_time_formatted": fmt_clock(ev.simulation_time_s),
                    "event_type": ev.event_type,
                    "subsystem": ev.subsystem,
                    "severity": ev.severity,
                    "description": ev.message,
                    "message": ev.message,
                    "result": "Logged to mission timeline",
                }
                for ev in sorted(run.timeline_events, key=lambda e: e.simulation_time_s)
            ]

            faults = [
                {
                    "fault_id": f.fault_id,
                    "name": f.fault_id,
                    "subsystem": f.subsystem,
                    "parameter": f.parameter,
                    "severity": f.severity,
                    "injected_sim_time_s": f.start_time_s,
                    "injected_sim_time_formatted": fmt_clock(f.start_time_s),
                    "duration_s": f.duration_s,
                    "cleared_at_s": f.cleared_at_s,
                    "status": "CLEARED" if f.cleared_at_s is not None else "ACTIVE",
                    "impact": f"Degraded {f.subsystem} ({f.parameter}) by {int(f.severity * 100)}%",
                }
                for f in run.fault_events
            ]

            recoveries = []
            for r in run.recovery_actions:
                acts = []
                if r.actions_json:
                    try: acts = json.loads(r.actions_json)
                    except Exception: pass
                effs = []
                if r.expected_effects_json:
                    try: effs = json.loads(r.expected_effects_json)
                    except Exception: pass
                recoveries.append({
                    "recovery_name": r.policy_name,
                    "policy_id": r.policy_id,
                    "applied_sim_time_s": r.applied_at_sim_time_s,
                    "applied_sim_time_formatted": fmt_clock(r.applied_at_sim_time_s),
                    "actions": acts,
                    "expected_effects": effs,
                    "result": "Applied to canonical spacecraft bus",
                    "final_status": "Successful",
                })

            final_st = {}
            if run.final_state_json:
                try: final_st = json.loads(run.final_state_json)
                except Exception: pass

            outcome = run.to_dict().get("outcome", run.status)
            recovery_status = "Successful" if len(recoveries) > 0 else ("None Required" if len(faults) == 0 else "Unrecovered Anomaly")

            rep_id = f"rep-{run.id}"
            report_data = {
                "id": rep_id,
                "run_id": run.id,
                "mission_id": run.id,
                "status": run.status,
                "outcome": outcome,
                "simulation_duration_s": sim_time_s,
                "real_started_at": started_iso,
                "real_completed_at": completed_iso,
                "real_elapsed_s": real_elapsed_s,
                "created_at": completed_iso or datetime.now(timezone.utc).isoformat(),
                "mission_info": {
                    "mission_id": run.id,
                    "status": run.status,
                    "outcome": outcome,
                    "recovery_status": recovery_status,
                    "real_started_at": started_iso,
                    "real_completed_at": completed_iso,
                    "real_elapsed_s": real_elapsed_s,
                    "real_elapsed_formatted": fmt_elapsed(real_elapsed_s),
                    "simulation_duration_s": sim_time_s,
                    "simulation_duration_formatted": f"T+00:00:00 → {fmt_clock(sim_time_s)}",
                },
                "timeline": events,
                "timeline_events": events,
                "faults": faults,
                "fault_analysis": {
                    "causal_graph": {"nodes": [], "edges": []},
                    "causal_chains": [],
                },
                "recovery": {
                    "actions": recoveries,
                    "policy_applied": run.recovery_action_taken or "None",
                    "recovery_status": recovery_status,
                    "comparisons": [],
                },
                "final_outcome": {
                    "simulation_time_s": sim_time_s,
                    "simulation_time_formatted": fmt_clock(sim_time_s),
                    "battery_soc_pct": run.final_battery_soc,
                    "min_battery_soc": run.min_battery_soc,
                    "power_state": run.power_state,
                    "solar_generation_w": final_st.get("solar_generation_w", 24.5),
                    "battery_stored_wh": final_st.get("battery_stored_wh", 61.2),
                    "internal_temp_c": final_st.get("internal_temp_c", 21.0),
                    "payload_state": final_st.get("payload_state", "IDLE"),
                    "comm_link_state": final_st.get("comm_link_state", "LOCKED"),
                    "images_completed": run.images_completed,
                    "images_deferred": run.images_deferred,
                    "images_failed": final_st.get("images_failed", 0),
                    "total_downlinked_mb": run.total_downlinked_mb,
                    "active_faults_count": run.active_faults_count,
                    "recovery_status": recovery_status,
                    "outcome": outcome,
                    "spacecraft_state": final_st,
                    "objective_status": {
                        "imagery": {"target": 20, "achieved": run.images_completed, "met": run.images_completed >= 20},
                        "downlink": {"target": 500.0, "achieved": run.total_downlinked_mb, "met": run.total_downlinked_mb >= 500.0},
                        "battery": {"threshold": 25.0, "final": run.final_battery_soc, "met": run.final_battery_soc >= 25.0},
                    },
                },
                "summary": {
                    "images_completed": run.images_completed,
                    "images_deferred": run.images_deferred,
                    "total_downlinked_mb": run.total_downlinked_mb,
                    "final_battery_soc": run.final_battery_soc,
                    "min_battery_soc": run.min_battery_soc,
                    "final_internal_temp_c": final_st.get("internal_temp_c", 21.0),
                    "active_faults": faults,
                    "total_events_logged": len(events),
                },
                "epistemic_declarations": {
                    "model_type": "Representative 3U CubeSat discrete-time simulation",
                    "fidelity": "Physics-informed, not flight-certified",
                    "parameters_source": "18_ENGINEERING_BASELINE.md and 19_ENGINEERING_PARAMETER_REGISTER.csv",
                },
            }

            existing_rep = db.query(ReportRecord).filter_by(id=rep_id).first()
            if not existing_rep:
                rep_record = ReportRecord(
                    id=rep_id,
                    run_id=run.id,
                    report_type="MISSION_REPORT",
                    title=f"Mission ORBIT-X1 Flight Analysis ({run.id})",
                    simulation_duration_s=sim_time_s,
                    summary_json=json.dumps(report_data.get("summary", {})),
                    content_json=json.dumps(report_data),
                    created_at=run.completed_at or datetime.now(timezone.utc),
                )
                db.add(rep_record)
                db.commit()
            return report_data
        except Exception as e:
            db.rollback()
            logger.error("Error compiling report for run %s: %s", run_id, e)
            return None
        finally:
            db.close()

    @staticmethod
    def record_events(run_id: str, events: list[dict]):
        """Persists simulation timeline events for a run."""
        if not events:
            return
        db = SessionLocal()
        try:
            HistoryService.ensure_run_record(run_id)
            for ev in events:
                rec = MissionEventRecord(
                    run_id=run_id,
                    simulation_time_s=float(ev.get("simulation_time_s", ev.get("timestamp_s", 0.0))),
                    step=int(ev.get("step", 0)),
                    event_type=str(ev.get("event_type", "EVENT")),
                    subsystem=str(ev.get("subsystem", "MISSION")),
                    severity=str(ev.get("severity", "INFO")),
                    message=str(ev.get("message", "")),
                    created_at=datetime.now(timezone.utc),
                )
                db.add(rec)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error("Error recording events for run %s: %s", run_id, e)
        finally:
            db.close()

    @staticmethod
    def get_run_events(run_id: str) -> list[dict]:
        """Returns all persisted events for a specific run in chronological simulation time."""
        db = SessionLocal()
        try:
            events = (
                db.query(MissionEventRecord)
                .filter_by(run_id=run_id)
                .order_by(MissionEventRecord.simulation_time_s.asc())
                .all()
            )
            return [e.to_dict() for e in events]
        finally:
            db.close()

    @staticmethod
    def get_run_details(run_id: str):
        """Returns deep details of a specific simulation run."""
        db = SessionLocal()
        try:
            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if not run:
                return None
            res = run.to_dict()
            res["fault_events"] = [f.to_dict() for f in run.fault_events]
            res["recovery_actions"] = [r.to_dict() for r in run.recovery_actions]
            res["reports"] = [rep.to_dict() for rep in run.reports]
            res["timeline_events"] = [e.to_dict() for e in run.timeline_events]
            res["snapshots_count"] = len(run.telemetry_snapshots)
            if run.final_state_json:
                try:
                    res["final_state"] = json.loads(run.final_state_json)
                except Exception:
                    res["final_state"] = None
            return res
        finally:
            db.close()

"""
Orbital Twin Persistent History Service
Records mission events, fault cascades, recovery actions, and run metrics to PostgreSQL.
Designed to run asynchronously or via quick non-blocking writes to protect the 100% in-memory physics engine.
"""
import json
import logging
from datetime import datetime, timezone
from backend.db.session import SessionLocal
from backend.db.models import (
    SimulationRunRecord,
    TelemetrySnapshotRecord,
    FaultEventRecord,
    RecoveryActionRecord,
    ReportRecord,
)

logger = logging.getLogger("orbital_twin.history")


class HistoryService:
    @staticmethod
    def ensure_run_record(run_id: str, initial_soc: float = 100.0, spacecraft_id: str = "sat-3u-01", mission_id: str = "eo-mission-01"):
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
                    status="RUNNING",
                    duration_s=0.0,
                    initial_battery_soc=initial_soc,
                    final_battery_soc=initial_soc,
                    min_battery_soc=initial_soc,
                    power_state="NOMINAL",
                    started_at=datetime.now(timezone.utc),
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
    def update_run_checkpoint(run_id: str, state, status: str | None = None):
        """Updates run metrics such as battery SOC, duration, downlinked data."""
        db = SessionLocal()
        try:
            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if not run:
                HistoryService.ensure_run_record(run_id, getattr(state, "battery_soc_pct", 100.0))
                run = db.query(SimulationRunRecord).filter_by(id=run_id).first()

            if run:
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
    def complete_run(run_id: str, state, status: str = "COMPLETED"):
        """Marks run as completed and stores final state JSON."""
        db = SessionLocal()
        try:
            run = db.query(SimulationRunRecord).filter_by(id=run_id).first()
            if run:
                run.status = status
                run.completed_at = datetime.now(timezone.utc)
                run.final_battery_soc = getattr(state, "battery_soc_pct", run.final_battery_soc)
                run.duration_s = getattr(state, "simulation_time_s", run.duration_s)
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
        """Returns all persisted simulation runs sorted by most recent."""
        db = SessionLocal()
        try:
            runs = db.query(SimulationRunRecord).order_by(SimulationRunRecord.started_at.desc()).all()
            return [r.to_dict() for r in runs]
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
            res["snapshots_count"] = len(run.telemetry_snapshots)
            if run.final_state_json:
                try:
                    res["final_state"] = json.loads(run.final_state_json)
                except Exception:
                    res["final_state"] = None
            return res
        finally:
            db.close()

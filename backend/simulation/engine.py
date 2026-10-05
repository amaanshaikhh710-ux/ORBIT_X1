"""
Orbital Twin — Authoritative Multi-Subsystem Simulation Engine
Deterministic discrete-time physics simulator advancing spacecraft state in exact 10-second timesteps.
Integrates Power, Thermal, Communication, Storage, Payload, OBC, ADCS, Environment, and Causal Propagation.
Governed by 18_ENGINEERING_BASELINE.md, 04_SIMULATION_ENGINE.md, and 24_ANTIGRAVITY_IMPLEMENTATION_CONTRACT.md.
"""

from typing import Any
import copy

from backend.simulation.core.state import CanonicalSpacecraftState
from backend.simulation.core.types import (
    EnvironmentState,
    PowerState,
    PayloadState,
    ThermalState,
    CommLinkState,
    ADCSQuality,
    AlertSeverity,
)
from backend.simulation.core import constants as const
from backend.simulation.subsystems.environment import EnvironmentModel, EnvironmentWindow
from backend.simulation.subsystems.power import PowerModel
from backend.simulation.subsystems.thermal import ThermalModel
from backend.simulation.subsystems.communication import CommunicationModel
from backend.simulation.subsystems.storage import StorageModel
from backend.simulation.subsystems.payload import PayloadModel
from backend.simulation.subsystems.obc import OBCModel
from backend.simulation.subsystems.adcs import ADCSModel
from backend.simulation.faults.propagation import CausalPropagationEngine
from backend.simulation.recovery.policies import RecoveryPolicy, RecoveryPolicyRegistry
from backend.simulation.telemetry import TelemetryEngine


class SimulationEngine:
    """
    Authoritative simulation orchestrator.
    Coordinates physical models, manages fault injection, logs causal propagation,
    and executes deterministic time steps.
    """

    def __init__(
        self,
        initial_state: CanonicalSpacecraftState | None = None,
        environment_model: EnvironmentModel | None = None,
        power_model: PowerModel | None = None,
        thermal_model: ThermalModel | None = None,
        comm_model: CommunicationModel | None = None,
        storage_model: StorageModel | None = None,
        payload_model: PayloadModel | None = None,
        obc_model: OBCModel | None = None,
        adcs_model: ADCSModel | None = None,
        recovery_policy: RecoveryPolicy | None = None,
        timestep_s: float = const.SIMULATION_TIMESTEP_S,
        run_id: str = "run-001",
        random_seed: int = 42,
    ):
        self.timestep_s = timestep_s
        self.run_id = run_id
        self.random_seed = random_seed

        # Subsystem Physics Models
        self.environment_model = environment_model or EnvironmentModel()
        self.power_model = power_model or PowerModel()
        self.thermal_model = thermal_model or ThermalModel()
        self.comm_model = comm_model or CommunicationModel()
        self.storage_model = storage_model or StorageModel()
        self.payload_model = payload_model or PayloadModel()
        self.obc_model = obc_model or OBCModel()
        self.adcs_model = adcs_model or ADCSModel()

        # Operational Recovery Policy
        self.recovery_policy = recovery_policy or RecoveryPolicyRegistry.get_by_id("R-NONE")

        # Causal Propagation Engine
        self.causal_engine = CausalPropagationEngine()

        # Initial baseline preservation for reset / branching
        self._baseline_state = (
            initial_state.clone() if initial_state else CanonicalSpacecraftState()
        )
        self.state = self._baseline_state.clone()

        # Faults & Logs
        self.active_faults: list[dict[str, Any]] = []
        self.event_log: list[dict[str, Any]] = []
        self.telemetry_history: list[list[dict[str, Any]]] = []
        self.state_history: list[CanonicalSpacecraftState] = [self.state.clone()]

        # Internal task scheduling helper
        self.next_auto_image_time_s: float = 60.0

        # Causal event link tracking
        self._causal_tracking: dict[str, str] = {}

        # Initial step 0 telemetry
        self.telemetry_history.append(
            TelemetryEngine.generate_snapshot(self.state, self.run_id)
        )

    def reset(self) -> None:
        """Restores exact initial baseline state and clears run histories."""
        self.state = self._baseline_state.clone()
        self.recovery_policy = RecoveryPolicyRegistry.get_by_id("R-NONE")
        self.environment_model.custom_windows.clear()
        self.active_faults.clear()
        self.event_log.clear()
        self.causal_engine.clear()
        self._causal_tracking.clear()
        self.next_auto_image_time_s = 60.0
        self.payload_model = PayloadModel()
        self.telemetry_history = [
            TelemetryEngine.generate_snapshot(self.state, self.run_id)
        ]
        self.state_history = [self.state.clone()]

    def inject_fault(
        self,
        fault_id: str,
        subsystem: str,
        parameter: str,
        severity: float,
        start_time_s: float,
        duration_s: float,
    ) -> None:
        """Registers a fault to be injected into the simulation."""
        fault = {
            "fault_id": fault_id,
            "subsystem": subsystem,
            "parameter": parameter,
            "severity": max(0.0, min(1.0, severity)),
            "start_time_s": start_time_s,
            "duration_s": duration_s,
            "end_time_s": start_time_s + duration_s,
        }
        self.active_faults.append(fault)

    def _apply_fault_modifiers(self) -> dict[str, float]:
        """
        Determines current parameter modifiers based on active faults at current simulation time.
        """
        modifiers = {
            "solar_health": 1.0,
            "battery_capacity_scale": 1.0,
            "comm_health": 1.0,
            "packet_loss_add": 0.0,
            "thermal_coeff_scale": 1.0,
            "pointing_bias_deg": 0.0,
            "control_authority": 1.0,
            "fault_cpu_load_pct": 0.0,
            "fault_overhead_w": 0.0,
        }

        current_time = self.state.simulation_time_s
        for fault in self.active_faults:
            if fault["start_time_s"] <= current_time < fault["end_time_s"]:
                param = fault["parameter"]
                sev = fault["severity"]

                if param == "solar_health":
                    modifiers["solar_health"] *= max(0.0, 1.0 - sev)
                elif param == "usable_capacity":
                    modifiers["battery_capacity_scale"] *= max(0.0, 1.0 - sev)
                elif param == "comm_health":
                    modifiers["comm_health"] *= max(0.0, 1.0 - sev)
                elif param == "packet_loss":
                    modifiers["packet_loss_add"] += sev * (
                        const.DEGRADED_PACKET_LOSS_MAX - const.NOMINAL_PACKET_LOSS
                    )
                elif param == "heat_rejection_coefficient":
                    modifiers["thermal_coeff_scale"] *= max(0.1, 1.0 - sev)
                elif param == "attitude_bias":
                    modifiers["pointing_bias_deg"] += sev * 5.0
                elif param == "control_authority":
                    modifiers["control_authority"] *= max(0.0, 1.0 - sev)
                elif param in ("cpu_fault_load", "cpu_utilization"):
                    modifiers["fault_cpu_load_pct"] += sev * 50.0
                elif param == "fault_overhead_w":
                    modifiers["fault_overhead_w"] += sev * 10.0

        return modifiers

    def step(self) -> CanonicalSpacecraftState:
        """
        Advances the simulation by exactly one fixed timestep (10 seconds).
        Executes all physical modules and causal dependency evaluations in authoritative order.
        """
        dt = self.timestep_s
        prev_power_state = self.state.power_state
        prev_env_state = self.state.environment_state
        prev_thermal_state = self.state.thermal_state
        prev_solar_generation = self.state.solar_generation_w
        prev_soc = self.state.battery_soc_pct
        prev_images_deferred = self.state.images_deferred

        # 1. Advance Clock
        next_sim_time = self.state.simulation_time_s + dt
        next_mission_time = self.state.mission_time_s + dt
        next_step_count = self.state.step_count + 1

        self.state.simulation_time_s = next_sim_time
        self.state.mission_time_s = next_mission_time
        self.state.step_count = next_step_count
        self.state.events_this_step = []

        # 2. Determine Environment State
        env_state, illumination, ext_temp, gs_visible = (
            self.environment_model.evaluate(next_sim_time)
        )
        self.state.environment_state = env_state
        self.state.illumination_factor = illumination
        self.state.external_temp_c = ext_temp
        self.state.ground_station_visible = gs_visible

        if env_state != prev_env_state:
            self._record_event(
                event_type="ENVIRONMENT_TRANSITION",
                subsystem="ENVIRONMENT",
                severity=AlertSeverity.INFO,
                message=f"Environment transitioned from {prev_env_state.value} to {env_state.value}",
            )

        # 3. Apply Active Fault Modifiers
        modifiers = self._apply_fault_modifiers()
        self.state.solar_health = modifiers["solar_health"]
        self.state.comm_health = modifiers["comm_health"]
        self.state.fault_overhead_load_w = modifiers["fault_overhead_w"]

        # Track root fault causal injection
        root_fault_event_id = None
        for fault in self.active_faults:
            if not fault.get("injected_event_logged", False) and next_sim_time >= fault["start_time_s"]:
                fault["injected_event_logged"] = True
                cevent = self.causal_engine.record_transition(
                    timestamp_s=next_sim_time,
                    source_subsystem=fault["subsystem"],
                    source_parameter=fault["parameter"],
                    previous_value=1.0,
                    new_value=1.0 - fault["severity"],
                    cause=f"Fault injection {fault['fault_id']}",
                    target_subsystem=fault["subsystem"],
                    effect=f"Parameter degraded by {fault['severity'] * 100:.0f}%",
                    severity="WARNING",
                )
                root_fault_event_id = cevent.id
                fault["event_id"] = cevent.id
                self._causal_tracking[fault["subsystem"]] = cevent.id
                self._causal_tracking[fault["fault_id"]] = cevent.id
                self._record_event(
                    event_type="FAULT_INJECTED",
                    subsystem=fault["subsystem"],
                    severity=AlertSeverity.WARNING,
                    message=f"Fault {fault['fault_id']} active on {fault['subsystem']}.{fault['parameter']}",
                )

        # 4. Update ADCS Subsystem
        adcs_res = self.adcs_model.update_adcs_step(
            dt_s=dt,
            current_pointing_error_deg=self.state.attitude_error_deg,
            control_authority=modifiers["control_authority"],
            fault_bias_deg=modifiers["pointing_bias_deg"],
        )
        self.state.attitude_error_deg = adcs_res.attitude_error_deg
        self.state.adcs_quality = adcs_res.adcs_quality
        self.state.adcs_load_w = adcs_res.adcs_power_load_w

        # 5. Evaluate Operational Recovery Constraints
        is_low_power_forced = self.recovery_policy.force_low_power_mode
        effective_power_state = (
            PowerState.LOW_POWER if is_low_power_forced and self.state.power_state == PowerState.NORMAL else self.state.power_state
        )

        can_image_env = True
        if self.recovery_policy.sunlight_only_imaging and env_state != EnvironmentState.SUNLIGHT:
            can_image_env = False

        if self.recovery_policy.disable_non_critical_payload:
            can_image_env = False

        # Auto-trigger periodic imaging task in scenario if idle and schedule reached
        if (
            self.payload_model.state == PayloadState.IDLE
            and next_sim_time >= self.next_auto_image_time_s
            and can_image_env
        ):
            task_num = (self.payload_model.images_completed + self.payload_model.images_deferred + 1)
            self.payload_model.trigger_image_task(task_id=f"img-{task_num:03d}")
            self.next_auto_image_time_s = next_sim_time + (180.0 * self.recovery_policy.imaging_interval_multiplier)

        # 6. Update Payload Subsystem
        payload_res = self.payload_model.update_payload_step(
            dt_s=dt,
            pointing_can_image=adcs_res.can_image and can_image_env,
            storage_is_full=self.state.storage_utilization_pct >= 100.0,
            power_state=effective_power_state,
            thermal_state=self.state.thermal_state,
            payload_health=1.0,
        )
        self.state.payload_state = payload_res.payload_state
        self.state.payload_load_w = payload_res.payload_power_w
        self.state.raw_data_buffer_mb = payload_res.raw_buffer_mb
        self.state.images_completed = payload_res.images_completed
        self.state.images_deferred = payload_res.images_deferred
        self.state.images_failed = payload_res.images_failed

        if payload_res.transition_event:
            self._record_event(
                event_type="PAYLOAD_STATE_EVENT",
                subsystem="PAYLOAD",
                severity=AlertSeverity.INFO,
                message=payload_res.transition_event,
            )

        # 7. Update OBC Subsystem
        obc_res = self.obc_model.update_obc_step(
            is_processing_image=payload_res.is_processing,
            is_downlinking=self.state.ground_station_visible and self.state.storage_used_gb > 0,
            fault_cpu_load_pct=modifiers["fault_cpu_load_pct"],
            thermal_throttle=self.recovery_policy.thermal_throttle,
        )
        self.state.cpu_utilization_pct = obc_res.cpu_utilization_pct
        self.state.memory_utilization_pct = obc_res.memory_utilization_pct
        self.state.processing_load_w = obc_res.obc_power_load_w

        # 8. Update Communication & Downlink Subsystem
        comm_downlink_enabled = not (
            self.recovery_policy.throttle_comm and effective_power_state in (PowerState.LOW_POWER, PowerState.CRITICAL_POWER)
        )
        comm_res = self.comm_model.update_comm_step(
            dt_s=dt,
            ground_station_visible=gs_visible,
            available_data_mb=self.state.storage_used_gb * 1000.0,
            comm_health=self.state.comm_health,
            packet_loss_modifier=modifiers["packet_loss_add"],
            power_state=effective_power_state,
            downlink_enabled=comm_downlink_enabled,
            prioritize_downlink=self.recovery_policy.prioritize_downlink,
        )
        self.state.comm_link_state = comm_res.comm_link_state
        self.state.effective_downlink_rate_mbps = comm_res.effective_rate_mbps
        self.state.downlinked_data_mb_step = comm_res.downlinked_mb_step
        self.state.total_downlinked_data_mb += comm_res.downlinked_mb_step
        self.state.packet_loss_fraction = comm_res.packet_loss_fraction
        self.state.signal_strength_dbm = comm_res.signal_strength_dbm
        self.state.comm_load_w = comm_res.comm_electrical_load_w

        # 9. Update Storage Subsystem
        storage_res = self.storage_model.update_storage_step(
            current_used_mb=self.state.storage_used_gb * 1000.0,
            generated_data_mb=payload_res.data_generated_to_storage_mb,
            downlinked_data_mb=comm_res.downlinked_mb_step,
        )
        self.state.storage_used_gb = storage_res.storage_used_gb
        self.state.storage_free_gb = storage_res.storage_free_gb
        self.state.storage_utilization_pct = storage_res.storage_utilization_pct

        # 10. Update Power Subsystem
        power_res = self.power_model.update_power_step(
            dt_s=dt,
            current_battery_energy_wh=self.state.battery_energy_wh,
            illumination_factor=illumination,
            solar_health=self.state.solar_health,
            internal_temp_c=self.state.internal_temp_c,
            housekeeping_load_w=self.state.housekeeping_load_w,
            payload_load_w=self.state.payload_load_w,
            processing_load_w=self.state.processing_load_w,
            comm_load_w=self.state.comm_load_w,
            adcs_load_w=self.state.adcs_load_w,
            thermal_load_w=self.state.thermal_load_w,
            fault_overhead_load_w=self.state.fault_overhead_load_w,
            current_power_state=effective_power_state,
        )
        self.state.solar_generation_w = power_res.solar_generation_w
        self.state.solar_temp_derating = power_res.solar_temp_derating
        self.state.total_power_generation_w = power_res.solar_generation_w
        self.state.total_power_consumption_w = power_res.total_power_consumption_w
        self.state.power_margin_w = power_res.power_margin_w
        self.state.battery_energy_wh = power_res.battery_energy_wh
        self.state.battery_soc_pct = power_res.battery_soc_pct
        self.state.battery_power_w = power_res.battery_power_w
        self.state.power_state = (
            PowerState.LOW_POWER if is_low_power_forced and power_res.power_state == PowerState.NORMAL else power_res.power_state
        )

        # 11. Update Thermal Subsystem
        thermal_res = self.thermal_model.update_thermal_step(
            dt_s=dt,
            current_internal_temp_c=self.state.internal_temp_c,
            external_temp_c=ext_temp,
            total_electrical_load_w=self.state.total_power_consumption_w,
            rejection_coeff_scale=modifiers["thermal_coeff_scale"],
        )
        self.state.internal_temp_c = thermal_res.internal_temp_c
        self.state.thermal_state = thermal_res.thermal_state
        self.state.heat_generated_w = thermal_res.heat_generated_w
        self.state.heat_rejected_w = thermal_res.heat_rejected_w
        self.state.heat_rejection_coeff = thermal_res.heat_rejection_coeff

        # Sensor readings
        self.state.measured_temperature_c = self.state.internal_temp_c
        self.state.measured_soc_pct = self.state.battery_soc_pct

        # 12. Causal Fault Propagation Linkage
        # a. Solar generation drop
        if self.state.solar_health < 1.0 and abs(self.state.solar_generation_w - prev_solar_generation) > 0.1:
            parent_id = self._causal_tracking.get("Solar") or root_fault_event_id
            gen_event = self.causal_engine.record_transition(
                timestamp_s=next_sim_time,
                source_subsystem="Solar",
                source_parameter="solar_generation_w",
                previous_value=prev_solar_generation,
                new_value=self.state.solar_generation_w,
                cause="Solar health degradation reduces panel generation",
                target_subsystem="Power Bus",
                effect=f"Generation fell to {self.state.solar_generation_w:.1f} W (Margin: {self.state.power_margin_w:.1f} W)",
                severity="WARNING",
                causal_parent_id=parent_id,
            )
            self._causal_tracking["power_margin"] = gen_event.id

        # b. Power state transition (due to battery SOC depletion or low-power policy)
        if self.state.power_state != prev_power_state:
            sev = (
                "CRITICAL"
                if self.state.power_state in (PowerState.CRITICAL_POWER, PowerState.EMERGENCY_SHUTDOWN)
                else "WARNING"
            )
            pwr_parent_id = self._causal_tracking.get("power_margin") or self._causal_tracking.get("Solar")
            pwr_event = self.causal_engine.record_transition(
                timestamp_s=next_sim_time,
                source_subsystem="Battery",
                source_parameter="power_state",
                previous_value=prev_power_state.value,
                new_value=self.state.power_state.value,
                cause=f"Battery SOC ({self.state.battery_soc_pct:.1f}%) crossed power threshold",
                target_subsystem="Mission Scheduler",
                effect=f"Power state transitioned to {self.state.power_state.value}",
                severity=sev,
                causal_parent_id=pwr_parent_id,
            )
            self._causal_tracking["power_state"] = pwr_event.id

        # c. Load deferral / load shedding
        if self.state.images_deferred > prev_images_deferred:
            shed_parent_id = self._causal_tracking.get("power_state") or self._causal_tracking.get("power_margin")
            shed_event = self.causal_engine.record_transition(
                timestamp_s=next_sim_time,
                source_subsystem="Mission Scheduler",
                source_parameter="images_deferred",
                previous_value=prev_images_deferred,
                new_value=self.state.images_deferred,
                cause=f"Spacecraft in {self.state.power_state.value} state requires non-critical load shedding",
                target_subsystem="Payload",
                effect="Imaging task deferred, mission objective delayed",
                severity="WARNING",
                causal_parent_id=shed_parent_id,
            )
            self._causal_tracking["load_shedding"] = shed_event.id

        # Emit discrete state change alerts
        if self.state.power_state != prev_power_state:
            sev = (
                AlertSeverity.CRITICAL
                if self.state.power_state in (PowerState.CRITICAL_POWER, PowerState.EMERGENCY_SHUTDOWN)
                else AlertSeverity.WARNING
            )
            self._record_event(
                event_type="POWER_STATE_TRANSITION",
                subsystem="POWER",
                severity=sev,
                message=f"Power state changed from {prev_power_state.value} to {self.state.power_state.value} (SOC: {self.state.battery_soc_pct:.1f}%)",
            )

        if self.state.thermal_state != prev_thermal_state:
            sev = AlertSeverity.CRITICAL if self.state.thermal_state == ThermalState.CRITICAL else AlertSeverity.WARNING
            self._record_event(
                event_type="THERMAL_STATE_TRANSITION",
                subsystem="THERMAL",
                severity=sev,
                message=f"Thermal state changed from {prev_thermal_state.value} to {self.state.thermal_state.value} (Temp: {self.state.internal_temp_c:.1f}°C)",
            )

        # 13. Telemetry Snapshot & State History
        snapshot = TelemetryEngine.generate_snapshot(self.state, self.run_id)
        self.telemetry_history.append(snapshot)
        self.state_history.append(self.state.clone())

        return self.state

    def advance(self, duration_s: float) -> list[CanonicalSpacecraftState]:
        """Advances the simulation by a given duration in seconds."""
        num_steps = int(duration_s / self.timestep_s)
        states = []
        for _ in range(num_steps):
            states.append(self.step())
        return states

    def apply_recovery_policy(self, policy: RecoveryPolicy) -> None:
        """Applies an operational recovery policy to the active running simulation."""
        self.recovery_policy = policy
        self.state.recovery_mode = policy.policy_id
        self._record_event(
            event_type="RECOVERY_POLICY_APPLIED",
            subsystem="RECOVERY",
            severity=AlertSeverity.INFO,
            message=f"Applied recovery policy {policy.policy_id}: {policy.name} ({policy.actions})",
        )
        self.causal_engine.record_transition(
            timestamp_s=self.state.simulation_time_s,
            source_subsystem="Recovery Planner",
            source_parameter="recovery_mode",
            previous_value="NOMINAL",
            new_value=policy.policy_id,
            cause=f"Flight Operator executed recovery policy {policy.policy_id}",
            target_subsystem="Mission Scheduler",
            effect=policy.expected_effects,
            severity="INFO",
        )

    def set_environment_override(
        self, state: EnvironmentState | None, duration_s: float = 600.0
    ) -> None:
        """Sets a deterministic environment window (e.g. forced Eclipse or Sunlight) or clears it."""
        if state is None:
            self.environment_model.custom_windows.clear()
            self._record_event(
                event_type="ENVIRONMENT_TRANSITION",
                subsystem="ENVIRONMENT",
                severity=AlertSeverity.INFO,
                message="Environment returned to nominal orbital schedule",
            )
        else:
            cur_time = self.state.simulation_time_s
            self.environment_model.custom_windows = [
                EnvironmentWindow(
                    start_s=cur_time,
                    end_s=cur_time + duration_s,
                    state=state,
                )
            ]
            self._record_event(
                event_type="ENVIRONMENT_TRANSITION",
                subsystem="ENVIRONMENT",
                severity=AlertSeverity.INFO,
                message=f"Environment set to {state.value} for {duration_s:.0f}s",
            )

    def export_telemetry_csv(self) -> str:
        """
        Exports complete historical telemetry of the simulation run as CSV.
        Contains at minimum all 23 specified telemetry fields.
        """
        import io
        import csv
        import datetime

        output = io.StringIO()
        fieldnames = [
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
        writer = csv.DictWriter(output, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()

        base_time = datetime.datetime(2026, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc)

        for st in self.state_history:
            ts = (base_time + datetime.timedelta(seconds=st.simulation_time_s)).isoformat()

            # Determine mission objective status
            if st.battery_soc_pct > 25.0 and st.attitude_error_deg <= 2.0:
                obj_status = "HEALTHY"
            elif st.battery_soc_pct > 15.0:
                obj_status = "DEGRADED"
            else:
                obj_status = "CRITICAL"

            # Determine active faults at this simulation time
            active_f_list = [
                f["fault_id"]
                for f in self.active_faults
                if f["start_time_s"] <= st.simulation_time_s < f.get("end_time_s", f["start_time_s"] + f.get("duration_s", 0))
            ]
            active_faults_str = ";".join(active_f_list) if active_f_list else "NONE"
            recovery_str = st.recovery_mode or (
                self.recovery_policy.policy_id
                if self.recovery_policy.policy_id != "R-NONE"
                else "NOMINAL"
            )

            writer.writerow({
                "timestamp": ts,
                "simulation_time": f"{st.simulation_time_s:.1f}",
                "environment_state": st.environment_state.value,
                "solar_generation_w": f"{st.solar_generation_w:.2f}",
                "power_consumption_w": f"{st.total_power_consumption_w:.2f}",
                "power_margin_w": f"{st.power_margin_w:.2f}",
                "battery_soc_pct": f"{st.battery_soc_pct:.2f}",
                "battery_power_w": f"{st.battery_power_w:.2f}",
                "internal_temp_c": f"{st.internal_temp_c:.2f}",
                "external_temp_c": f"{st.external_temp_c:.2f}",
                "communication_state": st.comm_link_state.value,
                "signal_strength_dbm": f"{st.signal_strength_dbm:.2f}",
                "packet_loss_pct": f"{st.packet_loss_fraction * 100.0:.2f}",
                "downlink_rate_mbps": f"{st.effective_downlink_rate_mbps:.2f}",
                "storage_used_gb": f"{st.storage_used_gb:.3f}",
                "storage_free_gb": f"{st.storage_free_gb:.3f}",
                "payload_state": st.payload_state.value,
                "images_completed": st.images_completed,
                "obc_cpu_pct": f"{st.cpu_utilization_pct:.1f}",
                "attitude_error_deg": f"{st.attitude_error_deg:.2f}",
                "mission_objective_status": obj_status,
                "active_faults": active_faults_str,
                "recovery_mode": recovery_str,
            })

        return output.getvalue()

    def _record_event(
        self,
        event_type: str,
        subsystem: str,
        severity: AlertSeverity,
        message: str,
    ) -> None:
        """Appends a simulation event."""
        event = {
            "simulation_time_s": self.state.simulation_time_s,
            "timestamp_s": self.state.simulation_time_s,
            "step": self.state.step_count,
            "event_type": event_type,
            "subsystem": subsystem,
            "severity": severity.value,
            "message": message,
        }
        self.state.events_this_step.append(event)
        self.event_log.append(event)

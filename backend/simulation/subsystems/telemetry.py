"""
Orbital Twin — Telemetry Engine & Snapshot Generator
Formats canonical state into strictly typed telemetry records with units, status, and epistemic source tags.
Governed by 06_DATA_AND_TELEMETRY_SPEC.md.
"""

from typing import Any
import datetime
from backend.simulation.core.state import CanonicalSpacecraftState
from backend.simulation.core.types import (
    DataQuality,
    SourceType,
    SubsystemType,
    SubsystemStatus,
)


class TelemetryEngine:
    """
    Transforms CanonicalSpacecraftState snapshots into standard telemetry streams.
    Ensures every reading includes value, unit, timestamp, subsystem, quality, and source classification.
    """

    @staticmethod
    def generate_snapshot(
        state: CanonicalSpacecraftState,
        simulation_run_id: str = "run-default",
    ) -> list[dict[str, Any]]:
        """Generates a complete list of telemetry records for the current simulation step."""
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        records: list[dict[str, Any]] = []

        def add_record(
            subsystem: SubsystemType,
            param: str,
            value: float | str | bool,
            unit: str,
            quality: DataQuality = DataQuality.VALID,
            status: SubsystemStatus = SubsystemStatus.HEALTHY,
            source_type: SourceType = SourceType.SIMULATED,
        ) -> None:
            records.append(
                {
                    "id": f"{simulation_run_id}_{int(state.simulation_time_s)}_{subsystem.value}_{param}",
                    "timestamp": now_iso,
                    "simulation_time_s": state.simulation_time_s,
                    "subsystem": subsystem.value,
                    "parameter": param,
                    "value": round(value, 4) if isinstance(value, float) else value,
                    "unit": unit,
                    "quality": quality.value,
                    "status": status.value,
                    "source_type": source_type.value,
                    "simulation_run_id": simulation_run_id,
                }
            )

        # Environment Subsystem
        add_record(
            SubsystemType.ENVIRONMENT,
            "environment_state",
            state.environment_state.value,
            "",
            source_type=SourceType.MODEL_ASSUMPTION,
        )
        add_record(
            SubsystemType.ENVIRONMENT,
            "illumination_factor",
            state.illumination_factor,
            "fraction",
            source_type=SourceType.MODEL_ASSUMPTION,
        )
        add_record(
            SubsystemType.ENVIRONMENT,
            "ground_station_visible",
            state.ground_station_visible,
            "bool",
            source_type=SourceType.MODEL_ASSUMPTION,
        )
        add_record(
            SubsystemType.ENVIRONMENT,
            "external_temp_c",
            state.external_temp_c,
            "°C",
            source_type=SourceType.MODEL_ASSUMPTION,
        )

        # Solar Subsystem
        solar_status = (
            SubsystemStatus.HEALTHY
            if state.solar_health > 0.8
            else (
                SubsystemStatus.DEGRADED
                if state.solar_health > 0.2
                else SubsystemStatus.CRITICAL
            )
        )
        add_record(
            SubsystemType.SOLAR,
            "solar_health",
            state.solar_health,
            "fraction",
            status=solar_status,
        )
        add_record(
            SubsystemType.SOLAR,
            "solar_generation_w",
            state.solar_generation_w,
            "W",
            status=solar_status,
        )
        add_record(
            SubsystemType.SOLAR,
            "solar_temp_derating",
            state.solar_temp_derating,
            "fraction",
            status=solar_status,
        )

        # Power Subsystem
        add_record(
            SubsystemType.POWER,
            "total_power_generation_w",
            state.total_power_generation_w,
            "W",
        )
        add_record(
            SubsystemType.POWER,
            "total_power_consumption_w",
            state.total_power_consumption_w,
            "W",
        )
        add_record(
            SubsystemType.POWER,
            "power_margin_w",
            state.power_margin_w,
            "W",
        )
        add_record(
            SubsystemType.POWER,
            "housekeeping_load_w",
            state.housekeeping_load_w,
            "W",
        )

        # Battery Subsystem
        batt_status = (
            SubsystemStatus.HEALTHY
            if state.battery_soc_pct > 25.0
            else (
                SubsystemStatus.DEGRADED
                if state.battery_soc_pct > 15.0
                else SubsystemStatus.CRITICAL
            )
        )
        add_record(
            SubsystemType.BATTERY,
            "battery_soc_pct",
            state.battery_soc_pct,
            "%",
            status=batt_status,
        )
        add_record(
            SubsystemType.BATTERY,
            "battery_energy_wh",
            state.battery_energy_wh,
            "Wh",
            status=batt_status,
        )
        add_record(
            SubsystemType.BATTERY,
            "battery_capacity_wh",
            state.battery_capacity_wh,
            "Wh",
            status=batt_status,
            source_type=SourceType.REFERENCE_RANGE,
        )
        add_record(
            SubsystemType.BATTERY,
            "battery_power_w",
            state.battery_power_w,
            "W",
            status=batt_status,
        )
        add_record(
            SubsystemType.BATTERY,
            "power_state",
            state.power_state.value,
            "",
            status=batt_status,
        )

        # Thermal Subsystem
        therm_status = (
            SubsystemStatus.HEALTHY
            if state.internal_temp_c <= 40.0
            else (
                SubsystemStatus.DEGRADED
                if state.internal_temp_c <= 50.0
                else SubsystemStatus.CRITICAL
            )
        )
        add_record(
            SubsystemType.THERMAL,
            "internal_temp_c",
            state.internal_temp_c,
            "°C",
            status=therm_status,
        )
        add_record(
            SubsystemType.THERMAL,
            "thermal_state",
            state.thermal_state.value,
            "",
            status=therm_status,
        )

        # Communication Subsystem
        comm_status = (
            SubsystemStatus.HEALTHY
            if state.comm_health > 0.8
            else (
                SubsystemStatus.DEGRADED
                if state.comm_health > 0.3
                else SubsystemStatus.CRITICAL
            )
        )
        add_record(
            SubsystemType.COMMUNICATION,
            "comm_link_state",
            state.comm_link_state.value,
            "",
            status=comm_status,
        )
        add_record(
            SubsystemType.COMMUNICATION,
            "downlink_rate_mbps",
            state.effective_downlink_rate_mbps,
            "Mbps",
            status=comm_status,
        )
        add_record(
            SubsystemType.COMMUNICATION,
            "packet_loss_pct",
            state.packet_loss_fraction * 100.0,
            "%",
            status=comm_status,
        )
        add_record(
            SubsystemType.COMMUNICATION,
            "signal_strength_dbm",
            state.signal_strength_dbm,
            "dBm",
            status=comm_status,
        )

        # Storage Subsystem
        storage_status = (
            SubsystemStatus.HEALTHY
            if state.storage_utilization_pct < 80.0
            else (
                SubsystemStatus.DEGRADED
                if state.storage_utilization_pct < 95.0
                else SubsystemStatus.CRITICAL
            )
        )
        add_record(
            SubsystemType.STORAGE,
            "storage_used_gb",
            state.storage_used_gb,
            "GB",
            status=storage_status,
        )
        add_record(
            SubsystemType.STORAGE,
            "storage_free_gb",
            state.storage_free_gb,
            "GB",
            status=storage_status,
        )
        add_record(
            SubsystemType.STORAGE,
            "storage_utilization_pct",
            state.storage_utilization_pct,
            "%",
            status=storage_status,
        )

        # Payload Subsystem
        add_record(
            SubsystemType.PAYLOAD,
            "payload_state",
            state.payload_state.value,
            "",
        )
        add_record(
            SubsystemType.PAYLOAD,
            "images_completed",
            state.images_completed,
            "count",
        )
        add_record(
            SubsystemType.PAYLOAD,
            "images_deferred",
            state.images_deferred,
            "count",
        )
        add_record(
            SubsystemType.PAYLOAD,
            "images_failed",
            state.images_failed,
            "count",
        )

        # OBC Subsystem
        obc_status = (
            SubsystemStatus.HEALTHY
            if state.cpu_utilization_pct < 80.0
            else (
                SubsystemStatus.DEGRADED
                if state.cpu_utilization_pct < 95.0
                else SubsystemStatus.CRITICAL
            )
        )
        add_record(
            SubsystemType.OBC,
            "cpu_utilization_pct",
            state.cpu_utilization_pct,
            "%",
            status=obc_status,
        )

        # ADCS Subsystem
        adcs_status = (
            SubsystemStatus.HEALTHY
            if state.attitude_error_deg <= 2.0
            else (
                SubsystemStatus.DEGRADED
                if state.attitude_error_deg <= 5.0
                else SubsystemStatus.CRITICAL
            )
        )
        add_record(
            SubsystemType.ADCS,
            "attitude_error_deg",
            state.attitude_error_deg,
            "deg",
            status=adcs_status,
        )

        return records

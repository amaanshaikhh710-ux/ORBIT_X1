"""
Orbital Twin — Canonical Spacecraft State
Authoritative state representation holding all physics parameters and subsystem indicators.
"""

from dataclasses import dataclass, field, asdict
from typing import Any
import copy

from backend.simulation.core.types import (
    EnvironmentState,
    PowerState,
    PayloadState,
    CommLinkState,
    ThermalState,
    ADCSQuality,
)
from backend.simulation.core import constants as const


@dataclass
class CanonicalSpacecraftState:
    # Clock
    simulation_time_s: float = 0.0
    mission_time_s: float = 0.0
    step_count: int = 0
    time_step_s: float = const.SIMULATION_TIMESTEP_S

    # Environment
    environment_state: EnvironmentState = EnvironmentState.SUNLIGHT
    illumination_factor: float = 1.0
    ground_station_visible: bool = False
    external_temp_c: float = const.EXTERNAL_TEMP_MAX_C

    # Solar Subsystem
    solar_health: float = 1.0  # 0.0 to 1.0
    solar_temp_derating: float = 1.0
    solar_generation_w: float = const.NOMINAL_SOLAR_PEAK_W

    # Electrical Loads
    housekeeping_load_w: float = const.HOUSEKEEPING_LOAD_W
    payload_load_w: float = 0.0
    processing_load_w: float = 0.0
    comm_load_w: float = 0.0
    adcs_load_w: float = 0.0
    thermal_load_w: float = 0.0
    fault_overhead_load_w: float = 0.0
    total_power_consumption_w: float = const.HOUSEKEEPING_LOAD_W

    # Power Balance
    total_power_generation_w: float = const.NOMINAL_SOLAR_PEAK_W
    power_margin_w: float = const.NOMINAL_SOLAR_PEAK_W - const.HOUSEKEEPING_LOAD_W

    # Battery Subsystem
    battery_capacity_wh: float = const.BATTERY_USABLE_CAPACITY_WH
    battery_energy_wh: float = (
        const.BATTERY_USABLE_CAPACITY_WH * (const.INITIAL_SOC_PCT / 100.0)
    )
    battery_soc_pct: float = const.INITIAL_SOC_PCT
    battery_power_w: float = -(const.NOMINAL_SOLAR_PEAK_W - const.HOUSEKEEPING_LOAD_W)  # negative = charging
    battery_health: float = 1.0
    power_state: PowerState = PowerState.NORMAL

    # Thermal Subsystem
    internal_temp_c: float = const.NOMINAL_TEMPERATURE_C
    thermal_state: ThermalState = ThermalState.NOMINAL
    heat_generated_w: float = const.HOUSEKEEPING_LOAD_W * const.HEAT_CONVERSION_FACTOR
    heat_rejected_w: float = 0.0
    heat_rejection_coeff: float = const.HEAT_REJECTION_COEFF_W_PER_K

    # Communication Subsystem
    comm_link_state: CommLinkState = CommLinkState.NO_LINK
    comm_health: float = 1.0
    signal_strength_dbm: float = const.NOMINAL_SIGNAL_STRENGTH_DBM
    packet_loss_fraction: float = const.NOMINAL_PACKET_LOSS
    effective_downlink_rate_mbps: float = 0.0
    downlinked_data_mb_step: float = 0.0
    total_downlinked_data_mb: float = 0.0

    # Storage Subsystem
    storage_capacity_gb: float = const.STORAGE_CAPACITY_GB
    storage_used_gb: float = const.INITIAL_STORAGE_USED_GB
    storage_free_gb: float = const.STORAGE_CAPACITY_GB - const.INITIAL_STORAGE_USED_GB
    storage_utilization_pct: float = (
        const.INITIAL_STORAGE_USED_GB / const.STORAGE_CAPACITY_GB
    ) * 100.0

    # Payload Subsystem
    payload_state: PayloadState = PayloadState.IDLE
    payload_health: float = 1.0
    active_task_id: str | None = None
    task_progress_s: float = 0.0
    raw_data_buffer_mb: float = 0.0
    images_completed: int = 0
    images_deferred: int = 0
    images_failed: int = 0

    # OBC Subsystem
    cpu_utilization_pct: float = const.CPU_BASELINE_PCT
    memory_utilization_pct: float = 30.0
    obc_health: float = 1.0

    # ADCS Subsystem
    attitude_error_deg: float = const.NOMINAL_POINTING_ERROR_DEG
    adcs_quality: ADCSQuality = ADCSQuality.GOOD
    adcs_health: float = 1.0

    # Sensors Subsystem
    sensor_health: float = 1.0
    measured_temperature_c: float = const.NOMINAL_TEMPERATURE_C
    measured_soc_pct: float = const.INITIAL_SOC_PCT

    # Diagnostics, Faults & Recovery
    active_faults: list[dict[str, Any]] = field(default_factory=list)
    alerts: list[dict[str, Any]] = field(default_factory=list)
    recovery_mode: str | None = None
    demo_mode: str | None = None
    events_this_step: list[dict[str, Any]] = field(default_factory=list)

    def clone(self) -> "CanonicalSpacecraftState":
        """Deep copy for branching, what-if resimulation, and recovery analysis."""
        return copy.deepcopy(self)

    def to_dict(self) -> dict[str, Any]:
        """Convert state to a plain dictionary for API serialization."""
        data = asdict(self)
        # Ensure enums serialize as string values
        data["environment_state"] = self.environment_state.value
        data["power_state"] = self.power_state.value
        data["payload_state"] = self.payload_state.value
        data["comm_link_state"] = self.comm_link_state.value
        data["thermal_state"] = self.thermal_state.value
        data["adcs_quality"] = self.adcs_quality.value
        return data

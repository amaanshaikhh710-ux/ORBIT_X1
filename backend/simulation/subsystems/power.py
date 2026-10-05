"""Electrical power generation, load balance, and battery state model."""

from dataclasses import dataclass

from backend.simulation.core import constants as const
from backend.simulation.core.types import PowerState


@dataclass(frozen=True)
class PowerStepResult:
    solar_generation_w: float
    solar_temp_derating: float
    total_power_consumption_w: float
    power_margin_w: float
    battery_energy_wh: float
    battery_soc_pct: float
    battery_power_w: float
    power_state: PowerState


@dataclass
class PowerModel:
    solar_peak_w: float = const.NOMINAL_SOLAR_PEAK_W
    battery_usable_capacity_wh: float = const.BATTERY_USABLE_CAPACITY_WH
    charge_efficiency: float = const.CHARGE_EFFICIENCY
    discharge_efficiency: float = const.DISCHARGE_EFFICIENCY

    def calculate_solar_generation(
        self,
        illumination_factor: float,
        solar_health: float,
        internal_temp_c: float,
    ) -> tuple[float, float]:
        temp_derating = 1.0
        if internal_temp_c > 45.0:
            temp_derating = max(0.0, 1.0 - ((internal_temp_c - 45.0) * 0.004))
        generation = self.solar_peak_w * max(0.0, illumination_factor) * max(0.0, solar_health) * temp_derating
        return generation, temp_derating

    def evaluate_power_state(self, battery_soc_pct: float) -> PowerState:
        if battery_soc_pct <= const.EMERGENCY_SOC_PCT:
            return PowerState.EMERGENCY_SHUTDOWN
        if battery_soc_pct <= const.CRITICAL_SOC_PCT:
            return PowerState.CRITICAL_POWER
        if battery_soc_pct <= const.LOW_POWER_SOC_PCT:
            return PowerState.LOW_POWER
        return PowerState.NORMAL

    def update_power_step(
        self,
        dt_s: float,
        current_battery_energy_wh: float,
        illumination_factor: float,
        solar_health: float,
        internal_temp_c: float,
        housekeeping_load_w: float,
        payload_load_w: float,
        processing_load_w: float,
        comm_load_w: float,
        adcs_load_w: float,
        thermal_load_w: float,
        fault_overhead_load_w: float,
        current_power_state: PowerState,
    ) -> PowerStepResult:
        solar_generation_w, derating = self.calculate_solar_generation(
            illumination_factor, solar_health, internal_temp_c
        )
        total_load_w = (
            housekeeping_load_w
            + payload_load_w
            + processing_load_w
            + comm_load_w
            + adcs_load_w
            + thermal_load_w
            + fault_overhead_load_w
        )
        power_margin_w = solar_generation_w - total_load_w
        raw_delta_wh = power_margin_w * (dt_s / 3600.0)
        delta_wh = (
            raw_delta_wh * self.charge_efficiency
            if raw_delta_wh >= 0.0
            else raw_delta_wh / self.discharge_efficiency
        )
        battery_energy_wh = min(
            self.battery_usable_capacity_wh,
            max(0.0, current_battery_energy_wh + delta_wh),
        )
        battery_soc_pct = (battery_energy_wh / self.battery_usable_capacity_wh) * 100.0
        return PowerStepResult(
            solar_generation_w=solar_generation_w,
            solar_temp_derating=derating,
            total_power_consumption_w=total_load_w,
            power_margin_w=power_margin_w,
            battery_energy_wh=battery_energy_wh,
            battery_soc_pct=battery_soc_pct,
            battery_power_w=-power_margin_w,
            power_state=self.evaluate_power_state(battery_soc_pct),
        )

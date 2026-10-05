"""
Orbital Twin — Power Subsystem Unit Tests
Detailed unit tests covering power balance, efficiency loss modeling, and power state thresholds.
"""

import pytest
from backend.simulation.core import constants as const
from backend.simulation.core.types import PowerState
from backend.simulation.subsystems.power import PowerModel


def test_power_state_thresholds():
    pm = PowerModel()
    # NORMAL: > 25%
    assert pm.evaluate_power_state(25.1) == PowerState.NORMAL
    assert pm.evaluate_power_state(85.0) == PowerState.NORMAL
    assert pm.evaluate_power_state(100.0) == PowerState.NORMAL

    # LOW_POWER: 15% < SOC <= 25%
    assert pm.evaluate_power_state(25.0) == PowerState.LOW_POWER
    assert pm.evaluate_power_state(20.0) == PowerState.LOW_POWER
    assert pm.evaluate_power_state(15.1) == PowerState.LOW_POWER

    # CRITICAL_POWER: 10% < SOC <= 15%
    assert pm.evaluate_power_state(15.0) == PowerState.CRITICAL_POWER
    assert pm.evaluate_power_state(12.0) == PowerState.CRITICAL_POWER
    assert pm.evaluate_power_state(10.1) == PowerState.CRITICAL_POWER

    # EMERGENCY_SHUTDOWN: <= 10%
    assert pm.evaluate_power_state(10.0) == PowerState.EMERGENCY_SHUTDOWN
    assert pm.evaluate_power_state(5.0) == PowerState.EMERGENCY_SHUTDOWN
    assert pm.evaluate_power_state(0.0) == PowerState.EMERGENCY_SHUTDOWN


def test_charge_and_discharge_efficiency_equations():
    pm = PowerModel(
        solar_peak_w=24.0,
        battery_usable_capacity_wh=72.0,
        charge_efficiency=0.90,
        discharge_efficiency=0.90,
    )
    dt = 10.0  # seconds

    # Case 1: Charging (P_net = +10 W)
    # E_delta_Wh = 10 * 10 / 3600 = 0.02777778 Wh
    # Charged energy = E_delta_Wh * 0.90 = 0.025 Wh
    res_charge = pm.update_power_step(
        dt_s=dt,
        current_battery_energy_wh=36.0,
        illumination_factor=1.0,
        solar_health=1.0,
        internal_temp_c=20.0,
        housekeeping_load_w=14.0,  # 24 - 14 = +10 W
        payload_load_w=0.0,
        processing_load_w=0.0,
        comm_load_w=0.0,
        adcs_load_w=0.0,
        thermal_load_w=0.0,
        fault_overhead_load_w=0.0,
        current_power_state=PowerState.NORMAL,
    )
    expected_charge_gain = 10.0 * (10.0 / 3600.0) * 0.90
    assert res_charge.battery_energy_wh == pytest.approx(36.0 + expected_charge_gain, rel=1e-5)

    # Case 2: Discharging (P_net = -10 W)
    # E_delta_Wh = -10 * 10 / 3600 = -0.02777778 Wh
    # Discharged energy from battery = E_delta_Wh / 0.90 = -0.030864 Wh
    res_discharge = pm.update_power_step(
        dt_s=dt,
        current_battery_energy_wh=36.0,
        illumination_factor=0.0,  # Eclipse -> P_solar = 0
        solar_health=1.0,
        internal_temp_c=20.0,
        housekeeping_load_w=10.0,  # P_net = -10 W
        payload_load_w=0.0,
        processing_load_w=0.0,
        comm_load_w=0.0,
        adcs_load_w=0.0,
        thermal_load_w=0.0,
        fault_overhead_load_w=0.0,
        current_power_state=PowerState.NORMAL,
    )
    expected_discharge_loss = (10.0 * (10.0 / 3600.0)) / 0.90
    assert res_discharge.battery_energy_wh == pytest.approx(36.0 - expected_discharge_loss, rel=1e-5)


def test_temperature_derating():
    pm = PowerModel(solar_peak_w=24.0)

    # Normal temp <= 45°C -> no derating (1.0)
    p_norm, derate_norm = pm.calculate_solar_generation(1.0, 1.0, 35.0)
    assert derate_norm == 1.0
    assert p_norm == 24.0

    # Elevated temp (55°C) -> derates by 0.4%/K * 10K = 4% (derating = 0.96)
    p_hot, derate_hot = pm.calculate_solar_generation(1.0, 1.0, 55.0)
    assert derate_hot == pytest.approx(0.96, rel=1e-3)
    assert p_hot == pytest.approx(24.0 * 0.96, rel=1e-3)

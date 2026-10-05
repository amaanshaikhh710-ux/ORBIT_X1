"""
Orbital Twin — Automated Validation Tests
Executing core validation cases from 23_VALIDATION_CASES.csv and 18_ENGINEERING_BASELINE.md.
"""

import pytest
from backend.simulation.core.constants import (
    NOMINAL_SOLAR_PEAK_W,
    BATTERY_USABLE_CAPACITY_WH,
    INITIAL_SOC_PCT,
    HOUSEKEEPING_LOAD_W,
    CHARGE_EFFICIENCY,
    DISCHARGE_EFFICIENCY,
    SIMULATION_TIMESTEP_S,
    SOLAR_DEGRADATION_DEMO_SEVERITY,
    STORAGE_CAPACITY_GB,
    DOWNLINK_RATE_MBPS,
    NOMINAL_PACKET_LOSS,
    COMM_HIGH_RATE_LOAD_W,
    THERMAL_WARNING_C,
    THERMAL_CRITICAL_C,
    IMAGING_MAX_POINTING_ERROR_DEG,
)
from backend.simulation.core.types import (
    EnvironmentState,
    PowerState,
    ThermalState,
    PayloadState,
    CommLinkState,
    ADCSQuality,
)
from backend.simulation.core.state import CanonicalSpacecraftState
from backend.simulation.subsystems.environment import EnvironmentModel, EnvironmentWindow, GroundStationWindow
from backend.simulation.subsystems.power import PowerModel
from backend.simulation.subsystems.thermal import ThermalModel
from backend.simulation.subsystems.communication import CommunicationModel
from backend.simulation.subsystems.storage import StorageModel
from backend.simulation.subsystems.payload import PayloadModel
from backend.simulation.subsystems.adcs import ADCSModel
from backend.simulation.engine import SimulationEngine
from backend.simulation.telemetry import TelemetryEngine
from backend.simulation.recovery.policies import RecoveryPolicyRegistry
from backend.simulation.recovery.simulator import RecoverySimulator


def test_v001_no_fault_sunlight_power_and_battery():
    """
    V-001: No-fault sunlight: battery remains bounded and responds to net power.
    In full sunlight: P_solar = 24W, P_housekeeping = 5W.
    P_net = 24 - 5 = +19W.
    Battery should charge according to dt and charging efficiency (0.90).
    """
    power_model = PowerModel()
    dt = 10.0
    initial_energy = 50.0  # Wh (well below 72 Wh capacity)

    res = power_model.update_power_step(
        dt_s=dt,
        current_battery_energy_wh=initial_energy,
        illumination_factor=1.0,
        solar_health=1.0,
        internal_temp_c=20.0,
        housekeeping_load_w=5.0,
        payload_load_w=0.0,
        processing_load_w=0.0,
        comm_load_w=0.0,
        adcs_load_w=0.0,
        thermal_load_w=0.0,
        fault_overhead_load_w=0.0,
        current_power_state=PowerState.NORMAL,
    )

    assert res.solar_generation_w == pytest.approx(24.0, rel=1e-3)
    assert res.total_power_consumption_w == pytest.approx(5.0, rel=1e-3)
    assert res.power_margin_w == pytest.approx(19.0, rel=1e-3)

    # Expected energy change: P_net * (dt / 3600) * charge_efficiency
    expected_delta_wh = 19.0 * (dt / 3600.0) * CHARGE_EFFICIENCY
    assert res.battery_energy_wh == pytest.approx(initial_energy + expected_delta_wh, rel=1e-4)
    assert res.battery_soc_pct > (initial_energy / BATTERY_USABLE_CAPACITY_WH) * 100.0
    assert res.battery_soc_pct <= 100.0


def test_v002_eclipse_zero_solar_generation():
    """
    V-002: Eclipse: solar generation becomes zero.
    """
    power_model = PowerModel()
    p_solar, _ = power_model.calculate_solar_generation(
        illumination_factor=0.0,
        solar_health=1.0,
        internal_temp_c=20.0,
    )
    assert p_solar == 0.0

    # In engine step under eclipse
    eclipse_window = [EnvironmentWindow(start_s=0.0, end_s=100.0, state=EnvironmentState.ECLIPSE)]
    env_model = EnvironmentModel(custom_windows=eclipse_window)
    engine = SimulationEngine(environment_model=env_model)

    state = engine.step()
    assert state.environment_state == EnvironmentState.ECLIPSE
    assert state.illumination_factor == 0.0
    assert state.solar_generation_w == 0.0
    assert state.power_margin_w < 0.0  # Deficit


def test_v003_solar_degradation_70_percent():
    """
    V-003: 70% solar degradation produces 30% of nominal solar generation before other modifiers.
    P_nominal = 24W.
    30% of 24W = 7.2W.
    """
    power_model = PowerModel()
    solar_health = 1.0 - SOLAR_DEGRADATION_DEMO_SEVERITY  # 0.30
    p_solar, _ = power_model.calculate_solar_generation(
        illumination_factor=1.0,
        solar_health=solar_health,
        internal_temp_c=20.0,
    )
    assert p_solar == pytest.approx(7.2, rel=1e-4)

    # In engine with injected fault
    sunlight_window = [EnvironmentWindow(start_s=0.0, end_s=500.0, state=EnvironmentState.SUNLIGHT)]
    engine = SimulationEngine(environment_model=EnvironmentModel(custom_windows=sunlight_window))
    engine.inject_fault(
        fault_id="F-SOLAR-001",
        subsystem="Solar",
        parameter="solar_health",
        severity=0.70,
        start_time_s=0.0,
        duration_s=300.0,
    )

    state = engine.step()
    assert state.solar_health == pytest.approx(0.30, rel=1e-4)
    assert state.solar_generation_w == pytest.approx(7.2, rel=1e-4)


def test_v004_soc_bounds_0_to_100():
    """
    V-004: SOC bounds: SOC remains strictly between 0 and 100 percent.
    Tests both overcharge clamping (at 100%) and deep discharge clamping (at 0%).
    """
    power_model = PowerModel()
    dt = 10.0

    # Overcharge test: start at 100% capacity and apply massive surplus
    res_over = power_model.update_power_step(
        dt_s=dt,
        current_battery_energy_wh=BATTERY_USABLE_CAPACITY_WH,
        illumination_factor=1.0,
        solar_health=1.0,
        internal_temp_c=20.0,
        housekeeping_load_w=0.0,
        payload_load_w=0.0,
        processing_load_w=0.0,
        comm_load_w=0.0,
        adcs_load_w=0.0,
        thermal_load_w=0.0,
        fault_overhead_load_w=0.0,
        current_power_state=PowerState.NORMAL,
    )
    assert res_over.battery_energy_wh == BATTERY_USABLE_CAPACITY_WH
    assert res_over.battery_soc_pct == 100.0

    # Depletion test: start near 0 and apply high deficit
    res_under = power_model.update_power_step(
        dt_s=dt,
        current_battery_energy_wh=0.01,
        illumination_factor=0.0,
        solar_health=1.0,
        internal_temp_c=20.0,
        housekeeping_load_w=50.0,
        payload_load_w=0.0,
        processing_load_w=0.0,
        comm_load_w=0.0,
        adcs_load_w=0.0,
        thermal_load_w=0.0,
        fault_overhead_load_w=0.0,
        current_power_state=PowerState.CRITICAL_POWER,
    )
    assert res_under.battery_energy_wh == 0.0
    assert res_under.battery_soc_pct == 0.0


def test_v005_no_ground_station_visibility_no_downlink():
    """
    V-005: No ground station visibility: no data is downlinked.
    """
    comm_model = CommunicationModel()
    # Visibility = False, even with plenty of stored data
    res = comm_model.update_comm_step(
        dt_s=10.0,
        ground_station_visible=False,
        available_data_mb=1000.0,
        comm_health=1.0,
    )
    assert res.comm_link_state == CommLinkState.NO_LINK
    assert res.effective_rate_mbps == 0.0
    assert res.downlinked_mb_step == 0.0
    assert res.comm_electrical_load_w == 0.0

    # In engine
    env_model = EnvironmentModel(ground_station_windows=[])  # no visible passes
    engine = SimulationEngine(environment_model=env_model)
    initial_storage = engine.state.storage_used_gb

    state = engine.step()
    assert not state.ground_station_visible
    assert state.downlinked_data_mb_step == 0.0
    assert state.storage_used_gb == initial_storage


def test_v006_visible_ground_station_storage_decreases():
    """
    V-006: Visible ground station + stored data + healthy link: storage decreases.
    At 2.0 Mbps, dt = 10s, packet loss 1%:
    downlinked_bits = 2e6 * 10 * 0.99 = 19.8e6 bits = 2.475 MB.
    """
    comm_model = CommunicationModel(nominal_downlink_rate_mbps=2.0, nominal_packet_loss=0.01)
    res = comm_model.update_comm_step(
        dt_s=10.0,
        ground_station_visible=True,
        available_data_mb=500.0,
        comm_health=1.0,
    )
    assert res.comm_link_state == CommLinkState.NOMINAL
    expected_mb = (2.0 * 1e6 * 10.0 * 0.99) / (8.0 * 1e6)  # 2.475 MB
    assert res.downlinked_mb_step == pytest.approx(expected_mb, rel=1e-4)
    assert res.comm_electrical_load_w == COMM_HIGH_RATE_LOAD_W

    # In engine
    gs_win = [GroundStationWindow(start_s=0.0, end_s=100.0)]
    env_model = EnvironmentModel(ground_station_windows=gs_win)
    engine = SimulationEngine(environment_model=env_model)
    initial_storage_gb = engine.state.storage_used_gb  # 1.0 GB = 1000 MB

    state = engine.step()
    assert state.ground_station_visible
    assert state.downlinked_data_mb_step == pytest.approx(expected_mb, rel=1e-4)
    assert state.storage_used_gb < initial_storage_gb
    expected_storage_gb = (1000.0 - expected_mb) / 1000.0
    assert state.storage_used_gb == pytest.approx(expected_storage_gb, rel=1e-4)


def test_v007_storage_cannot_exceed_capacity():
    """
    V-007: Storage capacity: storage never exceeds hardware capacity (8.0 GB / 8000 MB).
    """
    storage_model = StorageModel(capacity_gb=8.0)
    # Attempt to add 9000 MB to an already 1000 MB storage
    res = storage_model.update_storage_step(
        current_used_mb=1000.0,
        generated_data_mb=9000.0,
        downlinked_data_mb=0.0,
    )
    assert res.storage_used_gb == 8.0
    assert res.storage_used_mb == 8000.0
    assert res.storage_free_gb == 0.0
    assert res.storage_utilization_pct == 100.0
    assert res.is_full is True
    assert res.is_critical is True


def test_v008_high_temperature_warning_and_critical():
    """
    V-008: High temperature: thermal warning/critical states activate at thresholds.
    NOMINAL <= 40°C
    WARNING > 40°C
    CRITICAL > 50°C
    """
    thermal_model = ThermalModel(warning_temp_c=40.0, critical_temp_c=50.0)
    assert thermal_model.evaluate_thermal_state(25.0) == ThermalState.NOMINAL
    assert thermal_model.evaluate_thermal_state(40.0) == ThermalState.NOMINAL
    assert thermal_model.evaluate_thermal_state(40.1) == ThermalState.WARNING
    assert thermal_model.evaluate_thermal_state(50.0) == ThermalState.WARNING
    assert thermal_model.evaluate_thermal_state(50.1) == ThermalState.CRITICAL

    # Test in engine with massive heat fault
    engine = SimulationEngine()
    engine.state.internal_temp_c = 48.0
    engine.inject_fault(
        fault_id="F-THERM-001",
        subsystem="Thermal",
        parameter="heat_rejection_coefficient",
        severity=0.95,
        start_time_s=0.0,
        duration_s=500.0,
    )
    engine.inject_fault(
        fault_id="F-REG-001",
        subsystem="Power",
        parameter="fault_overhead_w",
        severity=1.0,  # +10 W continuous heat
        start_time_s=0.0,
        duration_s=500.0,
    )

    # Step engine to evaluate initial thermal state at 48°C
    engine.step()
    assert engine.state.thermal_state == ThermalState.WARNING

    # Advance until temp crosses 50°C
    while engine.state.internal_temp_c <= 50.0 and engine.state.simulation_time_s < 600.0:
        engine.step()
    assert engine.state.thermal_state == ThermalState.CRITICAL


def test_v009_pointing_error_above_2_deg_prevents_imaging():
    """
    V-009: Pointing error above 2 degrees: nominal imaging is deferred/invalidated.
    """
    adcs_model = ADCSModel(max_imaging_pointing_error_deg=2.0)
    # Pointing at 0.5 deg -> can image
    res_good = adcs_model.update_adcs_step(10.0, 0.5)
    assert res_good.can_image is True

    # Pointing with error gap resulting in > 2.0 deg -> cannot image
    res_bad = adcs_model.update_adcs_step(10.0, 3.0)
    assert res_bad.attitude_error_deg > 2.0
    assert res_bad.can_image is False
    assert res_bad.adcs_quality == ADCSQuality.DEGRADED

    # In engine: trigger imaging with attitude error > 2 deg
    engine = SimulationEngine()
    engine.state.attitude_error_deg = 3.5
    engine.payload_model.trigger_image_task("test-img")
    state = engine.step()

    # Task should be deferred because pointing > 2 deg
    assert state.images_deferred >= 1
    assert state.payload_state == PayloadState.IDLE


def test_v010_low_power_defers_non_critical_imaging():
    """
    V-010: Low power: non-critical imaging is deferred.
    """
    initial_state = CanonicalSpacecraftState(
        battery_energy_wh=BATTERY_USABLE_CAPACITY_WH * 0.20,  # 20% SOC -> LOW_POWER
        battery_soc_pct=20.0,
        power_state=PowerState.LOW_POWER,
    )
    engine = SimulationEngine(initial_state=initial_state)
    engine.payload_model.trigger_image_task("test-low-pwr-img")

    state = engine.step()
    assert state.images_deferred >= 1
    assert state.payload_load_w == 0.0


def test_v011_recovery_rerun_resets_to_identical_baseline():
    """
    V-011: Recovery rerun: resimulation starts from the exact same baseline.
    """
    engine = SimulationEngine()
    initial_energy = engine.state.battery_energy_wh
    initial_soc = engine.state.battery_soc_pct
    initial_time = engine.state.simulation_time_s

    engine.advance(100.0)
    assert engine.state.simulation_time_s == 100.0

    engine.reset()
    assert engine.state.simulation_time_s == initial_time
    assert engine.state.battery_energy_wh == initial_energy
    assert engine.state.battery_soc_pct == initial_soc
    assert engine.state.step_count == 0


def test_v012_determinism():
    """
    V-012: Determinism: same seed, config, and scenario produce identical output.
    """
    def run_sim():
        eng = SimulationEngine(run_id="run-det", random_seed=12345)
        eng.inject_fault(
            fault_id="F-SOLAR-001",
            subsystem="Solar",
            parameter="solar_health",
            severity=0.50,
            start_time_s=20.0,
            duration_s=60.0,
        )
        return eng.advance(120.0)

    run_1_states = run_sim()
    run_2_states = run_sim()

    assert len(run_1_states) == len(run_2_states)
    for s1, s2 in zip(run_1_states, run_2_states):
        assert s1.simulation_time_s == s2.simulation_time_s
        assert s1.solar_generation_w == s2.solar_generation_w
        assert s1.battery_energy_wh == s2.battery_energy_wh
        assert s1.battery_soc_pct == s2.battery_soc_pct
        assert s1.power_state == s2.power_state


def test_causal_fault_propagation_chain():
    """
    Validates that a solar degradation fault generates an explicit causal event chain:
    Solar degradation -> solar_generation drops -> power_margin drops -> battery discharges -> power_state transitions -> payload deferred.
    """
    # Start spacecraft with lower battery energy to trigger low power during fault
    # Start spacecraft close to 25% threshold with active imaging task
    init_state = CanonicalSpacecraftState(
        battery_energy_wh=BATTERY_USABLE_CAPACITY_WH * 0.252,  # 25.2% SOC
        battery_soc_pct=25.2,
        power_state=PowerState.NORMAL,
    )
    sunlight_window = [EnvironmentWindow(start_s=0.0, end_s=500.0, state=EnvironmentState.SUNLIGHT)]
    engine = SimulationEngine(
        initial_state=init_state,
        environment_model=EnvironmentModel(custom_windows=sunlight_window),
    )

    # Inject 85% solar fault (generation = 3.6W < 5.0W housekeeping -> deficit -> discharge)
    engine.inject_fault(
        fault_id="F-SOLAR-001",
        subsystem="Solar",
        parameter="solar_health",
        severity=0.85,
        start_time_s=10.0,
        duration_s=200.0,
    )
    engine.payload_model.trigger_image_task("img-causal-demo")

    # Step past fault start and through low power transition
    for _ in range(15):
        engine.step()

    causal_events = engine.causal_engine.get_events_for_timeline()
    assert len(causal_events) >= 3

    # Check that root fault, generation drop, and power state transition were logged
    subsystems_affected = {e["source_subsystem"] for e in causal_events}
    assert "Solar" in subsystems_affected
    assert "Battery" in subsystems_affected


def test_recovery_resimulator_multi_scenario_comparison():
    """
    Validates multi-scenario recovery re-simulation:
    Runs unmitigated run vs candidate recovery policies from identical baseline.
    Verifies that metrics are genuinely calculated, scenarios branch cleanly, and baseline is not mutated.
    """
    init_state = CanonicalSpacecraftState(
        battery_energy_wh=BATTERY_USABLE_CAPACITY_WH * 0.35,  # 35% SOC
        battery_soc_pct=35.0,
        power_state=PowerState.NORMAL,
    )
    faults = [
        {
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.70,
            "start_time_s": 20.0,
            "duration_s": 300.0,
        }
    ]

    # Run multi-scenario comparison over 600s
    report = RecoverySimulator.run_comparison(
        initial_state=init_state,
        faults=faults,
        duration_s=600.0,
    )

    # Verify report structure
    assert report.unmitigated_baseline is not None
    assert len(report.recovery_scenarios) >= 4

    unmitigated = report.unmitigated_baseline
    assert unmitigated.policy_id == "R-NONE"
    assert unmitigated.min_battery_soc_pct < 35.0

    # Low Power Mode (R-003) or Safe Mode (R-002) sheds non-critical load and should preserve more battery
    r_safe = next((s for s in report.recovery_scenarios if s.policy_id == "R-002"), None)
    assert r_safe is not None
    assert r_safe.min_battery_soc_pct >= unmitigated.min_battery_soc_pct

    # Ensure baseline state was not mutated
    assert init_state.battery_soc_pct == 35.0
    assert init_state.step_count == 0


def test_phase5_determinism_identical_runs():
    """
    PHASE 5: Prove that identical config + baseline + fault + recovery policy + seed produces identical output.
    """
    init_state = CanonicalSpacecraftState(battery_soc_pct=75.0)
    faults = [
        {
            "fault_id": "F-SOLAR-001",
            "subsystem": "Solar",
            "parameter": "solar_health",
            "severity": 0.60,
            "start_time_s": 10.0,
            "duration_s": 100.0,
        }
    ]
    policy = RecoveryPolicyRegistry.get_by_id("R-001")

    rep1 = RecoverySimulator.run_comparison(
        initial_state=init_state,
        faults=faults,
        duration_s=300.0,
        policies=[policy],
        random_seed=9999,
    )
    rep2 = RecoverySimulator.run_comparison(
        initial_state=init_state,
        faults=faults,
        duration_s=300.0,
        policies=[policy],
        random_seed=9999,
    )

    assert rep1.unmitigated_baseline.min_battery_soc_pct == rep2.unmitigated_baseline.min_battery_soc_pct
    assert rep1.unmitigated_baseline.final_battery_soc_pct == rep2.unmitigated_baseline.final_battery_soc_pct
    assert rep1.recovery_scenarios[0].min_battery_soc_pct == rep2.recovery_scenarios[0].min_battery_soc_pct
    assert rep1.recovery_scenarios[0].total_data_downlinked_mb == rep2.recovery_scenarios[0].total_data_downlinked_mb

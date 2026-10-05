"""
Orbital Twin — Environment & Clock Tests
Verifies orbital window progression, ground station passes, fault timing, and clock stability.
"""

import pytest
from backend.simulation.core import constants as const
from backend.simulation.core.types import EnvironmentState
from backend.simulation.subsystems.environment import EnvironmentModel
from backend.simulation.engine import SimulationEngine


def test_environment_orbital_cycle():
    env = EnvironmentModel(
        orbit_period_s=5400.0,
        sunlight_duration_s=3240.0,
        transition_duration_s=120.0,
    )

    # In sunlight (t = 1000s)
    state, illum, temp, gs = env.evaluate(1000.0)
    assert state == EnvironmentState.SUNLIGHT
    assert illum == 1.0
    assert temp == const.EXTERNAL_TEMP_MAX_C

    # In first transition (t = 3300s, between 3240 and 3360)
    state, illum, temp, gs = env.evaluate(3300.0)
    assert state == EnvironmentState.TRANSITION
    assert illum == 0.5

    # In eclipse (t = 4000s)
    state, illum, temp, gs = env.evaluate(4000.0)
    assert state == EnvironmentState.ECLIPSE
    assert illum == 0.0
    assert temp == const.EXTERNAL_TEMP_MIN_C


def test_ground_station_visibility():
    env = EnvironmentModel(orbit_period_s=5400.0)

    # At t = 500s: not visible
    _, _, _, gs_before = env.evaluate(500.0)
    assert not gs_before

    # At t = 800s: visible (window is 600s - 1200s)
    _, _, _, gs_during = env.evaluate(800.0)
    assert gs_during

    # At t = 1300s: not visible
    _, _, _, gs_after = env.evaluate(1300.0)
    assert not gs_after


def test_fault_lifecycle_timing():
    engine = SimulationEngine()
    engine.inject_fault(
        fault_id="F-SOLAR-001",
        subsystem="Solar",
        parameter="solar_health",
        severity=0.70,
        start_time_s=30.0,
        duration_s=50.0,  # active from 30s to 80s
    )

    # Step at t = 10s: fault inactive
    s1 = engine.step()
    assert s1.simulation_time_s == 10.0
    assert s1.solar_health == 1.0

    # Step at t = 20s: fault inactive
    s2 = engine.step()
    assert s2.simulation_time_s == 20.0
    assert s2.solar_health == 1.0

    # Step at t = 30s: fault active (30s <= t < 80s)
    s3 = engine.step()
    assert s3.simulation_time_s == 30.0
    assert s3.solar_health == pytest.approx(0.30, rel=1e-4)

    # Advance to t = 70s: still active
    while engine.state.simulation_time_s < 70.0:
        engine.step()
    assert engine.state.solar_health == pytest.approx(0.30, rel=1e-4)

    # Advance past 80s (t = 90s): fault expired
    while engine.state.simulation_time_s < 90.0:
        engine.step()
    assert engine.state.solar_health == 1.0

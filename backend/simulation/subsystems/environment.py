"""Deterministic orbital environment and ground station visibility model."""

from dataclasses import dataclass, field

from backend.simulation.core import constants as const
from backend.simulation.core.types import EnvironmentState


@dataclass
class EnvironmentWindow:
    start_s: float
    end_s: float
    state: EnvironmentState


@dataclass
class GroundStationWindow:
    start_s: float
    end_s: float


@dataclass
class EnvironmentModel:
    orbit_period_s: float = 5400.0
    sunlight_duration_s: float = 3240.0
    transition_duration_s: float = 120.0
    custom_windows: list[EnvironmentWindow] = field(default_factory=list)
    ground_station_windows: list[GroundStationWindow] | None = None

    def __post_init__(self) -> None:
        if self.ground_station_windows is None:
            self.ground_station_windows = [GroundStationWindow(600.0, 1200.0)]

    def evaluate(self, simulation_time_s: float) -> tuple[EnvironmentState, float, float, bool]:
        for window in self.custom_windows:
            if window.start_s <= simulation_time_s < window.end_s:
                return self._state_tuple(window.state, simulation_time_s)

        phase_s = simulation_time_s % self.orbit_period_s
        if phase_s < self.sunlight_duration_s:
            state = EnvironmentState.SUNLIGHT
        elif phase_s < self.sunlight_duration_s + self.transition_duration_s:
            state = EnvironmentState.TRANSITION
        else:
            state = EnvironmentState.ECLIPSE

        return self._state_tuple(state, simulation_time_s)

    def _state_tuple(
        self,
        state: EnvironmentState,
        simulation_time_s: float,
    ) -> tuple[EnvironmentState, float, float, bool]:
        if state == EnvironmentState.SUNLIGHT:
            illumination = 1.0
            external_temp_c = const.EXTERNAL_TEMP_MAX_C
        elif state == EnvironmentState.TRANSITION:
            illumination = 0.5
            external_temp_c = (const.EXTERNAL_TEMP_MAX_C + const.EXTERNAL_TEMP_MIN_C) / 2.0
        else:
            illumination = 0.0
            external_temp_c = const.EXTERNAL_TEMP_MIN_C

        phase_s = simulation_time_s % self.orbit_period_s
        visible = any(
            window.start_s <= phase_s < window.end_s
            for window in (self.ground_station_windows or [])
        )
        return state, illumination, external_temp_c, visible

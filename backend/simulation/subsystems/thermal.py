"""Lumped thermal dynamics model."""

from dataclasses import dataclass

from backend.simulation.core import constants as const
from backend.simulation.core.types import ThermalState


@dataclass(frozen=True)
class ThermalStepResult:
    internal_temp_c: float
    thermal_state: ThermalState
    heat_generated_w: float
    heat_rejected_w: float
    heat_rejection_coeff: float


@dataclass
class ThermalModel:
    warning_temp_c: float = const.THERMAL_WARNING_C
    critical_temp_c: float = const.THERMAL_CRITICAL_C
    capacitance_j_per_k: float = const.THERMAL_CAPACITANCE_J_PER_K
    rejection_coeff_w_per_k: float = const.HEAT_REJECTION_COEFF_W_PER_K

    def evaluate_thermal_state(self, internal_temp_c: float) -> ThermalState:
        if internal_temp_c > self.critical_temp_c:
            return ThermalState.CRITICAL
        if internal_temp_c > self.warning_temp_c:
            return ThermalState.WARNING
        return ThermalState.NOMINAL

    def update_thermal_step(
        self,
        dt_s: float,
        current_internal_temp_c: float,
        external_temp_c: float,
        total_electrical_load_w: float,
        rejection_coeff_scale: float = 1.0,
    ) -> ThermalStepResult:
        heat_generated_w = total_electrical_load_w * const.HEAT_CONVERSION_FACTOR
        coeff = self.rejection_coeff_w_per_k * max(0.0, rejection_coeff_scale)
        heat_rejected_w = coeff * (current_internal_temp_c - external_temp_c)
        delta_temp_c = ((heat_generated_w - heat_rejected_w) * dt_s) / self.capacitance_j_per_k
        internal_temp_c = current_internal_temp_c + delta_temp_c
        return ThermalStepResult(
            internal_temp_c=internal_temp_c,
            thermal_state=self.evaluate_thermal_state(internal_temp_c),
            heat_generated_w=heat_generated_w,
            heat_rejected_w=heat_rejected_w,
            heat_rejection_coeff=coeff,
        )

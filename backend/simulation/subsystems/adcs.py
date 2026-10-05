"""Attitude determination and control quality model."""

from dataclasses import dataclass

from backend.simulation.core import constants as const
from backend.simulation.core.types import ADCSQuality


@dataclass(frozen=True)
class ADCSStepResult:
    attitude_error_deg: float
    adcs_quality: ADCSQuality
    adcs_power_load_w: float
    can_image: bool


@dataclass
class ADCSModel:
    max_imaging_pointing_error_deg: float = const.IMAGING_MAX_POINTING_ERROR_DEG

    def update_adcs_step(
        self,
        dt_s: float,
        current_pointing_error_deg: float,
        control_authority: float = 1.0,
        fault_bias_deg: float = 0.0,
    ) -> ADCSStepResult:
        authority = max(0.0, min(1.0, control_authority))
        corrected_error = current_pointing_error_deg * (1.0 - 0.20 * authority)
        attitude_error = max(const.NOMINAL_POINTING_ERROR_DEG, corrected_error + fault_bias_deg)

        if attitude_error > const.POINTING_CRITICAL_DEG:
            quality = ADCSQuality.CRITICAL
        elif attitude_error > self.max_imaging_pointing_error_deg:
            quality = ADCSQuality.DEGRADED
        else:
            quality = ADCSQuality.GOOD

        return ADCSStepResult(
            attitude_error_deg=attitude_error,
            adcs_quality=quality,
            adcs_power_load_w=1.5,
            can_image=attitude_error <= self.max_imaging_pointing_error_deg,
        )

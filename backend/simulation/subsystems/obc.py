"""Onboard computer load model."""

from dataclasses import dataclass

from backend.simulation.core import constants as const


@dataclass(frozen=True)
class OBCStepResult:
    cpu_utilization_pct: float
    memory_utilization_pct: float
    obc_power_load_w: float


@dataclass
class OBCModel:
    baseline_cpu_pct: float = const.CPU_BASELINE_PCT

    def update_obc_step(
        self,
        is_processing_image: bool,
        is_downlinking: bool,
        fault_cpu_load_pct: float = 0.0,
        thermal_throttle: bool = False,
    ) -> OBCStepResult:
        cpu = self.baseline_cpu_pct + fault_cpu_load_pct
        if is_processing_image:
            cpu += const.CPU_PROCESSING_INCREMENT_PCT
        if is_downlinking:
            cpu += 5.0
        if thermal_throttle:
            cpu *= 0.75
        cpu = min(100.0, max(0.0, cpu))
        memory = min(95.0, 30.0 + (15.0 if is_processing_image else 0.0))
        power = const.PROCESSING_LOAD_W if is_processing_image or cpu > self.baseline_cpu_pct else 0.5
        return OBCStepResult(cpu, memory, power)

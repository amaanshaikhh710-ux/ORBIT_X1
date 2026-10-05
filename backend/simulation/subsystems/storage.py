"""Flash storage capacity and utilization model."""

from dataclasses import dataclass

from backend.simulation.core import constants as const


@dataclass(frozen=True)
class StorageStepResult:
    storage_used_mb: float
    storage_used_gb: float
    storage_free_gb: float
    storage_utilization_pct: float
    is_full: bool
    is_critical: bool


@dataclass
class StorageModel:
    capacity_gb: float = const.STORAGE_CAPACITY_GB

    def update_storage_step(
        self,
        current_used_mb: float,
        generated_data_mb: float,
        downlinked_data_mb: float,
    ) -> StorageStepResult:
        capacity_mb = self.capacity_gb * 1000.0
        used_mb = min(capacity_mb, max(0.0, current_used_mb + generated_data_mb - downlinked_data_mb))
        used_gb = used_mb / 1000.0
        free_gb = max(0.0, self.capacity_gb - used_gb)
        utilization = (used_gb / self.capacity_gb) * 100.0
        return StorageStepResult(
            storage_used_mb=used_mb,
            storage_used_gb=used_gb,
            storage_free_gb=free_gb,
            storage_utilization_pct=utilization,
            is_full=used_mb >= capacity_mb,
            is_critical=utilization >= 95.0,
        )

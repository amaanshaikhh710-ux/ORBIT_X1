"""Optical payload task lifecycle and data generation model."""

from dataclasses import dataclass

from backend.simulation.core import constants as const
from backend.simulation.core.types import PayloadState, PowerState, ThermalState


@dataclass(frozen=True)
class PayloadStepResult:
    payload_state: PayloadState
    payload_power_w: float
    raw_buffer_mb: float
    data_generated_to_storage_mb: float
    images_completed: int
    images_deferred: int
    images_failed: int
    is_processing: bool
    transition_event: str | None = None


class PayloadModel:
    def __init__(self) -> None:
        self.state = PayloadState.IDLE
        self.active_task_id: str | None = None
        self.task_progress_s = 0.0
        self.raw_buffer_mb = 0.0
        self.images_completed = 0
        self.images_deferred = 0
        self.images_failed = 0

    def trigger_image_task(self, task_id: str) -> bool:
        if self.state != PayloadState.IDLE:
            return False
        self.active_task_id = task_id
        self.task_progress_s = 0.0
        self.state = PayloadState.IMAGING
        return True

    def update_payload_step(
        self,
        dt_s: float,
        pointing_can_image: bool,
        storage_is_full: bool,
        power_state: PowerState,
        thermal_state: ThermalState,
        payload_health: float,
    ) -> PayloadStepResult:
        transition_event: str | None = None
        data_generated_mb = 0.0
        payload_power_w = 0.0
        is_processing = False

        blocked = (
            not pointing_can_image
            or storage_is_full
            or power_state in (PowerState.LOW_POWER, PowerState.CRITICAL_POWER, PowerState.EMERGENCY_SHUTDOWN)
            or thermal_state == ThermalState.CRITICAL
            or payload_health <= 0.2
        )

        if self.state in (PayloadState.IMAGING, PayloadState.PROCESSING) and blocked:
            self.images_deferred += 1
            self.state = PayloadState.IDLE
            self.active_task_id = None
            self.task_progress_s = 0.0
            self.raw_buffer_mb = 0.0
            transition_event = "Imaging task deferred by spacecraft constraints"
        elif self.state == PayloadState.IMAGING:
            payload_power_w = const.PAYLOAD_IMAGING_LOAD_W
            self.task_progress_s += dt_s
            if self.task_progress_s >= const.IMAGING_DURATION_S:
                self.raw_buffer_mb += const.RAW_IMAGE_SIZE_MB
                self.task_progress_s = 0.0
                self.state = PayloadState.PROCESSING
                transition_event = "Image capture complete; processing started"
        elif self.state == PayloadState.PROCESSING:
            is_processing = True
            self.task_progress_s += dt_s
            if self.task_progress_s >= const.PROCESSING_DURATION_S:
                self.raw_buffer_mb = max(0.0, self.raw_buffer_mb - const.RAW_IMAGE_SIZE_MB)
                data_generated_mb = const.PROCESSED_IMAGE_SIZE_MB
                self.images_completed += 1
                self.state = PayloadState.IDLE
                self.active_task_id = None
                self.task_progress_s = 0.0
                transition_event = "Image processed and stored"

        return PayloadStepResult(
            payload_state=self.state,
            payload_power_w=payload_power_w,
            raw_buffer_mb=self.raw_buffer_mb,
            data_generated_to_storage_mb=data_generated_mb,
            images_completed=self.images_completed,
            images_deferred=self.images_deferred,
            images_failed=self.images_failed,
            is_processing=is_processing,
            transition_event=transition_event,
        )

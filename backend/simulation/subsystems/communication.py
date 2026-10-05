"""Ground-link communication and downlink throughput model."""

from dataclasses import dataclass

from backend.simulation.core import constants as const
from backend.simulation.core.types import CommLinkState, PowerState


@dataclass(frozen=True)
class CommunicationStepResult:
    comm_link_state: CommLinkState
    effective_rate_mbps: float
    downlinked_mb_step: float
    packet_loss_fraction: float
    signal_strength_dbm: float
    comm_electrical_load_w: float


@dataclass
class CommunicationModel:
    nominal_downlink_rate_mbps: float = const.DOWNLINK_RATE_MBPS
    nominal_packet_loss: float = const.NOMINAL_PACKET_LOSS
    high_rate_load_w: float = const.COMM_HIGH_RATE_LOAD_W

    def update_comm_step(
        self,
        dt_s: float,
        ground_station_visible: bool,
        available_data_mb: float,
        comm_health: float,
        packet_loss_modifier: float = 0.0,
        power_state: PowerState = PowerState.NORMAL,
        downlink_enabled: bool = True,
        prioritize_downlink: bool = False,
    ) -> CommunicationStepResult:
        packet_loss = max(0.0, min(const.DEGRADED_PACKET_LOSS_MAX, self.nominal_packet_loss + packet_loss_modifier))
        if not ground_station_visible or available_data_mb <= 0.0 or not downlink_enabled:
            return CommunicationStepResult(
                CommLinkState.NO_LINK, 0.0, 0.0, packet_loss, const.NOMINAL_SIGNAL_STRENGTH_DBM, 0.0
            )

        health = max(0.0, min(1.0, comm_health))
        rate = self.nominal_downlink_rate_mbps * health
        if prioritize_downlink:
            rate *= 1.1
        if power_state in (PowerState.CRITICAL_POWER, PowerState.EMERGENCY_SHUTDOWN):
            rate *= 0.5

        downlinked_mb = (rate * 1e6 * dt_s * (1.0 - packet_loss)) / (8.0 * 1e6)
        downlinked_mb = min(available_data_mb, downlinked_mb)
        link_state = CommLinkState.NOMINAL if health >= 0.8 and packet_loss <= 0.05 else CommLinkState.DEGRADED
        signal_strength = const.NOMINAL_SIGNAL_STRENGTH_DBM - ((1.0 - health) * 20.0)

        return CommunicationStepResult(
            comm_link_state=link_state,
            effective_rate_mbps=rate,
            downlinked_mb_step=downlinked_mb,
            packet_loss_fraction=packet_loss,
            signal_strength_dbm=signal_strength,
            comm_electrical_load_w=self.high_rate_load_w,
        )

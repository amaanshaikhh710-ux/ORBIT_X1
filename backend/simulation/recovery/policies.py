"""
Orbital Twin — Recovery Policy Library
Defines standard operational recovery policies from 22_RECOVERY_POLICY_LIBRARY.csv.
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class RecoveryPolicy:
    policy_id: str
    name: str
    description: str
    actions: str
    expected_effects: str
    # Policy controls
    disable_non_critical_payload: bool = False
    force_low_power_mode: bool = False
    prioritize_downlink: bool = False
    throttle_comm: bool = False
    sunlight_only_imaging: bool = False
    thermal_throttle: bool = False
    imaging_interval_multiplier: float = 1.0


class RecoveryPolicyRegistry:
    """Provides standard recovery policies defined in the engineering baseline."""

    @classmethod
    def get_all_policies(cls) -> list[RecoveryPolicy]:
        return [
            RecoveryPolicy(
                policy_id="R-NONE",
                name="No Recovery",
                description="Continue default operation without automated or operator intervention.",
                actions="none",
                expected_effects="unmitigated fault progression",
            ),
            RecoveryPolicy(
                policy_id="R-001",
                name="Reduce Imaging",
                description="Halve imaging frequency to conserve power and reduce storage fill rate.",
                actions="reduce imaging frequency by 50%",
                expected_effects="decrease payload power and data generation",
                imaging_interval_multiplier=2.0,
            ),
            RecoveryPolicy(
                policy_id="R-002",
                name="Payload Safe Mode",
                description="Disable non-critical payload sensors to prevent battery depletion.",
                actions="disable non-critical payload",
                expected_effects="decrease payload power and processing load",
                disable_non_critical_payload=True,
            ),
            RecoveryPolicy(
                policy_id="R-003",
                name="Low Power Mode",
                description="Enter controlled low-power state, deferring all optional activities.",
                actions="enter low-power mode, defer optional tasks",
                expected_effects="decrease non-critical loads and defer optional tasks",
                force_low_power_mode=True,
                disable_non_critical_payload=True,
            ),
            RecoveryPolicy(
                policy_id="R-004",
                name="Downlink Priority",
                description="Maximize ground station passes and downlink bandwidth to flush storage.",
                actions="prioritize downlink when visible",
                expected_effects="reduce stored data sooner",
                prioritize_downlink=True,
            ),
            RecoveryPolicy(
                policy_id="R-005",
                name="Communication Throttle",
                description="Reduce non-essential transmitter activity during low power.",
                actions="reduce communication activity when not urgent",
                expected_effects="decrease comm power consumption",
                throttle_comm=True,
            ),
            RecoveryPolicy(
                policy_id="R-006",
                name="Sunlight Reschedule",
                description="Constrain imaging exclusively to full sunlight illumination windows.",
                actions="reschedule imaging to high-illumination windows",
                expected_effects="improve energy availability, eliminate eclipse battery drain during tasks",
                sunlight_only_imaging=True,
            ),
            RecoveryPolicy(
                policy_id="R-007",
                name="Thermal Throttle",
                description="Throttle computing and disable payload heating to prevent thermal damage.",
                actions="reduce high-load activities",
                expected_effects="decrease heat generation, stabilize internal temperature",
                thermal_throttle=True,
                imaging_interval_multiplier=2.0,
            ),
        ]

    @classmethod
    def get_by_id(cls, policy_id: str) -> RecoveryPolicy:
        for pol in cls.get_all_policies():
            if pol.policy_id == policy_id:
                return pol
        raise ValueError(f"Unknown recovery policy ID: {policy_id}")

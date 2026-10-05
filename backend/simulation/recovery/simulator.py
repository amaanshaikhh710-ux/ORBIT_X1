"""
Orbital Twin — Multi-Scenario Recovery Re-Simulator
Implements strict scenario branching from an immutable baseline snapshot.
Evaluates and compares actual physical consequences across candidate recovery policies.
Governed by 18_ENGINEERING_BASELINE.md Section 16 & 17 and 24_ANTIGRAVITY_IMPLEMENTATION_CONTRACT.md.
"""

from dataclasses import dataclass, asdict
from typing import Any, TYPE_CHECKING
import copy

from backend.simulation.core.state import CanonicalSpacecraftState
from backend.simulation.core.types import PowerState
from backend.simulation.subsystems.environment import EnvironmentModel
from backend.simulation.recovery.policies import RecoveryPolicy, RecoveryPolicyRegistry

if TYPE_CHECKING:
    from backend.simulation.engine import SimulationEngine


@dataclass
class ScenarioMetrics:
    policy_id: str
    policy_name: str
    min_battery_soc_pct: float
    final_battery_soc_pct: float
    max_temperature_c: float
    final_temperature_c: float
    images_completed: int
    images_deferred: int
    images_failed: int
    total_data_downlinked_mb: float
    peak_storage_utilization_pct: float
    communication_availability_pct: float
    critical_events_count: int
    recovery_time_s: float | None
    mission_objective_completion_pct: float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ScenarioComparisonReport:
    scenario_id: str
    duration_s: float
    unmitigated_baseline: ScenarioMetrics
    recovery_scenarios: list[ScenarioMetrics]

    def to_dict(self) -> dict[str, Any]:
        return {
            "scenario_id": self.scenario_id,
            "duration_s": self.duration_s,
            "unmitigated_baseline": self.unmitigated_baseline.to_dict(),
            "recovery_scenarios": [s.to_dict() for s in self.recovery_scenarios],
        }


class RecoverySimulator:
    """
    Executes multi-scenario recovery re-simulations.
    Preserves exact baseline inputs and executes identical fault runs with varied recovery policies.
    """

    @classmethod
    def run_comparison(
        cls,
        initial_state: CanonicalSpacecraftState,
        faults: list[dict[str, Any]],
        duration_s: float = 1800.0,  # 30 minutes nominal
        policies: list[RecoveryPolicy] | None = None,
        environment_model: EnvironmentModel | None = None,
        random_seed: int = 42,
    ) -> ScenarioComparisonReport:
        """
        Executes an unmitigated run (R-NONE) and compares it with all provided recovery policies.
        """
        candidate_policies = policies or [
            RecoveryPolicyRegistry.get_by_id("R-001"),  # Reduce Imaging
            RecoveryPolicyRegistry.get_by_id("R-002"),  # Payload Safe Mode
            RecoveryPolicyRegistry.get_by_id("R-003"),  # Low Power Mode
            RecoveryPolicyRegistry.get_by_id("R-004"),  # Downlink Priority
            RecoveryPolicyRegistry.get_by_id("R-006"),  # Sunlight Reschedule
        ]

        # 1. Immutable baseline snapshot
        baseline_snapshot = initial_state.clone()

        # 2. Run unmitigated baseline (R-NONE)
        none_policy = RecoveryPolicyRegistry.get_by_id("R-NONE")
        unmitigated_metrics = cls._simulate_single_policy(
            baseline_state=baseline_snapshot,
            faults=faults,
            policy=none_policy,
            duration_s=duration_s,
            env_model=environment_model,
            seed=random_seed,
        )

        # 3. Resimulate for each candidate recovery policy from the exact baseline
        recovery_results = []
        for policy in candidate_policies:
            metrics = cls._simulate_single_policy(
                baseline_state=baseline_snapshot,
                faults=faults,
                policy=policy,
                duration_s=duration_s,
                env_model=environment_model,
                seed=random_seed,
            )
            recovery_results.append(metrics)

        return ScenarioComparisonReport(
            scenario_id=f"rec-comp-{random_seed}",
            duration_s=duration_s,
            unmitigated_baseline=unmitigated_metrics,
            recovery_scenarios=recovery_results,
        )

    @classmethod
    def _simulate_single_policy(
        cls,
        baseline_state: CanonicalSpacecraftState,
        faults: list[dict[str, Any]],
        policy: RecoveryPolicy,
        duration_s: float,
        env_model: EnvironmentModel | None,
        seed: int,
    ) -> ScenarioMetrics:
        """
        Runs a single deterministic simulation scenario from a cloned baseline state.
        """
        from backend.simulation.engine import SimulationEngine

        state_copy = baseline_state.clone()
        engine = SimulationEngine(
            initial_state=state_copy,
            environment_model=env_model or EnvironmentModel(),
            recovery_policy=policy,
            run_id=f"run-{policy.policy_id}",
            random_seed=seed,
        )

        # Inject identical faults
        for f in faults:
            engine.inject_fault(
                fault_id=f["fault_id"],
                subsystem=f["subsystem"],
                parameter=f["parameter"],
                severity=f["severity"],
                start_time_s=f["start_time_s"],
                duration_s=f["duration_s"],
            )

        # Metrics trackers
        min_soc = state_copy.battery_soc_pct
        max_temp = state_copy.internal_temp_c
        visible_steps = 0
        total_steps = 0
        critical_events = 0
        entered_low_power_time = None
        recovery_time = None

        num_steps = int(duration_s / engine.timestep_s)
        for _ in range(num_steps):
            st = engine.step()
            total_steps += 1
            min_soc = min(min_soc, st.battery_soc_pct)
            max_temp = max(max_temp, st.internal_temp_c)
            if st.ground_station_visible:
                visible_steps += 1

            if st.power_state in (PowerState.LOW_POWER, PowerState.CRITICAL_POWER, PowerState.EMERGENCY_SHUTDOWN):
                if entered_low_power_time is None:
                    entered_low_power_time = st.simulation_time_s
            else:
                if entered_low_power_time is not None and recovery_time is None:
                    recovery_time = st.simulation_time_s - entered_low_power_time

        # Count critical events
        for e in engine.event_log:
            if e["severity"] == "CRITICAL":
                critical_events += 1

        comm_avail_pct = (visible_steps / max(1, total_steps)) * 100.0

        # Objective: completed images vs nominal expected tasks
        # In a 30m (1800s) test with 180s cycle, ~8 tasks expected
        target_tasks = max(1, int(duration_s / 180.0))
        objective_completion_pct = min(100.0, (st.images_completed / target_tasks) * 100.0)

        return ScenarioMetrics(
            policy_id=policy.policy_id,
            policy_name=policy.name,
            min_battery_soc_pct=round(min_soc, 2),
            final_battery_soc_pct=round(st.battery_soc_pct, 2),
            max_temperature_c=round(max_temp, 2),
            final_temperature_c=round(st.internal_temp_c, 2),
            images_completed=st.images_completed,
            images_deferred=st.images_deferred,
            images_failed=st.images_failed,
            total_data_downlinked_mb=round(st.total_downlinked_data_mb, 2),
            peak_storage_utilization_pct=round(st.storage_utilization_pct, 2),
            communication_availability_pct=round(comm_avail_pct, 2),
            critical_events_count=critical_events,
            recovery_time_s=recovery_time,
            mission_objective_completion_pct=round(objective_completion_pct, 2),
        )

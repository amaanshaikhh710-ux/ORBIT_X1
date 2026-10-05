"""
Orbital Twin — Causal Fault Propagation Engine
Captures cause-and-effect transitions across subsystem boundaries based on 20_SUBSYSTEM_DEPENDENCY_MATRIX.csv.
Provides structured causal chains explaining WHAT happened, WHY it happened, and WHAT it affected.
"""

from dataclasses import dataclass, field, asdict
from typing import Any
import uuid


@dataclass
class CausalEvent:
    id: str
    timestamp_s: float
    source_subsystem: str
    source_parameter: str
    previous_value: Any
    new_value: Any
    cause: str
    target_subsystem: str
    effect: str
    severity: str  # INFO, WARNING, CRITICAL
    causal_parent_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class CausalPropagationEngine:
    """
    Maintains active causal events, logs cross-subsystem transitions,
    and constructs causal graph trees for downstream fault analysis and explanation.
    """

    def __init__(self):
        self.events: list[CausalEvent] = []

    def record_transition(
        self,
        timestamp_s: float,
        source_subsystem: str,
        source_parameter: str,
        previous_value: Any,
        new_value: Any,
        cause: str,
        target_subsystem: str,
        effect: str,
        severity: str = "INFO",
        causal_parent_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> CausalEvent:
        """
        Records a discrete causal state transition.
        """
        event = CausalEvent(
            id=f"cevent-{len(self.events) + 1:04d}-{uuid.uuid4().hex[:6]}",
            timestamp_s=timestamp_s,
            source_subsystem=source_subsystem,
            source_parameter=source_parameter,
            previous_value=previous_value,
            new_value=new_value,
            cause=cause,
            target_subsystem=target_subsystem,
            effect=effect,
            severity=severity,
            causal_parent_id=causal_parent_id,
            metadata=metadata or {},
        )
        self.events.append(event)
        return event

    def get_events_for_timeline(self) -> list[dict[str, Any]]:
        """Returns all recorded causal events in chronological order."""
        return [e.to_dict() for e in self.events]

    def get_causal_chains(self) -> list[list[dict[str, Any]]]:
        """
        Reconstructs directed causal chains (root fault -> intermediate transitions -> mission impact).
        """
        # Index events by id and by parent_id
        events_by_id = {e.id: e for e in self.events}
        roots = [e for e in self.events if e.causal_parent_id is None]

        chains = []
        for root in roots:
            chain = [root.to_dict()]
            current = root
            while True:
                children = [e for e in self.events if e.causal_parent_id == current.id]
                if not children:
                    break
                # Follow dominant branch
                current = children[0]
                chain.append(current.to_dict())
            chains.append(chain)
        return chains

    def export_graph(self) -> dict[str, Any]:
        """
        Exports nodes and directed edges for UI visualization in Fault Analysis.
        Maintains parent-to-child continuity for causal chains.
        """
        nodes = []
        node_ids = set()
        edges = []
        events_by_id = {e.id: e for e in self.events}

        for e in self.events:
            # Source node for roots
            src_node_id = f"{e.source_subsystem}:{e.source_parameter}"
            if not e.causal_parent_id and src_node_id not in node_ids:
                nodes.append({
                    "id": src_node_id,
                    "label": f"{e.source_subsystem}\n({e.source_parameter})",
                    "subsystem": e.source_subsystem,
                    "status": "ROOT",
                })
                node_ids.add(src_node_id)

            # Target node for the transition effect
            tgt_node_id = f"{e.target_subsystem}:{e.effect}"
            if tgt_node_id not in node_ids:
                nodes.append({
                    "id": tgt_node_id,
                    "label": f"{e.target_subsystem}\n({e.effect})",
                    "subsystem": e.target_subsystem,
                    "status": e.severity,
                })
                node_ids.add(tgt_node_id)

            # Determine edge source: link from parent target if child, else from source node
            from_node_id = src_node_id
            if e.causal_parent_id and e.causal_parent_id in events_by_id:
                p = events_by_id[e.causal_parent_id]
                from_node_id = f"{p.target_subsystem}:{p.effect}"

            edges.append({
                "from": from_node_id,
                "to": tgt_node_id,
                "cause": e.cause,
                "description": e.cause,
                "severity": e.severity,
                "timestamp_s": e.timestamp_s,
            })

        return {"nodes": nodes, "edges": edges}

    def clear(self) -> None:
        self.events.clear()

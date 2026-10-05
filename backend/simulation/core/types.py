"""
Orbital Twin — Simulation Types & Enumerations
Enumerations and type definitions strictly adhering to the Engineering Baseline.
"""

from enum import Enum
from typing import TypedDict, Any


class EnvironmentState(str, Enum):
    SUNLIGHT = "SUNLIGHT"
    TRANSITION = "TRANSITION"
    ECLIPSE = "ECLIPSE"


class GroundStationVisibility(str, Enum):
    VISIBLE = "VISIBLE"
    NOT_VISIBLE = "NOT_VISIBLE"


class PowerState(str, Enum):
    NORMAL = "NORMAL"
    LOW_POWER = "LOW_POWER"
    CRITICAL_POWER = "CRITICAL_POWER"
    EMERGENCY_SHUTDOWN = "EMERGENCY_SHUTDOWN"


class PayloadState(str, Enum):
    IDLE = "IDLE"
    IMAGING = "IMAGING"
    PROCESSING = "PROCESSING"
    STORED = "STORED"
    DOWNLINKED = "DOWNLINKED"
    FAILED = "FAILED"
    DEFERRED = "DEFERRED"


class CommLinkState(str, Enum):
    NOMINAL = "NOMINAL"
    DEGRADED = "DEGRADED"
    NO_LINK = "NO_LINK"


class ThermalState(str, Enum):
    NOMINAL = "NOMINAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class ADCSQuality(str, Enum):
    GOOD = "GOOD"
    DEGRADED = "DEGRADED"
    CRITICAL = "CRITICAL"


class SubsystemStatus(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    CRITICAL = "CRITICAL"
    OFFLINE = "OFFLINE"


class SubsystemType(str, Enum):
    POWER = "POWER"
    SOLAR = "SOLAR"
    BATTERY = "BATTERY"
    THERMAL = "THERMAL"
    COMMUNICATION = "COMMUNICATION"
    PAYLOAD = "PAYLOAD"
    OBC = "OBC"
    STORAGE = "STORAGE"
    SENSORS = "SENSORS"
    ADCS = "ADCS"
    ENVIRONMENT = "ENVIRONMENT"
    SCHEDULER = "SCHEDULER"


class DataQuality(str, Enum):
    VALID = "VALID"
    DEGRADED = "DEGRADED"
    INVALID = "INVALID"
    MISSING = "MISSING"
    ESTIMATED = "ESTIMATED"


class SourceType(str, Enum):
    SIMULATED = "SIMULATED"
    PUBLIC_REFERENCE = "PUBLIC_REFERENCE"
    REFERENCE_RANGE = "REFERENCE-RANGE"
    SOURCE_BACKED = "SOURCE-BACKED"
    ESTIMATED = "ESTIMATED"
    MODEL_ASSUMPTION = "MODEL_ASSUMPTION"


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class TelemetryPoint(TypedDict):
    id: str
    timestamp: str
    simulation_time_s: float
    subsystem: str
    parameter: str
    value: float | str | bool
    unit: str
    quality: str
    status: str
    source_type: str
    simulation_run_id: str

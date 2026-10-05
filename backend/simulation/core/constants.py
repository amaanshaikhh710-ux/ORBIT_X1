"""
Orbital Twin — Engineering Constants & Locked Parameters
Authoritative values locked from 18_ENGINEERING_BASELINE.md and 19_ENGINEERING_PARAMETER_REGISTER.csv.
"""

from typing import Final, Literal

# Evidence Classification
Classification = Literal["SOURCE-BACKED", "REFERENCE-RANGE", "MODEL ASSUMPTION"]

# Simulation Time & Clock
SIMULATION_TIMESTEP_S: Final[float] = 10.0
SIMULATION_SPEEDS: Final[tuple[int, ...]] = (1, 5, 10, 25)

# Spacecraft Properties
MISSION_TYPE: Final[str] = "Earth observation"
BUS_CLASS: Final[str] = "3U"
SPACECRAFT_MASS_KG: Final[float] = 4.0

# Power Subsystem (W, Wh, %)
NOMINAL_SOLAR_PEAK_W: Final[float] = 24.0
BATTERY_USABLE_CAPACITY_WH: Final[float] = 72.0
INITIAL_SOC_PCT: Final[float] = 85.0
LOW_POWER_SOC_PCT: Final[float] = 25.0
CRITICAL_SOC_PCT: Final[float] = 15.0
EMERGENCY_SOC_PCT: Final[float] = 10.0
CHARGE_EFFICIENCY: Final[float] = 0.90
DISCHARGE_EFFICIENCY: Final[float] = 0.90

# Subsystem Electrical Loads (W)
HOUSEKEEPING_LOAD_W: Final[float] = 5.0
PAYLOAD_IMAGING_LOAD_W: Final[float] = 8.0
PROCESSING_LOAD_W: Final[float] = 3.0
COMM_HIGH_RATE_LOAD_W: Final[float] = 7.0

# Thermal Subsystem (°C, J/K, W/K)
NOMINAL_TEMPERATURE_C: Final[float] = 20.0
EXTERNAL_TEMP_MIN_C: Final[float] = -20.0
EXTERNAL_TEMP_MAX_C: Final[float] = 25.0
THERMAL_WARNING_C: Final[float] = 40.0
THERMAL_CRITICAL_C: Final[float] = 50.0
THERMAL_CAPACITANCE_J_PER_K: Final[float] = 1500.0
HEAT_REJECTION_COEFF_W_PER_K: Final[float] = 0.8
HEAT_CONVERSION_FACTOR: Final[float] = 0.90

# Storage Subsystem (GB, MB)
STORAGE_CAPACITY_GB: Final[float] = 8.0
INITIAL_STORAGE_USED_GB: Final[float] = 1.0
RAW_IMAGE_SIZE_MB: Final[float] = 120.0
PROCESSED_IMAGE_SIZE_MB: Final[float] = 35.0

# Payload Task Timing (s)
IMAGING_DURATION_S: Final[float] = 30.0
PROCESSING_DURATION_S: Final[float] = 60.0

# Communication Subsystem (Mbps, dBm, fraction)
DOWNLINK_RATE_MBPS: Final[float] = 2.0
NOMINAL_PACKET_LOSS: Final[float] = 0.01
DEGRADED_PACKET_LOSS_MAX: Final[float] = 0.20
NOMINAL_SIGNAL_STRENGTH_DBM: Final[float] = -70.0

# Onboard Computer (OBC) (%)
CPU_BASELINE_PCT: Final[float] = 35.0
CPU_PROCESSING_INCREMENT_PCT: Final[float] = 25.0
CPU_WARNING_PCT: Final[float] = 80.0
CPU_CRITICAL_PCT: Final[float] = 95.0

# Attitude Determination and Control System (ADCS) (deg)
NOMINAL_POINTING_ERROR_DEG: Final[float] = 0.5
POINTING_WARNING_DEG: Final[float] = 2.0
POINTING_CRITICAL_DEG: Final[float] = 5.0
IMAGING_MAX_POINTING_ERROR_DEG: Final[float] = 2.0

# Demo Fault Parameters
SOLAR_DEGRADATION_DEMO_SEVERITY: Final[float] = 0.70

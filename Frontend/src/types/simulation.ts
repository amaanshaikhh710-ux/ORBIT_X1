/**
 * Orbital Twin — Simulation & Telemetry Types
 * Directly mirrors CanonicalSpacecraftState and 07_API_CONTRACT.md
 */

export type PowerState = 'NORMAL' | 'LOW_POWER' | 'CRITICAL' | 'SAFE_HOLD';
export type EnvironmentState = 'SUNLIGHT' | 'ECLIPSE';
export type PayloadState = 'IDLE' | 'IMAGING' | 'PROCESSING' | 'STORED';
export type CommLinkState = 'ACQUIRING' | 'LOCKED' | 'DOWNLINKING' | 'CARRIER_ONLY' | 'SEARCHING';
export type ThermalState = 'NOMINAL' | 'WARNING' | 'CRITICAL';
export type ADCSQuality = 'NOMINAL' | 'DEGRADED' | 'FAILED';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type TelemetrySource = 'SIMULATED' | 'REFERENCE-RANGE' | 'MODEL_ASSUMPTION';

export interface CanonicalSpacecraftState {
  simulation_time_s: number;
  mission_time_s?: number;
  step_count: number;
  time_step_s?: number;
  orbit_period_s?: number;
  true_anomaly_deg?: number;
  environment_state: EnvironmentState;
  illumination_factor?: number;
  in_sunlight: boolean;
  ground_station_visible: boolean;

  // Power
  solar_generation_w: number;
  total_power_generation_w?: number;
  total_power_consumption_w?: number;
  power_margin_w?: number;
  battery_charge_w?: number;
  battery_discharge_w?: number;
  battery_power_w?: number;
  battery_soc_pct: number;
  battery_energy_wh?: number;
  battery_stored_wh: number;
  battery_capacity_wh?: number;
  usable_capacity_wh?: number;
  bus_voltage_v?: number;
  power_state: PowerState;
  solar_health: number;

  // Thermal
  internal_temp_c: number;
  thermal_state: ThermalState;
  heat_generated_w?: number;
  total_heat_dissipation_w: number;

  // Comm
  comm_link_state: CommLinkState;
  effective_downlink_rate_mbps?: number;
  downlink_data_rate_mbps: number;
  packet_loss_fraction?: number;
  packet_loss_pct: number;
  comm_health: number;

  // Storage
  storage_capacity_gb?: number;
  storage_used_gb?: number;
  storage_free_gb?: number;
  storage_used_mb: number;
  storage_capacity_mb?: number;
  storage_utilization_pct?: number;
  storage_fill_pct?: number;

  // Payload
  payload_state: PayloadState;
  payload_health?: number;
  payload_timer_s?: number;
  images_completed: number;
  images_deferred: number;
  images_failed: number;

  // OBC
  cpu_utilization_pct?: number;
  obc_cpu_utilization_pct?: number;
  memory_utilization_pct?: number;
  obc_memory_utilization_pct?: number;

  // ADCS
  attitude_error_deg?: number;
  adcs_pointing_error_deg: number;
  adcs_quality: ADCSQuality;

  // Cumulative
  total_energy_generated_wh?: number;
  total_energy_consumed_wh?: number;
  total_downlinked_data_mb: number;

  // Active faults and flags
  active_faults?: any[];
  active_faults_count: number;
  alerts?: any[];
  safe_mode_triggered?: boolean;
  imaging_enabled?: boolean;
  comms_enabled?: boolean;
  high_power_processing_enabled?: boolean;
  recovery_mode?: string;
  demo_mode?: string | null;
}

export interface TelemetryPoint {
  parameter_id: string;
  subsystem: string;
  name: string;
  value: number | string | boolean;
  unit: string;
  timestamp_s: number;
  source: TelemetrySource;
  quality: string;
  range_min?: number;
  range_max?: number;
}

export interface AlertItem {
  timestamp_s?: number;
  simulation_time_s?: number;
  severity: AlertSeverity;
  subsystem: string;
  message: string;
}

export interface CausalNode {
  id: string;
  label: string;
  subsystem: string;
  status: string;
}

export interface CausalEdge {
  from: string;
  to: string;
  description: string;
  timestamp_s: number;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export interface FaultCatalogItem {
  fault_id: string;
  subsystem: string;
  parameter: string;
  name: string;
  description: string;
  severity_range: string;
}

export interface ActiveFault {
  fault_id: string;
  subsystem: string;
  parameter: string;
  severity: number;
  start_time_s: number;
  duration_s: number;
}

export interface RecoveryScenarioResult {
  policy_id: string;
  policy_name: string;
  actions_taken: string[];
  end_simulation_time_s: number;
  min_battery_soc_pct: number;
  final_battery_soc_pct: number;
  max_internal_temp_c: number;
  final_internal_temp_c: number;
  images_completed: number;
  images_deferred: number;
  total_downlinked_mb: number;
  final_power_state: string;
  safe_mode_triggered: boolean;
  delta_vs_baseline: {
    delta_min_soc_pct: number;
    delta_final_soc_pct: number;
    delta_images_completed: number;
    delta_downlink_mb: number;
    delta_max_temp_c: number;
  };
}

export interface RecoveryComparisonReport {
  timestamp: string;
  unmitigated_baseline: RecoveryScenarioResult;
  recovery_scenarios: RecoveryScenarioResult[];
}

export interface SimulationMessage {
  type: 'INITIAL_STATE' | 'SIMULATION_UPDATE';
  run_id: string;
  simulation_time_s: number;
  speed: number;
  is_running: boolean;
  state: CanonicalSpacecraftState;
  telemetry: TelemetryPoint[];
  events?: AlertItem[];
  causal_graph?: CausalGraph;
}

export interface OperatorUser {
  id?: number;
  username: string;
  role: string;
  authenticated?: boolean;
}

export interface HistoricalSimulationRun {
  id: string;
  scenario_id: string;
  spacecraft_id: string;
  mission_id: string;
  engine_version: string;
  status: string;
  duration_s: number;
  initial_battery_soc: number;
  final_battery_soc: number;
  min_battery_soc: number;
  power_state: string;
  images_completed: number;
  images_deferred: number;
  total_downlinked_mb: number;
  active_faults_count: number;
  recovery_action_taken: string;
  fault_summary: string;
  started_at: string;
  completed_at?: string | null;
}

export interface HistoricalFaultEvent {
  id: number;
  run_id: string;
  fault_id: string;
  subsystem: string;
  parameter: string;
  severity: number;
  start_time_s: number;
  duration_s: number;
  cleared_at_s?: number | null;
  created_at?: string;
}

export interface HistoricalRecoveryAction {
  id: number;
  run_id: string;
  policy_id: string;
  policy_name: string;
  applied_at_sim_time_s: number;
  actions_json?: string;
  expected_effects_json?: string;
  created_at?: string;
}

export interface HistoricalRunDetails extends HistoricalSimulationRun {
  fault_events: HistoricalFaultEvent[];
  recovery_actions: HistoricalRecoveryAction[];
  reports: any[];
  snapshots_count?: number;
  final_state?: any;
}

export interface AdminUser {
  id: number;
  username: string;
  role: string;
  created_at?: string | null;
}

export type ActiveModule =
  | 'landing'
  | 'login'
  | 'mission-admin'
  | 'flight-director'
  | 'simulation-dashboard'
  | 'mission-control'
  | 'digital-twin'
  | 'telemetry'
  | 'simulation-lab'
  | 'fault-analysis'
  | 'recovery-planner'
  | 'timeline'
  | 'reports'
  | 'history'
  | 'docs';


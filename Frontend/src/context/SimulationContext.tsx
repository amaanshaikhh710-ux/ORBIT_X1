/**
 * Orbital Twin — Global Simulation Context
 * Canonical single-source-of-truth feeding all modules and the 3D Digital Twin
 */

import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import type {
  CanonicalSpacecraftState,
  TelemetryPoint,
  AlertItem,
  CausalGraph,
  RecoveryComparisonReport,
  FaultCatalogItem,
  ActiveFault,
  SimulationMessage,
  OperatorUser,
} from '../types/simulation';
import { api, SimulationWebSocket } from '../services/api';

export type WorkflowStep =
  | 'OBSERVE'
  | 'INVESTIGATE'
  | 'SIMULATE'
  | 'DETECT_PROPAGATION'
  | 'ANALYZE_IMPACT'
  | 'SELECT_RECOVERY'
  | 'RE_SIMULATE'
  | 'COMPARE';

export type ActiveModule =
  | 'landing'
  | 'login'
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

export function getRoleDefaultModule(role?: string): ActiveModule {
  if (role === 'Flight Director') return 'flight-director';
  if (role === 'Simulation Engineer') return 'simulation-dashboard';
  return 'mission-control';
}

export const DEFAULT_BASELINE_STATE: CanonicalSpacecraftState = {
  simulation_time_s: 0.0,
  step_count: 0,
  environment_state: 'SUNLIGHT',
  in_sunlight: true,
  ground_station_visible: false,
  solar_generation_w: 24.5,
  total_power_generation_w: 24.5,
  total_power_consumption_w: 14.2,
  power_margin_w: 10.3,
  battery_charge_w: 10.3,
  battery_discharge_w: 0.0,
  battery_power_w: 10.3,
  battery_soc_pct: 85.0,
  battery_energy_wh: 61.2,
  battery_stored_wh: 61.2,
  battery_capacity_wh: 72.0,
  usable_capacity_wh: 72.0,
  bus_voltage_v: 8.2,
  power_state: 'NORMAL',
  solar_health: 1.0,
  internal_temp_c: 21.0,
  thermal_state: 'NOMINAL',
  heat_generated_w: 12.0,
  total_heat_dissipation_w: 12.0,
  comm_link_state: 'LOCKED',
  effective_downlink_rate_mbps: 2.0,
  downlink_data_rate_mbps: 2.0,
  packet_loss_fraction: 0.0,
  packet_loss_pct: 0.0,
  comm_health: 1.0,
  storage_capacity_gb: 16.0,
  storage_used_gb: 0.24,
  storage_used_mb: 240.0,
  total_downlinked_data_mb: 0.0,
  adcs_pointing_error_deg: 0.12,
  attitude_error_deg: 0.12,
  adcs_quality: 'NOMINAL',
  payload_state: 'IDLE',
  images_completed: 0,
  images_deferred: 0,
  images_failed: 0,
  active_faults_count: 0,
  obc_cpu_utilization_pct: 35.0,
  true_anomaly_deg: 0.0,
};

interface TelemetryTimeSeriesPoint {
  time_s: number;
  battery_soc_pct: number;
  solar_generation_w: number;
  total_power_consumption_w: number;
  power_margin_w: number;
  internal_temp_c: number;
  storage_used_mb: number;
  downlink_mbps: number;
  adcs_error_deg: number;
  power_state: string;
}

interface SimulationContextValue {
  state: CanonicalSpacecraftState | null;
  telemetry: TelemetryPoint[];
  history: TelemetryTimeSeriesPoint[];
  alerts: AlertItem[];
  causalGraph: CausalGraph | null;
  recoveryReport: RecoveryComparisonReport | null;
  faultCatalog: FaultCatalogItem[];
  activeFaults: ActiveFault[];
  isRunning: boolean;
  speed: number;
  timestep: number;
  connected: boolean;
  workflowStep: WorkflowStep;
  activeModule: ActiveModule;
  selectedComponent: string | null;
  user: OperatorUser | null;
  isAuthenticated: boolean;
  activeRunId: string;
  missionStatus: string;
  realStartedAt: string | null;
  realCompletedAt: string | null;

  // Actions
  setWorkflowStep: (step: WorkflowStep) => void;
  setActiveModule: (mod: ActiveModule) => void;
  setSelectedComponent: (comp: string | null) => void;
  login: (username: string, password: string, role?: string) => Promise<void>;
  register: (username: string, password: string, role?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadHistoricalRun: (runId: string) => Promise<void>;
  start: () => void;
  pause: () => void;
  end: (status?: string) => Promise<void>;
  advanceTime: (amount: number, unit?: string) => Promise<void>;
  step: () => void;
  reset: () => Promise<void>;
  resetV003Demo: () => Promise<void>;
  setSpeed: (speed: number) => void;
  setTimestep: (timestepS: number) => Promise<void>;
  injectFault: (fault: ActiveFault) => Promise<void>;
  clearFault: (faultId: string) => Promise<void>;
  activateV003Demo: () => Promise<any>;
  runRecoverySim: (policies: string[], durationS?: number) => Promise<RecoveryComparisonReport>;
  applyRecoveryPolicy: (policyId: string) => Promise<any>;
  setEnvironment: (state: string, durationS?: number) => Promise<any>;
  exportTelemetryCsv: () => Promise<void>;
  generateReport: () => Promise<any>;
  recordTimelineEvent: (
    eventType: string,
    message: string,
    subsystem?: string,
    severity?: string,
    metadata?: Record<string, any>
  ) => Promise<any>;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CanonicalSpacecraftState | null>(() => ({ ...DEFAULT_BASELINE_STATE }));
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [history, setHistory] = useState<TelemetryTimeSeriesPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [causalGraph, setCausalGraph] = useState<CausalGraph | null>(null);
  const [recoveryReport, setRecoveryReport] = useState<RecoveryComparisonReport | null>(null);
  const [faultCatalog, setFaultCatalog] = useState<FaultCatalogItem[]>([]);
  const [activeFaults, setActiveFaults] = useState<ActiveFault[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeedState] = useState<number>(1);
  const [timestep, setTimestepState] = useState<number>(10);
  const [connected, setConnected] = useState<boolean>(false);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('OBSERVE');

  // Mission Lifecycle & Identity State
  const [activeRunId, setActiveRunId] = useState<string>('run-default');
  const [missionStatus, setMissionStatus] = useState<string>('CREATED');
  const [realStartedAt, setRealStartedAt] = useState<string | null>(null);
  const [realCompletedAt, setRealCompletedAt] = useState<string | null>(null);

  // Operator Authentication State
  const [user, setUser] = useState<OperatorUser | null>(() => {
    try {
      const saved = localStorage.getItem('orbital_twin_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed.role === 'System Engineer') {
        parsed.role = 'Simulation Engineer';
        localStorage.setItem('orbital_twin_user', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('orbital_twin_token');
  });

  const [activeModule, setActiveModuleState] = useState<ActiveModule>(() => {
    let saved = localStorage.getItem('orbital_twin_module') as any;
    if (saved === 'mission-admin') {
      localStorage.setItem('orbital_twin_module', 'mission-control');
      saved = 'mission-control';
    }
    const token = localStorage.getItem('orbital_twin_token');
    if (saved && token) {
      return saved as ActiveModule;
    }
    if (token) {
      try {
        const userSaved = localStorage.getItem('orbital_twin_user');
        if (userSaved) {
          const u = JSON.parse(userSaved);
          return getRoleDefaultModule(u.role);
        }
      } catch {}
      return 'mission-control';
    }
    return 'landing';
  });

  const setActiveModule = (mod: ActiveModule) => {
    const targetMod = (mod as any) === 'mission-admin' ? 'mission-control' : mod;
    setActiveModuleState(targetMod);
    if (targetMod !== 'login' && targetMod !== 'landing') {
      localStorage.setItem('orbital_twin_module', targetMod);
    }
  };

  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const wsRef = useRef<SimulationWebSocket | null>(null);

  const normalizeState = (raw: any): CanonicalSpacecraftState => {
    if (!raw || raw.detail || typeof raw !== 'object') {
      return { ...DEFAULT_BASELINE_STATE };
    }
    const simTime = typeof raw.simulation_time_s === 'number' ? raw.simulation_time_s : DEFAULT_BASELINE_STATE.simulation_time_s;
    return {
      ...DEFAULT_BASELINE_STATE,
      ...raw,
      simulation_time_s: simTime,
      step_count: typeof raw.step_count === 'number' ? raw.step_count : DEFAULT_BASELINE_STATE.step_count,
      battery_soc_pct: typeof raw.battery_soc_pct === 'number' ? raw.battery_soc_pct : DEFAULT_BASELINE_STATE.battery_soc_pct,
      solar_generation_w: typeof raw.solar_generation_w === 'number' ? raw.solar_generation_w : DEFAULT_BASELINE_STATE.solar_generation_w,
      internal_temp_c: typeof raw.internal_temp_c === 'number' ? raw.internal_temp_c : DEFAULT_BASELINE_STATE.internal_temp_c,
      downlink_data_rate_mbps: typeof raw.downlink_data_rate_mbps === 'number' ? raw.downlink_data_rate_mbps : (raw.effective_downlink_rate_mbps ?? DEFAULT_BASELINE_STATE.downlink_data_rate_mbps),
      total_downlinked_data_mb: typeof raw.total_downlinked_data_mb === 'number' ? raw.total_downlinked_data_mb : DEFAULT_BASELINE_STATE.total_downlinked_data_mb,
      battery_stored_wh: raw.battery_energy_wh ?? raw.battery_stored_wh ?? DEFAULT_BASELINE_STATE.battery_stored_wh,
      battery_capacity_wh: raw.battery_capacity_wh ?? DEFAULT_BASELINE_STATE.battery_capacity_wh,
      usable_capacity_wh: raw.usable_capacity_wh ?? DEFAULT_BASELINE_STATE.usable_capacity_wh,
      battery_power_w: raw.battery_power_w ?? (raw.battery_discharge_w !== undefined ? -raw.battery_discharge_w : DEFAULT_BASELINE_STATE.battery_power_w),
      in_sunlight: raw.environment_state === 'SUNLIGHT' || raw.in_sunlight === true,
      packet_loss_pct: (raw.packet_loss_fraction !== undefined ? raw.packet_loss_fraction * 100 : raw.packet_loss_pct) ?? DEFAULT_BASELINE_STATE.packet_loss_pct,
      storage_used_mb: (raw.storage_used_gb !== undefined ? raw.storage_used_gb * 1000 : raw.storage_used_mb) ?? DEFAULT_BASELINE_STATE.storage_used_mb,
      adcs_pointing_error_deg: raw.attitude_error_deg ?? raw.adcs_pointing_error_deg ?? DEFAULT_BASELINE_STATE.adcs_pointing_error_deg,
      total_heat_dissipation_w: raw.heat_generated_w ?? raw.total_heat_dissipation_w ?? DEFAULT_BASELINE_STATE.total_heat_dissipation_w,
      active_faults_count: Array.isArray(raw.active_faults) ? raw.active_faults.length : (raw.active_faults_count ?? 0),
      obc_cpu_utilization_pct: raw.cpu_utilization_pct ?? raw.obc_cpu_utilization_pct ?? DEFAULT_BASELINE_STATE.obc_cpu_utilization_pct,
      true_anomaly_deg: typeof raw.true_anomaly_deg === 'number' ? raw.true_anomaly_deg : (((simTime / 5400) * 360) % 360),
    };
  };

  const pushHistoryPoint = (s: CanonicalSpacecraftState) => {
    setHistory((prev) => {
      // Don't append duplicate time
      if (prev.length > 0 && prev[prev.length - 1].time_s === s.simulation_time_s) {
        return prev;
      }
      const pt: TelemetryTimeSeriesPoint = {
        time_s: s.simulation_time_s,
        battery_soc_pct: s.battery_soc_pct,
        solar_generation_w: s.solar_generation_w,
        total_power_consumption_w: s.total_power_consumption_w ?? 14.2,
        power_margin_w: s.power_margin_w ?? 10.3,
        internal_temp_c: s.internal_temp_c,
        storage_used_mb: s.storage_used_mb,
        downlink_mbps: s.downlink_data_rate_mbps,
        adcs_error_deg: s.adcs_pointing_error_deg,
        power_state: s.power_state,
      };
      const updated = [...prev, pt];
      return updated.slice(-120); // Keep last 120 points (20 minutes of 10s steps)
    });
  };

  const refreshMissionData = async () => {
    try {
      const [catResult, stateResult] = await Promise.allSettled([
        api.getFaultCatalog(),
        api.getLatestState(),
      ]);
      if (catResult.status === 'fulfilled' && Array.isArray(catResult.value)) {
        setFaultCatalog(catResult.value);
      }
      if (stateResult.status === 'fulfilled' && stateResult.value) {
        const norm = normalizeState(stateResult.value);
        setState(norm);
        pushHistoryPoint(norm);
      }
    } catch (e) {
      console.warn('Failed to refresh mission telemetry:', e);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    // Sanitize any stale Admin Console selection in storage
    if (localStorage.getItem('orbital_twin_module') === 'mission-admin') {
      localStorage.setItem('orbital_twin_module', 'mission-control');
    }

    // 0. Fetch active run info
    api.getActiveRun().then((info) => {
      if (info && info.run_id) {
        setActiveRunId(info.run_id);
        if (info.status) setMissionStatus(info.status);
        if (info.real_started_at) setRealStartedAt(info.real_started_at);
        if (info.real_completed_at) setRealCompletedAt(info.real_completed_at);
        if (typeof info.is_running === 'boolean') setIsRunning(info.is_running);
        if (info.speed) setSpeedState(info.speed);
      }
    }).catch(() => {});

    // 1. Fetch catalog
    api.getFaultCatalog().then((cat) => {
      if (Array.isArray(cat)) setFaultCatalog(cat);
    }).catch(console.error);

    // 2. Fetch initial state
    api.getLatestState().then((s) => {
      const norm = normalizeState(s);
      setState(norm);
      pushHistoryPoint(norm);
    }).catch(() => {
      setState({ ...DEFAULT_BASELINE_STATE });
    });

    // 3. Setup WebSocket connection
    const ws = new SimulationWebSocket('run-default');
    wsRef.current = ws;

    const unsubStatus = ws.subscribeStatus(setConnected);
    const unsubMsg = ws.subscribe((msg: SimulationMessage) => {
      if (msg.state) {
        const norm = normalizeState(msg.state);
        setState(norm);
        setIsRunning(msg.is_running);
        setSpeedState(msg.speed);
        pushHistoryPoint(norm);
      }
      if (msg.telemetry) {
        setTelemetry(msg.telemetry);
      }
      if (msg.events && msg.events.length > 0) {
        const normalizedEvents: AlertItem[] = msg.events.map((e: any) => ({
          ...e,
          timestamp_s: e.simulation_time_s ?? e.timestamp_s ?? 0,
          simulation_time_s: e.simulation_time_s ?? e.timestamp_s ?? 0,
          severity: e.severity,
          subsystem: e.subsystem,
          message: e.message,
        }));
        setAlerts((prev) => {
          const existingSignatures = new Set(prev.map((p) => `${p.timestamp_s}-${p.subsystem}-${p.message}`));
          const fresh = normalizedEvents.filter((e) => !existingSignatures.has(`${e.timestamp_s}-${e.subsystem}-${e.message}`));
          if (fresh.length === 0) return prev;
          return [...fresh, ...prev].slice(0, 50);
        });
      }
      if (msg.causal_graph) {
        const newGraph = msg.causal_graph;
        setCausalGraph((prev) => {
          if (!prev) return newGraph;
          if (
            prev.nodes.length === newGraph.nodes.length &&
            prev.edges.length === newGraph.edges.length
          ) {
            return prev;
          }
          return newGraph;
        });
      }
    });

    ws.connect();

    return () => {
      unsubStatus();
      unsubMsg();
      ws.disconnect();
    };
  }, []);

  const start = async () => {
    wsRef.current?.sendCommand('start');
    try {
      const res = await api.startSimulation(activeRunId);
      if (res && res.run_id) {
        setActiveRunId(res.run_id);
        setMissionStatus('RUNNING');
        if (res.real_started_at) setRealStartedAt(res.real_started_at);
        wsRef.current?.updateRunId(res.run_id);
      }
      setIsRunning(true);
    } catch (e) {
      console.error('Failed to start simulation:', e);
      setIsRunning(true);
    }
  };

  const pause = async () => {
    wsRef.current?.sendCommand('pause');
    try {
      await api.pauseSimulation(activeRunId);
      setMissionStatus('PAUSED');
      setIsRunning(false);
    } catch (e) {
      console.error('Failed to pause simulation:', e);
      setIsRunning(false);
    }
  };

  const end = async (status = 'COMPLETED') => {
    wsRef.current?.sendCommand('end', { status });
    try {
      const res = await api.endSimulation(activeRunId, status);
      setIsRunning(false);
      if (res) {
        // Backend ended and persisted activeRunId, then returned active_run_id and active_state (which is reset to T+00:00:00)
        if (res.active_state) {
          const norm = normalizeState(res.active_state);
          setState(norm);
          setHistory([
            {
              time_s: norm.simulation_time_s,
              battery_soc_pct: norm.battery_soc_pct,
              solar_generation_w: norm.solar_generation_w,
              total_power_consumption_w: norm.total_power_consumption_w ?? 14.2,
              power_margin_w: norm.power_margin_w ?? 10.3,
              internal_temp_c: norm.internal_temp_c,
              storage_used_mb: norm.storage_used_mb,
              downlink_mbps: norm.downlink_data_rate_mbps,
              adcs_error_deg: norm.adcs_pointing_error_deg,
              power_state: norm.power_state,
            },
          ]);
        } else {
          setState({ ...DEFAULT_BASELINE_STATE });
          setHistory([]);
        }

        const newRunId = res.active_run_id || 'run-default';
        setActiveRunId(newRunId);
        setMissionStatus('READY');
        setRealStartedAt(null);
        setRealCompletedAt(null);
        setAlerts([]);
        setActiveFaults([]);
        setCausalGraph(null);
        setRecoveryReport(null);
        setWorkflowStep('OBSERVE');

        if (wsRef.current) {
          wsRef.current.updateRunId(newRunId);
        }
      }
    } catch (e) {
      console.error('Failed to end simulation:', e);
      setIsRunning(false);
    }
  };

  const advanceTime = async (amount: number, unit = 'seconds') => {
    wsRef.current?.sendCommand('advance', { amount, unit });
    try {
      const res = await api.advanceSimulation(activeRunId, { amount, unit });
      if (res && res.state) {
        const norm = normalizeState(res.state);
        setState(norm);
        pushHistoryPoint(norm);
      }
      if (res && res.run_id && res.run_id !== activeRunId) {
        setActiveRunId(res.run_id);
        wsRef.current?.updateRunId(res.run_id);
      }
      if (res && res.real_started_at && !realStartedAt) {
        setRealStartedAt(res.real_started_at);
      }
      if (res && res.status) {
        setMissionStatus(res.status);
      }
    } catch (e) {
      console.error('Failed to advance simulation:', e);
    }
  };

  const step = () => {
    wsRef.current?.sendCommand('step');
    api.stepSimulation(activeRunId).then((res) => {
      if (res.state) {
        const norm = normalizeState(res.state);
        setState(norm);
        pushHistoryPoint(norm);
      }
      if (res.run_id && res.run_id !== activeRunId) {
        setActiveRunId(res.run_id);
        wsRef.current?.updateRunId(res.run_id);
      }
    }).catch(console.error);
  };

  const reset = async () => {
    wsRef.current?.sendCommand('reset');
    try {
      const res = await api.resetSimulation(activeRunId);
      if (res && res.state) {
        const norm = normalizeState(res.state);
        setState(norm);
        setHistory([
          {
            time_s: norm.simulation_time_s,
            battery_soc_pct: norm.battery_soc_pct,
            solar_generation_w: norm.solar_generation_w,
            total_power_consumption_w: norm.total_power_consumption_w ?? 14.2,
            power_margin_w: norm.power_margin_w ?? 10.3,
            internal_temp_c: norm.internal_temp_c,
            storage_used_mb: norm.storage_used_mb,
            downlink_mbps: norm.downlink_data_rate_mbps,
            adcs_error_deg: norm.adcs_pointing_error_deg,
            power_state: norm.power_state,
          },
        ]);
      } else {
        setState({ ...DEFAULT_BASELINE_STATE });
        setHistory([]);
      }
      setAlerts([]);
      setCausalGraph(null);
      setRecoveryReport(null);
      setActiveFaults([]);
      setWorkflowStep('OBSERVE');
      setIsRunning(false);

      const active = await api.getActiveRun().catch(() => null);
      if (active && active.run_id) {
        setActiveRunId(active.run_id);
        setMissionStatus(active.status || 'READY');
        setRealStartedAt(active.real_started_at || null);
        setRealCompletedAt(active.real_completed_at || null);
        if (wsRef.current) {
          wsRef.current.updateRunId(active.run_id);
        }
      }
    } catch (e) {
      console.error('Reset error:', e);
      setState({ ...DEFAULT_BASELINE_STATE });
      setHistory([]);
      setIsRunning(false);
    }
  };

  const recordTimelineEvent = async (
    eventType: string,
    message: string,
    subsystem = 'MISSION',
    severity = 'INFO',
    metadata?: Record<string, any>
  ) => {
    try {
      const res = await api.recordTimelineEvent(activeRunId, {
        event_type: eventType,
        message,
        subsystem,
        severity,
        metadata,
      });
      const newAlert: AlertItem = {
        timestamp_s: state?.simulation_time_s || 0,
        simulation_time_s: state?.simulation_time_s || 0,
        severity: severity as any,
        subsystem,
        message,
      };
      setAlerts((prev) => [newAlert, ...prev]);
      return res;
    } catch (e) {
      console.warn('Failed to record timeline event:', e);
    }
  };

  const resetV003Demo = async () => {
    await reset();
    setWorkflowStep('OBSERVE');
  };

  const setSpeed = (spd: number) => {
    wsRef.current?.sendCommand('set_speed', { speed: spd });
    api.setSpeed(activeRunId, spd).catch(console.error);
    setSpeedState(spd);
  };

  const setTimestep = async (ts: number) => {
    try {
      await api.setTimestep(activeRunId, ts);
      setTimestepState(ts);
    } catch (e) {
      console.error('Failed to set timestep:', e);
    }
  };

  const injectFault = async (fault: ActiveFault) => {
    await api.injectFault(activeRunId, fault);
    setActiveFaults((prev) => [...prev.filter((f) => f.fault_id !== fault.fault_id), fault]);
    // Fetch updated causal graph
    const g = await api.getCausalGraph(activeRunId);
    setCausalGraph(g);
  };

  const clearFault = async (faultId: string) => {
    await api.clearFault(activeRunId, faultId);
    setActiveFaults((prev) => prev.filter((f) => f.fault_id !== faultId));
    const g = await api.getCausalGraph(activeRunId);
    setCausalGraph(g);
  };

  const activateV003Demo = async () => {
    const res = await api.activateV003Demo(activeRunId);
    if (res.state) {
      const norm = normalizeState(res.state);
      setState(norm);
      pushHistoryPoint(norm);
      setActiveFaults(norm.active_faults || []);
      const g = await api.getCausalGraph(activeRunId);
      setCausalGraph(g);
    }
    return res;
  };

  const runRecoverySim = async (policies: string[], durationS = 600) => {
    const res = await api.simulateRecovery(activeRunId, durationS, policies);
    setRecoveryReport(res.report);
    return res.report;
  };

  const applyRecoveryPolicy = async (policyId: string) => {
    const res = await api.applyRecoveryPolicy(activeRunId, policyId);
    setState((prev) => (prev ? { ...prev, recovery_mode: policyId } : prev));
    return res;
  };

  const setEnvironment = async (envState: string, durationS = 600) => {
    const res = await api.setEnvironment(activeRunId, envState, durationS);
    return res;
  };

  const exportTelemetryCsv = async () => {
    try {
      await api.downloadTelemetryCsv(activeRunId);
    } catch (e: any) {
      console.error('Telemetry CSV export error:', e);
      alert(`CSV Export Error: ${e.message || 'Unable to download telemetry data'}`);
    }
  };

  const generateReport = async () => {
    const res = await api.generateReport(activeRunId);
    return res.report;
  };

  const login = async (username: string, password: string, role = 'Mission Administrator') => {
    const res = await api.login(username, password, role);
    setUser(res.user);
    setIsAuthenticated(true);
    const target = getRoleDefaultModule(res.user?.role || role);
    setActiveModule(target);
    await refreshMissionData();
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current.connect();
    }
  };

  const register = async (username: string, password: string, role = 'Mission Administrator') => {
    const res = await api.register(username, password, role);
    setUser(res.user);
    setIsAuthenticated(true);
    const target = getRoleDefaultModule(res.user?.role || role);
    setActiveModule(target);
    await refreshMissionData();
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current.connect();
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout API error:', e);
    } finally {
      localStorage.removeItem('orbital_twin_token');
      localStorage.removeItem('orbital_twin_user');
      localStorage.removeItem('orbital_twin_module');
      setUser(null);
      setIsAuthenticated(false);
      setActiveModule('landing');
    }
  };

  const loadHistoricalRun = async (runId: string) => {
    try {
      const details = await api.getHistoricalRunDetails(runId);
      if (details.final_state) {
        const norm = normalizeState(details.final_state);
        setState(norm);
        pushHistoryPoint(norm);
      }
      setActiveModule('mission-control');
    } catch (e) {
      console.error('Failed to load historical run:', e);
    }
  };

  const value = useMemo<SimulationContextValue>(
    () => ({
      state,
      telemetry,
      history,
      alerts,
      causalGraph,
      recoveryReport,
      faultCatalog,
      activeFaults,
      isRunning,
      speed,
      timestep,
      connected,
      workflowStep,
      activeModule,
      selectedComponent,
      user,
      isAuthenticated,
      activeRunId,
      missionStatus,
      realStartedAt,
      realCompletedAt,
      setWorkflowStep,
      setActiveModule,
      setSelectedComponent,
      login,
      register,
      logout,
      loadHistoricalRun,
      start,
      pause,
      end,
      advanceTime,
      step,
      reset,
      resetV003Demo,
      setSpeed,
      setTimestep,
      injectFault,
      clearFault,
      activateV003Demo,
      runRecoverySim,
      applyRecoveryPolicy,
      setEnvironment,
      exportTelemetryCsv,
      generateReport,
      recordTimelineEvent,
    }),
    [
      state,
      telemetry,
      history,
      alerts,
      causalGraph,
      recoveryReport,
      faultCatalog,
      activeFaults,
      isRunning,
      speed,
      timestep,
      connected,
      workflowStep,
      activeModule,
      selectedComponent,
      user,
      isAuthenticated,
      activeRunId,
      missionStatus,
      realStartedAt,
      realCompletedAt,
    ]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};


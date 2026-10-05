/**
 * Orbital Twin — API & WebSocket Client Service
 * Strictly interfaces with the authoritative FastAPI backend
 */

import type {
  CanonicalSpacecraftState,
  TelemetryPoint,
  FaultCatalogItem,
  ActiveFault,
  CausalGraph,
  RecoveryComparisonReport,
  AlertItem,
  SimulationMessage,
  HistoricalSimulationRun,
  HistoricalRunDetails,
  OperatorUser,
  AdminUser,
} from '../types/simulation';

// Support Render environment variable VITE_API_URL with fallback to relative path (proxied in dev)
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem('orbital_twin_token');
  const headers: Record<string, string> = { ...extra };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Simulation Controls
  async startSimulation(runId = 'run-default') {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async pauseSimulation(runId = 'run-default') {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async stepSimulation(runId = 'run-default') {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/step`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async resetSimulation(runId = 'run-default') {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async setSpeed(runId = 'run-default', speed: number) {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/speed`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ speed }),
    });
    return res.json();
  },

  async setTimestep(runId = 'run-default', timestepS: number) {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/timestep`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ timestep_s: timestepS }),
    });
    return res.json();
  },

  // State & Telemetry
  async getLatestState(spacecraftId = 'sat-3u-01'): Promise<CanonicalSpacecraftState> {
    const res = await fetch(`${API_BASE}/spacecraft/${spacecraftId}/state`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch state: HTTP ${res.status}`);
    }
    return res.json();
  },

  async getLatestTelemetry(runId = 'run-default'): Promise<TelemetryPoint[]> {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/telemetry/latest`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      return [];
    }
    return res.json();
  },

  async getTelemetryHistory(runId = 'run-default', limit = 100): Promise<TelemetryPoint[]> {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/telemetry?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      return [];
    }
    return res.json();
  },

  // Faults
  async getFaultCatalog(): Promise<FaultCatalogItem[]> {
    const res = await fetch(`${API_BASE}/faults/catalog`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      return [];
    }
    return res.json();
  },

  async injectFault(runId = 'run-default', fault: ActiveFault) {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/faults`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(fault),
    });
    return res.json();
  },

  async clearFault(runId = 'run-default', faultId: string) {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/faults/${faultId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getCausalGraph(runId = 'run-default'): Promise<CausalGraph> {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/faults/causal-graph`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Recovery
  async getRecoveryStrategies() {
    const res = await fetch(`${API_BASE}/recovery/strategies`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async simulateRecovery(
    runId = 'run-default',
    durationS = 600,
    policies = ['R-001', 'R-002', 'R-003', 'R-004', 'R-005', 'R-006', 'R-007']
  ): Promise<{ status: string; comparison_id: string; report: RecoveryComparisonReport }> {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/recovery/simulate`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ duration_s: durationS, policies }),
    });
    return res.json();
  },

  async activateV003Demo(runId = 'run-default') {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/preset/v003-demo`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async applyRecoveryPolicy(runId = 'run-default', policyId: string) {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/recovery/apply`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ policy_id: policyId }),
    });
    return res.json();
  },

  async setEnvironment(runId = 'run-default', state: string, durationS = 600) {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/environment`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ state, duration_s: durationS }),
    });
    return res.json();
  },

  getTelemetryCsvUrl(runId = 'run-default') {
    const token = localStorage.getItem('orbital_twin_token');
    return `${API_BASE}/simulation/runs/${runId}/telemetry/export.csv${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  async downloadTelemetryCsv(runId = 'run-default') {
    const token = localStorage.getItem('orbital_twin_token');
    const url = `${API_BASE}/simulation/runs/${runId}/telemetry/export.csv${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Authentication required to export telemetry CSV. Please log in.');
      }
      throw new Error(`Failed to download telemetry CSV: HTTP ${res.status}`);
    }
    const blob = await res.blob();
    if (blob.size === 0) {
      throw new Error('Downloaded telemetry file is empty.');
    }
    
    // Extract filename from Content-Disposition if present
    let filename = `orbital_twin_telemetry_${runId}.csv`;
    const disposition = res.headers.get('Content-Disposition');
    if (disposition) {
      const match = disposition.match(/filename="?([^";]+)"?/i);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Keep object URL alive for 1.5s so Chromium/Windows browser download manager finishes streaming
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1500);
  },

  // Timeline
  async getTimeline(runId = 'run-default'): Promise<{ simulation_time_s: number; events: AlertItem[]; causal_events: any[] }> {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/timeline`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Reports
  async generateReport(runId = 'run-default') {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/reports`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getReport(runId = 'run-default', reportId: string) {
    const res = await fetch(`${API_BASE}/simulation/runs/${runId}/reports/${reportId}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Authentication
  async login(username: string, password: string, role = 'Mission Operator'): Promise<{ status: string; token: string; user: OperatorUser }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(err.detail || 'Authentication failed');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('orbital_twin_token', data.token);
      localStorage.setItem('orbital_twin_user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(username: string, password: string, role = 'Mission Operator'): Promise<{ status: string; token: string; user: OperatorUser }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('orbital_twin_token', data.token);
      localStorage.setItem('orbital_twin_user', JSON.stringify(data.user));
    }
    return data;
  },

  async getCurrentUser(): Promise<OperatorUser> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } finally {
      localStorage.removeItem('orbital_twin_token');
      localStorage.removeItem('orbital_twin_user');
      localStorage.removeItem('orbital_twin_module');
    }
  },

  // Administration (Admin Only)
  async getAdminUsers(): Promise<AdminUser[]> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Admin authorization required: HTTP ${res.status}`);
    }
    return res.json();
  },

  // Persistent Mission History
  async getHistoricalRuns(): Promise<HistoricalSimulationRun[]> {
    const res = await fetch(`${API_BASE}/history/runs`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getHistoricalRunDetails(runId: string): Promise<HistoricalRunDetails> {
    const res = await fetch(`${API_BASE}/history/runs/${runId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Simulation run ${runId} not found`);
    }
    return res.json();
  },
};

/**
 * WebSocket Real-Time Telemetry Stream Manager
 */
export class SimulationWebSocket {
  private ws: WebSocket | null = null;
  private runId: string;
  private listeners: Set<(msg: SimulationMessage) => void> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private reconnectTimer: any = null;

  constructor(runId = 'run-default') {
    this.runId = runId;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    let wsUrl = '';
    if (API_BASE) {
      try {
        const parsed = new URL(API_BASE);
        const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${parsed.host}/ws/simulation/${this.runId}`;
      } catch {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws/simulation/${this.runId}`;
      }
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/simulation/${this.runId}`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.notifyStatus(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data: SimulationMessage = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(data));
        } catch (e) {
          console.error('Failed to parse WS payload', e);
        }
      };

      this.ws.onclose = () => {
        this.notifyStatus(false);
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.notifyStatus(false);
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((fn) => fn(connected));
  }

  subscribe(listener: (msg: SimulationMessage) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeStatus(listener: (connected: boolean) => void) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  sendCommand(cmd: string, extra: Record<string, any> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ command: cmd, ...extra }));
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

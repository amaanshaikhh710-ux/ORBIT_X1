import React, { useEffect, useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { api } from '../services/api';
import type { AdminUser, ActiveModule } from '../types/simulation';
import {
  Shield,
  Users,
  Satellite,
  Box,
  Compass,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Activity,
  History,
  FileText,
  Play,
  Pause,
  RefreshCw,
  Zap,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

export const MissionAdminDashboard: React.FC = () => {
  const {
    state,
    isRunning,
    start,
    pause,
    reset,
    activateV003Demo,
    setActiveModule,
    user,
  } = useSimulation();

  const [operators, setOperators] = useState<AdminUser[]>([]);
  const [loadingOperators, setLoadingOperators] = useState<boolean>(true);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    api
      .getAdminUsers()
      .then((users) => {
        if (mounted) {
          setOperators(users);
          setLoadingOperators(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setAdminError(err.message || 'Unable to retrieve operator roster');
          setLoadingOperators(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleActivateDemo = async () => {
    setDemoLoading(true);
    try {
      await activateV003Demo();
    } catch (e) {
      console.error(e);
    } finally {
      setDemoLoading(false);
    }
  };

  const moduleLaunchers: {
    id: ActiveModule;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: 'mission-control',
      title: 'Mission Operator Dashboard',
      description: 'Primary real-time flight telemetry, orbital state & subsystem monitoring',
      icon: <Satellite size={20} />,
      color: '#38BDF8',
    },
    {
      id: 'digital-twin',
      title: '3D Spacecraft Digital Twin',
      description: 'Interactive CAD-accurate 3U CubeSat structure, solar arrays & subsystem thermals',
      icon: <Box size={20} />,
      color: '#818CF8',
    },
    {
      id: 'flight-director',
      title: 'Flight Director Dashboard',
      description: 'Anomaly escalation, flight safety envelope, & live recovery policy execution',
      icon: <Compass size={20} />,
      color: '#C084FC',
    },
    {
      id: 'simulation-dashboard',
      title: 'Simulation & Physics Lab',
      description: 'Orbital physics engine, dynamic fault injection, & sun/eclipse environment controls',
      icon: <Sliders size={20} />,
      color: '#4ADE80',
    },
    {
      id: 'fault-analysis',
      title: 'Fault Analysis & Causal Graph',
      description: 'Directed causal DAG tracking anomaly propagation across spacecraft subsystems',
      icon: <AlertTriangle size={20} />,
      color: '#FB923C',
    },
    {
      id: 'recovery-planner',
      title: 'Recovery Strategy Planner',
      description: 'Multi-scenario parallel re-simulation comparing mitigation policies (R-001–R-007)',
      icon: <RotateCcw size={20} />,
      color: '#F472B6',
    },
    {
      id: 'telemetry',
      title: 'Telemetry Workbench',
      description: 'Deep time-series plots, multi-channel charting, and tabular export',
      icon: <Activity size={20} />,
      color: '#2DD4BF',
    },
    {
      id: 'history',
      title: 'Mission & Run History',
      description: 'Persistent PostgreSQL mission audit records, past simulation runs & reports',
      icon: <History size={20} />,
      color: '#A78BFA',
    },
    {
      id: 'reports',
      title: 'Executive Mission Reports',
      description: 'Automated post-pass mission summaries, telemetry compliance, & flight certification',
      icon: <FileText size={20} />,
      color: '#FACC15',
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', color: '#F1F5F9' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          borderRadius: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #EAB308, #CA8A04)',
              color: '#000',
              boxShadow: '0 0 16px rgba(234, 179, 8, 0.4)',
            }}
          >
            <Shield size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '0.4px', color: '#FFFFFF' }}>
                Mission Administration Console
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(234, 179, 8, 0.25)',
                  border: '1px solid rgba(234, 179, 8, 0.5)',
                  color: '#FDE047',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.5px',
                }}
              >
                FULL ACCESS PRIVILEGES
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#94A3B8', marginTop: '3px' }}>
              Authoritative command authority: Operator {user?.username || 'admin'} · System-wide inspection, RBAC management, and simulation orchestration
            </div>
          </div>
        </div>

        {/* Global Quick Simulation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={isRunning ? pause : start}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: isRunning ? '1px solid #EAB308' : '1px solid var(--accent-cyan)',
              background: isRunning ? 'rgba(234, 179, 8, 0.2)' : 'rgba(39, 199, 255, 0.2)',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            <span>{isRunning ? 'PAUSE SIM' : 'RESUME SIM'}</span>
          </button>

          <button
            onClick={reset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#CBD5E1',
              fontWeight: 500,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            <span>RESET</span>
          </button>

          <button
            onClick={handleActivateDemo}
            disabled={demoLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(245, 158, 11, 0.5)',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.35))',
              color: '#FDE68A',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
            }}
            title="Pre-stage 70% Solar degradation anomaly with active imaging"
          >
            <Zap size={14} />
            <span>{demoLoading ? 'STAGE...' : 'V-003 DEMO'}</span>
          </button>
        </div>
      </div>

      {/* 2. System Vitals Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div style={{ padding: '14px 18px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>MISSION TIME</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
            T+ {(state?.simulation_time_s ?? 0).toFixed(0)} s
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Orbit #{Math.floor((state?.simulation_time_s ?? 0) / 5400) + 1} · {state?.environment_state || 'SUNLIGHT'}
          </div>
        </div>

        <div style={{ padding: '14px 18px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>POWER SUBSYSTEM</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: (state?.battery_soc_pct ?? 0) > 25 ? '#4ADE80' : '#EF4444', marginTop: '4px' }}>
            {(state?.battery_soc_pct ?? 0).toFixed(1)}% SOC
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Gen: {(state?.solar_generation_w ?? 0).toFixed(1)} W · Bus: {state?.power_state || 'NORMAL'}
          </div>
        </div>

        <div style={{ padding: '14px 18px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>THERMAL & ADCS</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#38BDF8', marginTop: '4px' }}>
            {(state?.internal_temp_c ?? 0).toFixed(1)} °C
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            ADCS Pointing: {(state?.adcs_pointing_error_deg ?? 0).toFixed(2)}°
          </div>
        </div>

        <div style={{ padding: '14px 18px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ACTIVE FAULTS</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: (state?.active_faults_count ?? 0) > 0 ? '#EF4444' : '#4ADE80', marginTop: '4px' }}>
            {state?.active_faults_count ?? 0} ACTIVE
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Downlink: {(state?.downlink_data_rate_mbps ?? 0).toFixed(1)} Mbps
          </div>
        </div>
      </div>

      {/* 3. Operator Roster & RBAC Authorization Table */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#FACC15" />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Authoritative Operator Roster & Role Mapping</h2>
          </div>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>Verified via backend API: <code>/admin/users</code></span>
        </div>

        {loadingOperators ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
            Querying authoritative operator database...
          </div>
        ) : adminError ? (
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '6px', fontSize: '13px' }}>
            {adminError}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', color: '#94A3B8' }}>
                  <th style={{ padding: '10px 12px' }}>CALL SIGN / USERNAME</th>
                  <th style={{ padding: '10px 12px' }}>AUTHORITATIVE RBAC ROLE</th>
                  <th style={{ padding: '10px 12px' }}>PERMISSION ENVELOPE</th>
                  <th style={{ padding: '10px 12px' }}>DEFAULT DASHBOARD</th>
                  <th style={{ padding: '10px 12px' }}>SYSTEM STATUS</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr
                    key={op.id}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: op.username === user?.username ? 'rgba(234, 179, 8, 0.08)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {op.username} {op.username === user?.username && ' (CURRENT)'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background:
                            op.role === 'Mission Administrator'
                              ? 'rgba(234, 179, 8, 0.15)'
                              : op.role === 'Flight Director'
                              ? 'rgba(168, 85, 247, 0.15)'
                              : op.role === 'Simulation Engineer'
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'rgba(56, 189, 248, 0.15)',
                          color:
                            op.role === 'Mission Administrator'
                              ? '#FACC15'
                              : op.role === 'Flight Director'
                              ? '#C084FC'
                              : op.role === 'Simulation Engineer'
                              ? '#4ADE80'
                              : '#38BDF8',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        {op.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#CBD5E1' }}>
                      {op.role === 'Mission Administrator' && 'Unrestricted Full Access · Fault Injection · Recovery Execution · User Audit'}
                      {op.role === 'Mission Operator' && 'Read-only Telemetry Monitoring · Digital Twin · History Logs · Reports'}
                      {op.role === 'Flight Director' && 'Flight Safety Envelope · Anomaly Evaluation · Live Recovery Policy Execution'}
                      {op.role === 'Simulation Engineer' && 'Physics Lab Control · Subsystem Fault Injection · Causal Graph Verification'}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {op.role === 'Mission Administrator' && 'mission-admin'}
                      {op.role === 'Mission Operator' && 'mission-control'}
                      {op.role === 'Flight Director' && 'flight-director'}
                      {op.role === 'Simulation Engineer' && 'simulation-dashboard'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#4ADE80', fontSize: '11.5px' }}>
                        <CheckCircle2 size={13} /> Active Credentials
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Full Access Module Direct Launchpad */}
      <div>
        <div style={{ marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Mission Module Direct Launchpad</h2>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
            Mission Administrator has unrestricted authority to launch and interact with any module across the entire platform:
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '14px',
          }}
        >
          {moduleLaunchers.map((mod) => (
            <div
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '16px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = mod.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 18px ${mod.color}22`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: `${mod.color}1a`,
                  color: mod.color,
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {mod.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#FFFFFF' }}>{mod.title}</div>
                  <ExternalLink size={13} color="#64748B" />
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', lineHeight: 1.45 }}>
                  {mod.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

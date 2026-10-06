import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { api } from '../services/api';
import type { HistoricalSimulationRun, HistoricalRunDetails } from '../types/simulation';
import {
  History,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Clock,
  Eye,
  FileText,
  ArrowRight,
  Database,
  X,
} from 'lucide-react';

export const MissionHistory: React.FC = () => {
  const { loadHistoricalRun, setActiveModule } = useSimulation();

  const [runs, setRuns] = useState<HistoricalSimulationRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'NOMINAL' | 'ANOMALY' | 'RECOVERED'>('ALL');
  const [selectedRun, setSelectedRun] = useState<HistoricalRunDetails | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const data = await api.getHistoricalRuns();
      setRuns(data);
    } catch (e) {
      console.error('Failed to load history runs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const openDetails = async (runId: string) => {
    try {
      const details = await api.getHistoricalRunDetails(runId);
      setSelectedRun(details);
    } catch (e) {
      console.error('Failed to load run details:', e);
    }
  };

  const filteredRuns = runs.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status.toUpperCase() === filter;
  });

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `T+ ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'NOMINAL':
        return { label: 'NOMINAL', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', color: '#34d399' };
      case 'RUNNING':
        return { label: 'LIVE / RUNNING', bg: 'rgba(39, 199, 255, 0.15)', border: 'rgba(39, 199, 255, 0.4)', color: '#38bdf8' };
      case 'ANOMALY':
        return { label: 'ANOMALY ACTIVE', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', color: '#f87171' };
      case 'RECOVERED':
        return { label: 'RECOVERED', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' };
      default:
        return { label: status, bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.3)', color: '#94a3b8' };
    }
  };

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '1440px',
        margin: '0 auto',
        color: '#F5F8FC',
        minHeight: 'calc(100vh - 150px)',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: '#27C7FF',
              letterSpacing: '2px',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Database size={13} />
            <span>POSTGRESQL TELEMETRY VAULT // MISSION ORBIT-X1</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '0.4px' }}>
            Mission & Simulation History
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Authoritative flight records, fault propagation trajectories, executed recovery actions, and generated reports.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Filter Pills */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.8)',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {(['ALL', 'NOMINAL', 'ANOMALY', 'RECOVERED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: filter === f ? 'rgba(39, 199, 255, 0.2)' : 'transparent',
                  color: filter === f ? '#27C7FF' : '#94A3B8',
                  transition: 'all 0.15s ease',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchRuns}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(39, 199, 255, 0.12)',
              border: '1px solid rgba(39, 199, 255, 0.3)',
              borderRadius: '8px',
              color: '#27C7FF',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Vault</span>
          </button>
        </div>
      </div>

      {/* History Table / Cards */}
      {filteredRuns.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <History size={40} color="#64748B" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', margin: '0 0 6px 0', color: '#CBD5E1' }}>No Simulation Runs Recorded</h3>
          <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '0 auto 16px' }}>
            Simulation runs are automatically archived to PostgreSQL when initiated or checkpointed in Mission Control.
          </p>
          <button
            onClick={() => setActiveModule('mission-control')}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              border: 'none',
              borderRadius: '6px',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go to Mission Control →
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredRuns.map((r) => {
            const badge = getStatusBadge(r.status);
            return (
              <div
                key={r.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1.4fr) minmax(140px, 1fr) minmax(180px, 1.2fr) minmax(180px, 1.2fr) minmax(140px, 1fr) auto',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                  transition: 'border-color 0.2s ease, transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(39, 199, 255, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                }}
              >
                {/* 1. Run ID & Date */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>
                      {r.id}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        color: badge.color,
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    Started: {r.started_at ? new Date(r.started_at).toLocaleString() : 'N/A'}
                  </div>
                </div>

                {/* 2. Duration & Power State */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#E2E8F0', fontFamily: 'var(--font-mono)' }}>
                    <Clock size={13} color="#38bdf8" />
                    <span>{formatDuration(r.duration_s)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    Power State: <span style={{ color: '#CBD5E1' }}>{r.power_state}</span>
                  </div>
                </div>

                {/* 3. Battery SOC (Initial -> Final) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#94A3B8' }}>Battery SOC:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: r.final_battery_soc < 25 ? '#f87171' : '#34d399' }}>
                      {r.initial_battery_soc.toFixed(1)}% → {r.final_battery_soc.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: '5px',
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, r.final_battery_soc))}%`,
                        background: r.final_battery_soc < 25 ? '#f87171' : r.final_battery_soc < 40 ? '#f59e0b' : '#10b981',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '3px' }}>
                    Min SOC: {r.min_battery_soc.toFixed(1)}%
                  </div>
                </div>

                {/* 4. Faults & Recovery Taken */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: r.active_faults_count > 0 ? '#f87171' : '#94A3B8' }}>
                    <AlertTriangle size={13} />
                    <span>{r.fault_summary !== 'None' ? r.fault_summary : 'Zero Injected Faults'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#CBD5E1', marginTop: '3px' }}>
                    <RotateCcw size={11} color="#38bdf8" />
                    <span>Recovery: {r.recovery_action_taken}</span>
                  </div>
                </div>

                {/* 5. Science Yield */}
                <div>
                  <div style={{ fontSize: '12px', color: '#E2E8F0', fontFamily: 'var(--font-mono)' }}>
                    {r.images_completed} images
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {r.total_downlinked_mb.toFixed(1)} MB downlinked
                  </div>
                </div>

                {/* 6. Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => openDetails(r.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      color: '#E2E8F0',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#27C7FF';
                      e.currentTarget.style.color = '#27C7FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.color = '#E2E8F0';
                    }}
                  >
                    <Eye size={13} />
                    <span>Inspect</span>
                  </button>

                  <button
                    onClick={() => loadHistoricalRun(r.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 12px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      border: '1px solid rgba(39, 199, 255, 0.35)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Load run state in Digital Twin"
                  >
                    <span>Load in Twin</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Inspector for Selected Run */}
      {selectedRun && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setSelectedRun(null)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '85vh',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 23, 42, 0.8)',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#27C7FF', letterSpacing: '1.5px' }}>
                  POSTGRESQL AUDIT LOG // {selectedRun.id}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '2px 0 0 0', color: '#FFFFFF' }}>
                  Run Details & Anomaly Trajectory
                </h3>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* Metrics Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>DURATION</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {formatDuration(selectedRun.duration_s)}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>FINAL SOC</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: selectedRun.final_battery_soc < 25 ? '#f87171' : '#34d399' }}>
                    {selectedRun.final_battery_soc.toFixed(1)}%
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>IMAGES CAPTURED</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#E2E8F0' }}>
                    {selectedRun.images_completed}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>DOWNLINKED DATA</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#E2E8F0' }}>
                    {selectedRun.total_downlinked_mb.toFixed(1)} MB
                  </div>
                </div>
              </div>

              {/* Injected Fault Events */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#CBD5E1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} color="#f87171" />
                  <span>Injected Fault Events ({selectedRun.fault_events?.length || 0})</span>
                </h4>
                {selectedRun.fault_events && selectedRun.fault_events.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedRun.fault_events.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#f87171' }}>{f.fault_id}</strong>: {f.subsystem} ({f.parameter})
                        </div>
                        <div style={{ color: '#94A3B8', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                          Severity: {(f.severity * 100).toFixed(0)}% • Start: T+{f.start_time_s}s
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                    No fault events injected during this run.
                  </div>
                )}
              </div>

              {/* Recovery Actions */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#CBD5E1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCcw size={14} color="#38bdf8" />
                  <span>Executed Recovery Actions ({selectedRun.recovery_actions?.length || 0})</span>
                </h4>
                {selectedRun.recovery_actions && selectedRun.recovery_actions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedRun.recovery_actions.map((rec) => (
                      <div
                        key={rec.id}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#38bdf8' }}>{rec.policy_id}</strong>: {rec.policy_name}
                        </div>
                        <div style={{ color: '#94A3B8', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                          Applied at: T+{rec.applied_at_sim_time_s}s
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                    No recovery policies executed.
                  </div>
                )}
              </div>

              {/* Attached Reports */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#CBD5E1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} color="#a855f7" />
                  <span>Archived Reports ({selectedRun.reports?.length || 0})</span>
                </h4>
                {selectedRun.reports && selectedRun.reports.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedRun.reports.map((rep) => (
                      <div
                        key={rep.id}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(168, 85, 247, 0.08)',
                          border: '1px solid rgba(168, 85, 247, 0.25)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#c084fc' }}>{rep.id}</strong>: {rep.title}
                        </div>
                        <div style={{ color: '#94A3B8', fontSize: '11px' }}>
                          {new Date(rep.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                    No reports generated for this run yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '14px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 23, 42, 0.8)',
              }}
            >
              <button
                onClick={() => setSelectedRun(null)}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: '#CBD5E1',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  loadHistoricalRun(selectedRun.id);
                  setSelectedRun(null);
                }}
                style={{
                  padding: '8px 18px',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Load State in Digital Twin →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

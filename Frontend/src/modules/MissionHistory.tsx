import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { api } from '../services/api';
import type {
  HistoricalSimulationRun,
  HistoricalRunDetails,
  HistoricalMissionReport,
} from '../types/simulation';
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
  Download,
  CheckCircle,
  Layers,
  ShieldCheck,
} from 'lucide-react';

export const MissionHistory: React.FC = () => {
  const { loadHistoricalRun, setActiveModule } = useSimulation();

  const [runs, setRuns] = useState<HistoricalSimulationRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'NOMINAL' | 'ANOMALY' | 'RECOVERED'>('ALL');
  const [selectedRun, setSelectedRun] = useState<HistoricalRunDetails | null>(null);

  // Authoritative Historical Mission Report Modal State
  const [viewReport, setViewReport] = useState<HistoricalMissionReport | null>(null);
  const [reportLoadingId, setReportLoadingId] = useState<string | null>(null);

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

  const openReport = async (runId: string) => {
    setReportLoadingId(runId);
    try {
      const rep = await api.getHistoricalRunReport(runId);
      setViewReport(rep);
    } catch (e) {
      console.error('Failed to load historical report:', e);
      alert(`Unable to load historical report for mission ${runId}`);
    } finally {
      setReportLoadingId(null);
    }
  };

  const handleDownloadReportJson = (rep: HistoricalMissionReport) => {
    try {
      const blob = new Blob([JSON.stringify(rep, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mission-report-${rep.mission_id || rep.run_id}.json`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      console.error('Report export error:', e);
    }
  };

  const filteredRuns = runs.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status.toUpperCase() === filter;
  });

  const formatSimDuration = (secs?: number | null) => {
    if (secs == null || isNaN(secs)) return 'T+00:00:00';
    const total = Math.max(0, Math.round(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatRealElapsed = (secs?: number | null) => {
    if (secs == null || isNaN(secs)) return 'N/A';
    const total = Math.max(0, Math.round(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return { label: 'COMPLETED', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', color: '#34d399' };
      case 'ABORTED':
        return { label: 'ABORTED', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', color: '#f87171' };
      case 'NOMINAL':
        return { label: 'NOMINAL', bg: 'rgba(34, 197, 94, 0.14)', border: 'rgba(34, 197, 94, 0.4)', color: '#22c55e' };
      case 'RUNNING':
        return { label: 'LIVE / RUNNING', bg: 'rgba(56, 189, 248, 0.14)', border: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' };
      case 'ANOMALY':
        return { label: 'ANOMALY ACTIVE', bg: 'rgba(239, 68, 68, 0.14)', border: 'rgba(239, 68, 68, 0.45)', color: '#ef4444' };
      case 'RECOVERED':
        return { label: 'RECOVERED', bg: 'rgba(249, 115, 22, 0.14)', border: 'rgba(249, 115, 22, 0.45)', color: 'var(--accent-orange)' };
      default:
        return { label: status, bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)', color: '#94a3b8' };
    }
  };

  const getOutcomeBadge = (outcome?: string, status?: string) => {
    const out = (outcome || status || 'COMPLETED').toUpperCase();
    if (out.includes('RECOVER')) {
      return { label: 'MISSION RECOVERED', bg: 'rgba(249, 115, 22, 0.16)', border: 'rgba(249, 115, 22, 0.5)', color: 'var(--accent-orange)' };
    }
    if (out.includes('NOMINAL') || out === 'COMPLETED') {
      return { label: 'NOMINAL SUCCESS', bg: 'rgba(34, 197, 94, 0.16)', border: 'rgba(34, 197, 94, 0.45)', color: '#22c55e' };
    }
    if (out.includes('ANOMALY')) {
      return { label: 'ANOMALY ACTIVE', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.5)', color: '#f87171' };
    }
    if (out.includes('ABORT')) {
      return { label: 'MISSION ABORTED', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.5)', color: '#f87171' };
    }
    return { label: out, bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' };
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
              color: 'var(--accent-gold)',
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
            <span>AUTHORITATIVE PERSISTENT VAULT // MISSION ORBIT-X1</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '0.4px' }}>
            Mission & Simulation History
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Permanent historical records of completed spacecraft simulation runs, fault cascades, recovery actions, and immutable mission reports.
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
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: filter === f ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                  fontSize: '11.5px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: filter === f ? 700 : 500,
                  cursor: 'pointer',
                  background: filter === f ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: filter === f ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.15s ease',
                  boxShadow: filter === f ? '0 0 10px rgba(56, 189, 248, 0.25)' : 'none',
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
            className="btn btn-secondary"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
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
          <h3 style={{ fontSize: '16px', margin: '0 0 6px 0', color: '#CBD5E1' }}>No Completed Missions Recorded</h3>
          <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '460px', margin: '0 auto 16px' }}>
            Mission runs are permanently archived when you run and click <strong>End Mission</strong> in Mission Control. Only actual completed simulations appear here.
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredRuns.map((r) => {
            const badge = getStatusBadge(r.status);
            const outcomeBadge = getOutcomeBadge(r.outcome, r.status);
            const faultCount = r.active_faults_count || 0;
            const recoveryLabel =
              r.recovery_status ||
              (r.recovery_action_taken && r.recovery_action_taken !== 'None' ? 'Successful' : faultCount > 0 ? 'Unrecovered' : 'None Required');

            return (
              <div
                key={r.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(240px, 1.3fr) minmax(180px, 1.1fr) minmax(160px, 1fr) minmax(140px, 0.9fr) auto',
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
                {/* 1. Mission ID, Badges & Real Timestamps */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13.5px', color: '#FFFFFF' }}>
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
                    <span
                      style={{
                        padding: '2px 8px',
                        background: outcomeBadge.bg,
                        border: `1px solid ${outcomeBadge.border}`,
                        color: outcomeBadge.color,
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                      }}
                    >
                      {outcomeBadge.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: 1.5 }}>
                    <div>
                      Started: <span style={{ color: '#E2E8F0' }}>{r.started_at ? new Date(r.started_at).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div>
                      Ended: <span style={{ color: '#E2E8F0' }}>{r.completed_at ? new Date(r.completed_at).toLocaleString() : 'In-Progress'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Real Elapsed & Simulation Duration */}
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
                    REAL ELAPSED
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F8FAFC', fontFamily: 'var(--font-mono)', marginTop: '1px' }}>
                    {formatRealElapsed(r.real_elapsed_s)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', marginTop: '4px' }}>
                    SIMULATION CLOCK
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                    <Clock size={12} />
                    <span>T+00:00:00 → {formatSimDuration(r.duration_s)}</span>
                  </div>
                </div>

                {/* 3. Faults & Recovery Status */}
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' }}>
                    FAULTS
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: faultCount > 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>
                    <AlertTriangle size={13} />
                    <span>{faultCount} {faultCount === 1 ? 'Fault' : 'Faults'}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', marginTop: '4px' }}>
                    RECOVERY
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: recoveryLabel === 'Successful' ? 'var(--accent-gold)' : '#CBD5E1' }}>
                    <RotateCcw size={11} color="#38bdf8" />
                    <span>{recoveryLabel}</span>
                  </div>
                </div>

                {/* 4. Telemetry Yield */}
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    Final SOC: <strong style={{ color: r.final_battery_soc < 25 ? '#f87171' : '#34d399' }}>{r.final_battery_soc.toFixed(1)}%</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    Imagery: <strong style={{ color: '#E2E8F0' }}>{r.images_completed}</strong> • Downlink: <strong style={{ color: '#38bdf8' }}>{r.total_downlinked_mb.toFixed(1)} MB</strong>
                  </div>
                </div>

                {/* 5. Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Authoritative View Report Button */}
                  <button
                    onClick={() => openReport(r.id)}
                    disabled={reportLoadingId === r.id}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 14px',
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.55)',
                      color: 'var(--accent-gold)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 0 10px rgba(212, 175, 55, 0.15)',
                    }}
                    title="Load authoritative historical mission report for this exact mission"
                  >
                    <FileText size={13} />
                    <span>{reportLoadingId === r.id ? 'Loading...' : 'View Report'}</span>
                  </button>

                  {/* Quick Inspect Button */}
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
                    title="Inspect database records and snapshots"
                  >
                    <Eye size={13} />
                    <span>Inspect</span>
                  </button>

                  {/* Load State in Twin */}
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

      {/* ======================================================== */}
      {/* 1. Authoritative Historical Mission Report Modal (Step 10) */}
      {/* ======================================================== */}
      {viewReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setViewReport(null)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '920px',
              maxHeight: '90vh',
              background: '#090D16',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '16px',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.9), 0 0 30px rgba(212, 175, 55, 0.15)',
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
                background: 'rgba(15, 23, 42, 0.95)',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', letterSpacing: '2px', fontWeight: 700 }}>
                  HISTORICAL MISSION REPORT // {viewReport.mission_info?.mission_id || viewReport.run_id}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '2px 0 0 0', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Flight Analysis & Epistemic Audit</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      background: viewReport.mission_info?.outcome?.includes('RECOVER') ? 'rgba(212, 175, 55, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      border: viewReport.mission_info?.outcome?.includes('RECOVER') ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)',
                      color: viewReport.mission_info?.outcome?.includes('RECOVER') ? 'var(--accent-gold)' : '#34d399',
                    }}
                  >
                    {viewReport.mission_info?.outcome || viewReport.status}
                  </span>
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => handleDownloadReportJson(viewReport)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Download size={13} />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={() => setViewReport(null)}
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
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Section 1: Mission Information */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <h4 style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', margin: '0 0 12px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  1. MISSION INFORMATION
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>MISSION ID</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                      {viewReport.mission_info?.mission_id}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>STATUS & OUTCOME</div>
                    <div style={{ fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>
                      {viewReport.mission_info?.status} ({viewReport.mission_info?.outcome})
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>REAL ELAPSED DURATION</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
                      {viewReport.mission_info?.real_elapsed_formatted || formatRealElapsed(viewReport.mission_info?.real_elapsed_s)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>SIMULATION DURATION</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '2px' }}>
                      {viewReport.mission_info?.simulation_duration_formatted || formatSimDuration(viewReport.mission_info?.simulation_duration_s)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>REAL START TIME</div>
                    <div style={{ color: '#CBD5E1', marginTop: '2px' }}>
                      {viewReport.mission_info?.real_started_at ? new Date(viewReport.mission_info.real_started_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>REAL END TIME</div>
                    <div style={{ color: '#CBD5E1', marginTop: '2px' }}>
                      {viewReport.mission_info?.real_completed_at ? new Date(viewReport.mission_info.real_completed_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>RECOVERY STATUS</div>
                    <div style={{ fontWeight: 600, color: viewReport.mission_info?.recovery_status === 'Successful' ? 'var(--accent-gold)' : '#94A3B8', marginTop: '2px' }}>
                      {viewReport.mission_info?.recovery_status || 'None Required'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>REPORT ID</div>
                    <div style={{ fontFamily: 'var(--font-mono)', color: '#94A3B8', marginTop: '2px' }}>
                      {viewReport.id}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Chronological Mission Timeline */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    2. MISSION TIMELINE ({viewReport.timeline?.length || 0} EVENTS)
                  </h4>
                  <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>CHRONOLOGICAL SIMULATION TIME</span>
                </div>
                {viewReport.timeline && viewReport.timeline.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                    {viewReport.timeline.map((ev, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 12px',
                          background: 'rgba(15, 23, 42, 0.5)',
                          borderLeft: `3px solid ${
                            ev.severity === 'CRITICAL' ? '#ef4444' : ev.severity === 'WARNING' ? '#f59e0b' : '#38bdf8'
                          }`,
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#38bdf8', width: '85px', flexShrink: 0 }}>
                          {ev.simulation_time_formatted || formatSimDuration(ev.simulation_time_s)}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', width: '80px', flexShrink: 0 }}>
                          [{ev.subsystem}]
                        </span>
                        <span style={{ flex: 1, color: '#F1F5F9' }}>
                          {ev.message || ev.description}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#64748B', flexShrink: 0 }}>
                          {ev.result || 'Logged'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                    No recorded timeline events for this mission.
                  </div>
                )}
              </div>

              {/* Section 3: Faults Injected */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <h4 style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', margin: '0 0 12px 0', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} color="#f87171" />
                  <span>3. FAULTS ({viewReport.faults?.length || 0})</span>
                </h4>
                {viewReport.faults && viewReport.faults.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {viewReport.faults.map((f, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(140px, 1fr) minmax(140px, 1fr) minmax(120px, 1fr) auto',
                          gap: '12px',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#f87171' }}>{f.fault_id}</strong>
                          <div style={{ fontSize: '11px', color: '#CBD5E1' }}>{f.subsystem} ({f.parameter})</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Severity: <strong>{(f.severity * 100).toFixed(0)}%</strong></div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Injected: <strong>{f.injected_sim_time_formatted || formatSimDuration(f.injected_sim_time_s)}</strong></div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: f.status === 'CLEARED' ? '#34d399' : '#f87171', fontWeight: 600 }}>
                            Status: {f.status}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#64748B' }}>Duration: {f.duration_s}s</div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#F1F5F9' }}>
                          {f.impact}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} color="#34d399" />
                    <span>Zero faults or anomalies were injected during this mission run.</span>
                  </div>
                )}
              </div>

              {/* Section 4: Fault Analysis */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <h4 style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', margin: '0 0 10px 0', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="#38bdf8" />
                  <span>4. FAULT CAUSAL ANALYSIS</span>
                </h4>
                <div style={{ fontSize: '12px', color: '#CBD5E1', lineHeight: '1.5' }}>
                  {viewReport.faults && viewReport.faults.length > 0 ? (
                    <div>
                      {viewReport.faults.map((f, i) => (
                        <div key={i} style={{ marginBottom: '6px' }}>
                          • <strong>Causal Root:</strong> [{f.fault_id}] on {f.subsystem} ({f.parameter}) propagated into power bus margins, requiring mitigation.
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontStyle: 'italic', color: '#64748B' }}>
                      No causal propagation chains generated — nominal flight trajectory maintained.
                    </div>
                  )}
                </div>
              </div>

              {/* Section 5: Recovery Actions & Comparisons */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <h4 style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', margin: '0 0 12px 0', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCcw size={14} color="var(--accent-gold)" />
                  <span>5. RECOVERY ACTIONS & COMPARISONS</span>
                </h4>
                {viewReport.recovery?.actions && viewReport.recovery.actions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {viewReport.recovery.actions.map((r, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          background: 'rgba(212, 175, 55, 0.08)',
                          border: '1px solid rgba(212, 175, 55, 0.3)',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <strong style={{ color: 'var(--accent-gold)' }}>
                            {r.policy_id}: {r.recovery_name}
                          </strong>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#38bdf8' }}>
                            Applied at: {r.applied_sim_time_formatted || formatSimDuration(r.applied_sim_time_s)}
                          </span>
                        </div>
                        <div style={{ color: '#CBD5E1', fontSize: '11px', marginBottom: '4px' }}>
                          <strong>Actions Executed:</strong> {Array.isArray(r.actions) ? r.actions.join(', ') : r.actions}
                        </div>
                        <div style={{ color: '#94A3B8', fontSize: '11px' }}>
                          <strong>Expected Effects:</strong> {Array.isArray(r.expected_effects) ? r.expected_effects.join(', ') : r.expected_effects}
                        </div>
                        <div style={{ color: '#34d399', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}>
                          Result: {r.result} • Status: {r.final_status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                    No recovery actions required or executed for this mission.
                  </div>
                )}
              </div>

              {/* Section 6: Final Outcome */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <h4 style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', margin: '0 0 12px 0', letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="#34d399" />
                  <span>6. FINAL OUTCOME & VERIFICATION</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px' }}>
                  <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>FINAL SIMULATION TIME</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>
                      {viewReport.final_outcome?.simulation_time_formatted || formatSimDuration(viewReport.final_outcome?.simulation_time_s)}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>FINAL BATTERY SOC</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: (viewReport.final_outcome?.battery_soc_pct || 0) < 25 ? '#f87171' : '#34d399', marginTop: '2px' }}>
                      {viewReport.final_outcome?.battery_soc_pct?.toFixed(1)}% (Min: {viewReport.final_outcome?.min_battery_soc?.toFixed(1)}%)
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>SCIENCE YIELD</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                      {viewReport.final_outcome?.images_completed} images / {viewReport.final_outcome?.total_downlinked_mb?.toFixed(1)} MB
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                    <div style={{ color: '#64748B', fontSize: '10.5px' }}>MISSION OBJECTIVES</div>
                    <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px', fontWeight: 600 }}>
                      Imagery: {viewReport.final_outcome?.images_completed}/20 • Downlink: {viewReport.final_outcome?.total_downlinked_mb?.toFixed(0)}/500 MB
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 7: Epistemic Declarations */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: '14px',
                  fontSize: '11px',
                  color: '#94A3B8',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ fontWeight: 700, color: '#CBD5E1', marginBottom: '4px' }}>
                  Epistemic Declarations & Engineering Baseline
                </div>
                <div>Model Classification: {viewReport.epistemic_declarations?.model_type}</div>
                <div>Fidelity: {viewReport.epistemic_declarations?.fidelity}</div>
                <div>Parameter Source: {viewReport.epistemic_declarations?.parameters_source}</div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 24px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 23, 42, 0.95)',
              }}
            >
              <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                Authoritative immutable historical report tied to mission ID {viewReport.mission_info?.mission_id}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleDownloadReportJson(viewReport)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  <Download size={13} />
                  <span>Download JSON</span>
                </button>
                <button
                  onClick={() => setViewReport(null)}
                  style={{
                    padding: '8px 18px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. Modal Inspector for Selected Run (Database Details) */}
      {/* ======================================================== */}
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
                  Run Details & Database Audit
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
              {/* Real Wall-Clock Run Timestamps & Outcome */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  marginBottom: '16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>REAL WALL-CLOCK START</div>
                  <div style={{ fontSize: '12px', color: '#E2E8F0', marginTop: '2px', fontWeight: 600 }}>
                    {selectedRun.started_at ? new Date(selectedRun.started_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>REAL WALL-CLOCK END</div>
                  <div style={{ fontSize: '12px', color: '#E2E8F0', marginTop: '2px', fontWeight: 600 }}>
                    {selectedRun.completed_at ? new Date(selectedRun.completed_at).toLocaleString() : 'In-Progress / Running'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>MISSION OUTCOME</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: selectedRun.status === 'COMPLETED' ? '#34d399' : selectedRun.status === 'ABORTED' ? '#f87171' : '#38bdf8', marginTop: '2px' }}>
                    {selectedRun.status}
                  </div>
                </div>
              </div>

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
                    {formatSimDuration(selectedRun.duration_s)}
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

              {/* Persisted Chronological Mission Timeline (Simulation Time) */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#CBD5E1', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="#38bdf8" />
                  <span>Persisted Mission Timeline ({selectedRun.timeline_events?.length || 0} events)</span>
                </h4>
                {selectedRun.timeline_events && selectedRun.timeline_events.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {selectedRun.timeline_events.map((ev, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderLeft: `3px solid ${
                            ev.severity === 'CRITICAL' ? '#ef4444' : ev.severity === 'WARNING' ? '#f59e0b' : '#38bdf8'
                          }`,
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#38bdf8', width: '85px', flexShrink: 0 }}>
                          {formatSimDuration(ev.simulation_time_s ?? 0)}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#CBD5E1', width: '90px', flexShrink: 0 }}>
                          [{ev.subsystem}]
                        </div>
                        <div style={{ flex: 1, color: '#F1F5F9' }}>
                          {ev.message}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                    No recorded timeline events for this run.
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

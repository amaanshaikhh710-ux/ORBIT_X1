import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { api } from '../services/api';
import type { HistoricalSimulationRun } from '../types/simulation';
import {
  FileText,
  Download,
  RefreshCw,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Database,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { activeRunId, generateReport, exportTelemetryCsv } = useSimulation();

  const [historicalRuns, setHistoricalRuns] = useState<HistoricalSimulationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('ACTIVE');
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const loadHistoricalReport = async (runId: string) => {
    setLoading(true);
    try {
      const rep = await api.getHistoricalRunReport(runId);
      setReport(rep);
    } catch (e) {
      console.error(`Failed to load historical report for run ${runId}:`, e);
    } finally {
      setLoading(false);
    }
  };

  // Load list of completed historical missions
  useEffect(() => {
    const loadRuns = async () => {
      try {
        const runs = await api.getHistoricalRuns();
        setHistoricalRuns(runs);
        // If there are completed missions and no report is loaded, default to the most recent completed mission
        if (runs.length > 0) {
          setSelectedRunId(runs[0].id);
          loadHistoricalReport(runs[0].id);
        }
      } catch (e) {
        console.error('Failed to load historical runs for reports:', e);
      }
    };
    loadRuns();
  }, []);

  const handleSelectRun = async (runId: string) => {
    setSelectedRunId(runId);
    if (runId === 'ACTIVE') {
      setReport(null);
    } else {
      await loadHistoricalReport(runId);
    }
  };

  const handleGenerateActive = async () => {
    setLoading(true);
    try {
      const rep = await generateReport();
      setReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!report) return;
    try {
      const runKey = report.mission_info?.mission_id || report.run_id || report.id;
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orbital-twin-report-${runKey}.json`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e: any) {
      console.error('Report export error:', e);
      alert(`Export error: ${e.message || 'Unable to download report JSON'}`);
    }
  };

  const formatSimDuration = (secs?: number | null) => {
    if (secs == null || isNaN(secs)) return 'T+00:00:00';
    const total = Math.max(0, Math.round(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatRealElapsed = (secs?: number | null) => {
    if (secs == null || isNaN(secs)) return 'N/A';
    const total = Math.max(0, Math.round(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header bar */}
      <div className="aerospace-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-gold)" />
            <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '0.3px' }}>Historical Mission Reports & Flight Verification</span>
            <span className="source-tag">AUTHORITATIVE PERSISTENT AUDIT</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Immutable post-flight telemetry records, fault propagation traces, recovery outcomes, and epistemic declarations.
          </div>
        </div>

        {/* Mission Selector & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Historical Run Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={14} color="#38bdf8" />
            <select
              value={selectedRunId}
              onChange={(e) => handleSelectRun(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#F8FAFC',
                padding: '6px 12px',
                borderRadius: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {historicalRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} ({r.status})
                </option>
              ))}
              <option value="ACTIVE">[Live Active Simulation: {activeRunId}]</option>
            </select>
          </div>

          {selectedRunId === 'ACTIVE' && (
            <button
              onClick={handleGenerateActive}
              disabled={loading}
              className="btn btn-primary"
              style={{
                background: 'var(--grad-primary)',
                borderColor: 'rgba(212, 175, 55, 0.5)',
                boxShadow: '0 2px 10px rgba(212, 175, 55, 0.25)',
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>{loading ? 'Compiling...' : 'Generate Live Report'}</span>
            </button>
          )}

          {selectedRunId !== 'ACTIVE' && (
            <button
              onClick={() => loadHistoricalReport(selectedRunId)}
              disabled={loading}
              className="btn btn-secondary"
              title="Refresh report from persistent database"
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>Refresh Report</span>
            </button>
          )}

          <button
            onClick={exportTelemetryCsv}
            className="btn btn-secondary"
            title="Download authoritative simulation run telemetry CSV"
          >
            <Download size={14} /> Export CSV
          </button>

          {report && (
            <button onClick={handleDownloadJson} className="btn btn-secondary">
              <Download size={14} /> Export JSON
            </button>
          )}
        </div>
      </div>

      {/* Report Display */}
      {report ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Card */}
          <div className="aerospace-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)', letterSpacing: '1.5px', fontWeight: 700 }}>
                  MISSION ID: {report.mission_info?.mission_id || report.run_id}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  Mission ORBIT-X1 Post-Run Flight Analysis
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  Real Started: <strong style={{ color: '#E2E8F0' }}>{report.mission_info?.real_started_at ? new Date(report.mission_info.real_started_at).toLocaleString() : report.real_started_at ? new Date(report.real_started_at).toLocaleString() : 'N/A'}</strong>
                  {' | '}
                  Real Ended: <strong style={{ color: '#E2E8F0' }}>{report.mission_info?.real_completed_at ? new Date(report.mission_info.real_completed_at).toLocaleString() : report.real_completed_at ? new Date(report.real_completed_at).toLocaleString() : 'N/A'}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    background: (report.mission_info?.outcome || report.outcome || '').includes('RECOVER') ? 'rgba(212, 175, 55, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    border: (report.mission_info?.outcome || report.outcome || '').includes('RECOVER') ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)',
                    color: (report.mission_info?.outcome || report.outcome || '').includes('RECOVER') ? 'var(--accent-gold)' : '#34d399',
                  }}
                >
                  {report.mission_info?.outcome || report.outcome || report.status || 'VERIFIED STATE'}
                </span>
                <span className="badge badge-normal">IMMUTABLE ARCHIVE</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px' }}>
              <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.12)' }}>
                <div style={{ color: '#8493A8', fontSize: '10.5px', fontFamily: 'var(--font-mono)', letterSpacing: '0.4px', marginBottom: '2px' }}>REAL ELAPSED DURATION</div>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                  {report.mission_info?.real_elapsed_formatted || formatRealElapsed(report.mission_info?.real_elapsed_s)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Wall-clock operator duration
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.12)' }}>
                <div style={{ color: '#8493A8', fontSize: '10.5px', fontFamily: 'var(--font-mono)', letterSpacing: '0.4px', marginBottom: '2px' }}>SIMULATION CLOCK</div>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                  {report.mission_info?.simulation_duration_formatted || formatSimDuration(report.simulation_duration_s || report.mission_info?.simulation_duration_s)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  ({Number(report.simulation_duration_s || report.mission_info?.simulation_duration_s || 0).toFixed(0)}s internal clock)
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.12)' }}>
                <div style={{ color: '#8493A8', fontSize: '10.5px', fontFamily: 'var(--font-mono)', letterSpacing: '0.4px', marginBottom: '2px' }}>FINAL BATTERY SOC</div>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: (report.summary?.final_battery_soc ?? 100) > 25 ? '#34d399' : '#f87171' }}>
                  {report.summary?.final_battery_soc ?? report.final_outcome?.battery_soc_pct?.toFixed(1) ?? 'N/A'} %
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Usable reserve status
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.12)' }}>
                <div style={{ color: '#8493A8', fontSize: '10.5px', fontFamily: 'var(--font-mono)', letterSpacing: '0.4px', marginBottom: '2px' }}>DOWNLINK TOTAL</div>
                <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {report.summary?.total_downlinked_mb ?? report.final_outcome?.total_downlinked_mb?.toFixed(1) ?? 0} MB
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Stored payload science data
                </div>
              </div>
            </div>
          </div>

          {/* Faults & Recovery Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Faults */}
            <div className="aerospace-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>
                <AlertTriangle size={15} color="#f87171" />
                <span>Injected Faults & Anomalies</span>
              </div>
              {(!report.faults || report.faults.length === 0) && (!report.summary?.active_faults || report.summary?.active_faults.length === 0) ? (
                <div style={{ fontSize: '12px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px', padding: '10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px' }}>
                  <CheckCircle size={14} />
                  <span>Nominal mission execution: Zero anomalies injected.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(report.faults || report.summary?.active_faults || []).map((f: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ color: '#f87171' }}>{f.fault_id}</strong>
                        <span style={{ fontSize: '11px', color: '#CBD5E1' }}>
                          Injected at: {f.injected_sim_time_formatted || formatSimDuration(f.start_time_s || f.injected_sim_time_s)}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        {f.subsystem} ({f.parameter}) • Severity: {(Number(f.severity) * 100).toFixed(0)}%
                      </div>
                      {f.impact && (
                        <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '4px' }}>
                          Impact: {f.impact}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recovery Actions */}
            <div className="aerospace-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>
                <RotateCcw size={15} color="var(--accent-gold)" />
                <span>Recovery Actions & Mitigation</span>
              </div>
              {!report.recovery?.actions || report.recovery.actions.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', padding: '10px' }}>
                  No recovery actions executed for this mission run.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {report.recovery.actions.map((rec: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(212, 175, 55, 0.08)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ color: 'var(--accent-gold)' }}>
                          {rec.policy_id}: {rec.recovery_name}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                          Applied: {rec.applied_sim_time_formatted || formatSimDuration(rec.applied_sim_time_s)}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '3px' }}>
                        Actions: {Array.isArray(rec.actions) ? rec.actions.join(', ') : rec.actions}
                      </div>
                      <div style={{ fontSize: '11px', color: '#34d399', marginTop: '2px', fontWeight: 600 }}>
                        Result: {rec.result} • Status: {rec.final_status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mission Timeline Events */}
          {report.timeline && report.timeline.length > 0 && (
            <div className="aerospace-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>
                <Clock size={15} color="#38bdf8" />
                <span>Chronological Timeline Events ({report.timeline.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                {report.timeline.map((ev: any, idx: number) => (
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
            </div>
          )}

          {/* Epistemic Declarations */}
          <div className="aerospace-card" style={{ background: 'rgba(255,255,255,0.015)' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Epistemic Declarations & Engineering Baseline
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              <div><b>Model Classification:</b> {report.epistemic_declarations?.model_type}</div>
              <div><b>Fidelity Declaration:</b> {report.epistemic_declarations?.fidelity}</div>
              <div><b>Parameter Authoritative Source:</b> {report.epistemic_declarations?.parameters_source}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="aerospace-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {selectedRunId === 'ACTIVE'
            ? 'Click "Generate Live Report" to compile a formal report from the live simulation in memory, or select a completed historical mission from the dropdown above.'
            : 'Loading authoritative historical mission report...'}
        </div>
      )}
    </div>
  );
};

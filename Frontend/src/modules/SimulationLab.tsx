import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type { ActiveFault } from '../types/simulation';
import { Sliders, Zap, AlertTriangle, Trash2, Play, Check, Sun, Moon, Globe, RotateCcw } from 'lucide-react';

export const SimulationLab: React.FC = () => {
  const { faultCatalog, activeFaults, injectFault, clearFault, state, setEnvironment, setWorkflowStep, setActiveModule, activateV003Demo, resetV003Demo, user } = useSimulation();

  const userRole = user?.role || 'Mission Operator';
  const canInjectFault = userRole === 'Simulation Engineer' || userRole === 'Mission Administrator';

  const [selectedFaultId, setSelectedFaultId] = useState<string>('F-SOLAR-001');
  const [severityPct, setSeverityPct] = useState<number>(70);
  const [startTimeS, setStartTimeS] = useState<number>(0);
  const [durationS, setDurationS] = useState<number>(300);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedCatalogItem = faultCatalog.find((f) => f.fault_id === selectedFaultId) || faultCatalog[0];

  const handleInject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogItem || !canInjectFault) return;

    const fault: ActiveFault = {
      fault_id: selectedCatalogItem.fault_id,
      subsystem: selectedCatalogItem.subsystem,
      parameter: selectedCatalogItem.parameter,
      severity: severityPct / 100.0,
      start_time_s: startTimeS,
      duration_s: durationS,
    };

    await injectFault(fault);
    setStatusMessage(`Fault ${fault.fault_id} injected at T+${fault.start_time_s}s for ${fault.duration_s}s`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handlePreset = async (faultId: string, sev: number, dur: number) => {
    if (!canInjectFault) return;
    const item = faultCatalog.find((f) => f.fault_id === faultId);
    if (!item) return;
    const fault: ActiveFault = {
      fault_id: item.fault_id,
      subsystem: item.subsystem,
      parameter: item.parameter,
      severity: sev,
      start_time_s: state?.simulation_time_s || 0,
      duration_s: dur,
    };
    await injectFault(fault);
    setStatusMessage(`Preset applied: ${item.name} (${sev * 100}% severity)`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="aerospace-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Simulation Lab & Fault Injection Console</span>
            <span className="source-tag">DYNAMIC FAULT INJECTION</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Inject controlled anomalies into the authoritative physics engine to inspect causal propagation and failure states.
          </div>
        </div>

        {statusMessage && (
          <div className="badge badge-normal" style={{ padding: '6px 12px' }}>
            <Check size={14} /> {statusMessage}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Fault Injection Form */}
        <div className="aerospace-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Zap size={16} color="var(--status-warning)" />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>Configure Anomaly Parameters</span>
          </div>

          <form onSubmit={handleInject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                TARGET SUBSYSTEM & FAULT
              </label>
              <select
                value={selectedFaultId}
                onChange={(e) => setSelectedFaultId(e.target.value)}
                style={{ width: '100%' }}
              >
                {faultCatalog.map((f) => (
                  <option key={f.fault_id} value={f.fault_id}>
                    [{f.fault_id}] {f.name} ({f.subsystem})
                  </option>
                ))}
              </select>
            </div>

            {selectedCatalogItem && (
              <div
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                }}
              >
                <div><b>Affected Parameter:</b> <code style={{ color: 'var(--accent-cyan)' }}>{selectedCatalogItem.parameter}</code></div>
                <div style={{ marginTop: '4px' }}>{selectedCatalogItem.description}</div>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>SEVERITY LEVEL</span>
                <span className="font-mono" style={{ color: 'var(--status-warning)', fontWeight: 600 }}>{severityPct}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={severityPct}
                onChange={(e) => setSeverityPct(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  START TIME (SECONDS)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={startTimeS}
                  onChange={(e) => setStartTimeS(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  DURATION (SECONDS)
                </label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={durationS}
                  onChange={(e) => setDurationS(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canInjectFault}
              className="btn btn-primary"
              style={{
                background: canInjectFault ? '#d97706' : 'rgba(255, 255, 255, 0.05)',
                borderColor: canInjectFault ? '#b45309' : 'rgba(255, 255, 255, 0.1)',
                color: canInjectFault ? '#fff' : '#64748b',
                cursor: canInjectFault ? 'pointer' : 'not-allowed',
                marginTop: '6px',
                opacity: canInjectFault ? 1 : 0.45,
              }}
              title={canInjectFault ? "Inject fault into active simulation run" : "Simulation Engineer or Administrator role required to inject faults"}
            >
              <AlertTriangle size={15} /> {canInjectFault ? 'Inject Fault into Simulation' : 'Engineer Privilege Required'}
            </button>
          </form>
        </div>

        {/* Validation Presets & Active Faults */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Orbital Environment & Lighting Control */}
          <div className="aerospace-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={16} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 600, fontSize: '13px' }}>Orbital Environment & Lighting Mode</span>
              </div>
              <span className={`badge ${state?.in_sunlight ? 'badge-normal' : 'badge-info'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                CURRENT: {state?.environment_state || (state?.in_sunlight ? 'SUNLIGHT' : 'ECLIPSE')}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={async () => {
                  await setEnvironment('SUNLIGHT', 600);
                  setStatusMessage('Environment set to SUNLIGHT (forced)');
                  setTimeout(() => setStatusMessage(null), 4000);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                title="Force orbital lighting to Sunlight"
              >
                <Sun size={13} color="#f59e0b" /> Sunlight
              </button>

              <button
                type="button"
                onClick={async () => {
                  await setEnvironment('ECLIPSE', 600);
                  setStatusMessage('Environment set to ECLIPSE (forced umbra)');
                  setTimeout(() => setStatusMessage(null), 4000);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                title="Force spacecraft into Earth Umbra (Eclipse)"
              >
                <Moon size={13} color="#38bdf8" /> Eclipse
              </button>

              <button
                type="button"
                onClick={async () => {
                  await setEnvironment('ORBIT');
                  setStatusMessage('Environment returned to dynamic orbit model');
                  setTimeout(() => setStatusMessage(null), 4000);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                title="Return to Keplerian/SGP4 eclipse cycle"
              >
                <Globe size={13} color="#10b981" /> Nominal Orbit
              </button>
            </div>
          </div>

          {/* Quick Validation Presets */}
          <div className="aerospace-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Play size={16} color="var(--accent-cyan)" />
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Preconfigured Engineering Test Cases</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={async () => {
                  await activateV003Demo();
                  setStatusMessage('V-003 Hackathon Demo Preset Activated: Pre-staged SOC at 25.08% + 70% Solar Degradation. Step or start stream to see LOW_POWER in ~3 steps!');
                  setTimeout(() => setStatusMessage(null), 6000);
                }}
                className="btn btn-primary"
                style={{
                  justifyContent: 'space-between',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '12px',
                  background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.4) 0%, rgba(217, 119, 6, 0.4) 100%)',
                  border: '1px solid #f59e0b',
                  padding: '8px 12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#f59e0b' }}>⚡ V-003 Hackathon Demo Preset (12h Paced)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pre-stages SOC to 25.08% + 70% solar fault for immediate demo</div>
                </div>
                <span className="badge badge-warning" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold' }}>
                  DEMO MODE
                </span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await resetV003Demo();
                  setStatusMessage('V-003 Reset: Spacecraft restored to 85% SOC nominal baseline state.');
                  setTimeout(() => setStatusMessage(null), 4000);
                }}
                className="btn btn-secondary"
                style={{
                  justifyContent: 'center',
                  width: '100%',
                  fontSize: '12px',
                  borderColor: '#38bdf8',
                  color: '#38bdf8',
                  padding: '7px 12px',
                }}
                title="Reset V-003 demo back to nominal baseline (85% SOC, 24W Solar, 0 Faults)"
              >
                <RotateCcw size={14} /> Reset V-003 & Restore Baseline State
              </button>

              <button
                onClick={() => handlePreset('F-SOLAR-001', 0.7, 400)}
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between', width: '100%', textAlign: 'left', fontSize: '12px' }}
              >
                <span><b>V-003:</b> 70% Solar Array Degradation</span>
                <span className="badge badge-warning">Solar: -70%</span>
              </button>

              <button
                onClick={() => handlePreset('F-THERM-001', 0.6, 500)}
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between', width: '100%', textAlign: 'left', fontSize: '12px' }}
              >
                <span><b>V-008:</b> Radiator Surface Degradation</span>
                <span className="badge badge-warning">Heat Rejection: -60%</span>
              </button>

              <button
                onClick={() => handlePreset('F-ADCS-001', 0.8, 300)}
                className="btn btn-secondary"
                style={{ justifyContent: 'space-between', width: '100%', textAlign: 'left', fontSize: '12px' }}
              >
                <span><b>V-009:</b> Star Tracker Pointing Bias (&gt;2.0°)</span>
                <span className="badge badge-warning">ADCS Bias: 2.4°</span>
              </button>
            </div>
          </div>

          {/* Active Faults in Simulation Table */}
          <div className="aerospace-card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} color="var(--status-critical)" />
                <span style={{ fontWeight: 600, fontSize: '13px' }}>Active Injected Faults ({activeFaults.length})</span>
              </div>
              {activeFaults.length > 0 && (
                <button
                  onClick={() => {
                    setWorkflowStep('DETECT_PROPAGATION');
                    setActiveModule('fault-analysis');
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  Analyze Causal Graph ↗
                </button>
              )}
            </div>

            {activeFaults.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
                No active faults injected. Spacecraft is operating under nominal parameters.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeFaults.map((f) => (
                  <div
                    key={f.fault_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      borderRadius: '4px',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--status-critical)' }}>
                        {f.fault_id} ({f.subsystem})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Severity: {(f.severity * 100).toFixed(0)}% | T+{f.start_time_s}s → T+{f.start_time_s + f.duration_s}s
                      </div>
                    </div>
                    <button
                      onClick={() => clearFault(f.fault_id)}
                      className="btn btn-danger"
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      title="Clear this fault"
                    >
                      <Trash2 size={13} /> Clear
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

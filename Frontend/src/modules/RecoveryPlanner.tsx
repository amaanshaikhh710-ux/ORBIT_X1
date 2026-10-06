import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { RotateCcw, CheckSquare, Square, Play, BarChart2, CheckCircle2, ShieldCheck } from 'lucide-react';

export const RecoveryPlanner: React.FC = () => {
  const { recoveryReport, runRecoverySim, applyRecoveryPolicy, state, setWorkflowStep, user } = useSimulation();
  const [applyingPolicyId, setApplyingPolicyId] = useState<string | null>(null);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  const userRole = user?.role || 'Mission Operator';
  const canApplyPolicy = userRole === 'Flight Director' || userRole === 'Mission Administrator';

  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([
    'R-001',
    'R-002',
    'R-003',
    'R-004',
    'R-005',
    'R-006',
    'R-007',
  ]);
  const [durationS, setDurationS] = useState<number>(600);
  const [loading, setLoading] = useState<boolean>(false);

  const policyMetadata: Record<string, { name: string; desc: string }> = {
    'R-001': { name: 'Reduce Imaging', desc: 'Throttle imaging duty cycle by 50% to save 4.0 W average payload draw' },
    'R-002': { name: 'Payload Safe Mode', desc: 'Immediately shut down optical payload to eliminate 8.0 W payload draw' },
    'R-003': { name: 'Low Power Mode', desc: 'Isolate non-essential loads, halt imaging, and throttle comms to conserve bus power' },
    'R-004': { name: 'Downlink Priority', desc: 'Prioritize telemetry and stored science downlink during ground station passes' },
    'R-005': { name: 'Comm Throttle', desc: 'Reduce RF transmission duty cycle to save up to 7.0 W transceiver draw' },
    'R-006': { name: 'Sunlight Reschedule', desc: 'Reschedule power-intensive operations exclusively during sunlight intervals' },
    'R-007': { name: 'Thermal Throttle', desc: 'Throttle onboard compute to minimize internal thermal rise and heat dissipation' },
  };

  const togglePolicy = (pid: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  const handleSimulate = async () => {
    setLoading(true);
    try {
      await runRecoverySim(selectedPolicies, durationS);
      setWorkflowStep('COMPARE');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPolicy = async (policyId: string) => {
    setApplyingPolicyId(policyId);
    try {
      await applyRecoveryPolicy(policyId);
      setWorkflowStep('RE_SIMULATE');
      setAppliedFeedback(`Policy ${policyId} successfully applied to spacecraft flight software! Spacecraft state updated (Mode: ${policyId}). You can now resume/step simulation to observe improved trajectory.`);
    } catch (e: any) {
      console.error(e);
      setAppliedFeedback(`Error applying policy: ${e.message || e}`);
    } finally {
      setApplyingPolicyId(null);
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="aerospace-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Recovery Policy Multi-Scenario Simulator</span>
            <span className="source-tag">BRANCHING RE-SIMULATION</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Branches from identical baseline state to compare physical metrics of candidate recovery policies without mock bias.
          </div>
        </div>

        <button
          onClick={handleSimulate}
          disabled={loading || selectedPolicies.length === 0}
          className="btn btn-primary"
          style={{ background: 'var(--accent-orange)' }}
        >
          <Play size={15} /> {loading ? 'Re-simulating Scenarios...' : 'Run Multi-Scenario Comparison'}
        </button>
      </div>

      {/* Candidate Policy Selector Card */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Select Candidate Operational Policies</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Simulation Horizon:</span>
            <select
              value={durationS}
              onChange={(e) => setDurationS(Number(e.target.value))}
              style={{ padding: '4px 8px' }}
            >
              <option value="300">300 seconds (5 min)</option>
              <option value="600">600 seconds (10 min)</option>
              <option value="1200">1200 seconds (20 min)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {Object.keys(policyMetadata).map((pid) => {
            const isSelected = selectedPolicies.includes(pid);
            const meta = policyMetadata[pid];

            return (
              <div
                key={pid}
                onClick={() => togglePolicy(pid)}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(249, 115, 22, 0.10)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ marginTop: '2px', color: isSelected ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
                  {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-info">{pid}</span>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{meta.name}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {meta.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Results Table */}
      {recoveryReport ? (
        <div className="aerospace-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={16} color="var(--status-normal)" />
              <span style={{ fontWeight: 600, fontSize: '14px' }}>
                Multi-Scenario Physics Comparison Report (Horizon: {durationS}s)
              </span>
            </div>
            <span className="source-tag">AUTHORITATIVE RESIMULATION TRUTH</span>
          </div>

          {appliedFeedback && (
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid var(--accent-cyan)',
                color: '#38bdf8',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ShieldCheck size={16} />
              <span>{appliedFeedback}</span>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>POLICY ID & NAME</th>
                  <th style={{ padding: '10px 12px' }}>MIN BATTERY SOC</th>
                  <th style={{ padding: '10px 12px' }}>FINAL SOC</th>
                  <th style={{ padding: '10px 12px' }}>MAX TEMP</th>
                  <th style={{ padding: '10px 12px' }}>IMAGES COMPLETED</th>
                  <th style={{ padding: '10px 12px' }}>DOWNLINK</th>
                  <th style={{ padding: '10px 12px' }}>POWER STATE</th>
                  <th style={{ padding: '10px 12px' }}>Δ MIN SOC (vs BASE)</th>
                  <th style={{ padding: '10px 12px' }}>FLIGHT ACTION</th>
                </tr>
              </thead>
              <tbody>
                {/* Unmitigated Baseline Row */}
                <tr style={{ background: 'rgba(239, 68, 68, 0.08)', borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--status-critical)' }}>
                    {recoveryReport.unmitigated_baseline.policy_id}: {recoveryReport.unmitigated_baseline.policy_name}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                    {recoveryReport.unmitigated_baseline.min_battery_soc_pct.toFixed(2)} %
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {recoveryReport.unmitigated_baseline.final_battery_soc_pct.toFixed(2)} %
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {(recoveryReport.unmitigated_baseline.max_internal_temp_c ?? (recoveryReport.unmitigated_baseline as any).max_temperature_c ?? 25).toFixed(2)} °C
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {recoveryReport.unmitigated_baseline.images_completed}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {(recoveryReport.unmitigated_baseline.total_downlinked_mb ?? (recoveryReport.unmitigated_baseline as any).total_data_downlinked_mb ?? 0).toFixed(1)} MB
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className="badge badge-warning">
                      {recoveryReport.unmitigated_baseline.final_power_state || 'EVALUATED'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    BASELINE (0.00%)
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    --
                  </td>
                </tr>

                {/* Candidate Policies Rows */}
                {recoveryReport.recovery_scenarios.map((sc) => {
                  const baseSoc = recoveryReport.unmitigated_baseline.min_battery_soc_pct;
                  const deltaSoc = sc.delta_vs_baseline ? sc.delta_vs_baseline.delta_min_soc_pct : (sc.min_battery_soc_pct - baseSoc);
                  const isPositive = deltaSoc > 0;
                  const maxTemp = sc.max_internal_temp_c ?? (sc as any).max_temperature_c ?? 25;
                  const downlink = sc.total_downlinked_mb ?? (sc as any).total_data_downlinked_mb ?? 0;
                  const powerState = sc.final_power_state || (sc.min_battery_soc_pct > 40 ? 'NORMAL' : 'LOW_POWER');
                  const isActive = state?.recovery_mode === sc.policy_id;

                  return (
                    <tr key={sc.policy_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {sc.policy_id}: {sc.policy_name}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                        {sc.min_battery_soc_pct.toFixed(2)} %
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {sc.final_battery_soc_pct.toFixed(2)} %
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {maxTemp.toFixed(2)} °C
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {sc.images_completed}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {downlink.toFixed(1)} MB
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`badge ${powerState === 'NORMAL' ? 'badge-normal' : 'badge-warning'}`}>
                          {powerState}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          fontWeight: 700,
                          color: isPositive ? 'var(--status-normal)' : 'var(--status-critical)',
                        }}
                      >
                        {isPositive ? `+${deltaSoc.toFixed(2)}%` : `${deltaSoc.toFixed(2)}%`}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isActive ? (
                          <span
                            className="badge badge-normal"
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ShieldCheck size={12} /> ACTIVE
                          </span>
                        ) : (
                          <button
                            onClick={canApplyPolicy ? () => handleApplyPolicy(sc.policy_id) : undefined}
                            disabled={applyingPolicyId !== null || !canApplyPolicy}
                            className="btn btn-primary"
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              background: canApplyPolicy ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                              borderColor: canApplyPolicy ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
                              color: canApplyPolicy ? '#fff' : '#64748b',
                              opacity: canApplyPolicy ? 1 : 0.45,
                              cursor: canApplyPolicy ? 'pointer' : 'not-allowed',
                              whiteSpace: 'nowrap',
                            }}
                            title={
                              canApplyPolicy
                                ? "Execute this recovery policy on the live spacecraft flight software"
                                : "Flight Director or Mission Administrator privilege required to execute live recovery commands"
                            }
                          >
                            {applyingPolicyId === sc.policy_id ? 'Applying...' : canApplyPolicy ? 'Execute Policy' : 'Director Locked'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--status-normal)', marginBottom: '4px' }}>
              <CheckCircle2 size={15} /> Flight Operator Recommendation Analysis
            </div>
            <div>
              Policies are evaluated by their actual measured state bounds. Compare <b>Min SOC preservation</b> against <b>Mission Science Yield</b> (scenes collected) to pick the optimum trade-off according to current flight rules.
            </div>
          </div>
        </div>
      ) : (
        <div className="aerospace-card" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Click "Run Multi-Scenario Comparison" above to branch from the current spacecraft baseline and execute the candidate recovery re-simulations.
        </div>
      )}
    </div>
  );
};

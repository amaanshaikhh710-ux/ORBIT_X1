import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import {
  RotateCcw,
  CheckSquare,
  Square,
  Play,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Battery,
  Sun,
  Thermometer,
} from 'lucide-react';

export const RecoveryPlanner: React.FC = () => {
  const {
    recoveryReport,
    runRecoverySim,
    applyRecoveryPolicy,
    state,
    setWorkflowStep,
    user,
    recordTimelineEvent,
  } = useSimulation();

  const [applyingPolicyId, setApplyingPolicyId] = useState<string | null>(null);
  const [selectedSinglePolicy, setSelectedSinglePolicy] = useState<string>('R-002');
  const [appliedFeedback, setAppliedFeedback] = useState<{
    policyId: string;
    policyName: string;
    power: string;
    battery: string;
    payload: string;
    mission: string;
  } | null>(null);

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

  // Record timeline event when Recovery Planner is opened
  useEffect(() => {
    recordTimelineEvent(
      'RECOVERY_PLANNER_OPENED',
      'Recovery Planner opened by operator to evaluate recovery options',
      'RECOVERY',
      'INFO'
    );
  }, []);

  const policyMetadata: Record<
    string,
    { name: string; simpleDesc: string; powerEffect: string; payloadEffect: string }
  > = {
    'R-001': {
      name: 'Reduce Imaging',
      simpleDesc: 'Reduce camera activity by 50% to save 4.0 W payload power.',
      powerEffect: '+4.0 W margin',
      payloadEffect: 'Throttled (50% yield)',
    },
    'R-002': {
      name: 'Payload Safe Mode',
      simpleDesc: 'Turn off imaging cameras to protect the battery and eliminate 8.0 W draw.',
      powerEffect: '+8.0 W margin',
      payloadEffect: 'Imaging paused',
    },
    'R-003': {
      name: 'Low Power Mode',
      simpleDesc: 'Turn off non-essential systems and halt imaging to conserve bus power.',
      powerEffect: 'Max savings (+10.5 W)',
      payloadEffect: 'Non-essentials shut down',
    },
    'R-004': {
      name: 'Downlink Priority',
      simpleDesc: 'Prioritize communication time to send critical science data during passes.',
      powerEffect: 'Nominal draw',
      payloadEffect: 'High downlink rate',
    },
    'R-005': {
      name: 'Comm Throttle',
      simpleDesc: 'Reduce radio transmission power to save battery.',
      powerEffect: '+4.0 W margin',
      payloadEffect: 'Reduced downlink speed',
    },
    'R-006': {
      name: 'Sunlight Reschedule',
      simpleDesc: 'Only run high-power tasks when spacecraft is in full sunlight.',
      powerEffect: 'Solar synchronized',
      payloadEffect: 'Sunlight-only imaging',
    },
    'R-007': {
      name: 'Thermal Throttle',
      simpleDesc: 'Slow down processors to reduce spacecraft heat.',
      powerEffect: '+2.0 W margin',
      payloadEffect: 'Processor throttled',
    },
  };

  const togglePolicy = (pid: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  const handleSelectOption = (pid: string) => {
    setSelectedSinglePolicy(pid);
    recordTimelineEvent(
      'RECOVERY_OPTION_SELECTED',
      `Operator selected candidate recovery option: ${policyMetadata[pid]?.name || pid}`,
      'RECOVERY',
      'INFO'
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
      await recordTimelineEvent(
        'RECOVERY_EXECUTED',
        `Recovery action applied: ${policyMetadata[policyId]?.name || policyId}`,
        'RECOVERY',
        'WARNING'
      );
      await applyRecoveryPolicy(policyId);
      setWorkflowStep('RE_SIMULATE');

      const meta = policyMetadata[policyId];
      setAppliedFeedback({
        policyId,
        policyName: meta?.name || policyId,
        power: 'Improved (Draw reduced, margin restored)',
        battery: 'Stable (Discharge slowed)',
        payload: meta?.payloadEffect || 'Adjusted',
        mission: 'Protected (Spacecraft stabilized)',
      });
    } catch (e: any) {
      console.error(e);
      await recordTimelineEvent(
        'RECOVERY_FAILED',
        `Failed to apply recovery policy ${policyId}: ${e.message || e}`,
        'RECOVERY',
        'CRITICAL'
      );
    } finally {
      setApplyingPolicyId(null);
    }
  };

  const hasFaults = (state?.active_faults_count || 0) > 0;
  const isBatteryLow = (state?.battery_soc_pct || 100) < 40;
  const isPowerDeficit = (state?.power_margin_w || 0) < 0;
  const isTempHigh = (state?.internal_temp_c || 20) > 40;

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. CURRENT PROBLEM (What went wrong?) */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle
              size={18}
              color={hasFaults || isBatteryLow || isPowerDeficit ? 'var(--status-critical)' : 'var(--status-normal)'}
            />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Current Problem (What went wrong?)</span>
          </div>
          <span
            className="badge"
            style={{
              background: hasFaults || isBatteryLow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: hasFaults || isBatteryLow ? '#f87171' : '#34d399',
              border: `1px solid ${hasFaults || isBatteryLow ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            }}
          >
            {hasFaults ? `${state?.active_faults_count} ACTIVE FAULT(S)` : 'NOMINAL FLIGHT STATE'}
          </span>
        </div>

        {/* Live Spacecraft Metrics Baseline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Sun size={13} color="#38bdf8" /> SOLAR POWER GENERATED
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '4px' }}>
              {(state?.solar_generation_w ?? 0).toFixed(1)} W
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Environment: {state?.environment_state || 'SUNLIGHT'}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Battery size={13} color={(state?.battery_soc_pct || 100) < 30 ? '#f87171' : '#22c55e'} /> BATTERY LEVEL
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: (state?.battery_soc_pct || 100) < 30 ? '#f87171' : (state?.battery_soc_pct || 100) < 50 ? '#f59e0b' : '#22c55e',
                marginTop: '4px',
              }}
            >
              {(state?.battery_soc_pct ?? 0).toFixed(1)} %
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {(state?.battery_power_w ?? 0) < 0
                ? `Discharging (${Math.abs(state?.battery_power_w ?? 0).toFixed(1)} W)`
                : `Charging (${(state?.battery_power_w ?? 0).toFixed(1)} W)`}
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Zap size={13} color="#f59e0b" /> POWER USED
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: '4px' }}>
              {(state?.total_power_consumption_w ?? 0).toFixed(1)} W
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Margin: {(state?.power_margin_w ?? 0).toFixed(1)} W
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Thermometer size={13} color={(state?.internal_temp_c || 20) > 40 ? '#f87171' : '#38bdf8'} /> TEMPERATURE
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#E2E8F0', marginTop: '4px' }}>
              {(state?.internal_temp_c ?? 0).toFixed(1)} °C
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              State: {state?.thermal_state || 'NOMINAL'}
            </div>
          </div>
        </div>

        {/* Plain Language Situation Assessment & Mission Impact */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '6px',
            background: hasFaults || isBatteryLow ? 'rgba(239, 68, 68, 0.06)' : 'rgba(56, 189, 248, 0.06)',
            border: `1px solid ${hasFaults || isBatteryLow ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)'}`,
            fontSize: '12.5px',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 600, color: hasFaults || isBatteryLow ? '#f87171' : '#38bdf8', marginBottom: '4px' }}>
            MISSION IMPACT ASSESSMENT
          </div>
          <div>
            {hasFaults ? (
              <span>
                • Solar array output is degraded or hardware faults are active on the bus.
                <br />
                • The battery is draining to compensate for electrical deficit.
                <br />
                • <strong>Impact:</strong> Optical imaging and non-critical operations may deplete the battery unless power is conserved.
              </span>
            ) : isBatteryLow ? (
              <span>
                • Battery level is below nominal flight threshold ({state?.battery_soc_pct.toFixed(1)}%).
                <br />
                • <strong>Impact:</strong> Non-essential spacecraft systems must be reduced to preserve battery health.
              </span>
            ) : isTempHigh ? (
              <span>
                • Spacecraft temperatures are elevated ({state?.internal_temp_c.toFixed(1)}°C).
                <br />
                • <strong>Impact:</strong> Compute cycles and payload transmitters should be throttled to prevent thermal degradation.
              </span>
            ) : (
              <span>
                • Spacecraft power, thermal, and payload subsystems are operating within nominal limits.
                <br />
                • You can simulate and apply recovery options to test response plans in advance.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. RECOVERY OPTIONS (What can we do?) */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Recovery Options (What can we do?)</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Select options to compare, or pick one to apply directly to the spacecraft.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Horizon:</span>
            <select
              value={durationS}
              onChange={(e) => setDurationS(Number(e.target.value))}
              style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid var(--border-color)', fontSize: '12px' }}
            >
              <option value="300">300 sec (5 min)</option>
              <option value="600">600 sec (10 min)</option>
              <option value="1200">1200 sec (20 min)</option>
            </select>

            <button
              onClick={handleSimulate}
              disabled={loading || selectedPolicies.length === 0}
              className="btn btn-primary"
              style={{ background: 'var(--accent-orange)' }}
              title="Compare all selected options starting from the exact current spacecraft condition"
            >
              <Play size={14} /> {loading ? 'Comparing...' : 'Compare Recovery Options'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {Object.keys(policyMetadata).map((pid) => {
            const isSelectedForSim = selectedPolicies.includes(pid);
            const isSingleSelected = selectedSinglePolicy === pid;
            const meta = policyMetadata[pid];
            const isCurrentlyActiveOnBus = state?.recovery_mode === pid;

            return (
              <div
                key={pid}
                onClick={() => handleSelectOption(pid)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  border: isSingleSelected
                    ? '2px solid var(--accent-cyan)'
                    : isSelectedForSim
                    ? '1px solid rgba(249, 115, 22, 0.4)'
                    : '1px solid var(--border-color)',
                  background: isSingleSelected
                    ? 'rgba(56, 189, 248, 0.08)'
                    : isSelectedForSim
                    ? 'rgba(249, 115, 22, 0.05)'
                    : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-info">{pid}</span>
                    <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>{meta.name}</strong>
                  </div>

                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePolicy(pid);
                    }}
                    title="Include in multi-option comparison"
                    style={{ color: isSelectedForSim ? 'var(--accent-orange)' : 'var(--text-muted)' }}
                  >
                    {isSelectedForSim ? <CheckSquare size={16} /> : <Square size={16} />}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {meta.simpleDesc}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '11px' }}>
                  <span style={{ color: '#38bdf8' }}>{meta.powerEffect}</span>
                  {isCurrentlyActiveOnBus ? (
                    <span className="badge badge-normal" style={{ fontSize: '10px' }}>
                      ACTIVE ON BUS
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Click to pick</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. COMPARE OPTIONS (What will happen?) */}
      {recoveryReport && (
        <div className="aerospace-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Compare Recovery Options (What will happen?)</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Each option is tested from the same spacecraft condition so we can compare the results fairly.
              </div>
            </div>
            <span className="source-tag">EVALUATED FROM CURRENT BASELINE</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>OPTION</th>
                  <th style={{ padding: '10px 12px' }}>POWER</th>
                  <th style={{ padding: '10px 12px' }}>BATTERY</th>
                  <th style={{ padding: '10px 12px' }}>PAYLOAD</th>
                  <th style={{ padding: '10px 12px' }}>MISSION RESULT</th>
                  <th style={{ padding: '10px 12px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {/* Baseline row (No Recovery) */}
                <tr style={{ background: 'rgba(239, 68, 68, 0.08)', borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f87171' }}>
                    No Recovery (Baseline)
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    Deficit ({recoveryReport.unmitigated_baseline.final_power_state || 'UNMITIGATED'})
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                    Min: {recoveryReport.unmitigated_baseline.min_battery_soc_pct.toFixed(1)}% | Final: {recoveryReport.unmitigated_baseline.final_battery_soc_pct.toFixed(1)}%
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {recoveryReport.unmitigated_baseline.images_completed} images
                  </td>
                  <td style={{ padding: '10px 12px', color: '#f87171', fontWeight: 600 }}>
                    Critical Battery Drain
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                    --
                  </td>
                </tr>

                {/* Candidate options rows */}
                {recoveryReport.recovery_scenarios.map((sc) => {
                  const meta = policyMetadata[sc.policy_id];
                  const deltaSoc = sc.min_battery_soc_pct - recoveryReport.unmitigated_baseline.min_battery_soc_pct;
                  const isPositive = deltaSoc >= 0;
                  const isGood = sc.min_battery_soc_pct >= 30;
                  const isActive = state?.recovery_mode === sc.policy_id;

                  return (
                    <tr key={sc.policy_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {sc.policy_id}: {meta?.name || sc.policy_name}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isGood ? 'Improved' : 'Marginal'} ({meta?.powerEffect || 'Stabilized'})
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                        Min: {sc.min_battery_soc_pct.toFixed(1)}% ({isPositive ? `+${deltaSoc.toFixed(1)}%` : `${deltaSoc.toFixed(1)}%`})
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {meta?.payloadEffect || `${sc.images_completed} images`}
                      </td>
                      <td style={{ padding: '10px 12px', color: isGood ? '#34d399' : '#f59e0b', fontWeight: 600 }}>
                        {isGood ? 'Good / Protected' : 'Acceptable'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {isActive ? (
                          <span className="badge badge-normal" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={12} /> APPLIED
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
                              cursor: canApplyPolicy ? 'pointer' : 'not-allowed',
                            }}
                            title={
                              canApplyPolicy
                                ? "Apply this recovery action to live spacecraft simulation"
                                : "Flight Director or Mission Administrator privilege required to execute recovery"
                            }
                          >
                            {applyingPolicyId === sc.policy_id ? 'Applying...' : canApplyPolicy ? 'Apply Recovery' : 'Director Locked'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. APPLY RECOVERY & RESULT (Did it work?) */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>Apply Recovery & Result (Did it work?)</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Execute the selected recovery strategy to immediately modify spacecraft power draw and battery trajectory.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Selected: <strong>{policyMetadata[selectedSinglePolicy]?.name || selectedSinglePolicy}</strong>
            </span>

            <button
              onClick={canApplyPolicy ? () => handleApplyPolicy(selectedSinglePolicy) : undefined}
              disabled={applyingPolicyId !== null || !canApplyPolicy}
              className="btn btn-primary"
              style={{
                background: canApplyPolicy ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                borderColor: canApplyPolicy ? '#059669' : 'rgba(255, 255, 255, 0.1)',
                color: canApplyPolicy ? '#fff' : '#64748b',
                cursor: canApplyPolicy ? 'pointer' : 'not-allowed',
                padding: '8px 16px',
                fontWeight: 700,
              }}
              title={
                canApplyPolicy
                  ? `Apply ${policyMetadata[selectedSinglePolicy]?.name || selectedSinglePolicy} to the spacecraft`
                  : 'Flight Director role required'
              }
            >
              <RotateCcw size={15} /> {applyingPolicyId === selectedSinglePolicy ? 'Applying...' : 'Apply Recovery'}
            </button>
          </div>
        </div>

        {/* Operator Result Card */}
        {appliedFeedback ? (
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>
              <CheckCircle2 size={18} /> RECOVERY COMPLETE
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '12.5px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Action:</span>
                <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '2px' }}>
                  {appliedFeedback.policyId} — {appliedFeedback.policyName}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Power:</span>
                <div style={{ fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>
                  {appliedFeedback.power}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Battery:</span>
                <div style={{ fontWeight: 600, color: '#34d399', marginTop: '2px' }}>
                  {appliedFeedback.battery}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Payload:</span>
                <div style={{ fontWeight: 600, color: '#fbbf24', marginTop: '2px' }}>
                  {appliedFeedback.payload}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Mission:</span>
                <div style={{ fontWeight: 600, color: '#34d399', marginTop: '2px' }}>
                  {appliedFeedback.mission}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            Select any recovery option above and click <strong>Apply Recovery</strong> to execute on the live spacecraft flight software.
          </div>
        )}
      </div>
    </div>
  );
};

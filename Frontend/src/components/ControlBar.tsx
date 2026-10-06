import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Play, Pause, SkipForward, RotateCcw, Zap, Square, FastForward } from 'lucide-react';

export const ControlBar: React.FC = () => {
  const {
    isRunning,
    speed,
    timestep,
    state,
    activeRunId,
    missionStatus,
    start,
    pause,
    end,
    advanceTime,
    step,
    reset,
    resetV003Demo,
    setSpeed,
    setTimestep,
    activateV003Demo,
    user,
  } = useSimulation();

  const [advanceAmount, setAdvanceAmount] = useState<number>(5);
  const [advanceUnit, setAdvanceUnit] = useState<string>('Minutes');
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);

  const userRole = user?.role || 'Mission Operator';
  const canInjectFault = userRole === 'Simulation Engineer' || userRole === 'Mission Administrator';

  const speeds = [1, 5, 10, 25];
  const timesteps = [
    { s: 5, label: '5s Fast' },
    { s: 10, label: '10s Normal' },
    { s: 15, label: '15s Detailed' },
    { s: 20, label: '20s Present' },
  ];

  const formatSimTime = (secs = 0) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleAdvance = async (amount: number, unit: string) => {
    setIsAdvancing(true);
    try {
      await advanceTime(amount, unit);
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '8px 20px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {/* Simulation Stepping & Execution Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {isRunning ? (
          <button
            onClick={pause}
            className="btn btn-secondary"
            style={{ borderColor: 'var(--status-warning)', color: 'var(--status-warning)' }}
            title="Pause continuous simulation"
          >
            <Pause size={15} /> Pause
          </button>
        ) : (
          <button
            onClick={start}
            className="btn btn-primary"
            style={{ background: '#10b981', borderColor: '#059669' }}
            title="Start mission simulation"
          >
            <Play size={15} /> Start Mission
          </button>
        )}

        <button
          onClick={step}
          className="btn btn-secondary"
          title={`Advance single exact ${timestep}-second discrete timestep`}
        >
          <SkipForward size={15} /> Step (+{timestep}s)
        </button>

        {/* End Mission Button */}
        <button
          onClick={() => end('COMPLETED')}
          disabled={missionStatus === 'COMPLETED' || missionStatus === 'ABORTED'}
          className="btn btn-secondary"
          style={{
            borderColor: missionStatus === 'COMPLETED' ? 'rgba(255, 255, 255, 0.1)' : '#ef4444',
            color: missionStatus === 'COMPLETED' ? 'var(--text-muted)' : '#f87171',
            background: missionStatus === 'COMPLETED' ? 'transparent' : 'rgba(239, 68, 68, 0.1)',
            opacity: missionStatus === 'COMPLETED' ? 0.45 : 1,
            cursor: missionStatus === 'COMPLETED' ? 'not-allowed' : 'pointer',
          }}
          title="End active mission, record real wall-clock completion timestamp, and persist final telemetry/events to Mission History"
        >
          <Square size={13} /> End Mission
        </button>

        <button
          onClick={reset}
          className="btn btn-danger"
          title="Reset simulation state to T=0s baseline (preserves completed missions in Mission History)"
        >
          <RotateCcw size={15} /> Reset
        </button>

        <button
          onClick={canInjectFault ? activateV003Demo : undefined}
          disabled={!canInjectFault}
          className="btn btn-secondary"
          style={{
            borderColor: canInjectFault ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
            color: canInjectFault ? '#f59e0b' : '#64748b',
            background: state?.demo_mode === 'V-003_DEMO' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
            fontSize: '12px',
            opacity: canInjectFault ? 1 : 0.45,
            cursor: canInjectFault ? 'pointer' : 'not-allowed',
          }}
          title={
            canInjectFault
              ? "Activate V-003 Hackathon Demo Preset (Pre-staged SOC 25.08% + 70% Solar Degradation)"
              : "Simulation Engineer or Administrator role required to activate fault presets"
          }
        >
          <Zap size={14} color={canInjectFault ? "#f59e0b" : "#64748b"} />
          <span>{state?.demo_mode === 'V-003_DEMO' ? 'V-003 Active' : 'V-003 Demo'}</span>
          {!canInjectFault && ' (Locked)'}
        </button>

        <button
          onClick={resetV003Demo}
          className="btn btn-secondary"
          style={{
            borderColor: '#38bdf8',
            color: '#38bdf8',
            fontSize: '12px',
            cursor: 'pointer',
          }}
          title="Completely reset V-003 demo to nominal baseline (85% SOC, 24W Solar, Nominal EPS, 0 Faults)"
        >
          <RotateCcw size={14} /> Reset V-003
        </button>
      </div>

      {/* Discrete Timestep, Speed, and Manual Advance Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {/* Manual Simulation Time Advance */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '3px 8px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            ADVANCE:
          </span>
          <input
            type="number"
            min="1"
            max="3600"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: '42px',
              padding: '2px 4px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: 'rgba(0, 0, 0, 0.4)',
              color: '#fff',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              textAlign: 'center',
            }}
            title="Amount of simulated mission time to advance"
          />
          <select
            value={advanceUnit}
            onChange={(e) => setAdvanceUnit(e.target.value)}
            style={{
              padding: '2px 4px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: 'rgba(0, 0, 0, 0.4)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
            title="Unit: Seconds, Minutes, or Hours"
          >
            <option value="Seconds">Sec</option>
            <option value="Minutes">Min</option>
            <option value="Hours">Hours</option>
          </select>
          <button
            onClick={() => handleAdvance(advanceAmount, advanceUnit)}
            disabled={isAdvancing || missionStatus === 'COMPLETED'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid var(--accent-cyan)',
              background: 'rgba(39, 199, 255, 0.15)',
              color: '#27C7FF',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: isAdvancing ? 'wait' : 'pointer',
            }}
            title="Advance simulation time forward without waiting real wall-clock time"
          >
            <FastForward size={12} />
            <span>{isAdvancing ? '...' : 'Advance'}</span>
          </button>
        </div>

        {/* Timestep Pacing Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            TIMING:
          </span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {timesteps.map((item) => (
              <button
                key={item.s}
                onClick={() => setTimestep(item.s)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: timestep === item.s ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                  background: timestep === item.s ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: timestep === item.s ? '#fff' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title={`Configure simulation timestep to ${item.s}s`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Speed Multiplier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            SPEED:
          </span>
          <div style={{ display: 'flex', gap: '3px' }}>
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: speed === s ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                  background: speed === s ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: speed === s ? '#fff' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Telemetry Metrics Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MISSION RUN</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>
            {activeRunId}
          </div>
          <div style={{ fontSize: '9px', fontWeight: 600, color: missionStatus === 'COMPLETED' ? '#10b981' : missionStatus === 'RUNNING' ? '#38bdf8' : '#f59e0b' }}>
            ● {missionStatus}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STEP COUNT</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
            #{state?.step_count || 0}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SIM TIME</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
            {formatSimTime(state?.simulation_time_s)}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {(state?.simulation_time_s ?? 0).toFixed(0)}s
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACTIVE FAULTS</div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: (state?.active_faults_count || 0) > 0 ? 'var(--status-critical)' : 'var(--status-normal)',
            }}
          >
            {state?.active_faults_count || 0}
          </div>
        </div>
      </div>
    </div>
  );
};

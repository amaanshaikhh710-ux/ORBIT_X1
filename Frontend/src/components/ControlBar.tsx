import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Play, Pause, SkipForward, RotateCcw, Zap } from 'lucide-react';

export const ControlBar: React.FC = () => {
  const {
    isRunning,
    speed,
    timestep,
    state,
    start,
    pause,
    step,
    reset,
    resetV003Demo,
    setSpeed,
    setTimestep,
    activateV003Demo,
    user,
  } = useSimulation();

  const userRole = user?.role || 'Mission Operator';
  const canInjectFault = userRole === 'Simulation Engineer' || userRole === 'Mission Administrator';

  const speeds = [1, 5, 10, 25];
  const timesteps = [
    { s: 5, label: '5s Fast' },
    { s: 10, label: '10s Normal' },
    { s: 15, label: '15s Detailed' },
    { s: 20, label: '20s Present' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '8px 20px',
        background: 'rgba(7, 12, 23, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.12)',
      }}
    >
      {/* Simulation Stepping & Execution Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {isRunning ? (
          <button
            onClick={pause}
            className="btn"
            style={{
              background: 'rgba(245, 158, 11, 0.16)',
              borderColor: 'rgba(245, 158, 11, 0.5)',
              color: '#fbbf24',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
            title="Pause continuous simulation"
          >
            <Pause size={15} /> Pause
          </button>
        ) : (
          <button
            onClick={start}
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderColor: 'rgba(52, 211, 153, 0.5)',
              color: '#ffffff',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
            }}
            title="Start continuous real-time simulation"
          >
            <Play size={15} /> Start Stream
          </button>
        )}

        <button
          onClick={step}
          className="btn btn-secondary"
          title={`Advance single exact ${timestep}-second discrete timestep`}
        >
          <SkipForward size={15} /> Step (+{timestep}s)
        </button>

        <button
          onClick={reset}
          className="btn btn-danger"
          title="Reset simulation state to T=0s baseline"
        >
          <RotateCcw size={15} /> Reset
        </button>

        <button
          onClick={canInjectFault ? activateV003Demo : undefined}
          disabled={!canInjectFault}
          className="btn btn-secondary"
          style={{
            borderColor: canInjectFault ? 'rgba(212, 175, 55, 0.55)' : 'rgba(255, 255, 255, 0.08)',
            color: canInjectFault ? 'var(--accent-gold)' : '#64748b',
            background: state?.demo_mode === 'V-003_DEMO' ? 'rgba(212, 175, 55, 0.22)' : 'rgba(14, 23, 40, 0.75)',
            fontSize: '12px',
            opacity: canInjectFault ? 1 : 0.45,
            cursor: canInjectFault ? 'pointer' : 'not-allowed',
            boxShadow: state?.demo_mode === 'V-003_DEMO' ? '0 0 10px rgba(212, 175, 55, 0.3)' : 'none',
          }}
          title={
            canInjectFault
              ? "Activate V-003 Hackathon Demo Preset (Pre-staged SOC 25.08% + 70% Solar Degradation)"
              : "Simulation Engineer or Administrator role required to activate fault presets"
          }
        >
          <Zap size={14} color={canInjectFault ? "var(--accent-gold)" : "#64748b"} />
          <span>{state?.demo_mode === 'V-003_DEMO' ? 'V-003 Active' : 'V-003 Demo'}</span>
          {!canInjectFault && ' (Locked)'}
        </button>

        <button
          onClick={resetV003Demo}
          className="btn btn-secondary"
          style={{
            borderColor: 'rgba(212, 175, 55, 0.35)',
            color: 'var(--accent-gold)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
          title="Completely reset V-003 demo to nominal baseline (85% SOC, 24W Solar, Nominal EPS, 0 Faults)"
        >
          <RotateCcw size={14} /> Reset V-003
        </button>
      </div>

      {/* Discrete Timestep & Speed Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {/* Timestep Pacing Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#8493A8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
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
                  border: timestep === item.s ? '1px solid rgba(157, 0, 255, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: timestep === item.s ? 'rgba(157, 0, 255, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                  color: timestep === item.s ? '#ffffff' : '#CBD5E1',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: timestep === item.s ? '0 0 8px rgba(157, 0, 255, 0.25)' : 'none',
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
          <span style={{ fontSize: '11px', color: '#8493A8', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
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
                  border: speed === s ? '1px solid rgba(157, 0, 255, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: speed === s ? 'rgba(157, 0, 255, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                  color: speed === s ? '#ffffff' : '#CBD5E1',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: speed === s ? '0 0 8px rgba(157, 0, 255, 0.25)' : 'none',
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
        <div style={{ textAlign: 'right', padding: '3px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '10px', color: '#8493A8', fontFamily: 'var(--font-mono)', letterSpacing: '0.4px' }}>STEP COUNT</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#F8FAFC', fontSize: '12.5px' }}>
            #{state?.step_count || 0}
          </div>
        </div>
        <div style={{ textAlign: 'right', padding: '3px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '10px', color: '#8493A8', fontFamily: 'var(--font-mono)', letterSpacing: '0.4px' }}>SIM TIME</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-gold)', fontSize: '12.5px' }}>
            {(state?.simulation_time_s ?? 0).toFixed(0)} s
          </div>
        </div>
        <div style={{ textAlign: 'right', padding: '3px 8px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '10px', color: '#8493A8', fontFamily: 'var(--font-mono)', letterSpacing: '0.4px' }}>ACTIVE FAULTS</div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '12.5px',
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

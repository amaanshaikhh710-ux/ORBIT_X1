import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Play, Pause, SkipForward, RotateCcw, Zap } from 'lucide-react';

export const ControlBar: React.FC = () => {
  const { isRunning, speed, state, start, pause, step, reset, setSpeed, activateV003Demo, user } = useSimulation();

  const userRole = user?.role || 'Mission Operator';
  const canInjectFault = userRole === 'Simulation Engineer' || userRole === 'Mission Administrator';

  const speeds = [1, 5, 10, 25];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: 'rgba(12, 17, 29, 0.95)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {/* Simulation Stepping & Execution Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            title="Start continuous real-time simulation"
          >
            <Play size={15} /> Start Stream
          </button>
        )}

        <button
          onClick={step}
          className="btn btn-secondary"
          title="Advance single exact 10-second discrete timestep"
        >
          <SkipForward size={15} /> Step (+10s)
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
            borderColor: canInjectFault ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)',
            color: canInjectFault ? '#f59e0b' : '#64748b',
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
          <Zap size={14} color={canInjectFault ? "#f59e0b" : "#64748b"} /> V-003 Demo {!canInjectFault && '(Locked)'}
        </button>
      </div>

      {/* Speed Multiplier Gating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          SPEED MULTIPLIER:
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: speed === s ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                background: speed === s ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: speed === s ? '#fff' : 'var(--text-secondary)',
                fontSize: '12px',
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

      {/* Telemetry Metrics Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STEP COUNT</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
            #{state?.step_count || 0}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SIM TIME</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
            {(state?.simulation_time_s ?? 0).toFixed(0)} s
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

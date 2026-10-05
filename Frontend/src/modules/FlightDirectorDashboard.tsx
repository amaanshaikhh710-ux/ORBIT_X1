import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { RecoveryPlanner } from './RecoveryPlanner';
import {
  Compass,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Thermometer,
  Navigation,
  ArrowRight,
} from 'lucide-react';

export const FlightDirectorDashboard: React.FC = () => {
  const { state, user, setActiveModule } = useSimulation();

  const batterySoc = state?.battery_soc_pct ?? 0;
  const internalTemp = state?.internal_temp_c ?? 0;
  const pointingError = state?.adcs_pointing_error_deg ?? 0;
  const activeFaults = state?.active_faults_count ?? 0;

  const socViolation = batterySoc < 25.0;
  const tempViolation = internalTemp > 40.0;
  const pointingViolation = pointingError > 2.0;
  const hasViolations = socViolation || tempViolation || pointingViolation || activeFaults > 0;

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
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
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
              background: 'linear-gradient(135deg, #A855F7, #7E22CE)',
              color: '#FFFFFF',
              boxShadow: '0 0 16px rgba(168, 85, 247, 0.4)',
            }}
          >
            <Compass size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '0.4px', color: '#FFFFFF' }}>
                Flight Director Console
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(168, 85, 247, 0.25)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  color: '#E9D5FF',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.5px',
                }}
              >
                DECISION & RECOVERY AUTHORITY
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#94A3B8', marginTop: '3px' }}>
              Operator: {user?.username || 'flight_director'} · Authority to execute live recovery commands (R-001 through R-007) and manage flight safety envelopes
            </div>
          </div>
        </div>

        {/* Quick Cross-Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveModule('mission-control')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#CBD5E1',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <span>Operator Telemetry</span>
            <ArrowRight size={13} />
          </button>
          <button
            onClick={() => setActiveModule('digital-twin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#CBD5E1',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <span>3D Satellite View</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 2. Flight Safety Envelope Status */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {/* Battery SOC Envelope */}
        <div
          style={{
            padding: '16px',
            background: 'var(--card-bg)',
            border: socViolation ? '1px solid #EF4444' : '1px solid var(--border-color)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              BATTERY SOC ENVELOPE
            </span>
            <Zap size={14} color={socViolation ? '#EF4444' : '#4ADE80'} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: socViolation ? '#EF4444' : '#4ADE80', marginTop: '6px' }}>
            {batterySoc.toFixed(1)} %
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
            Threshold: ≥ 25.0% · Status: {socViolation ? 'CRITICAL DEPLETION' : 'NOMINAL RESERVE'}
          </div>
        </div>

        {/* Thermal Envelope */}
        <div
          style={{
            padding: '16px',
            background: 'var(--card-bg)',
            border: tempViolation ? '1px solid #EF4444' : '1px solid var(--border-color)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              INTERNAL THERMAL LIMIT
            </span>
            <Thermometer size={14} color={tempViolation ? '#EF4444' : '#38BDF8'} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: tempViolation ? '#EF4444' : '#38BDF8', marginTop: '6px' }}>
            {internalTemp.toFixed(1)} °C
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
            Threshold: ≤ 40.0°C · Dissipation: {(state?.total_heat_dissipation_w ?? 0).toFixed(1)} W
          </div>
        </div>

        {/* ADCS Pointing Precision */}
        <div
          style={{
            padding: '16px',
            background: 'var(--card-bg)',
            border: pointingViolation ? '1px solid #F59E0B' : '1px solid var(--border-color)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ADCS POINTING ACCURACY
            </span>
            <Navigation size={14} color={pointingViolation ? '#F59E0B' : '#4ADE80'} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: pointingViolation ? '#F59E0B' : '#4ADE80', marginTop: '6px' }}>
            {pointingError.toFixed(2)} °
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
            Limit: ≤ 2.0° · Quality: {state?.adcs_quality || 'NOMINAL'}
          </div>
        </div>

        {/* Anomaly & Decision Escalation */}
        <div
          style={{
            padding: '16px',
            background: 'var(--card-bg)',
            border: hasViolations ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              DIRECTIVE ESCALATION
            </span>
            {hasViolations ? <AlertTriangle size={14} color="#EF4444" /> : <ShieldCheck size={14} color="#4ADE80" />}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: hasViolations ? '#F87171' : '#4ADE80', marginTop: '6px' }}>
            {hasViolations ? 'ACTION REQUIRED' : 'ENVELOPE NOMINAL'}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
            Active faults: {activeFaults} · Select & execute mitigation below
          </div>
        </div>
      </div>

      {/* 3. Embedded Multi-Scenario Recovery Planner */}
      <div style={{ marginTop: '16px' }}>
        <RecoveryPlanner />
      </div>
    </div>
  );
};

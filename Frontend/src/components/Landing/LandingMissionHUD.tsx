import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Activity, BatteryCharging, Sun, Thermometer, Radio } from 'lucide-react';

/**
 * LandingMissionHUD — Subtle, compact aerospace mission status HUD for the hero
 * Uses safe read-only telemetry from SimulationContext with reliable presentation fallbacks.
 */
export const LandingMissionHUD: React.FC = () => {
  const { state } = useSimulation();

  // Safe read-only telemetry data with aerospace presentation defaults
  const batterySoc =
    state?.battery_soc_pct != null ? `${Math.round(state.battery_soc_pct)}%` : '85%';
  const solarGen =
    state?.solar_generation_w != null ? `${state.solar_generation_w.toFixed(1)} W` : '24.2 W';
  const internalTemp =
    state?.internal_temp_c != null ? `${state.internal_temp_c.toFixed(1)}°C` : '20.4°C';
  const commsStatus = state?.comm_link_state ? String(state.comm_link_state) : 'NOMINAL';

  return (
    <div
      style={{
        marginTop: '28px',
        padding: '16px 20px',
        background: 'rgba(8, 14, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(212, 175, 55, 0.22)',
        borderRadius: '10px',
        boxShadow: '0 12px 32px rgba(2, 6, 15, 0.65), 0 0 16px rgba(212, 175, 55, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        maxWidth: '440px',
        fontFamily: 'var(--font-mono)',
        userSelect: 'none',
      }}
    >
      {/* HUD Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '10px',
          borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={13} color="var(--accent-gold)" />
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '1px',
              color: '#94A3B8',
              textTransform: 'uppercase',
            }}
          >
            MISSION AVIONICS HUD
          </span>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10.5px',
            fontWeight: 700,
            color: 'var(--status-normal)',
            letterSpacing: '0.6px',
          }}
        >
          <span
            className="live-beacon"
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block',
            }}
          />
          NOMINAL
        </div>
      </div>

      {/* Orbit & Simulation Sub-Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          marginBottom: '12px',
          padding: '4px 8px',
          background: 'rgba(212, 175, 55, 0.06)',
          borderRadius: '4px',
          border: '1px solid rgba(212, 175, 55, 0.15)',
        }}
      >
        <span style={{ color: '#F8FAFC', fontWeight: 600, letterSpacing: '0.4px' }}>ORBIT-X1 (LEO 550KM)</span>
        <span style={{ color: 'var(--accent-gold)', fontSize: '10px', letterSpacing: '0.5px', fontWeight: 600 }}>
          STREAM ACTIVE
        </span>
      </div>

      {/* 2x2 Telemetry Telemetry Metric Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px 16px',
        }}
      >
        {/* Battery */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8' }}>
            <BatteryCharging size={12} color="var(--accent-gold)" />
            Battery
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--accent-gold)' }}>{batterySoc}</span>
        </div>

        {/* Solar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8' }}>
            <Sun size={12} color="var(--accent-gold)" />
            Solar
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--accent-gold)' }}>{solarGen}</span>
        </div>

        {/* Temperature */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8' }}>
            <Thermometer size={12} color="#B026FF" />
            Temp
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#F8FAFC' }}>{internalTemp}</span>
        </div>

        {/* Comms */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8' }}>
            <Radio size={12} color="#B026FF" />
            Comms
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#34d399' }}>{commsStatus}</span>
        </div>
      </div>
    </div>
  );
};

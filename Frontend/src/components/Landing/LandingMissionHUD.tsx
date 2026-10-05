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
        padding: '14px 18px',
        background: 'rgba(5, 12, 24, 0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(39, 199, 255, 0.22)',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        maxWidth: '420px',
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
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={13} color="#27C7FF" />
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 600,
              letterSpacing: '1px',
              color: '#94A3B8',
              textTransform: 'uppercase',
            }}
          >
            MISSION STATUS
          </span>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '10.5px',
            fontWeight: 700,
            color: '#27D17F',
            letterSpacing: '0.6px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#27D17F',
              boxShadow: '0 0 8px #27D17F',
              display: 'inline-block',
            }}
          />
          OPERATIONAL
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
        }}
      >
        <span style={{ color: '#F5F8FC', fontWeight: 600, letterSpacing: '0.4px' }}>ORBIT-X1</span>
        <span style={{ color: '#27C7FF', opacity: 0.85, fontSize: '10px', letterSpacing: '0.5px' }}>
          SIMULATION ACTIVE
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8' }}>
            <BatteryCharging size={12} color="#27C7FF" />
            Battery
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#F5F8FC' }}>{batterySoc}</span>
        </div>

        {/* Solar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8' }}>
            <Sun size={12} color="#27C7FF" />
            Solar
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#F5F8FC' }}>{solarGen}</span>
        </div>

        {/* Temperature */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8' }}>
            <Thermometer size={12} color="#27C7FF" />
            Temperature
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#F5F8FC' }}>{internalTemp}</span>
        </div>

        {/* Comms */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8' }}>
            <Radio size={12} color="#27C7FF" />
            Comms
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#27D17F' }}>{commsStatus}</span>
        </div>
      </div>
    </div>
  );
};

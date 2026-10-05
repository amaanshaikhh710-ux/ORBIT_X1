import React from 'react';
import type { CanonicalSpacecraftState } from '../../types/simulation';
import { ComponentPreviewGraphic } from './ComponentPreviewGraphic';
import { Sun, Battery, Camera, Radio, Compass, Box, X } from 'lucide-react';

interface ComponentDetailPanelProps {
  component: string;
  state: CanonicalSpacecraftState | null;
  onClose: () => void;
}

export const ComponentDetailPanel: React.FC<ComponentDetailPanelProps> = ({ component, state, onClose }) => {
  const getHeaderIcon = () => {
    switch (component) {
      case 'solar':
        return <Sun size={18} color="#f59e0b" />;
      case 'battery':
        return <Battery size={18} color="#10b981" />;
      case 'payload':
        return <Camera size={18} color="#38bdf8" />;
      case 'comm':
        return <Radio size={18} color="#38bdf8" />;
      case 'adcs':
        return <Compass size={18} color="#a855f7" />;
      case 'bus':
      default:
        return <Box size={18} color="#38bdf8" />;
    }
  };

  const getTitle = () => {
    switch (component) {
      case 'solar':
        return 'COMPONENT: SOLAR';
      case 'battery':
        return 'COMPONENT: BATTERY';
      case 'payload':
        return 'COMPONENT: PAYLOAD';
      case 'comm':
        return 'COMPONENT: COMM / ANTENNA';
      case 'adcs':
        return 'COMPONENT: ADCS';
      case 'bus':
      default:
        return 'COMPONENT: BUS';
    }
  };

  return (
    <div
      style={{
        width: '360px',
        background: 'rgba(9, 14, 26, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: '10px',
        padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.1)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getHeaderIcon()}
          <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.8px', color: '#f8fafc' }}>
            {getTitle()}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
          }}
          title="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Visual Component Preview Graphic */}
      <ComponentPreviewGraphic component={component} />

      {/* Real-time Telemetry Data Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
        {component === 'solar' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subsystem</span>
              <span style={{ fontWeight: 500 }}>Electrical Power System (Solar Array)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Solar Health</span>
              <span style={{ fontWeight: 600, color: (state?.solar_health || 1.0) >= 0.8 ? 'var(--status-normal)' : 'var(--status-warning)' }}>
                {((state?.solar_health || 1.0) * 100).toFixed(1)} %
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Peak Capacity</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>24.0 W (Nominal)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Current Generation</span>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>{state?.solar_generation_w.toFixed(2)} W</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Sunlight Status</span>
              <span style={{ fontWeight: 600, color: state?.in_sunlight ? 'var(--status-normal)' : 'var(--status-critical)' }}>
                {state?.in_sunlight ? 'Direct Sunlight' : 'Eclipse'}
              </span>
            </div>
          </>
        )}

        {component === 'battery' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subsystem</span>
              <span style={{ fontWeight: 500 }}>Li-Ion Energy Storage Subsystem</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>State of Charge (SOC)</span>
              <span style={{ fontWeight: 600, color: (state?.battery_soc_pct || 100) > 40 ? 'var(--status-normal)' : (state?.battery_soc_pct || 100) > 20 ? 'var(--status-warning)' : 'var(--status-critical)' }}>
                {state?.battery_soc_pct.toFixed(2)} %
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Capacity</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>72 Wh</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Stored Energy</span>
              <span style={{ fontWeight: 600 }}>{state?.battery_stored_wh.toFixed(2)} Wh</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Battery Net Power</span>
              <span
                style={{
                  fontWeight: 600,
                  color: (state?.battery_power_w ?? 0) < -0.1 ? 'var(--status-warning)' : (state?.battery_power_w ?? 0) > 0.1 ? 'var(--status-normal)' : 'var(--text-muted)',
                }}
              >
                {(state?.battery_power_w ?? 0) >= 0 ? '+' : ''}{(state?.battery_power_w ?? 0).toFixed(2)} W ({((state?.battery_power_w ?? 0) < -0.1 ? 'Discharging' : (state?.battery_power_w ?? 0) > 0.1 ? 'Charging' : 'Idle')})
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Power State</span>
              <span className={`badge badge-${state?.power_state === 'NORMAL' ? 'normal' : 'warning'}`}>
                {state?.power_state || 'NORMAL'}
              </span>
            </div>
          </>
        )}

        {component === 'payload' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subsystem</span>
              <span style={{ fontWeight: 500 }}>High-Resolution Optical Imager</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Payload State</span>
              <span className="badge badge-info">{state?.payload_state || 'IDLE'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Images Completed</span>
              <span style={{ fontWeight: 600, color: 'var(--status-normal)' }}>{state?.images_completed || 0} scenes</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Images Deferred</span>
              <span style={{ fontWeight: 600, color: (state?.images_deferred || 0) > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}>
                {state?.images_deferred || 0} scenes
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Payload Power</span>
              <span style={{ fontWeight: 600 }}>
                {state?.payload_state === 'IMAGING' ? '8.00 W' : state?.payload_state === 'PROCESSING' ? '4.50 W' : '0.00 W'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Imaging Status</span>
              <span style={{ fontWeight: 600, color: state?.payload_state === 'IMAGING' ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                {state?.payload_state === 'IMAGING' ? 'Active Acquisition' : state?.payload_state === 'PROCESSING' ? 'Compressing & Storing' : 'Standby / Idle'}
              </span>
            </div>
          </>
        )}

        {component === 'comm' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subsystem</span>
              <span style={{ fontWeight: 500 }}>X-Band RF Communications Subsystem</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Communication State</span>
              <span className="badge badge-info">{state?.comm_link_state || 'IDLE'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Downlink Rate</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{state?.downlink_data_rate_mbps.toFixed(2)} Mbps</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Packet Loss</span>
              <span style={{ fontWeight: 600, color: (state?.packet_loss_pct || 0) > 5 ? 'var(--status-critical)' : 'var(--status-normal)' }}>
                {state?.packet_loss_pct.toFixed(2)} %
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Signal / Link State</span>
              <span style={{ fontWeight: 600, color: state?.ground_station_visible ? 'var(--status-normal)' : 'var(--text-muted)' }}>
                {state?.ground_station_visible ? (state.comm_health < 0.8 ? 'Degraded Link' : 'Nominal AOS Svalbard') : 'LOS (No Ground Track)'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Ground Station</span>
              <span style={{ fontWeight: 500 }}>Svalbard (AOS: {state?.ground_station_visible ? 'YES' : 'NO'})</span>
            </div>
          </>
        )}

        {component === 'adcs' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subsystem</span>
              <span style={{ fontWeight: 500 }}>Attitude Determination & Control (ADCS)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pointing Error</span>
              <span style={{ fontWeight: 600, color: (state?.adcs_pointing_error_deg || 0) <= 2.0 ? 'var(--status-normal)' : 'var(--status-critical)' }}>
                {state?.adcs_pointing_error_deg.toFixed(2)}°
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pointing Limit</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>2.00° (Payload Science Gate)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Attitude State</span>
              <span style={{ fontWeight: 600, color: (state?.adcs_pointing_error_deg || 0) <= 2.0 ? 'var(--status-normal)' : 'var(--status-warning)' }}>
                {(state?.adcs_pointing_error_deg || 0) <= 2.0 ? 'Nominal 3-Axis Nadir' : 'Attitude Disturbance / Wobble'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Actuators</span>
              <span style={{ fontWeight: 500 }}>3-Axis Orthogonal Reaction Wheels</span>
            </div>
          </>
        )}

        {component === 'bus' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subsystem</span>
              <span style={{ fontWeight: 500 }}>3U Mechanical Structure & Avionics</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Form Factor</span>
              <span style={{ fontWeight: 600 }}>3U Standard CubeSat (10×10×30 cm)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Mass</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>4.0 kg</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Internal Temperature</span>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>{state?.internal_temp_c.toFixed(2)} °C</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>OBC CPU Utilization</span>
              <span style={{ fontWeight: 600 }}>{(state?.obc_cpu_utilization_pct || 35).toFixed(1)} %</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>OBC Memory (RAM)</span>
              <span style={{ fontWeight: 600 }}>{(state?.obc_memory_utilization_pct || 12).toFixed(1)} %</span>
            </div>
          </>
        )}
      </div>

      {/* Governing Equation Box */}
      <div
        style={{
          marginTop: '6px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '6px',
          padding: '10px 12px',
        }}
      >
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
          Governing Equation
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-cyan)', lineHeight: 1.4 }}>
          {component === 'solar' && 'P_gen = P_peak × solar_health × cos(θ) × (1 - α)'}
          {component === 'battery' && 'SOC(t+Δt) = SOC(t) + (P_chg×0.9 - P_dis/0.9)×Δt / E_cap'}
          {component === 'payload' && 'FSM: IDLE → IMAGING (30s) → PROCESSING (60s) → STORED (35MB)'}
          {component === 'comm' && 'R_eff = R_nominal × comm_health × (1 - packet_loss) [Pass: 600s]'}
          {component === 'adcs' && 'τ_ctrl = -K_p · e_rot - K_d · ω + ω × (I_sat · ω)'}
          {component === 'bus' && 'm·C_p·(dT/dt) = Q_solar + Q_albedo + Q_earth - ε·σ·A·T⁴ + P_elec'}
        </div>
      </div>
    </div>
  );
};

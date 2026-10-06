import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { CubeSat3D } from '../components/DigitalTwin/CubeSat3D';
import {
  Battery,
  Thermometer,
  Radio,
  Camera,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export const MissionControl: React.FC = () => {
  const { state, alerts, setActiveModule } = useSimulation();

  if (!state) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Awaiting spacecraft telemetry stream...
      </div>
    );
  }

  const getPowerBadgeClass = (s: string) => {
    switch (s) {
      case 'NORMAL': return 'badge-normal';
      case 'LOW_POWER': return 'badge-warning';
      case 'CRITICAL':
      case 'SAFE_HOLD': return 'badge-critical';
      default: return 'badge-info';
    }
  };

  const getThermalBadgeClass = (s: string) => {
    switch (s) {
      case 'NOMINAL': return 'badge-normal';
      case 'WARNING': return 'badge-warning';
      case 'CRITICAL': return 'badge-critical';
      default: return 'badge-info';
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 3D Visualizer & Quick Primary Status Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* 3D Digital Twin Live View */}
        <div className="aerospace-card" style={{ padding: '12px', minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.5px' }}>
                SPACECRAFT REAL-TIME 3D DIGITAL TWIN
              </span>
              <span className="source-tag">3U BUS VISUALIZER</span>
              {state.demo_mode && (
                <span className="badge badge-warning" style={{ background: '#f59e0b', color: '#000', fontSize: '11px', fontWeight: 'bold' }}>
                  DEMO MODE: {state.demo_mode}
                </span>
              )}
              {state.recovery_mode && state.recovery_mode !== 'NOMINAL' && (
                <span className="badge badge-normal" style={{ background: 'var(--status-normal)', color: '#fff', fontSize: '11px' }}>
                  POLICY: {state.recovery_mode} ACTIVE
                </span>
              )}
            </div>
            <button
              onClick={() => setActiveModule('digital-twin')}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              Full Screen Twin ↗
            </button>
          </div>
          <div style={{ flex: 1, minHeight: '420px', position: 'relative' }}>
            <CubeSat3D />
          </div>
        </div>

        {/* Primary Subsystem Health Status Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Power & Energy Card */}
          <div className="aerospace-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Battery size={16} color="var(--accent-gold)" />
                <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.3px', color: '#FFFFFF' }}>Electrical Power System (EPS)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {state.recovery_mode && state.recovery_mode !== 'NOMINAL' && (
                  <span className="badge badge-gold" style={{ fontSize: '10px' }}>
                    MODE: {state.recovery_mode}
                  </span>
                )}
                <span className={`badge ${getPowerBadgeClass(state.power_state)}`}>
                  {state.power_state}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ color: '#8493A8', fontSize: '10.5px', fontFamily: 'var(--font-mono)', letterSpacing: '0.4px', marginBottom: '2px' }}>BATTERY SOC</div>
                <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: state.battery_soc_pct > 25 ? '#34d399' : 'var(--status-critical)' }}>
                  {state.battery_soc_pct.toFixed(2)} %
                </div>
                <div className="source-tag" style={{ marginTop: '4px' }}>SIMULATED</div>
              </div>

              <div style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ color: '#8493A8', fontSize: '10.5px', fontFamily: 'var(--font-mono)', letterSpacing: '0.4px', marginBottom: '2px' }}>SOLAR GEN</div>
                <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                  {state.solar_generation_w.toFixed(2)} W
                </div>
                <div className="source-tag" style={{ marginTop: '4px' }}>SIMULATED</div>
              </div>

              <div style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ color: '#8493A8', fontSize: '10.5px', fontFamily: 'var(--font-mono)', letterSpacing: '0.4px', marginBottom: '2px' }}>STORED ENERGY</div>
                <div style={{ fontSize: '17px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-gold)' }}>
                  {state.battery_stored_wh.toFixed(1)} Wh
                </div>
                <div style={{ fontSize: '10px', color: '#8493A8', marginTop: '4px' }}>/ {(state.battery_capacity_wh || 72.0).toFixed(1)} Wh</div>
              </div>
            </div>

            {/* SOC Progress Bar */}
            <div style={{ marginTop: '12px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, state.battery_soc_pct))}%`,
                  background: state.battery_soc_pct > 40 ? 'var(--status-normal)' : state.battery_soc_pct > 20 ? 'var(--status-warning)' : 'var(--status-critical)',
                  boxShadow: state.battery_soc_pct > 25 ? '0 0 8px rgba(16, 185, 129, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Thermal Subsystem Card */}
          <div className="aerospace-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Thermometer size={16} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 600 }}>Thermal Subsystem</span>
              </div>
              <span className={`badge ${getThermalBadgeClass(state.thermal_state)}`}>
                {state.thermal_state}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>INTERNAL TEMP</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: state.internal_temp_c < 45 ? 'var(--status-normal)' : 'var(--status-critical)' }}>
                  {state.internal_temp_c.toFixed(2)} °C
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Warn: &gt;45°C | Crit: &gt;50°C</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>HEAT DISSIPATION</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {state.total_heat_dissipation_w.toFixed(2)} W
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>SUNLIGHT STATE</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: state.in_sunlight ? '#f59e0b' : '#38bdf8' }}>
                  {state.in_sunlight ? 'SUNLIGHT' : 'ECLIPSE'}
                </div>
              </div>
            </div>
          </div>

          {/* Communications Subsystem Card */}
          <div className="aerospace-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={16} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 600 }}>RF Communications</span>
              </div>
              <span className="badge badge-info">{state.comm_link_state}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>DOWNLINK RATE</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {state.downlink_data_rate_mbps.toFixed(2)} Mbps
                </div>
                <div className="source-tag">SIMULATED</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>TOTAL DOWNLINKED</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {state.total_downlinked_data_mb.toFixed(1)} MB
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>PACKET LOSS</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {state.packet_loss_pct.toFixed(2)} %
                </div>
              </div>
            </div>
          </div>

          {/* Optical Payload & Storage */}
          <div className="aerospace-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 600 }}>Payload & Storage</span>
              </div>
              <span className="badge badge-info">{state.payload_state}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>COMPLETED</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--status-normal)' }}>
                  {state.images_completed}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>DEFERRED</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: state.images_deferred > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}>
                  {state.images_deferred}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>STORAGE USED</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {state.storage_used_mb.toFixed(1)} MB
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>ADCS ERROR</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: state.adcs_pointing_error_deg <= 2.0 ? 'var(--status-normal)' : 'var(--status-critical)' }}>
                  {state.adcs_pointing_error_deg.toFixed(2)}°
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Objectives & Events Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Objectives Progress */}
        <div className="aerospace-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <CheckCircle size={16} color="var(--status-normal)" />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>Mission Objectives Verification</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Objective 1 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Earth Observation Imagery Acquisition (Target: 20 scenes)</span>
                <span className="font-mono">{state.images_completed} / 20</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (state.images_completed / 20) * 100)}%`, background: 'var(--accent-cyan)' }} />
              </div>
            </div>

            {/* Objective 2 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Science Data Downlinked via Svalbard (Target: 500 MB)</span>
                <span className="font-mono">{state.total_downlinked_data_mb.toFixed(1)} / 500.0 MB</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (state.total_downlinked_data_mb / 500) * 100)}%`, background: 'var(--accent-blue)' }} />
              </div>
            </div>

            {/* Objective 3 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Maintain Battery Reserve &gt; 25% (Safety Threshold)</span>
                <span className="font-mono" style={{ color: state.battery_soc_pct > 25 ? 'var(--status-normal)' : 'var(--status-critical)' }}>
                  {state.battery_soc_pct.toFixed(2)} % ({state.battery_soc_pct > 25 ? 'MET' : 'VIOLATION'})
                </span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, state.battery_soc_pct)}%`, background: state.battery_soc_pct > 25 ? 'var(--status-normal)' : 'var(--status-critical)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Live Operational Alerts Feed */}
        <div className="aerospace-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="var(--status-warning)" />
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Operational Alerts & Events</span>
            </div>
            <button
              onClick={() => setActiveModule('timeline')}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              Full Timeline ↗
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                All systems nominal. No active anomalies or alert flags.
              </div>
            ) : (
              alerts.slice(0, 5).map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '4px',
                    borderLeft: `3px solid ${a.severity === 'CRITICAL' ? 'var(--status-critical)' : 'var(--status-warning)'}`,
                  }}
                >
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    T+{(a.simulation_time_s ?? a.timestamp_s ?? 0).toFixed(0)}s
                  </span>
                  <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`}>
                    {a.subsystem}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    {a.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import { BookOpen, ShieldCheck, Table, Code2 } from 'lucide-react';

export const Documentation: React.FC = () => {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="aerospace-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Engineering Documentation & Parameter Registers</span>
            <span className="source-tag">AUTHORITATIVE BASELINE</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Full transparency into governing physics equations, subsystem dependencies, and epistemic source classifications.
          </div>
        </div>
      </div>

      {/* Epistemic Classifications Card */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <ShieldCheck size={16} color="var(--status-normal)" />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Epistemic Telemetry Classifications</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', fontSize: '12px' }}>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--accent-cyan)' }}>
            <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              SIMULATED
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Values computed dynamically step-by-step from governing differential or algebraic physics equations (e.g. Battery SOC, Internal Temp, Downlink data volume).
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--status-warning)' }}>
            <div style={{ fontWeight: 600, color: 'var(--status-warning)', marginBottom: '4px' }}>
              REFERENCE-RANGE
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Nominal operational bands, safety thresholds, and datasheet limits derived from published flight CubeSat missions (e.g. 20-25°C nominal thermal range, 25% min reserve).
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: '3px solid var(--text-muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
              MODEL_ASSUMPTION
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Simplifying engineering assumptions explicitly registered to avoid false fidelity (e.g. lumped single-node thermal mass, constant 90% power converter efficiency).
            </div>
          </div>
        </div>
      </div>

      {/* Subsystem Equations Summary */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Code2 size={16} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Authoritative Governing Equations (18_ENGINEERING_BASELINE.md)</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>// 1. Power Generation & SOC</span>
            <div style={{ color: 'var(--text-primary)', marginTop: '4px' }}>
              P_gen = P_peak × solar_health × max(0, cos(solar_incidence_angle)) × (1 - 0.004 × (T - 25°C))<br />
              SOC(t + Δt) = SOC(t) + [(P_charge × η_chg) - (P_discharge / η_dis)] × (Δt / E_usable) × 100
            </div>
          </div>

          <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>// 2. Lumped-Capacitance Thermal Model</span>
            <div style={{ color: 'var(--text-primary)', marginTop: '4px' }}>
              C × (dT / dt) = Q_internal + Q_solar_abs - Q_radiated<br />
              T(t + Δt) = T(t) + [P_dissipated - h_rad × (T(t) - T_sink)] × (Δt / C_thermal)
            </div>
          </div>

          <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>// 3. Ground Station Pass & Downlink Accounting</span>
            <div style={{ color: 'var(--text-primary)', marginTop: '4px' }}>
              Downlink_Rate = 2.0 Mbps = 0.25 MB/s = 2.5 MB / 10s timestep (nominal)<br />
              Net_Downlink = 2.5 MB × (1 - packet_loss_pct / 100) × comm_health (during AOS window)
            </div>
          </div>
        </div>
      </div>

      {/* Parameter Register Table */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Table size={16} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Spacecraft Bus Parameters (19_ENGINEERING_PARAMETER_REGISTER.csv)</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>PARAMETER</th>
                <th style={{ padding: '8px 12px' }}>VALUE</th>
                <th style={{ padding: '8px 12px' }}>UNIT</th>
                <th style={{ padding: '8px 12px' }}>SUBSYSTEM</th>
                <th style={{ padding: '8px 12px' }}>DESCRIPTION</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)' }}>SOLAR_PEAK_W</td>
                <td style={{ padding: '8px 12px' }}>24.0</td>
                <td style={{ padding: '8px 12px' }}>W</td>
                <td style={{ padding: '8px 12px' }}>Power</td>
                <td style={{ padding: '8px 12px' }}>Deployable solar panel peak normal insolation yield</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)' }}>BATTERY_CAPACITY_WH</td>
                <td style={{ padding: '8px 12px' }}>72.0</td>
                <td style={{ padding: '8px 12px' }}>Wh</td>
                <td style={{ padding: '8px 12px' }}>Power</td>
                <td style={{ padding: '8px 12px' }}>Li-Ion battery pack usable energy capacity (authoritative baseline)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)' }}>STORAGE_CAPACITY_GB</td>
                <td style={{ padding: '8px 12px' }}>8.0</td>
                <td style={{ padding: '8px 12px' }}>GB</td>
                <td style={{ padding: '8px 12px' }}>Storage</td>
                <td style={{ padding: '8px 12px' }}>NAND flash science payload storage</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)' }}>DOWNLINK_RATE_MBPS</td>
                <td style={{ padding: '8px 12px' }}>2.0</td>
                <td style={{ padding: '8px 12px' }}>Mbps</td>
                <td style={{ padding: '8px 12px' }}>Comms</td>
                <td style={{ padding: '8px 12px' }}>X-band transceiver nominal transmission bit rate</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)' }}>COMM_DRAW_W</td>
                <td style={{ padding: '8px 12px' }}>7.0</td>
                <td style={{ padding: '8px 12px' }}>W</td>
                <td style={{ padding: '8px 12px' }}>Comms</td>
                <td style={{ padding: '8px 12px' }}>X-band transmitter RF power draw during active pass</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)' }}>PAYLOAD_DRAW_W</td>
                <td style={{ padding: '8px 12px' }}>8.0</td>
                <td style={{ padding: '8px 12px' }}>W</td>
                <td style={{ padding: '8px 12px' }}>Payload</td>
                <td style={{ padding: '8px 12px' }}>Optical imager power consumption during active capture</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)' }}>HOUSEKEEPING_DRAW_W</td>
                <td style={{ padding: '8px 12px' }}>5.0</td>
                <td style={{ padding: '8px 12px' }}>W</td>
                <td style={{ padding: '8px 12px' }}>Power</td>
                <td style={{ padding: '8px 12px' }}>Baseline platform avionics, ADCS, and sensor idle draw</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)' }}>POINTING_LIMIT_DEG</td>
                <td style={{ padding: '8px 12px' }}>2.0</td>
                <td style={{ padding: '8px 12px' }}>deg</td>
                <td style={{ padding: '8px 12px' }}>ADCS</td>
                <td style={{ padding: '8px 12px' }}>Maximum allowable attitude pointing error for valid imaging</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

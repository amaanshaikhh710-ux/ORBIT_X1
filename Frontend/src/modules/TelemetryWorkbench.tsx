import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Activity, Layers, Download } from 'lucide-react';

export const TelemetryWorkbench: React.FC = () => {
  const { history, telemetry, state, exportTelemetryCsv } = useSimulation();
  const [selectedMetric, setSelectedMetric] = useState<
    'battery_soc_pct' | 'solar_generation_w' | 'internal_temp_c' | 'storage_used_mb' | 'downlink_mbps' | 'adcs_error_deg'
  >('battery_soc_pct');

  const metricConfigs = {
    battery_soc_pct: { label: 'Battery State of Charge', unit: '%', color: '#22c55e', min: 0, max: 100, source: 'SIMULATED' },
    solar_generation_w: { label: 'Solar Array Generation', unit: 'W', color: '#38bdf8', min: 0, max: 25, source: 'SIMULATED' },
    internal_temp_c: { label: 'Internal Spacecraft Temp', unit: '°C', color: '#f59e0b', min: 0, max: 60, source: 'SIMULATED' },
    storage_used_mb: { label: 'Flash Science Storage Used', unit: 'MB', color: '#818cf8', min: 0, max: 8000, source: 'SIMULATED' },
    downlink_mbps: { label: 'X-Band Downlink Rate', unit: 'Mbps', color: '#06b6d4', min: 0, max: 3, source: 'SIMULATED' },
    adcs_error_deg: { label: 'ADCS Pointing Error', unit: 'deg', color: '#ec4899', min: 0, max: 5, source: 'SIMULATED' },
  };

  const config = metricConfigs[selectedMetric];

  // Render SVG time-series chart from history points
  const renderChart = () => {
    if (history.length < 2) {
      return (
        <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Accumulating simulation telemetry history (need at least 2 steps)...
        </div>
      );
    }

    const width = 800;
    const height = 240;
    const padding = { top: 20, right: 30, bottom: 30, left: 50 };

    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const values = history.map((pt) => pt[selectedMetric]);
    const minVal = Math.min(...values, config.min);
    const maxVal = Math.max(...values, config.max > 0 ? config.max : 1);
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const timeMin = history[0].time_s;
    const timeMax = history[history.length - 1].time_s;
    const timeRange = timeMax - timeMin === 0 ? 1 : timeMax - timeMin;

    const points = history.map((pt) => {
      const x = padding.left + ((pt.time_s - timeMin) / timeRange) * plotW;
      const y = padding.top + plotH - ((pt[selectedMetric] - minVal) / valRange) * plotH;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '260px' }}>
        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding.top + plotH * (1 - ratio);
          const val = minVal + ratio * valRange;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                {val.toFixed(1)} {config.unit}
              </text>
            </g>
          );
        })}

        {/* Telemetry line */}
        <polyline
          fill="none"
          stroke={config.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Data points */}
        {history.map((pt, i) => {
          const x = padding.left + ((pt.time_s - timeMin) / timeRange) * plotW;
          const y = padding.top + plotH - ((pt[selectedMetric] - minVal) / valRange) * plotH;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill={config.color}
              stroke="#0a0e17"
              strokeWidth="1.5"
            />
          );
        })}

        {/* X axis labels */}
        <text
          x={padding.left}
          y={height - 8}
          fill="var(--text-muted)"
          fontSize="10"
          fontFamily="var(--font-mono)"
        >
          T+{timeMin}s
        </text>
        <text
          x={width - padding.right}
          y={height - 8}
          fill="var(--text-muted)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          textAnchor="end"
        >
          T+{timeMax}s
        </text>
      </svg>
    );
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Metric Picker */}
      <div className="aerospace-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Telemetry Workbench</span>
            <span className="source-tag">100% SIMULATED TRUTH</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Every parameter originates strictly from the 10-second discrete simulation engine state.
          </div>
        </div>

        {/* Metric Selector Tabs & CSV Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(Object.keys(metricConfigs) as Array<keyof typeof metricConfigs>).map((key) => {
              const isSelected = selectedMetric === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '4px',
                    border: isSelected ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(249, 115, 22, 0.16)' : 'rgba(255, 255, 255, 0.02)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {metricConfigs[key].label} ({metricConfigs[key].unit})
                </button>
              );
            })}
          </div>

          <button
            onClick={exportTelemetryCsv}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '4px',
              border: '1px solid var(--accent-cyan)',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            title="Download authoritative simulation run telemetry CSV with all 23 flight parameters"
          >
            <Download size={14} />
            Export Telemetry (CSV)
          </button>
        </div>
      </div>

      {/* Primary Telemetry Curve Card */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: config.color }}>
              {config.label} vs Simulation Time
            </span>
            <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Latest: {state ? Number(state[selectedMetric as keyof typeof state] || 0).toFixed(2) : '--'} {config.unit}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="source-tag">{config.source}</span>
            <span className="badge badge-normal">SAMPLE: 10s TIMESTEP</span>
          </div>
        </div>

        {renderChart()}
      </div>

      {/* Raw Telemetry Parameter Table */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>Current Telemetry Frame Snapshot</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Showing {telemetry.length} parameters from authoritative engine snapshot
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>PARAM ID</th>
                <th style={{ padding: '8px 12px' }}>SUBSYSTEM</th>
                <th style={{ padding: '8px 12px' }}>NAME</th>
                <th style={{ padding: '8px 12px' }}>VALUE</th>
                <th style={{ padding: '8px 12px' }}>UNIT</th>
                <th style={{ padding: '8px 12px' }}>QUALITY</th>
                <th style={{ padding: '8px 12px' }}>EPISTEMIC SOURCE</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)' }}>{p.parameter_id}</td>
                  <td style={{ padding: '8px 12px' }}>{p.subsystem}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{p.name}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                    {typeof p.value === 'number' ? p.value.toFixed(2) : String(p.value)}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{p.unit || '--'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="badge badge-normal">{p.quality}</span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="source-tag">{p.source}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

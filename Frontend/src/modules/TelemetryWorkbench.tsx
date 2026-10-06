import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Activity, Layers, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const TelemetryWorkbench: React.FC = () => {
  const { history, telemetry, state, exportTelemetryCsv } = useSimulation();

  type MetricKey =
    | 'battery_soc_pct'
    | 'solar_generation_w'
    | 'total_power_consumption_w'
    | 'internal_temp_c'
    | 'downlink_mbps'
    | 'storage_used_mb'
    | 'adcs_error_deg';

  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('battery_soc_pct');

  const metricConfigs: Record<
    MetricKey,
    {
      label: string;
      technicalId: string;
      unit: string;
      color: string;
      min: number;
      max: number;
      description: string;
      warningThreshold?: number;
      thresholdCondition?: 'below' | 'above';
      thresholdLabel?: string;
    }
  > = {
    battery_soc_pct: {
      label: 'Battery Level',
      technicalId: 'EPS-BAT-001',
      unit: '%',
      color: '#22c55e',
      min: 0,
      max: 100,
      description: 'Spacecraft main lithium battery charge percentage',
      warningThreshold: 40,
      thresholdCondition: 'below',
      thresholdLabel: '40% Warning Threshold',
    },
    solar_generation_w: {
      label: 'Solar Power Generated',
      technicalId: 'EPS-SOL-001',
      unit: 'W',
      color: '#38bdf8',
      min: 0,
      max: 28,
      description: 'Total power produced by deployable photovoltaic solar arrays',
      warningThreshold: 10,
      thresholdCondition: 'below',
      thresholdLabel: '10 W Degradation Warning',
    },
    total_power_consumption_w: {
      label: 'Power Used',
      technicalId: 'EPS-BUS-002',
      unit: 'W',
      color: '#f59e0b',
      min: 0,
      max: 25,
      description: 'Total electrical power consumed by all spacecraft loads',
      warningThreshold: 18,
      thresholdCondition: 'above',
      thresholdLabel: '18 W High Load Warning',
    },
    internal_temp_c: {
      label: 'Spacecraft Temperature',
      technicalId: 'TCS-TMP-001',
      unit: '°C',
      color: '#f97316',
      min: 0,
      max: 60,
      description: 'Internal spacecraft equipment bay core temperature',
      warningThreshold: 40,
      thresholdCondition: 'above',
      thresholdLabel: '40°C High Temp Warning',
    },
    downlink_mbps: {
      label: 'Communication Signal',
      technicalId: 'COM-DLK-001',
      unit: 'Mbps',
      color: '#06b6d4',
      min: 0,
      max: 3,
      description: 'Downlink throughput data transmission rate to ground stations',
    },
    storage_used_mb: {
      label: 'Storage Used',
      technicalId: 'OBC-STR-001',
      unit: 'MB',
      color: '#818cf8',
      min: 0,
      max: 8000,
      description: 'Non-volatile memory buffer holding captured science images',
      warningThreshold: 6000,
      thresholdCondition: 'above',
      thresholdLabel: '6000 MB Storage Warning',
    },
    adcs_error_deg: {
      label: 'Pointing Accuracy',
      technicalId: 'ADC-ATT-001',
      unit: 'deg',
      color: '#ec4899',
      min: 0,
      max: 2,
      description: 'Attitude pointing offset error relative to Earth target',
      warningThreshold: 0.5,
      thresholdCondition: 'above',
      thresholdLabel: '0.5° Pointing Warning',
    },
  };

  const config = metricConfigs[selectedMetric];

  // Format simulation seconds to readable T+MM:SS or T+HH:MM:SS
  const formatSimTime = (secs = 0) => {
    const total = Math.max(0, Math.round(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    if (h > 0) {
      return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `T+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentVal =
    state && typeof state[selectedMetric as keyof typeof state] === 'number'
      ? (state[selectedMetric as keyof typeof state] as number)
      : history.length > 0
      ? history[history.length - 1][selectedMetric]
      : 0;

  // Evaluate normal / warning state
  let isWarning = false;
  if (config.warningThreshold !== undefined && config.thresholdCondition) {
    if (config.thresholdCondition === 'below' && currentVal < config.warningThreshold) {
      isWarning = true;
    } else if (config.thresholdCondition === 'above' && currentVal > config.warningThreshold) {
      isWarning = true;
    }
  }

  // Render SVG time-series chart from history points
  const renderChart = () => {
    if (history.length < 2) {
      return (
        <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Accumulating simulation telemetry history (need at least 2 simulation steps)...
        </div>
      );
    }

    const width = 800;
    const height = 260;
    const padding = { top: 25, right: 40, bottom: 40, left: 65 };

    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const values = history.map((pt) => pt[selectedMetric] ?? 0);
    let minVal = Math.min(...values, config.min);
    let maxVal = Math.max(...values, config.max > 0 ? config.max : 1);
    if (config.warningThreshold !== undefined) {
      minVal = Math.min(minVal, config.warningThreshold);
      maxVal = Math.max(maxVal, config.warningThreshold);
    }
    const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const timeMin = history[0].time_s;
    const timeMax = history[history.length - 1].time_s;
    const timeRange = timeMax - timeMin === 0 ? 1 : timeMax - timeMin;

    const points = history.map((pt) => {
      const x = padding.left + ((pt.time_s - timeMin) / timeRange) * plotW;
      const y = padding.top + plotH - (((pt[selectedMetric] ?? 0) - minVal) / valRange) * plotH;
      return `${x},${y}`;
    }).join(' ');

    // Threshold Y position
    let thresholdY: number | null = null;
    if (config.warningThreshold !== undefined) {
      thresholdY = padding.top + plotH - ((config.warningThreshold - minVal) / valRange) * plotH;
    }

    // Time ticks (4 points across the X axis)
    const timeTicks = [0, 0.33, 0.66, 1].map((ratio) => {
      const t = timeMin + ratio * timeRange;
      const x = padding.left + ratio * plotW;
      return { t, x };
    });

    return (
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '270px' }}>
        {/* Horizontal gridlines and Y axis labels */}
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
                stroke="rgba(255,255,255,0.07)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fill="var(--text-muted)"
                fontSize="11"
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                {val.toFixed(1)} {config.unit}
              </text>
            </g>
          );
        })}

        {/* Warning Threshold Line if applicable */}
        {thresholdY !== null && thresholdY >= padding.top && thresholdY <= padding.top + plotH && (
          <g>
            <line
              x1={padding.left}
              y1={thresholdY}
              x2={width - padding.right}
              y2={thresholdY}
              stroke="#f87171"
              strokeDasharray="6 3"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
            <text
              x={width - padding.right}
              y={thresholdY - 5}
              fill="#f87171"
              fontSize="10"
              fontFamily="var(--font-mono)"
              textAnchor="end"
              fontWeight="600"
            >
              ⚠ {config.thresholdLabel || 'Warning Threshold'}
            </text>
          </g>
        )}

        {/* Telemetry Polyline */}
        <polyline
          fill="none"
          stroke={config.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Telemetry Data Dots */}
        {history.map((pt, i) => {
          const x = padding.left + ((pt.time_s - timeMin) / timeRange) * plotW;
          const y = padding.top + plotH - (((pt[selectedMetric] ?? 0) - minVal) / valRange) * plotH;
          const isLatest = i === history.length - 1;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={isLatest ? 4.5 : 2.5}
              fill={isLatest ? '#FFFFFF' : config.color}
              stroke={config.color}
              strokeWidth={isLatest ? 2 : 1}
            />
          );
        })}

        {/* X Axis Time Ticks (Simulation Time T+...) */}
        {timeTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={tick.x}
              y1={padding.top + plotH}
              x2={tick.x}
              y2={padding.top + plotH + 5}
              stroke="rgba(255,255,255,0.2)"
            />
            <text
              x={tick.x}
              y={padding.top + plotH + 20}
              fill="var(--text-muted)"
              fontSize="11"
              fontFamily="var(--font-mono)"
              textAnchor={i === 0 ? 'start' : i === timeTicks.length - 1 ? 'end' : 'middle'}
            >
              {formatSimTime(tick.t)}
            </text>
          </g>
        ))}

        {/* Axis Titles */}
        <text
          x={width / 2}
          y={height - 5}
          fill="var(--text-muted)"
          fontSize="10"
          fontFamily="var(--font-mono)"
          textAnchor="middle"
        >
          SIMULATION TIME (INTERNAL CLOCK)
        </text>
      </svg>
    );
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Quick Selector */}
      <div className="aerospace-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 700, fontSize: '15px' }}>Telemetry Workbench</span>
            <span className="source-tag">AUTHORITATIVE SIMULATION TELEMETRY</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Live engineering telemetry streamed directly from the spacecraft physics engine.
          </div>
        </div>

        {/* Export CSV Button */}
        <button
          onClick={exportTelemetryCsv}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '6px',
            border: '1px solid var(--accent-cyan)',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          title="Download authoritative flight telemetry CSV record"
        >
          <Download size={14} />
          <span>Export Telemetry (CSV)</span>
        </button>
      </div>

      {/* Parameter Selector Buttons */}
      <div className="aerospace-card" style={{ padding: '14px' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Select Telemetry Parameter
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(metricConfigs) as MetricKey[]).map((key) => {
            const isSelected = selectedMetric === key;
            const item = metricConfigs[key];
            const val =
              state && typeof state[key as keyof typeof state] === 'number'
                ? (state[key as keyof typeof state] as number)
                : 0;

            return (
              <button
                key={key}
                onClick={() => setSelectedMetric(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid var(--accent-orange)' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{item.label}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    color: isSelected ? 'var(--accent-orange)' : '#38bdf8',
                    fontWeight: 700,
                  }}
                >
                  {val.toFixed(1)} {item.unit}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Telemetry Curve Card */}
      <div className="aerospace-card">
        {/* Metric Header & Live Value Display */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: config.color }}>
                {config.label}
              </span>
              <span className="badge badge-info" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                {config.technicalId}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
              {config.description}
            </div>
          </div>

          {/* Latest Value Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: isWarning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${isWarning ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                color: isWarning ? '#f87171' : '#34d399',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {isWarning ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
              <span>{isWarning ? 'WARNING THRESHOLD EXCEEDED' : 'NOMINAL FLIGHT MARGIN'}</span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                LATEST VALUE
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: isWarning ? '#f87171' : config.color,
                }}
              >
                {currentVal.toFixed(2)} {config.unit}
              </div>
            </div>
          </div>
        </div>

        {/* SVG Time-Series Chart */}
        {renderChart()}
      </div>

      {/* Complete Telemetry Parameters Table */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 700, fontSize: '13px' }}>Full Subsystem Telemetry Frame</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Authoritative 10-second discrete telemetry frame
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>NAME</th>
                <th style={{ padding: '8px 12px' }}>PARAM ID</th>
                <th style={{ padding: '8px 12px' }}>SUBSYSTEM</th>
                <th style={{ padding: '8px 12px' }}>VALUE</th>
                <th style={{ padding: '8px 12px' }}>UNIT</th>
                <th style={{ padding: '8px 12px' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.map((p, idx) => {
                const isItemWarning =
                  p.parameter_id === 'EPS-BAT-001' && Number(p.value) < 40
                    ? true
                    : p.parameter_id === 'TCS-TMP-001' && Number(p.value) > 40
                    ? true
                    : p.quality !== 'GOOD';

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#FFFFFF' }}>{p.name}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      {p.parameter_id}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className="badge badge-info">{p.subsystem}</span>
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        color: isItemWarning ? '#f87171' : 'var(--text-primary)',
                      }}
                    >
                      {typeof p.value === 'number' ? p.value.toFixed(2) : String(p.value)}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{p.unit}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        className="badge"
                        style={{
                          background: isItemWarning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isItemWarning ? '#f87171' : '#34d399',
                        }}
                      >
                        {isItemWarning ? 'ALERT' : 'NOMINAL'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

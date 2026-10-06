import React, { useEffect, useState } from 'react';
import { Zap, Battery, Thermometer, Radio } from 'lucide-react';

interface TelemetryChannel {
  id: string;
  name: string;
  value: string;
  subValue: string;
  status: string;
  statusColor: string;
  strokeColor: string;
  icon: React.ReactNode;
  unit: string;
  points: number[];
}

export const LandingTelemetryVisual: React.FC = () => {
  const [tick, setTick] = useState(0);

  // Subtle 60fps/10Hz visual animation for waveforms
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => (prev + 1) % 360);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Generate dynamic sinusoidal telemetry waveform coordinates
  const generateWave = (offset: number, amplitude: number, frequency: number, base: number) => {
    const pts: string[] = [];
    const width = 280;
    for (let x = 0; x <= width; x += 10) {
      const angle = (x * frequency + tick * 4 + offset) * (Math.PI / 180);
      const y = base - Math.sin(angle) * amplitude;
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const channels: TelemetryChannel[] = [
    {
      id: 'solar',
      name: 'POWER GENERATION',
      value: (24.0 + Math.sin(tick * 0.05) * 0.3).toFixed(1),
      unit: 'W',
      subValue: 'SOLAR PEAK 24 W NOMINAL',
      status: 'SUNLIT NOMINAL',
      statusColor: '#22c55e',
      strokeColor: '#f59e0b',
      icon: <Zap size={16} color="var(--accent-orange)" />,
      points: [22.8, 23.5, 23.9, 24.1, 24.0, 24.2, 23.8, 24.0, 24.1],
    },
    {
      id: 'battery',
      name: 'BATTERY STATE OF CHARGE',
      value: (85.0 + Math.sin(tick * 0.03) * 0.2).toFixed(1),
      unit: '%',
      subValue: '72 Wh BATTERY CAPACITY',
      status: 'INITIAL SOC 85%',
      statusColor: '#22c55e',
      strokeColor: '#f97316',
      icon: <Battery size={16} color="var(--accent-orange)" />,
      points: [84.2, 84.6, 84.9, 85.0, 85.1, 85.0, 84.8, 85.0, 85.1],
    },
    {
      id: 'thermal',
      name: 'INTERNAL THERMAL BUS',
      value: (20.0 + Math.sin(tick * 0.04) * 0.2).toFixed(1),
      unit: '°C',
      subValue: 'NOMINAL 20°C BUS',
      status: 'EQUILIBRIUM',
      statusColor: '#38bdf8',
      strokeColor: '#38bdf8',
      icon: <Thermometer size={16} color="var(--accent-cyan)" />,
      points: [19.8, 19.9, 20.0, 20.1, 20.0, 20.2, 20.0, 19.9, 20.0],
    },
    {
      id: 'comms',
      name: 'X-BAND RF DOWNLINK',
      value: (2.00 + Math.sin(tick * 0.06) * 0.03).toFixed(2),
      unit: 'Mbps',
      subValue: 'NOMINAL 2 Mbps DOWNLINK',
      status: 'LINK NOMINAL',
      statusColor: '#22c55e',
      strokeColor: '#0284c7',
      icon: <Radio size={16} color="var(--accent-cyan)" />,
      points: [1.96, 1.98, 2.01, 2.00, 2.02, 1.99, 2.01, 2.00, 2.02],
    },
  ];

  return (
    <section
      style={{
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '60px 36px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Section Header */}
      <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 40px' }}>
        <div
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-gold)',
            letterSpacing: '2.5px',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          MISSION TELEMETRY PREVIEW
        </div>
        <h2
          style={{
            fontSize: 'clamp(24px, 3.0vw, 34px)',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.5px',
            lineHeight: 1.2,
            marginBottom: '14px',
          }}
        >
          TELEMETRY VISUALIZATION
        </h2>
        <p
          style={{
            fontSize: '15px',
            lineHeight: 1.6,
            color: '#AAB7C8',
            maxWidth: '620px',
            margin: '0 auto',
          }}
        >
          Visual preview of spacecraft telemetry channels including power generation, battery energy
          storage, internal thermal balance, and communications downlink feeding the digital twin engine.
        </p>
      </div>

      {/* Telemetry Visual Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        {channels.map((chan, idx) => (
          <div
            key={chan.id}
            style={{
              padding: '22px 24px',
              background: 'linear-gradient(180deg, rgba(12, 20, 36, 0.85) 0%, rgba(7, 13, 24, 0.95) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(2, 6, 15, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'border-color 0.2s ease, transform 0.2s ease',
            }}
          >
            {/* Card Header */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.28)',
                    }}
                  >
                    {chan.icon}
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.8px',
                      color: '#94A3B8',
                    }}
                  >
                    {chan.name}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    color: chan.statusColor,
                    padding: '2px 7px',
                    background: `${chan.statusColor}18`,
                    border: `1px solid ${chan.statusColor}40`,
                    borderRadius: '4px',
                  }}
                >
                  {chan.status}
                </span>
              </div>

              {/* Metric Value */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '28px',
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    color: chan.strokeColor === '#f59e0b' ? 'var(--accent-orange)' : '#F8FAFC',
                  }}
                >
                  {chan.value}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: chan.strokeColor,
                  }}
                >
                  {chan.unit}
                </span>
              </div>

              {/* Sub-Metric / Details */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: '#64748B',
                  marginBottom: '16px',
                }}
              >
                {chan.subValue}
              </div>
            </div>

            {/* Technical SVG Waveform Display */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '64px',
                background: 'rgba(3, 8, 18, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                overflow: 'hidden',
                padding: '4px 6px',
              }}
            >
              {/* Technical Grid Overlay */}
              <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                <defs>
                  <pattern id={`grid-${chan.id}`} width="28" height="15" patternUnits="userSpaceOnUse">
                    <path
                      d="M 28 0 L 0 0 0 15"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.04)"
                      strokeWidth="1"
                    />
                  </pattern>
                  <linearGradient id={`grad-${chan.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chan.strokeColor} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={chan.strokeColor} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill={`url(#grid-${chan.id})`} />

                {/* Animated Waveform Polyline */}
                <polyline
                  fill="none"
                  stroke={chan.strokeColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={generateWave(idx * 45, 12, 1.2, 28)}
                />
              </svg>

              {/* Live Technical Ticks */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'rgba(148, 163, 184, 0.6)',
                  letterSpacing: '0.4px',
                }}
              >
                T+00:14:22 • 10Hz
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

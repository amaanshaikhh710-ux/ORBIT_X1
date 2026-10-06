import React from 'react';
import type { CanonicalSpacecraftState } from '../../types/simulation';
import { Sun, Battery, Camera, Radio, Compass, Cpu } from 'lucide-react';

export interface ScreenAnchor {
  x: number;
  y: number;
  visible: boolean;
}

interface CalloutOverlayProps {
  state: CanonicalSpacecraftState | null;
  selectedComponent: string | null;
  onSelectComponent: (component: string) => void;
  anchors: Record<string, ScreenAnchor>;
  containerWidth: number;
  containerHeight: number;
}

interface CalloutConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  line1: (s: CanonicalSpacecraftState | null) => string;
  line2: (s: CanonicalSpacecraftState | null) => { text: string; color?: string };
  // Target position offset relative to container
  defaultPos: { left?: string; right?: string; top?: string; bottom?: string };
}

export function getCardAnchorOrigin(configId: string, width: number, height: number): { x: number; y: number } {
  switch (configId) {
    case 'solar': return { x: width * 0.12 + 80, y: height * 0.18 + 26 };
    case 'comm': return { x: width * 0.42 + 80, y: height * 0.12 + 26 };
    case 'adcs': return { x: width * (1 - 0.34) - 80, y: height * 0.34 + 26 };
    case 'bus': return { x: width * 0.11 + 80, y: height * 0.50 + 26 };
    case 'battery': return { x: width * 0.12 + 80, y: height * (1 - 0.22) - 26 };
    case 'payload': return { x: width * 0.46 + 80, y: height * (1 - 0.22) - 26 };
    default: return { x: width * 0.5, y: height * 0.5 };
  }
}

export const CalloutOverlay: React.FC<CalloutOverlayProps> = React.memo(({
  state,
  selectedComponent,
  onSelectComponent,
  anchors,
  containerWidth,
  containerHeight,
}) => {
  const configs: CalloutConfig[] = [
    {
      id: 'solar',
      title: 'Solar Array',
      icon: <Sun size={15} color="#f59e0b" />,
      line1: (s) => `${(s?.solar_generation_w ?? 24.0).toFixed(1)} W ${(s?.solar_health ?? 1.0) >= 0.8 ? '(Nominal)' : '(Degraded)'}`,
      line2: (s) => ({
        text: `Health: ${(((s?.solar_health ?? 1.0) * 100)).toFixed(0)}%`,
        color: (s?.solar_health ?? 1.0) >= 0.8 ? '#10b981' : '#f59e0b',
      }),
      defaultPos: { left: '12%', top: '18%' },
    },
    {
      id: 'comm',
      title: 'Antenna / Comm',
      icon: <Radio size={15} color="#38bdf8" />,
      line1: (s) => `Downlink: ${(s?.downlink_data_rate_mbps ?? 2.0).toFixed(1)} Mbps`,
      line2: (s) => ({
        text: `Status: ${s?.comm_link_state === 'DOWNLINKING' ? 'Downlinking' : (s?.comm_health ?? 1.0) >= 0.8 ? 'Nominal' : 'Degraded'}`,
        color: s?.comm_link_state === 'DOWNLINKING' ? '#38bdf8' : '#10b981',
      }),
      defaultPos: { left: '42%', top: '12%' },
    },
    {
      id: 'adcs',
      title: 'ADCS',
      icon: <Compass size={15} color="#38bdf8" />,
      line1: (s) => `Pointing Error: ${(s?.adcs_pointing_error_deg ?? 0.5).toFixed(1)}°`,
      line2: (s) => ({
        text: `Status: ${(s?.adcs_pointing_error_deg ?? 0.5) <= 2.0 ? 'Nominal' : 'Wobble'}`,
        color: (s?.adcs_pointing_error_deg ?? 0.5) <= 2.0 ? '#10b981' : '#ef4444',
      }),
      defaultPos: { right: '34%', top: '34%' },
    },
    {
      id: 'bus',
      title: 'Bus',
      icon: <Cpu size={15} color="#38bdf8" />,
      line1: (s) => `Temp: ${(s?.internal_temp_c ?? 20.0).toFixed(1)} °C`,
      line2: (s) => ({
        text: `CPU: ${(s?.obc_cpu_utilization_pct ?? 35).toFixed(0)}% | RAM: ${(s?.obc_memory_utilization_pct ?? 12).toFixed(0)}%`,
        color: '#94a3b8',
      }),
      defaultPos: { left: '11%', top: '50%' },
    },
    {
      id: 'battery',
      title: 'Battery',
      icon: <Battery size={15} color="#10b981" />,
      line1: (s) => `SOC: ${(s?.battery_soc_pct ?? 100).toFixed(0)}%`,
      line2: (s) => ({
        text: `Capacity: ${(s?.battery_capacity_wh ?? 72).toFixed(0)} Wh`,
        color: (s?.battery_soc_pct ?? 100) > 40 ? '#10b981' : (s?.battery_soc_pct ?? 100) > 20 ? '#f59e0b' : '#ef4444',
      }),
      defaultPos: { left: '12%', bottom: '22%' },
    },
    {
      id: 'payload',
      title: 'Payload',
      icon: <Camera size={15} color="#38bdf8" />,
      line1: (s) => `Imaging: ${s?.payload_state === 'IMAGING' ? 'Active' : s?.payload_state === 'PROCESSING' ? 'Processing' : 'Idle'}`,
      line2: (s) => ({
        text: `Images: ${s?.images_completed ?? 0}`,
        color: '#94a3b8',
      }),
      defaultPos: { left: '46%', bottom: '22%' },
    },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* SVG Leader Lines & Glowing Anchor Dots */}
      <svg
        width={containerWidth}
        height={containerHeight}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
      >
        <defs>
          <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {configs.map((c) => {
          const anchor = anchors[c.id];
          const isSelected = selectedComponent === c.id;
          const origin = getCardAnchorOrigin(c.id, containerWidth, containerHeight);
          const anchorX = anchor?.x ?? origin.x;
          const anchorY = anchor?.y ?? origin.y;
          const midX = (origin.x + anchorX) / 2;

          return (
            <g key={c.id} id={`callout-anchor-${c.id}`}>
              {/* Leader Polyline */}
              <polyline
                id={`callout-line-${c.id}`}
                points={`${origin.x},${origin.y} ${midX},${anchorY} ${anchorX},${anchorY}`}
                fill="none"
                stroke={isSelected ? '#f97316' : 'rgba(56, 189, 248, 0.45)'}
                strokeWidth={isSelected ? 1.8 : 1.2}
                strokeDasharray={isSelected ? 'none' : '3 2'}
                filter="url(#cyanGlow)"
              />
              {/* Glowing anchor ring and center dot */}
              <circle
                id={`callout-dot-${c.id}`}
                cx={anchorX}
                cy={anchorY}
                r={isSelected ? 5 : 3.5}
                fill={isSelected ? '#f97316' : '#38bdf8'}
                filter="url(#cyanGlow)"
              />
              <circle
                id={`callout-ring-${c.id}`}
                cx={anchorX}
                cy={anchorY}
                r={isSelected ? 9 : 7}
                fill="none"
                stroke={isSelected ? '#f97316' : '#38bdf8'}
                strokeWidth={1}
                opacity={0.8}
              />
            </g>
          );
        })}
      </svg>

      {/* Interactive Callout Cards */}
      {configs.map((c) => {
        const isSelected = selectedComponent === c.id;
        const line2Data = c.line2(state);

        return (
          <div
            key={c.id}
            onClick={() => onSelectComponent(c.id)}
            style={{
              position: 'absolute',
              ...c.defaultPos,
              pointerEvents: 'auto',
              cursor: 'pointer',
              zIndex: 3,
              background: isSelected ? 'rgba(11, 20, 38, 0.94)' : 'rgba(8, 12, 20, 0.88)',
              backdropFilter: 'blur(10px)',
              border: isSelected ? '1.5px solid #f97316' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '8px 12px',
              minWidth: '150px',
              boxShadow: isSelected
                ? '0 0 18px rgba(249, 115, 22, 0.35), 0 4px 16px rgba(0,0,0,0.6)'
                : '0 4px 16px rgba(0,0,0,0.5)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isSelected ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            {/* Header with icon and title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              {c.icon}
              <span style={{ fontWeight: 600, fontSize: '12px', color: '#f8fafc' }}>
                {c.title}
              </span>
            </div>

            {/* Line 1 */}
            <div style={{ fontSize: '11px', color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>
              {c.line1(state)}
            </div>

            {/* Line 2 */}
            <div
              style={{
                fontSize: '11px',
                color: line2Data.color || '#94a3b8',
                fontFamily: 'var(--font-mono)',
                marginTop: '1px',
                fontWeight: 500,
              }}
            >
              {line2Data.text}
            </div>
          </div>
        );
      })}
    </div>
  );
});

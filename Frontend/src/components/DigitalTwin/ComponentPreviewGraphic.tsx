import React from 'react';

interface ComponentPreviewGraphicProps {
  component: string;
}

export const ComponentPreviewGraphic: React.FC<ComponentPreviewGraphicProps> = ({ component }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '140px',
        borderRadius: '6px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #090e1a 0%, #111b2e 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '14px',
      }}
    >
      {/* Background technical grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(56, 189, 248, 0.08) 0%, transparent 70%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 16px 16px, 16px 16px',
        }}
      />

      {/* Component Specific Visual Graphic */}
      {component === 'solar' && (
        <svg width="280" height="120" viewBox="0 0 280 120" style={{ position: 'relative', zIndex: 1 }}>
          <defs>
            <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#081a38" />
              <stop offset="50%" stopColor="#0f3875" />
              <stop offset="100%" stopColor="#061226" />
            </linearGradient>
            <linearGradient id="frameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="hingeGold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          {/* Left Wing Frame */}
          <rect x="20" y="25" width="110" height="70" rx="3" fill="url(#frameGrad)" stroke="#38bdf8" strokeWidth="1" />
          {/* Left Solar Cells */}
          <rect x="25" y="30" width="48" height="60" rx="2" fill="url(#solarGrad)" stroke="#1e293b" />
          <rect x="77" y="30" width="48" height="60" rx="2" fill="url(#solarGrad)" stroke="#1e293b" />
          {/* Cell Grid Lines */}
          <line x1="25" y1="45" x2="73" y2="45" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="25" y1="60" x2="73" y2="60" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="25" y1="75" x2="73" y2="75" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="49" y1="30" x2="49" y2="90" stroke="#f8fafc" strokeWidth="1" strokeOpacity="0.7" />
          <line x1="77" y1="45" x2="125" y2="45" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="77" y1="60" x2="125" y2="60" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="77" y1="75" x2="125" y2="75" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="101" y1="30" x2="101" y2="90" stroke="#f8fafc" strokeWidth="1" strokeOpacity="0.7" />

          {/* Central Hinge Bracket */}
          <rect x="133" y="45" width="14" height="30" rx="2" fill="url(#hingeGold)" />
          <circle cx="140" cy="52" r="3" fill="#451a03" />
          <circle cx="140" cy="68" r="3" fill="#451a03" />

          {/* Right Wing Frame */}
          <rect x="150" y="25" width="110" height="70" rx="3" fill="url(#frameGrad)" stroke="#38bdf8" strokeWidth="1" />
          {/* Right Solar Cells */}
          <rect x="155" y="30" width="48" height="60" rx="2" fill="url(#solarGrad)" stroke="#1e293b" />
          <rect x="207" y="30" width="48" height="60" rx="2" fill="url(#solarGrad)" stroke="#1e293b" />
          {/* Grid Lines */}
          <line x1="155" y1="45" x2="203" y2="45" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="155" y1="60" x2="203" y2="60" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="155" y1="75" x2="203" y2="75" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="179" y1="30" x2="179" y2="90" stroke="#f8fafc" strokeWidth="1" strokeOpacity="0.7" />
          <line x1="207" y1="45" x2="255" y2="45" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="207" y1="60" x2="255" y2="60" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="207" y1="75" x2="255" y2="75" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.4" />
          <line x1="231" y1="30" x2="231" y2="90" stroke="#f8fafc" strokeWidth="1" strokeOpacity="0.7" />

          {/* Glint line */}
          <line x1="30" y1="32" x2="250" y2="32" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.6" />
        </svg>
      )}

      {component === 'battery' && (
        <svg width="280" height="120" viewBox="0 0 280 120" style={{ position: 'relative', zIndex: 1 }}>
          <defs>
            <linearGradient id="goldFoil" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="30%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="cellMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          {/* Main Enclosure */}
          <rect x="60" y="22" width="160" height="76" rx="6" fill="url(#goldFoil)" stroke="#fef08a" strokeWidth="1.5" />
          {/* Thermal Stitching Lines */}
          <line x1="110" y1="22" x2="110" y2="98" stroke="#92400e" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="170" y1="22" x2="170" y2="98" stroke="#92400e" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* Aluminum Flange Brackets */}
          <rect x="48" y="32" width="12" height="16" rx="2" fill="url(#cellMetal)" />
          <rect x="48" y="72" width="12" height="16" rx="2" fill="url(#cellMetal)" />
          <rect x="220" y="32" width="12" height="16" rx="2" fill="url(#cellMetal)" />
          <rect x="220" y="72" width="12" height="16" rx="2" fill="url(#cellMetal)" />
          {/* Screws */}
          <circle cx="54" cy="40" r="2.5" fill="#f8fafc" />
          <circle cx="54" cy="80" r="2.5" fill="#f8fafc" />
          <circle cx="226" cy="40" r="2.5" fill="#f8fafc" />
          <circle cx="226" cy="80" r="2.5" fill="#f8fafc" />
          {/* Central Battery Electronics & LED Indicator Gauge */}
          <rect x="90" y="44" width="100" height="32" rx="4" fill="#090e17" stroke="#38bdf8" strokeWidth="1" />
          {/* 5 Green LED SOC Segments */}
          <rect x="100" y="54" width="12" height="12" rx="2" fill="#10b981" />
          <rect x="116" y="54" width="12" height="12" rx="2" fill="#10b981" />
          <rect x="132" y="54" width="12" height="12" rx="2" fill="#10b981" />
          <rect x="148" y="54" width="12" height="12" rx="2" fill="#10b981" />
          <rect x="164" y="54" width="12" height="12" rx="2" fill="#10b981" />
          <text x="140" y="36" fill="#451a03" fontSize="8" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">
            LI-ION 8S2P 72Wh MODULE
          </text>
        </svg>
      )}

      {component === 'payload' && (
        <svg width="280" height="120" viewBox="0 0 280 120" style={{ position: 'relative', zIndex: 1 }}>
          <defs>
            <linearGradient id="lensGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#818cf8" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#c084fc" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
            </linearGradient>
            <radialGradient id="lensGleam" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Barrel Housing */}
          <rect x="70" y="24" width="140" height="72" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          {/* Stepped Rings */}
          <rect x="85" y="20" width="110" height="80" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          {/* Knurled focus grip ridges */}
          <line x1="95" y1="20" x2="95" y2="100" stroke="#64748b" strokeWidth="2" strokeDasharray="2 3" />
          <line x1="102" y1="20" x2="102" y2="100" stroke="#64748b" strokeWidth="2" strokeDasharray="2 3" />
          <line x1="109" y1="20" x2="109" y2="100" stroke="#64748b" strokeWidth="2" strokeDasharray="2 3" />
          {/* Front Bezel */}
          <circle cx="155" cy="60" r="32" fill="#090d16" stroke="#94a3b8" strokeWidth="2" />
          {/* Optical Glass Lens */}
          <circle cx="155" cy="60" r="26" fill="url(#lensGlass)" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="155" cy="60" r="26" fill="url(#lensGleam)" />
          {/* Aperture ring markings */}
          <text x="155" y="38" fill="#94a3b8" fontSize="6" fontFamily="monospace" textAnchor="middle">
            EO-50mm f/1.4
          </text>
        </svg>
      )}

      {component === 'comm' && (
        <svg width="280" height="120" viewBox="0 0 280 120" style={{ position: 'relative', zIndex: 1 }}>
          <defs>
            <linearGradient id="antennaGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          {/* Mounting Base */}
          <rect x="120" y="85" width="40" height="20" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />
          {/* X-band Feed Horn / Dish */}
          <path d="M 115 85 L 140 45 L 165 85 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="140" cy="58" r="8" fill="url(#antennaGold)" />
          {/* Long Gold Deployable Masts */}
          <line x1="140" y1="45" x2="140" y2="10" stroke="url(#antennaGold)" strokeWidth="3" strokeLinecap="round" />
          <line x1="140" y1="65" x2="80" y2="25" stroke="url(#antennaGold)" strokeWidth="2" strokeLinecap="round" />
          <line x1="140" y1="65" x2="200" y2="25" stroke="url(#antennaGold)" strokeWidth="2" strokeLinecap="round" />
          {/* RF Microwave Wavefront Radiations */}
          <circle cx="140" cy="10" r="10" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.8" />
          <circle cx="140" cy="10" r="22" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" />
          <circle cx="140" cy="10" r="35" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.25" />
          <text x="140" y="112" fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle">
            8.2 GHz X-BAND TRANSCEIVER
          </text>
        </svg>
      )}

      {component === 'adcs' && (
        <svg width="280" height="120" viewBox="0 0 280 120" style={{ position: 'relative', zIndex: 1 }}>
          <defs>
            <radialGradient id="flywheelGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="60%" stopColor="#d97706" />
              <stop offset="90%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
          </defs>
          {/* Housing Chassis */}
          <rect x="75" y="20" width="130" height="80" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          {/* 3-Axis Orthogonal Flywheels */}
          {/* Wheel Z (Center) */}
          <circle cx="140" cy="60" r="28" fill="url(#flywheelGrad)" stroke="#fef08a" strokeWidth="1.5" />
          <circle cx="140" cy="60" r="14" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
          <circle cx="140" cy="60" r="4" fill="#38bdf8" />
          {/* Spin indicator spokes */}
          <line x1="140" y1="36" x2="140" y2="84" stroke="#f8fafc" strokeWidth="1" strokeOpacity="0.8" />
          <line x1="116" y1="60" x2="164" y2="60" stroke="#f8fafc" strokeWidth="1" strokeOpacity="0.8" />
          {/* Wheel X (Orthogonal Side Profile) */}
          <rect x="82" y="44" width="8" height="32" rx="2" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
          {/* Wheel Y (Orthogonal Top Profile) */}
          <rect x="124" y="24" width="32" height="8" rx="2" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
          {/* Star Tracker Tube */}
          <rect x="180" y="35" width="18" height="30" rx="2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1" />
          <circle cx="189" cy="40" r="5" fill="#38bdf8" />
          <text x="140" y="112" fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle">
            3-AXIS REACTION WHEEL + STAR TRACKER
          </text>
        </svg>
      )}

      {component === 'bus' && (
        <svg width="280" height="120" viewBox="0 0 280 120" style={{ position: 'relative', zIndex: 1 }}>
          <defs>
            <linearGradient id="railGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          {/* 3U CubeSat Chassis Skeleton (10x10x30cm) */}
          <rect x="90" y="15" width="100" height="90" rx="4" fill="#0a0f1d" stroke="#38bdf8" strokeWidth="1.5" />
          {/* 4 Corner Rails */}
          <rect x="86" y="10" width="8" height="100" rx="1.5" fill="url(#railGrad)" stroke="#cbd5e1" strokeWidth="0.8" />
          <rect x="186" y="10" width="8" height="100" rx="1.5" fill="url(#railGrad)" stroke="#cbd5e1" strokeWidth="0.8" />
          {/* 3U Bay Ribs */}
          <line x1="94" y1="45" x2="186" y2="45" stroke="#475569" strokeWidth="2" />
          <line x1="94" y1="75" x2="186" y2="75" stroke="#475569" strokeWidth="2" />
          {/* Internal PC104 Avionics Stack visible */}
          <rect x="105" y="24" width="70" height="14" rx="2" fill="#064e3b" stroke="#10b981" strokeWidth="0.5" />
          <rect x="105" y="52" width="70" height="14" rx="2" fill="#064e3b" stroke="#10b981" strokeWidth="0.5" />
          <rect x="105" y="82" width="70" height="14" rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="0.5" />
          {/* Screws */}
          <circle cx="90" cy="18" r="2" fill="#f8fafc" />
          <circle cx="190" cy="18" r="2" fill="#f8fafc" />
          <circle cx="90" cy="102" r="2" fill="#f8fafc" />
          <circle cx="190" cy="102" r="2" fill="#f8fafc" />
          <text x="140" y="114" fill="#38bdf8" fontSize="8" fontFamily="monospace" textAnchor="middle">
            3U ANODIZED CHASSIS & OBC AVIONICS
          </text>
        </svg>
      )}
    </div>
  );
};

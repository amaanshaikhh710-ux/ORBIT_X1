import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Box, Globe } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  const { setActiveModule } = useSimulation();

  return (
    <footer
      style={{
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '40px 36px 36px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
      }}
    >
      {/* Brand & Subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          }}
        >
          <Box size={15} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '13.5px', letterSpacing: '0.6px', color: '#FFFFFF' }}>
            ORBITAL <span style={{ color: '#27C7FF' }}>TWIN</span>
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
            Mission ORBIT-X1 Aerospace Digital Twin Platform
          </div>
        </div>
      </div>

      {/* Navigation Quick Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <button
          onClick={() => setActiveModule('mission-control')}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            fontSize: '12.5px',
            cursor: 'pointer',
            padding: '2px 4px',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#27C7FF')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
        >
          Mission
        </button>
        <button
          onClick={() => setActiveModule('digital-twin')}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            fontSize: '12.5px',
            cursor: 'pointer',
            padding: '2px 4px',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#27C7FF')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
        >
          Digital Twin
        </button>
        <button
          onClick={() => setActiveModule('docs')}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            fontSize: '12.5px',
            cursor: 'pointer',
            padding: '2px 4px',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#27C7FF')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
        >
          Docs & Register
        </button>
      </div>

      {/* Orbital Baseline Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: '#64748B',
        }}
      >
        <Globe size={13} color="#27C7FF" />
        <span>LEO 550 KM</span>
        <span style={{ opacity: 0.35 }}>•</span>
        <span style={{ color: '#27D17F', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#27D17F',
              display: 'inline-block',
            }}
          />
          OPERATIONAL
        </span>
      </div>
    </footer>
  );
};

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
        borderTop: '1px solid rgba(56, 189, 248, 0.15)',
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
            width: '30px',
            height: '30px',
            borderRadius: '7px',
            background: 'linear-gradient(135deg, #1e1b2e 0%, #0d121f 100%)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            boxShadow: '0 0 12px rgba(212, 175, 55, 0.2)',
          }}
        >
          <Box size={15} color="var(--accent-gold)" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '13.5px', letterSpacing: '0.6px', color: '#FFFFFF' }}>
            ORBITAL <span style={{ color: 'var(--accent-gold)' }}>TWIN</span>
          </div>
          <div style={{ fontSize: '11px', color: '#8493A8', fontFamily: 'var(--font-mono)' }}>
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
          onMouseEnter={(e) => (e.currentTarget.style.color = '#B026FF')}
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
          onMouseEnter={(e) => (e.currentTarget.style.color = '#B026FF')}
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
          onMouseEnter={(e) => (e.currentTarget.style.color = '#B026FF')}
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
          color: '#8493A8',
        }}
      >
        <Globe size={13} color="var(--accent-cyan)" />
        <span style={{ color: '#CBD5E1' }}>LEO 550 KM</span>
        <span style={{ opacity: 0.35 }}>•</span>
        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
          <span
            className="live-beacon"
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
              display: 'inline-block',
            }}
          />
          OPERATIONAL
        </span>
      </div>
    </footer>
  );
};

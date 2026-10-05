import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Box, Menu, X } from 'lucide-react';

export const LandingNavbar: React.FC = () => {
  const { isAuthenticated, setActiveModule } = useSimulation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      style={{
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '16px 36px 0',
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          padding: '8px 24px',
          background: 'rgba(5, 11, 20, 0.84)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(39, 199, 255, 0.18)',
          borderRadius: '40px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* LEFT: Cube/Space Icon + Brand Name */}
        <div
          onClick={() => setActiveModule('landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          title="Orbital Twin Home"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              boxShadow: '0 0 12px rgba(39, 199, 255, 0.45)',
            }}
          >
            <Box size={16} color="#fff" />
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: '14.5px',
              letterSpacing: '0.8px',
              color: '#FFFFFF',
            }}
          >
            ORBITAL <span style={{ color: '#27C7FF' }}>TWIN</span>
          </span>
        </div>

        {/* CENTER: Navigation Links */}
        <nav
          className="desktop-nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
          }}
        >
          <button
            onClick={() => setActiveModule('mission-control')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              padding: '4px 6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#27C7FF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#CBD5E1')}
            title="Mission Overview & Telemetry"
          >
            Mission
          </button>

          <button
            onClick={() => setActiveModule('digital-twin')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              padding: '4px 6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#27C7FF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#CBD5E1')}
            title="Interactive 3D Spacecraft Digital Twin"
          >
            Digital Twin
          </button>

          <button
            onClick={() => setActiveModule('docs')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.2s ease',
              padding: '4px 6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#27C7FF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#CBD5E1')}
            title="Engineering Baseline & Documentation"
          >
            Docs & Register
          </button>
        </nav>

        {/* RIGHT: Operational Status Badge */}
        <div
          className="desktop-status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '1px',
              height: '16px',
              background: 'rgba(255, 255, 255, 0.12)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '11.5px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              color: '#94a3b8',
              letterSpacing: '0.4px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#27D17F',
                boxShadow: '0 0 8px #27D17F',
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#E2E8F0' }}>ORBIT-X1</span>
            <span style={{ opacity: 0.35 }}>•</span>
            <span style={{ color: '#27D17F' }}>OPERATIONAL</span>
          </div>

          <button
            onClick={() => setActiveModule(isAuthenticated ? 'mission-control' : 'login')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: 'rgba(39, 199, 255, 0.12)',
              border: '1px solid rgba(39, 199, 255, 0.35)',
              borderRadius: '20px',
              color: '#27C7FF',
              fontSize: '11.5px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.4px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(39, 199, 255, 0.25)';
              e.currentTarget.style.borderColor = '#27C7FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(39, 199, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(39, 199, 255, 0.35)';
            }}
          >
            <span>{isAuthenticated ? 'MISSION CONTROL →' : 'OPERATOR LOGIN'}</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-nav-toggle"
          style={{
            display: 'none',
            background: 'transparent',
            border: 'none',
            color: '#F5F8FC',
            cursor: 'pointer',
            padding: '4px',
            justifySelf: 'end',
          }}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            marginTop: '8px',
            padding: '16px 20px',
            background: 'rgba(5, 11, 20, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(39, 199, 255, 0.28)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <button
            onClick={() => {
              setActiveModule('mission-control');
              setMobileMenuOpen(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              fontSize: '14px',
              textAlign: 'left',
              padding: '6px 0',
              cursor: 'pointer',
            }}
          >
            Mission
          </button>
          <button
            onClick={() => {
              setActiveModule('digital-twin');
              setMobileMenuOpen(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              fontSize: '14px',
              textAlign: 'left',
              padding: '6px 0',
              cursor: 'pointer',
            }}
          >
            Digital Twin
          </button>
          <button
            onClick={() => {
              setActiveModule('docs');
              setMobileMenuOpen(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#CBD5E1',
              fontSize: '14px',
              textAlign: 'left',
              padding: '6px 0',
              cursor: 'pointer',
            }}
          >
            Docs & Register
          </button>
        </div>
      )}
    </header>
  );
};

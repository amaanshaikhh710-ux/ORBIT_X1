import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { LandingNavbar } from '../components/Landing/LandingNavbar';
import { LandingFeatureStrip } from '../components/Landing/LandingFeatureStrip';
import { LandingSpacecraft3D } from '../components/Landing/LandingSpacecraft3D';
import { LandingMissionHUD } from '../components/Landing/LandingMissionHUD';
import { LandingMissionFlow } from '../components/Landing/LandingMissionFlow';
import { LandingTelemetryVisual } from '../components/Landing/LandingTelemetryVisual';
import { LandingExploreTwin } from '../components/Landing/LandingExploreTwin';
import { LandingFooter } from '../components/Landing/LandingFooter';
import { Rocket, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, setActiveModule } = useSimulation();

  const handleLaunch = () => {
    setActiveModule(isAuthenticated ? 'mission-control' : 'login');
  };

  return (
    <div
      className="landing-container"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 70% 25%, #081d3f 0%, #051329 45%, #020814 100%)',
        color: '#F5F8FC',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      {/* ================================================== */}
      {/* 1. HERO SECTION (Full-height initial presentation) */}
      {/* ================================================== */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* Isolated 3D Cinematic Space Scene with Earth and CubeSat */}
        <LandingSpacecraft3D />

        {/* Dark Scrim Mask: keeps LEFT side deep dark space for 100% crisp typography */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 18% 46%, rgba(2, 8, 20, 0.94) 0%, rgba(2, 8, 20, 0.78) 42%, rgba(2, 8, 20, 0.10) 75%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

        {/* Top Navbar */}
        <LandingNavbar />

        {/* Main Hero Content Area - Vertically Balanced at ~20-25% from top */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: '1360px',
            margin: '0 auto',
            padding: '24px 44px 0',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ maxWidth: '580px', pointerEvents: 'auto' }}>
            {/* Eyebrow */}
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: '#27C7FF',
                letterSpacing: '2.8px',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span>SPACE</span>
              <span style={{ opacity: 0.35 }}>|</span>
              <span>SIMULATION</span>
              <span style={{ opacity: 0.35 }}>|</span>
              <span>ANALYSIS</span>
              <span style={{ opacity: 0.35 }}>|</span>
              <span>RECOVERY</span>
            </div>

            {/* Main Heading: ORBITAL TWIN (WHITE + BRIGHT CYAN) */}
            <h1
              style={{
                fontSize: 'clamp(38px, 4.2vw, 56px)',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
                color: '#FFFFFF',
                marginBottom: '14px',
              }}
            >
              ORBITAL <span style={{ color: '#27C7FF' }}>TWIN</span>
            </h1>

            {/* Subtitle */}
            <h2
              style={{
                fontSize: 'clamp(17px, 1.8vw, 22px)',
                fontWeight: 600,
                color: '#F5F8FC',
                letterSpacing: '0.2px',
                marginBottom: '16px',
                lineHeight: 1.28,
              }}
            >
              Digital Twin for Mission ORBIT-X1
            </h2>

            {/* Supporting Text */}
            <p
              style={{
                fontSize: '15px',
                lineHeight: 1.62,
                color: '#AAB7C8',
                maxWidth: '510px',
                marginBottom: '26px',
              }}
            >
              A live digital replica of ORBIT-X1 that connects spacecraft telemetry, system
              behavior, fault propagation, simulation, and recovery planning in one mission
              environment.
            </p>

            {/* Single Primary Mission Launch CTA Button -> Opens digital-twin */}
            <div>
              <button
                onClick={handleLaunch}
                className="launch-hero-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '15px 34px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  border: '1px solid rgba(39, 199, 255, 0.45)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  cursor: 'pointer',
                  boxShadow:
                    '0 0 24px rgba(24, 191, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  textTransform: 'uppercase',
                }}
              >
                <Rocket size={17} />
                <span>LAUNCH ORBITAL TWIN</span>
                <ArrowRight size={17} className="cta-arrow" />
              </button>
            </div>

            {/* Subtle Mission Status HUD */}
            <LandingMissionHUD />
          </div>
        </div>

        {/* Feature Strip below Hero */}
        <LandingFeatureStrip />
      </section>

      {/* ================================================== */}
      {/* 2. MISSION FLOW SECTION                            */}
      {/* ================================================== */}
      <LandingMissionFlow />

      {/* ================================================== */}
      {/* 3. MINI TELEMETRY VISUAL SECTION                   */}
      {/* ================================================== */}
      <LandingTelemetryVisual />

      {/* ================================================== */}
      {/* 4. EXPLORE THE TWIN SECTION                        */}
      {/* ================================================== */}
      <LandingExploreTwin />

      {/* ================================================== */}
      {/* 5. MINIMAL AEROSPACE FOOTER                        */}
      {/* ================================================== */}
      <LandingFooter />
    </div>
  );
};

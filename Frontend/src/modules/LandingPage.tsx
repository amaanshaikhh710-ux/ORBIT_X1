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
        background:
          'radial-gradient(circle at 85% 18%, rgba(157, 0, 255, 0.12) 0%, transparent 45%), radial-gradient(circle at 12% 82%, rgba(224, 17, 95, 0.06) 0%, transparent 40%), radial-gradient(ellipse at 72% 22%, #0a1329 0%, #060c1c 42%, #020409 100%)',
        color: '#F8FAFC',
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

        {/* Tactical Dark Scrim Mask with subtle radial depth */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 18% 46%, rgba(2, 6, 16, 0.96) 0%, rgba(2, 6, 16, 0.82) 42%, rgba(2, 6, 16, 0.15) 75%, transparent 100%)',
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
          <div style={{ maxWidth: '600px', pointerEvents: 'auto' }}>
            {/* Eyebrow / Mission Spec Badge */}
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-gold)',
                letterSpacing: '2.5px',
                fontWeight: 600,
                textTransform: 'uppercase',
                marginBottom: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                borderRadius: '4px',
                background: 'rgba(212, 175, 55, 0.08)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
              }}
            >
              <span className="live-beacon" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-gold)' }} />
              <span>MISSION ORBIT-X1</span>
              <span style={{ opacity: 0.35 }}>|</span>
              <span>DIGITAL TWIN OPERATIONS</span>
            </div>

            {/* Main Heading: ORBITAL TWIN */}
            <h1
              style={{
                fontSize: 'clamp(40px, 4.4vw, 60px)',
                fontWeight: 800,
                letterSpacing: '-0.8px',
                lineHeight: 1.08,
                color: '#FFFFFF',
                marginBottom: '14px',
                textShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
              }}
            >
              ORBITAL <span style={{ color: 'var(--accent-gold)', textShadow: '0 0 35px rgba(212, 175, 55, 0.45)' }}>TWIN</span>
            </h1>

            {/* Subtitle */}
            <h2
              style={{
                fontSize: 'clamp(17px, 1.8vw, 22px)',
                fontWeight: 600,
                color: '#E2E8F0',
                letterSpacing: '0.2px',
                marginBottom: '16px',
                lineHeight: 1.3,
              }}
            >
              Digital Twin for Mission ORBIT-X1
            </h2>

            {/* Supporting Text */}
            <p
              style={{
                fontSize: '15px',
                lineHeight: 1.64,
                color: '#94A3B8',
                maxWidth: '520px',
                marginBottom: '28px',
              }}
            >
              A high-fidelity digital replica of ORBIT-X1 uniting spacecraft telemetry,
              system physics, cross-subsystem fault propagation, and operational recovery
              planning in a unified mission-control environment.
            </p>

            {/* Single Primary Mission Launch CTA Button with Animated Gold->Ruby Gradient */}
            <div>
              <button
                onClick={handleLaunch}
                className="launch-hero-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '15px 36px',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  letterSpacing: '0.9px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                <Rocket size={17} color="var(--accent-gold)" />
                <span style={{ letterSpacing: '1px' }}>LAUNCH ORBITAL TWIN</span>
                <ArrowRight size={17} className="cta-arrow" color="var(--accent-gold)" />
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

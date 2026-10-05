import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Box, ArrowRight, Zap, Compass, Radio, Cpu, Camera, ShieldAlert } from 'lucide-react';

interface SubsystemCard {
  tag: string;
  name: string;
  specs: string;
  icon: React.ReactNode;
}

export const LandingExploreTwin: React.FC = () => {
  const { setActiveModule } = useSimulation();

  const subsystems: SubsystemCard[] = [
    {
      tag: 'EPS',
      name: 'ELECTRICAL POWER SYSTEM',
      specs: 'Deployable solar array (24 W peak), 72 Wh Li-ion battery, MPPT regulation',
      icon: <Zap size={18} color="#27C7FF" />,
    },
    {
      tag: 'ADCS',
      name: 'ATTITUDE DETERMINATION & CONTROL',
      specs: '3-axis reaction wheels, magnetic torquers, star tracker, Sun sensors',
      icon: <Compass size={18} color="#27C7FF" />,
    },
    {
      tag: 'COMMS',
      name: 'COMMUNICATION SYSTEM',
      specs: 'UHF/VHF engineering transceiver, X-band payload downlink (2 Mbps nominal, 7 W high-rate)',
      icon: <Radio size={18} color="#27C7FF" />,
    },
    {
      tag: 'OBC',
      name: 'ON-BOARD COMPUTER',
      specs: 'Dual-core ARM fault-tolerant computer, 3 W processing budget, CAN bus',
      icon: <Cpu size={18} color="#27C7FF" />,
    },
    {
      tag: 'PAYLOAD',
      name: 'OPTICAL EARTH OBSERVATION',
      specs: 'Multispectral Earth observation imager (8 W), 8 GB high-speed storage buffer',
      icon: <Camera size={18} color="#27C7FF" />,
    },
    {
      tag: 'TCS',
      name: 'THERMAL CONTROL SYSTEM',
      specs: 'Multi-layer insulation blanket, silver Teflon radiators, thermistors (20°C nominal)',
      icon: <ShieldAlert size={18} color="#27C7FF" />,
    },
  ];

  return (
    <section
      style={{
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '60px 36px 80px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Container Card with Subtle Dark Glass */}
      <div
        style={{
          padding: '48px 40px',
          background: 'rgba(5, 12, 24, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(39, 199, 255, 0.22)',
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 40px' }}>
          <div
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: '#27C7FF',
              letterSpacing: '2.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            HIGH-FIDELITY SPACECRAFT ARCHITECTURE
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.2vw, 36px)',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
              marginBottom: '14px',
            }}
          >
            A LIVING DIGITAL REPLICA OF ORBIT-X1
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
            Explore spacecraft systems, telemetry, mission behavior, faults, and recovery strategies
            inside the interactive Digital Twin.
          </p>
        </div>

        {/* 6 Subsystem Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          {subsystems.map((sub) => (
            <div
              key={sub.tag}
              style={{
                padding: '18px 20px',
                background: 'rgba(2, 6, 14, 0.65)',
                border: '1px solid rgba(39, 199, 255, 0.14)',
                borderRadius: '10px',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
              }}
              className="subsystem-preview-card"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '7px',
                  background: 'rgba(39, 199, 255, 0.08)',
                  border: '1px solid rgba(39, 199, 255, 0.22)',
                  flexShrink: 0,
                }}
              >
                {sub.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#27C7FF',
                      letterSpacing: '0.6px',
                    }}
                  >
                    [{sub.tag}]
                  </span>
                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: '#F5F8FC',
                      letterSpacing: '0.4px',
                    }}
                  >
                    {sub.name}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '12px',
                    lineHeight: 1.45,
                    color: '#94A3B8',
                    margin: 0,
                  }}
                >
                  {sub.specs}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Center CTA */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setActiveModule('digital-twin')}
            className="launch-hero-cta"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 36px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              border: '1px solid rgba(39, 199, 255, 0.45)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.8px',
              cursor: 'pointer',
              boxShadow: '0 0 28px rgba(24, 191, 255, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              textTransform: 'uppercase',
            }}
          >
            <Box size={18} />
            <span>EXPLORE DIGITAL TWIN</span>
            <ArrowRight size={18} className="cta-arrow" />
          </button>
        </div>
      </div>
    </section>
  );
};

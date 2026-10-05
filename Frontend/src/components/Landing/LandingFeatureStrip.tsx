import React from 'react';
import { useSimulation, type ActiveModule } from '../../context/SimulationContext';
import { Radio, Box, TrendingUp, ShieldCheck } from 'lucide-react';

interface FeatureItem {
  id: ActiveModule;
  icon: React.ReactNode;
  title: string;
  description: string;
}

export const LandingFeatureStrip: React.FC = () => {
  const { setActiveModule } = useSimulation();

  const features: FeatureItem[] = [
    {
      id: 'telemetry',
      icon: <Radio size={17} color="#27C7FF" />,
      title: 'REAL-TIME TELEMETRY',
      description: 'Live spacecraft data',
    },
    {
      id: 'digital-twin',
      icon: <Box size={17} color="#27C7FF" />,
      title: 'DIGITAL TWIN',
      description: 'Simulate and analyse dynamics',
    },
    {
      id: 'fault-analysis',
      icon: <TrendingUp size={17} color="#27C7FF" />,
      title: 'FAULT PROPAGATION',
      description: 'Understand impact across systems',
    },
    {
      id: 'recovery-planner',
      icon: <ShieldCheck size={17} color="#27C7FF" />,
      title: 'RECOVERY PLANNING',
      description: 'Evaluate and execute recovery strategies',
    },
  ];

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '0 36px 20px',
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div
        className="landing-feature-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          alignItems: 'center',
          padding: '12px 20px',
          background: 'rgba(5, 11, 20, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(39, 199, 255, 0.2)',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        }}
      >
        {features.map((feat, idx) => (
          <div
            key={feat.id}
            onClick={() => setActiveModule(feat.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '8px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRight: idx < features.length - 1 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
              borderRadius: '8px',
            }}
            className="feature-item-hover"
            title={`Launch ${feat.title} in Mission Control`}
          >
            {/* Minimal Line Icon in Subtle Cyan Circle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(39, 199, 255, 0.08)',
                border: '1px solid rgba(39, 199, 255, 0.28)',
                boxShadow: '0 0 12px rgba(39, 199, 255, 0.12)',
                flexShrink: 0,
              }}
            >
              {feat.icon}
            </div>

            {/* Title & Description */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  color: '#F5F8FC',
                  fontFamily: 'var(--font-sans)',
                  textTransform: 'uppercase',
                }}
              >
                {feat.title}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#AAB7C8',
                  marginTop: '2px',
                  lineHeight: 1.35,
                }}
              >
                {feat.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

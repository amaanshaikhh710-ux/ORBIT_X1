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
      icon: <Radio size={17} color="var(--accent-gold)" />,
      title: 'REAL-TIME TELEMETRY',
      description: 'Live spacecraft data',
    },
    {
      id: 'digital-twin',
      icon: <Box size={17} color="#B026FF" />,
      title: 'DIGITAL TWIN',
      description: 'Simulate and analyse dynamics',
    },
    {
      id: 'fault-analysis',
      icon: <TrendingUp size={17} color="var(--accent-ruby)" />,
      title: 'FAULT PROPAGATION',
      description: 'Understand impact across systems',
    },
    {
      id: 'recovery-planner',
      icon: <ShieldCheck size={17} color="var(--accent-gold)" />,
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
          padding: '14px 20px',
          background: 'linear-gradient(180deg, rgba(10, 18, 34, 0.92) 0%, rgba(6, 12, 24, 0.96) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(157, 0, 255, 0.22)',
          borderRadius: '12px',
          boxShadow: '0 12px 36px rgba(2, 6, 15, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        {features.map((feat, idx) => {
          const accentColor =
            feat.id === 'digital-twin'
              ? 'rgba(157, 0, 255, 0.35)'
              : feat.id === 'fault-analysis'
              ? 'rgba(224, 17, 95, 0.35)'
              : 'rgba(212, 175, 55, 0.35)';
          const bgDim =
            feat.id === 'digital-twin'
              ? 'rgba(157, 0, 255, 0.1)'
              : feat.id === 'fault-analysis'
              ? 'rgba(224, 17, 95, 0.1)'
              : 'rgba(212, 175, 55, 0.1)';

          return (
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
              {/* Minimal Line Icon in Coordinated Accent Circle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: bgDim,
                  border: `1px solid ${accentColor}`,
                  boxShadow: `0 0 14px ${bgDim}`,
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
                  color: '#F8FAFC',
                  fontFamily: 'var(--font-sans)',
                  textTransform: 'uppercase',
                }}
              >
                {feat.title}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#94A3B8',
                  marginTop: '2px',
                  lineHeight: 1.35,
                }}
              >
                {feat.description}
              </span>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};

import React from 'react';
import { Radio, Sliders, GitBranch, ShieldCheck } from 'lucide-react';

interface FlowStep {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const LandingMissionFlow: React.FC = () => {
  const steps: FlowStep[] = [
    {
      step: '01',
      title: 'OBSERVE',
      description: 'Real-time telemetry and spacecraft state',
      icon: <Radio size={20} color="var(--accent-gold)" />,
    },
    {
      step: '02',
      title: 'SIMULATE',
      description: 'Run mission scenarios and what-if conditions',
      icon: <Sliders size={20} color="#B026FF" />,
    },
    {
      step: '03',
      title: 'DIAGNOSE',
      description: 'Trace faults and their propagation',
      icon: <GitBranch size={20} color="var(--accent-ruby)" />,
    },
    {
      step: '04',
      title: 'RECOVER',
      description: 'Evaluate and apply recovery strategies',
      icon: <ShieldCheck size={20} color="var(--accent-gold)" />,
    },
  ];

  return (
    <section
      style={{
        width: '100%',
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '80px 36px 40px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Section Header */}
      <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
        <div
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-gold)',
            letterSpacing: '2.5px',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          MISSION ARCHITECTURE & WORKFLOW
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
          ONE MISSION. ONE DIGITAL REALITY.
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
          Observe spacecraft behavior, simulate mission conditions, diagnose faults, and evaluate
          recovery actions from a unified digital environment.
        </p>
      </div>

      {/* 4-Step Horizontal Card Flow */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
        }}
      >
        {steps.map((item) => {
          const accentColor =
            item.step === '02'
              ? '#B026FF'
              : item.step === '03'
              ? 'var(--accent-ruby)'
              : 'var(--accent-gold)';
          const bgDim =
            item.step === '02'
              ? 'rgba(157, 0, 255, 0.1)'
              : item.step === '03'
              ? 'rgba(224, 17, 95, 0.1)'
              : 'rgba(212, 175, 55, 0.1)';
          const borderDim =
            item.step === '02'
              ? 'rgba(157, 0, 255, 0.35)'
              : item.step === '03'
              ? 'rgba(224, 17, 95, 0.35)'
              : 'rgba(212, 175, 55, 0.35)';

          return (
            <div
              key={item.step}
              className="mission-flow-card"
              style={{
                padding: '26px 24px',
                background: 'linear-gradient(180deg, rgba(12, 20, 36, 0.82) 0%, rgba(7, 13, 24, 0.94) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '12px',
                boxShadow: '0 8px 28px rgba(2, 6, 15, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {/* Step Top Bar: Icon + Step Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '18px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: bgDim,
                    border: `1px solid ${borderDim}`,
                    boxShadow: `0 0 12px ${bgDim}`,
                  }}
                >
                  {item.icon}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    color: accentColor,
                    padding: '3px 8px',
                    background: bgDim,
                    borderRadius: '4px',
                    border: `1px solid ${borderDim}`,
                  }}
                >
                  // PHASE {item.step}
                </span>
              </div>

            {/* Title */}
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#F8FAFC',
                letterSpacing: '0.6px',
                marginBottom: '8px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {item.title}
            </h3>

            {/* Description */}
            <p
              style={{
                fontSize: '13.5px',
                lineHeight: 1.6,
                color: '#94A3B8',
                margin: 0,
              }}
            >
              {item.description}
            </p>
          </div>
        );
      })}
      </div>
    </section>
  );
};

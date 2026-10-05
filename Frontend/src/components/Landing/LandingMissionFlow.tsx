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
      icon: <Radio size={20} color="#27C7FF" />,
    },
    {
      step: '02',
      title: 'SIMULATE',
      description: 'Run mission scenarios and what-if conditions',
      icon: <Sliders size={20} color="#27C7FF" />,
    },
    {
      step: '03',
      title: 'DIAGNOSE',
      description: 'Trace faults and their propagation',
      icon: <GitBranch size={20} color="#27C7FF" />,
    },
    {
      step: '04',
      title: 'RECOVER',
      description: 'Evaluate and apply recovery strategies',
      icon: <ShieldCheck size={20} color="#27C7FF" />,
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
            color: '#27C7FF',
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
        {steps.map((item) => (
          <div
            key={item.step}
            className="mission-flow-card"
            style={{
              padding: '24px 22px',
              background: 'rgba(5, 12, 24, 0.75)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(39, 199, 255, 0.16)',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
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
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: 'rgba(39, 199, 255, 0.08)',
                  border: '1px solid rgba(39, 199, 255, 0.25)',
                }}
              >
                {item.icon}
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  color: '#27C7FF',
                  padding: '3px 8px',
                  background: 'rgba(39, 199, 255, 0.08)',
                  borderRadius: '4px',
                  border: '1px solid rgba(39, 199, 255, 0.2)',
                }}
              >
                {item.step}
              </span>
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#F5F8FC',
                letterSpacing: '0.6px',
                marginBottom: '8px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {item.step} — {item.title}
            </h3>

            {/* Description */}
            <p
              style={{
                fontSize: '13.5px',
                lineHeight: 1.55,
                color: '#94A3B8',
                margin: 0,
              }}
            >
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

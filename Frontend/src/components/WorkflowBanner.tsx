import React from 'react';
import { useSimulation, type WorkflowStep, type ActiveModule } from '../context/SimulationContext';
import { ChevronRight } from 'lucide-react';

interface WorkflowItem {
  key: WorkflowStep;
  label: string;
  module: ActiveModule;
  description: string;
}

const STEPS: WorkflowItem[] = [
  { key: 'OBSERVE', label: '1. Observe', module: 'mission-control', description: 'Monitor telemetry and health indicators' },
  { key: 'INVESTIGATE', label: '2. Investigate', module: 'telemetry', description: 'Inspect subsystem anomalies and components' },
  { key: 'SIMULATE', label: '3. Simulate', module: 'simulation-lab', description: 'Inject or simulate mission conditions' },
  { key: 'DETECT_PROPAGATION', label: '4. Detect Propagation', module: 'fault-analysis', description: 'Observe cross-subsystem cascading effects' },
  { key: 'ANALYZE_IMPACT', label: '5. Analyze Impact', module: 'fault-analysis', description: 'Evaluate mission objectives and safety limits' },
  { key: 'SELECT_RECOVERY', label: '6. Select Recovery', module: 'recovery-planner', description: 'Formulate candidate operational mitigations' },
  { key: 'RE_SIMULATE', label: '7. Re-simulate', module: 'recovery-planner', description: 'Execute multi-scenario branching re-runs' },
  { key: 'COMPARE', label: '8. Compare', module: 'recovery-planner', description: 'Contrast physics outcomes vs unmitigated baseline' },
];

export const WorkflowBanner: React.FC = () => {
  const { workflowStep, setWorkflowStep, setActiveModule } = useSimulation();

  const handleStepClick = (step: WorkflowItem) => {
    setWorkflowStep(step.key);
    setActiveModule(step.module);
  };

  const currentIdx = STEPS.findIndex((s) => s.key === workflowStep);

  return (
    <div
      style={{
        background: 'rgba(7, 12, 23, 0.96)',
        borderBottom: '1px solid rgba(56, 189, 248, 0.1)',
        padding: '8px 16px',
        overflowX: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '950px' }}>
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: 'var(--accent-gold)',
            marginRight: '8px',
            whiteSpace: 'nowrap',
            letterSpacing: '0.6px',
          }}
        >
          MISSION WORKFLOW:
        </span>

        {STEPS.map((step, idx) => {
          const isActive = step.key === workflowStep;
          const isPassed = idx < currentIdx;

          return (
            <React.Fragment key={step.key}>
              <button
                onClick={() => handleStepClick(step)}
                title={step.description}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: isActive
                    ? '1px solid rgba(212, 175, 55, 0.75)'
                    : isPassed
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isActive
                    ? 'rgba(212, 175, 55, 0.18)'
                    : isPassed
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'rgba(255, 255, 255, 0.02)',
                  color: isActive
                    ? '#ffffff'
                    : isPassed
                    ? '#34d399'
                    : 'var(--text-muted)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: isActive ? 700 : isPassed ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s ease',
                  boxShadow: isActive ? '0 0 12px rgba(212, 175, 55, 0.28)' : 'none',
                }}
              >
                {isActive && (
                  <span
                    className="live-beacon"
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: 'var(--accent-gold)',
                      display: 'inline-block',
                    }}
                  />
                )}
                <span>{step.label}</span>
              </button>

              {idx < STEPS.length - 1 && (
                <ChevronRight size={13} color="rgba(212, 175, 55, 0.3)" style={{ flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

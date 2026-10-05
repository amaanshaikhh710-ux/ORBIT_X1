import React from 'react';
import { Sun, Battery, Camera, Radio, Compass, Box } from 'lucide-react';

interface ComponentDockProps {
  selectedComponent: string | null;
  onSelect: (component: string) => void;
}

interface ComponentItem {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export const ComponentDock: React.FC<ComponentDockProps> = ({ selectedComponent, onSelect }) => {
  const components: ComponentItem[] = [
    { id: 'solar', name: 'Solar', icon: <Sun size={20} color="#f59e0b" /> },
    { id: 'battery', name: 'Battery', icon: <Battery size={20} color="#10b981" /> },
    { id: 'payload', name: 'Payload', icon: <Camera size={20} color="#38bdf8" /> },
    { id: 'comm', name: 'Comm', icon: <Radio size={20} color="#38bdf8" /> },
    { id: 'adcs', name: 'ADCS', icon: <Compass size={20} color="#a855f7" /> },
    { id: 'bus', name: 'Bus', icon: <Box size={20} color="#94a3b8" /> },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        background: 'rgba(9, 14, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}
    >
      {components.map((c) => {
        const isSelected = selectedComponent === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '74px',
              height: '70px',
              padding: '6px',
              background: isSelected ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isSelected
                ? '0 0 16px rgba(56, 189, 248, 0.45), inset 0 0 8px rgba(56, 189, 248, 0.2)'
                : 'none',
              transform: isSelected ? 'scale(1.04)' : 'scale(1)',
            }}
            title={`Inspect ${c.name} component`}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {c.icon}
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? '#38bdf8' : 'var(--text-secondary)',
                letterSpacing: '0.3px',
              }}
            >
              {c.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};

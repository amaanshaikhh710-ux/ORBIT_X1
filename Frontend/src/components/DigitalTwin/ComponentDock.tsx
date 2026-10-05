import React from 'react';
import {
  RotateCcw,
  Move,
  ZoomIn,
  RefreshCw,
  Maximize,
  Sun,
  Battery,
  Camera,
  Radio,
  Compass,
  Box,
} from 'lucide-react';

export type ViewMode = 'rotate' | 'pan' | 'zoom';

export interface ComponentDockProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onResetView?: () => void;
  onToggleFullscreen?: () => void;
  selectedComponent: string | null;
  onSelectComponent: (component: string) => void;
}

interface ComponentItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  activeColor: string;
}

export const ComponentDock: React.FC<ComponentDockProps> = ({
  viewMode,
  onViewModeChange,
  onResetView,
  onToggleFullscreen,
  selectedComponent,
  onSelectComponent,
}) => {
  const viewActions: {
    id: ViewMode;
    name: string;
    icon: React.ReactNode;
    tooltip: string;
  }[] = [
    {
      id: 'rotate',
      name: 'Rotate',
      icon: <RotateCcw size={18} />,
      tooltip: 'Orbit / Rotate Viewpoint (Click to step or drag canvas)',
    },
    {
      id: 'pan',
      name: 'Pan',
      icon: <Move size={18} />,
      tooltip: 'Pan Camera Position (Click to center or drag canvas)',
    },
    {
      id: 'zoom',
      name: 'Zoom',
      icon: <ZoomIn size={18} />,
      tooltip: 'Zoom Camera Distance (Click to cycle or drag canvas)',
    },
  ];

  const components: ComponentItem[] = [
    { id: 'solar', name: 'Solar', icon: <Sun size={18} />, activeColor: '#f59e0b' },
    { id: 'battery', name: 'Battery', icon: <Battery size={18} />, activeColor: '#10b981' },
    { id: 'payload', name: 'Payload', icon: <Camera size={18} />, activeColor: '#38bdf8' },
    { id: 'comm', name: 'Comm', icon: <Radio size={18} />, activeColor: '#38bdf8' },
    { id: 'adcs', name: 'ADCS', icon: <Compass size={18} />, activeColor: '#c084fc' },
    { id: 'bus', name: 'Bus', icon: <Box size={18} />, activeColor: '#94a3b8' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 14px',
        background: 'rgba(10, 14, 23, 0.90)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(56, 189, 248, 0.24)',
        borderRadius: '12px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65), 0 0 1px rgba(56, 189, 248, 0.3)',
        maxWidth: 'calc(100vw - 32px)',
        overflowX: 'auto',
        pointerEvents: 'auto',
      }}
    >
      {/* 1. View Controls Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            paddingLeft: '2px',
          }}
        >
          View Controls
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {viewActions.map((action) => {
            const isActive = viewMode === action.id;
            return (
              <button
                key={action.id}
                onClick={() => onViewModeChange(action.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  width: '64px',
                  height: '56px',
                  padding: '4px',
                  background: isActive ? 'rgba(14, 165, 233, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                  border: isActive ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: isActive ? '#38bdf8' : 'var(--text-secondary)',
                  boxShadow: isActive
                    ? '0 0 14px rgba(56, 189, 248, 0.35), inset 0 0 6px rgba(56, 189, 248, 0.15)'
                    : 'none',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                }}
                title={action.tooltip}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {action.icon}
                </div>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: '0.2px',
                  }}
                >
                  {action.name}
                </span>
              </button>
            );
          })}

          {/* View Utilities: Reset & Fullscreen */}
          {(onResetView || onToggleFullscreen) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '2px' }}>
              {onResetView && (
                <button
                  onClick={onResetView}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '26px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Reset Camera Viewpoint"
                >
                  <RefreshCw size={13} />
                </button>
              )}
              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '26px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Toggle Fullscreen"
                >
                  <Maximize size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Clean Vertical Divider */}
      <div
        style={{
          width: '1px',
          height: '44px',
          background: 'rgba(56, 189, 248, 0.22)',
          margin: '0 4px',
          alignSelf: 'center',
          flexShrink: 0,
        }}
      />

      {/* 2. Subsystems Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            paddingLeft: '2px',
          }}
        >
          Spacecraft Subsystems
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {components.map((c) => {
            const isSelected = selectedComponent === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectComponent(c.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  width: '64px',
                  height: '56px',
                  padding: '4px',
                  background: isSelected ? 'rgba(14, 165, 233, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: isSelected ? '#38bdf8' : 'var(--text-secondary)',
                  boxShadow: isSelected
                    ? '0 0 14px rgba(56, 189, 248, 0.35), inset 0 0 6px rgba(56, 189, 248, 0.15)'
                    : 'none',
                  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
                }}
                title={`Inspect & focus ${c.name} subsystem`}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? '#38bdf8' : c.activeColor,
                  }}
                >
                  {c.icon}
                </div>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: isSelected ? 600 : 500,
                    letterSpacing: '0.2px',
                  }}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

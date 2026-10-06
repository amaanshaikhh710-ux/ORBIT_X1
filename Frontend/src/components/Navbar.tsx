import React, { useEffect } from 'react';
import { useSimulation, getRoleDefaultModule, type ActiveModule } from '../context/SimulationContext';
import {
  Satellite,
  Activity,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Clock,
  FileText,
  Box,
  BookOpen,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  History,
  Shield,
  LogOut,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { state, isRunning, connected, activeModule, setActiveModule, user, logout } = useSimulation();

  const userRole = user?.role || 'Mission Operator';

  const navItems: { id: ActiveModule; label: string; icon: React.ReactNode }[] = [
    { id: 'mission-control', label: 'Mission Control', icon: <Satellite size={16} /> },
    { id: 'digital-twin', label: 'Digital Twin (3D)', icon: <Box size={16} /> },
    { id: 'telemetry', label: 'Telemetry', icon: <Activity size={16} /> },
    { id: 'simulation-lab', label: 'Simulation Lab', icon: <Sliders size={16} /> },
    { id: 'fault-analysis', label: 'Fault Analysis', icon: <AlertTriangle size={16} /> },
    { id: 'recovery-planner', label: 'Recovery Planner', icon: <RotateCcw size={16} /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={16} /> },
    { id: 'reports', label: 'Reports', icon: <FileText size={16} /> },
    { id: 'history', label: 'Mission History', icon: <History size={16} /> },
    { id: 'docs', label: 'Docs & Register', icon: <BookOpen size={16} /> },
  ];

  // Authoritative RBAC module filtering
  const isAllowedModule = React.useCallback((moduleId: ActiveModule): boolean => {
    if (moduleId === 'landing' || moduleId === 'login') return true;
    // Mission Administrator has unrestricted full access to every module
    if (userRole === 'Mission Administrator') return true;

    // Common operational monitoring modules
    if (['mission-control', 'digital-twin', 'telemetry', 'timeline', 'reports', 'history', 'docs'].includes(moduleId)) {
      return true;
    }

    // Flight Director: Monitoring + Flight Director Console + Recovery Planner
    if (userRole === 'Flight Director') {
      return moduleId === 'flight-director' || moduleId === 'recovery-planner';
    }

    // Simulation Engineer: Monitoring + Simulation Dashboard + Simulation Lab + Fault Analysis + Recovery Planner
    if (userRole === 'Simulation Engineer') {
      return (
        moduleId === 'simulation-dashboard' ||
        moduleId === 'simulation-lab' ||
        moduleId === 'fault-analysis' ||
        moduleId === 'recovery-planner'
      );
    }

    return false;
  }, [userRole]);

  useEffect(() => {
    if (activeModule !== 'landing' && activeModule !== 'login' && !isAllowedModule(activeModule)) {
      setActiveModule(getRoleDefaultModule(userRole));
    }
  }, [userRole, activeModule, setActiveModule, isAllowedModule]);

  const visibleNavItems = navItems.filter((item) => isAllowedModule(item.id));

  const formatSimTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `T+ ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(6, 11, 22, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Top Bar: Mission Metadata & Live Telemetry Telemetry Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 20px',
          borderBottom: '1px solid rgba(56, 189, 248, 0.1)',
        }}
      >
        <div
          onClick={() => setActiveModule('landing')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          title="Return to Landing Page"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #131d2e 0%, #070c14 100%)',
              border: '1px solid rgba(249, 115, 22, 0.45)',
              boxShadow: '0 0 12px rgba(249, 115, 22, 0.2)',
            }}
          >
            <Satellite size={18} color="var(--accent-orange)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, letterSpacing: '0.6px', fontSize: '15px', color: '#FFFFFF' }}>
                ORBITAL <span style={{ color: 'var(--accent-orange)' }}>TWIN</span>
              </span>
              <span className="badge badge-gold" style={{ fontSize: '10px' }}>3U CUBESAT</span>
              <span className="source-tag">AUTHORITATIVE DIGITAL TWIN</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Mission: Earth Observation & High-Rate Svalbard Downlink
            </div>
          </div>
        </div>

        {/* Spacecraft Flight Clock & Real-time Telemetry Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Orbit Phase */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(11, 16, 26, 0.85)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
            }}
          >
            {state?.in_sunlight ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-orange)', fontSize: '11.5px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                <Sun size={13} /> SUNLIGHT ({(state.true_anomaly_deg || 0).toFixed(1)}°)
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--accent-cyan)', fontSize: '11.5px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                <Moon size={13} /> ECLIPSE (UMBRA)
              </span>
            )}
          </div>

          {/* Ground Station Visibility */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: state?.ground_station_visible ? 'rgba(249, 115, 22, 0.12)' : 'rgba(11, 16, 26, 0.85)',
              borderRadius: '6px',
              border: state?.ground_station_visible ? '1px solid rgba(249, 115, 22, 0.45)' : '1px solid var(--border-color)',
            }}
          >
            <span
              style={{
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: state?.ground_station_visible ? 'var(--accent-orange)' : 'var(--text-muted)',
              }}
            >
              GS SVALBARD: {state?.ground_station_visible ? 'AOS (VISIBLE)' : 'LOS'}
            </span>
          </div>

          {/* Mission Time */}
          <div
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              background: 'rgba(11, 16, 26, 0.95)',
              border: '1px solid rgba(249, 115, 22, 0.35)',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5), 0 0 8px rgba(249, 115, 22, 0.1)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '13px',
              color: 'var(--accent-orange)',
              letterSpacing: '1px',
            }}
          >
            {formatSimTime(state?.simulation_time_s || 0)}
          </div>

          {/* Engine State Indicator */}
          <span className={`badge ${isRunning ? 'badge-normal' : 'badge-warning'}`}>
            <span
              className={isRunning ? 'live-beacon' : ''}
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: isRunning ? '#10b981' : '#f59e0b',
                display: 'inline-block',
              }}
            />
            {isRunning ? 'SIM RUNNING' : 'SIM PAUSED'}
          </span>

          {/* WebSocket Link */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: connected ? 'var(--status-normal)' : 'var(--status-critical)',
            }}
            title={connected ? 'Live WebSocket telemetry active' : 'WebSocket disconnected - reconnecting'}
          >
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {connected ? 'WS LIVE' : 'WS OFFLINE'}
            </span>
          </div>

          {/* Operator Authentication & Authoritative Role Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px' }}>
            <div
              onClick={() => setActiveModule(getRoleDefaultModule(userRole))}
              title={`Click to open your primary ${userRole} Dashboard`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                background:
                  userRole === 'Mission Administrator'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : userRole === 'Flight Director'
                    ? 'rgba(56, 189, 248, 0.12)'
                    : userRole === 'Simulation Engineer'
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(245, 158, 11, 0.12)',
                border:
                  userRole === 'Mission Administrator'
                    ? '1px solid rgba(245, 158, 11, 0.4)'
                    : userRole === 'Flight Director'
                    ? '1px solid rgba(56, 189, 248, 0.4)'
                    : userRole === 'Simulation Engineer'
                    ? '1px solid rgba(34, 197, 94, 0.35)'
                    : '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '6px',
                fontSize: '11.5px',
                color:
                  userRole === 'Mission Administrator'
                    ? 'var(--accent-amber)'
                    : userRole === 'Flight Director'
                    ? 'var(--accent-cyan)'
                    : userRole === 'Simulation Engineer'
                    ? '#22c55e'
                    : 'var(--accent-amber)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
              }}
            >
              <Shield size={13} />
              <span>{user ? user.username : 'GUEST'}</span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.08)',
                  letterSpacing: '0.4px',
                }}
              >
                {userRole.toUpperCase()}
              </span>
            </div>
            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '6px',
                color: '#f87171',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
              title="Sign out operator"
            >
              <LogOut size={12} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0 16px',
          overflowX: 'auto',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {visibleNavItems.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                background: isActive ? 'rgba(249, 115, 22, 0.12)' : 'transparent',
                color: isActive ? '#F8FAFC' : 'var(--text-secondary)',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-orange)' : '2px solid transparent',
                borderRadius: '4px 4px 0 0',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
                boxShadow: 'none',
              }}
            >
              <span style={{ color: isActive ? 'var(--accent-orange)' : 'inherit' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};

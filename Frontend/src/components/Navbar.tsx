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
    ...(userRole === 'Mission Administrator'
      ? [{ id: 'mission-admin' as ActiveModule, label: 'Admin Console', icon: <Shield size={16} /> }]
      : []),
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
        background: 'var(--bg-primary)',
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
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
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
              width: 32,
              height: 32,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              boxShadow: '0 0 12px rgba(14, 165, 233, 0.4)',
            }}
          >
            <Satellite size={18} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, letterSpacing: '0.5px', fontSize: '15px' }}>
                ORBITAL <span style={{ color: 'var(--accent-cyan)' }}>TWIN</span>
              </span>
              <span className="badge badge-info">3U CUBESAT</span>
              <span className="source-tag">AUTHORITATIVE DIGITAL TWIN</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Mission: Earth Observation & High-Rate Svalbard Downlink
            </div>
          </div>
        </div>

        {/* Spacecraft Flight Clock & Real-time Telemetry Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Orbit Phase */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
            }}
          >
            {state?.in_sunlight ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '12px' }}>
                <Sun size={14} /> SUNLIGHT (ANOMALY: {(state.true_anomaly_deg || 0).toFixed(1)}°)
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', fontSize: '12px' }}>
                <Moon size={14} /> ECLIPSE (UMBRA)
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
              background: state?.ground_station_visible ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.04)',
              borderRadius: '6px',
              border: state?.ground_station_visible ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: state?.ground_station_visible ? 'var(--accent-cyan)' : 'var(--text-muted)',
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
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-color)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '13px',
              color: 'var(--accent-cyan)',
              letterSpacing: '1px',
            }}
          >
            {formatSimTime(state?.simulation_time_s || 0)}
          </div>

          {/* Engine State Indicator */}
          <span className={`badge ${isRunning ? 'badge-normal' : 'badge-warning'}`}>
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
            {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
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
                    ? 'rgba(234, 179, 8, 0.15)'
                    : userRole === 'Flight Director'
                    ? 'rgba(168, 85, 247, 0.15)'
                    : userRole === 'Simulation Engineer'
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(39, 199, 255, 0.15)',
                border:
                  userRole === 'Mission Administrator'
                    ? '1px solid rgba(234, 179, 8, 0.4)'
                    : userRole === 'Flight Director'
                    ? '1px solid rgba(168, 85, 247, 0.4)'
                    : userRole === 'Simulation Engineer'
                    ? '1px solid rgba(34, 197, 94, 0.4)'
                    : '1px solid rgba(39, 199, 255, 0.3)',
                borderRadius: '6px',
                fontSize: '11.5px',
                color:
                  userRole === 'Mission Administrator'
                    ? '#FACC15'
                    : userRole === 'Flight Director'
                    ? '#C084FC'
                    : userRole === 'Simulation Engineer'
                    ? '#4ADE80'
                    : '#38BDF8',
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
                  background: 'rgba(255,255,255,0.1)',
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
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                color: '#f87171',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
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
                background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                borderRadius: '4px 4px 0 0',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};

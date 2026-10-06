import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { SimulationProvider, useSimulation, getRoleDefaultModule } from './context/SimulationContext';
import { Navbar } from './components/Navbar';
import { WorkflowBanner } from './components/WorkflowBanner';
import { ControlBar } from './components/ControlBar';
import { MissionControl } from './modules/MissionControl';
import { DigitalTwinModule } from './modules/DigitalTwinModule';
import { TelemetryWorkbench } from './modules/TelemetryWorkbench';
import { SimulationLab } from './modules/SimulationLab';
import { FaultAnalysis } from './modules/FaultAnalysis';
import { RecoveryPlanner } from './modules/RecoveryPlanner';
import { MissionTimeline } from './modules/MissionTimeline';
import { Reports } from './modules/Reports';
import { Documentation } from './modules/Documentation';
import { LandingPage } from './modules/LandingPage';
import { LoginPage } from './modules/LoginPage';
import { MissionHistory } from './modules/MissionHistory';
import { FlightDirectorDashboard } from './modules/FlightDirectorDashboard';
import { SimulationDashboard } from './modules/SimulationDashboard';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Orbital Twin Render Error Caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 30%, #081d3f 0%, #051329 50%, #020814 100%)',
            color: '#F5F8FC',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              padding: '36px',
              maxWidth: '520px',
              background: 'rgba(5, 12, 24, 0.92)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#EF4444',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={28} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 10px 0', color: '#FFFFFF' }}>
              Operations Console Recovery
            </h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              A telemetry rendering boundary anomaly occurred. The mission state and authentication session have been safely preserved.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                border: '1px solid rgba(39, 199, 255, 0.4)',
                borderRadius: '8px',
                color: '#FFFFFF',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} />
              <span>Reload Operations Console</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const FallbackModule: React.FC = () => {
  const { user, setActiveModule } = useSimulation();
  const defaultMod = getRoleDefaultModule(user?.role);
  React.useEffect(() => {
    setActiveModule(defaultMod);
  }, [defaultMod, setActiveModule]);
  return null;
};

const MainContent: React.FC = () => {
  const { activeModule } = useSimulation();

  return (
    <main style={{ minHeight: 'calc(100vh - 150px)', background: 'var(--bg-primary)' }}>
      {activeModule === 'flight-director' && <FlightDirectorDashboard />}
      {activeModule === 'simulation-dashboard' && <SimulationDashboard />}
      {activeModule === 'mission-control' && <MissionControl />}
      {activeModule === 'digital-twin' && <DigitalTwinModule />}
      {activeModule === 'telemetry' && <TelemetryWorkbench />}
      {activeModule === 'simulation-lab' && <SimulationLab />}
      {activeModule === 'fault-analysis' && <FaultAnalysis />}
      {activeModule === 'recovery-planner' && <RecoveryPlanner />}
      {activeModule === 'timeline' && <MissionTimeline />}
      {activeModule === 'reports' && <Reports />}
      {activeModule === 'history' && <MissionHistory />}
      {activeModule === 'docs' && <Documentation />}
      {![
        'flight-director',
        'simulation-dashboard',
        'mission-control',
        'digital-twin',
        'telemetry',
        'simulation-lab',
        'fault-analysis',
        'recovery-planner',
        'timeline',
        'reports',
        'history',
        'docs',
      ].includes(activeModule) && <FallbackModule />}
    </main>
  );
};

const AppContent: React.FC = () => {
  const { activeModule, isAuthenticated } = useSimulation();

  if (activeModule === 'landing') {
    return <LandingPage />;
  }

  // Protect main mission operations; prompt login if not authenticated
  if (activeModule === 'login' || !isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <WorkflowBanner />
      <ControlBar />
      <MainContent />
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <SimulationProvider>
        <AppContent />
      </SimulationProvider>
    </ErrorBoundary>
  );
}

export default App;

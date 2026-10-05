import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { SimulationLab } from './SimulationLab';
import {
  Sliders,
  Sun,
  Moon,
  Cpu,
  Zap,
  Activity,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const SimulationDashboard: React.FC = () => {
  const { state, user, setActiveModule } = useSimulation();

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', color: '#F1F5F9' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.35)',
          borderRadius: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #22C55E, #16A34A)',
              color: '#FFFFFF',
              boxShadow: '0 0 16px rgba(34, 197, 94, 0.4)',
            }}
          >
            <Sliders size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '0.4px', color: '#FFFFFF' }}>
                Simulation & Physics Dashboard
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(34, 197, 94, 0.25)',
                  border: '1px solid rgba(34, 197, 94, 0.5)',
                  color: '#86EFAC',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.5px',
                }}
              >
                FAULT INJECTION & SIM LAB AUTHORITY
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#94A3B8', marginTop: '3px' }}>
              Operator: {user?.username || 'simulation_engineer'} · Subsystem degradation injection, orbital physics overrides, and causality verification
            </div>
          </div>
        </div>

        {/* Quick Link to Causal Graph */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveModule('fault-analysis')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(251, 146, 60, 0.4)',
              background: 'rgba(251, 146, 60, 0.1)',
              color: '#FB923C',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <AlertTriangle size={13} />
            <span>Causal Graph</span>
            <ArrowRight size={13} />
          </button>
          <button
            onClick={() => setActiveModule('telemetry')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#CBD5E1',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <Activity size={13} />
            <span>Telemetry Plots</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 2. Physics & Spacecraft Hardware Vitals */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div style={{ padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ENVIRONMENTAL STATE
            </span>
            {state?.environment_state === 'SUNLIGHT' ? <Sun size={15} color="#FACC15" /> : <Moon size={15} color="#94A3B8" />}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#FACC15', marginTop: '6px' }}>
            {state?.environment_state || 'SUNLIGHT'}
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Anomaly: {(state?.true_anomaly_deg ?? 0).toFixed(1)}° · Ground Stn: {state?.ground_station_visible ? 'VISIBLE' : 'LOS'}
          </div>
        </div>

        <div style={{ padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              SOLAR ARRAY OUTPUT
            </span>
            <Zap size={15} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#38BDF8', marginTop: '6px' }}>
            {(state?.solar_generation_w ?? 0).toFixed(2)} W
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Cell Health: {((state?.solar_health ?? 1.0) * 100).toFixed(0)}% · Consumption: {(state?.total_power_consumption_w ?? 0).toFixed(1)} W
          </div>
        </div>

        <div style={{ padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              OBC PROCESSOR LOAD
            </span>
            <Cpu size={15} color="#4ADE80" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#4ADE80', marginTop: '6px' }}>
            {(state?.obc_cpu_utilization_pct ?? 35).toFixed(0)} %
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Storage: {(state?.storage_used_mb ?? 0).toFixed(1)} MB / {(state?.storage_capacity_gb ?? 16) * 1000} MB
          </div>
        </div>

        <div style={{ padding: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ACTIVE FAULT INJECTIONS
            </span>
            <AlertTriangle size={15} color={(state?.active_faults_count ?? 0) > 0 ? '#EF4444' : '#4ADE80'} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: (state?.active_faults_count ?? 0) > 0 ? '#EF4444' : '#4ADE80', marginTop: '6px' }}>
            {state?.active_faults_count ?? 0} ACTIVE
          </div>
          <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
            Use the injection workbench below to stage hardware faults
          </div>
        </div>
      </div>

      {/* 3. Embedded Subsystem Fault Injection Lab */}
      <div style={{ marginTop: '16px' }}>
        <SimulationLab />
      </div>
    </div>
  );
};

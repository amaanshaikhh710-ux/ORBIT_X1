import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { api } from '../services/api';
import type { AlertItem, HistoricalSimulationRun } from '../types/simulation';
import { Clock, Filter, Database } from 'lucide-react';

export const MissionTimeline: React.FC = () => {
  const { alerts, activeRunId } = useSimulation();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [selectedRunId, setSelectedRunId] = useState<string>('ACTIVE');
  const [historicalRuns, setHistoricalRuns] = useState<HistoricalSimulationRun[]>([]);
  const [historicalEvents, setHistoricalEvents] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    api.getHistoricalRuns()
      .then((runs) => {
        if (Array.isArray(runs)) setHistoricalRuns(runs);
      })
      .catch(console.error);
  }, [activeRunId]);

  useEffect(() => {
    if (selectedRunId === 'ACTIVE') {
      setHistoricalEvents([]);
      return;
    }

    setLoading(true);
    api.getTimeline(selectedRunId)
      .then((data) => {
        if (data && Array.isArray(data.events)) {
          setHistoricalEvents(data.events);
        } else {
          setHistoricalEvents([]);
        }
      })
      .catch((e) => {
        console.error('Failed to load historical timeline events:', e);
        setHistoricalEvents([]);
      })
      .finally(() => setLoading(false));
  }, [selectedRunId]);

  const activeEvents = selectedRunId === 'ACTIVE' ? alerts : historicalEvents;

  const sortedEvents = [...activeEvents].sort((a, b) => {
    const timeA = a.simulation_time_s ?? a.timestamp_s ?? 0;
    const timeB = b.simulation_time_s ?? b.timestamp_s ?? 0;
    return timeA - timeB;
  });

  const filteredAlerts = sortedEvents.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const formatSimTime = (secs = 0) => {
    const total = Math.max(0, Math.round(secs));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = Math.floor(total % 60);
    return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="aerospace-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--accent-gold)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Mission Event Timeline</span>
            <span className="source-tag">CHRONOLOGICAL SIMULATION EVENT LOG</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Mission: <strong style={{ color: '#38bdf8' }}>{selectedRunId === 'ACTIVE' ? activeRunId : selectedRunId}</strong> | Chronological internal spacecraft timeline
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Mission Run Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={14} color="#38bdf8" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Run:</span>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#38bdf8',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Select active or historical mission run to view its isolated chronological timeline"
            >
              <option value="ACTIVE">Active Mission ({activeRunId})</option>
              {historicalRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} ({r.status})
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Filter:</span>
            {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: filterSeverity === sev ? '1px solid rgba(157, 0, 255, 0.65)' : '1px solid var(--border-color)',
                  background: filterSeverity === sev ? 'rgba(157, 0, 255, 0.22)' : 'rgba(255, 255, 255, 0.02)',
                  color: filterSeverity === sev ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: filterSeverity === sev ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: filterSeverity === sev ? '0 0 10px rgba(157, 0, 255, 0.3)' : 'none',
                }}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div className="aerospace-card">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-cyan)', fontSize: '13px' }}>
            Loading mission timeline from database vault...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No operational events logged matching filter for this mission run.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredAlerts.map((ev, i) => {
              const simTimeSec = ev.simulation_time_s ?? ev.timestamp_s ?? 0;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${
                      ev.severity === 'CRITICAL'
                        ? 'var(--status-critical)'
                        : ev.severity === 'WARNING'
                        ? 'var(--status-warning)'
                        : 'var(--accent-cyan)'
                    }`,
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)', width: '95px', flexShrink: 0, fontWeight: 600 }}>
                    {formatSimTime(simTimeSec)}
                  </div>

                  <span
                    className={`badge ${
                      ev.severity === 'CRITICAL'
                        ? 'badge-critical'
                        : ev.severity === 'WARNING'
                        ? 'badge-warning'
                        : 'badge-info'
                    }`}
                    style={{ width: '85px', justifyContent: 'center' }}
                  >
                    {ev.subsystem}
                  </span>

                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>
                    {ev.message}
                  </div>

                  <span className="source-tag" style={{ fontSize: '10px' }}>
                    {ev.severity}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Clock, Filter } from 'lucide-react';

export const MissionTimeline: React.FC = () => {
  const { alerts } = useSimulation();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="aerospace-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Mission Event Timeline</span>
            <span className="source-tag">CHRONOLOGICAL EVENT LOG</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Sequence of operational events, autonomous state transitions, fault injections, and recovery executions.
          </div>
        </div>

        {/* Severity Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} color="var(--text-muted)" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Filter:</span>
          {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                border: filterSeverity === sev ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                background: filterSeverity === sev ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                color: filterSeverity === sev ? '#fff' : 'var(--text-secondary)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="aerospace-card">
        {filteredAlerts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No operational events logged matching filter. Start simulation or inject faults to generate events.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredAlerts.map((ev, i) => (
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
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-cyan)', width: '80px', flexShrink: 0 }}>
                  T+{(ev.simulation_time_s ?? ev.timestamp_s ?? 0).toFixed(0)}s
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

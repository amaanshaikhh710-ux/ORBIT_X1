import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { GitFork, ShieldAlert, Zap, ArrowDown } from 'lucide-react';

export const FaultAnalysis: React.FC = () => {
  const { causalGraph, state, setWorkflowStep, setActiveModule } = useSimulation();

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="aerospace-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitFork size={18} color="var(--status-critical)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Fault Propagation & Causal Analysis</span>
            <span className="source-tag">DISCRETE CAUSAL GRAPH</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Authoritative directed graph mapping how physical anomalies propagate across subsystems and impact mission objectives.
          </div>
        </div>

        <button
          onClick={() => {
            setWorkflowStep('SELECT_RECOVERY');
            setActiveModule('recovery-planner');
          }}
          className="btn btn-primary"
          style={{ background: '#0284c7' }}
        >
          Formulate Recovery Strategy →
        </button>
      </div>

      {/* Causal Chain Summary Banner */}
      <div className="aerospace-card" style={{ borderLeft: '4px solid var(--status-critical)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <ShieldAlert size={16} color="var(--status-critical)" />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Current Propagation Status</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {causalGraph && causalGraph.edges.length > 0 ? (
            <span>
              Active causal chain detected with <b>{causalGraph.nodes.length} nodes</b> and <b>{causalGraph.edges.length} directed causal transitions</b>.
              Primary root cause originating in <b>{causalGraph.nodes[0]?.subsystem || 'Unknown'}</b> impacting power state ({state?.power_state}) and science yield.
            </span>
          ) : (
            <span>
              No active causal fault chains detected. Spacecraft operates in nominal state ({state?.power_state}).
            </span>
          )}
        </div>
      </div>

      {/* Causal Graph Visualization (Flow Layout) */}
      <div className="aerospace-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>Subsystem Causal Transition Flow</span>
          </div>
          <span className="source-tag">DETERMINISTIC CAUSAL CHAIN</span>
        </div>

        {(!causalGraph || causalGraph.nodes.length === 0) ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No faults have triggered causal propagation yet. Navigate to <b>Simulation Lab</b> to inject a test fault (e.g. V-003: 70% Solar Array Degradation).
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '10px 0' }}>
            {causalGraph.nodes.map((node, idx) => {
              const edge = causalGraph.edges.find((e) => e.to === node.id);

              return (
                <React.Fragment key={node.id}>
                  {/* Directed Link / Edge Annotation */}
                  {edge && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '4px 12px',
                        background: 'rgba(239, 68, 68, 0.06)',
                        border: '1px dashed rgba(239, 68, 68, 0.3)',
                        borderRadius: '4px',
                        maxWidth: '450px',
                        textAlign: 'center',
                      }}
                    >
                      <ArrowDown size={14} color="var(--status-critical)" />
                      <span style={{ fontSize: '11px', color: 'var(--status-critical)', fontFamily: 'var(--font-mono)' }}>
                        {edge.description} (T+{(edge.timestamp_s ?? 0).toFixed(0)}s)
                      </span>
                    </div>
                  )}

                  {/* Node Box */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '520px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: idx === 0 ? '1px solid var(--status-critical)' : '1px solid var(--border-active)',
                      borderRadius: '8px',
                      padding: '14px 18px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className={`badge ${idx === 0 ? 'badge-critical' : 'badge-warning'}`}>
                          {idx === 0 ? 'ROOT CAUSE' : 'CONSEQUENCE'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          SUBSYSTEM: {node.subsystem.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {node.label}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-inactive" style={{ fontSize: '10px' }}>
                        NODE #{idx + 1}
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Subsystem Impact Matrix */}
      <div className="aerospace-card">
        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>
          Cross-Subsystem Engineering Impact Summary
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', fontSize: '12px' }}>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
            <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              ELECTRICAL POWER IMPACT
            </div>
            <div>Solar Generation: {(state?.solar_generation_w ?? 0).toFixed(2)} W</div>
            <div>Battery SOC: {(state?.battery_soc_pct ?? 0).toFixed(2)}%</div>
            <div>Power State: <span className="badge badge-warning">{state?.power_state || 'NORMAL'}</span></div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
            <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              SCIENCE PAYLOAD IMPACT
            </div>
            <div>Images Completed: {state?.images_completed ?? 0}</div>
            <div>Images Deferred: {state?.images_deferred ?? 0}</div>
            <div>Payload State: <span className="badge badge-info">{state?.payload_state || 'IDLE'}</span></div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
            <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              THERMAL & RF IMPACT
            </div>
            <div>Internal Temp: {(state?.internal_temp_c ?? 0).toFixed(2)} °C</div>
            <div>Downlink Rate: {(state?.downlink_data_rate_mbps ?? 0).toFixed(2)} Mbps</div>
            <div>Downlinked: {(state?.total_downlinked_data_mb ?? 0).toFixed(1)} MB</div>
          </div>
        </div>
      </div>
    </div>
  );
};

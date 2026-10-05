import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { FileText, Download, RefreshCw } from 'lucide-react';

export const Reports: React.FC = () => {
  const { generateReport } = useSimulation();
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const rep = await generateReport();
      setReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbital-twin-report-${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="aerospace-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Mission Verification & Post-Run Reports</span>
            <span className="source-tag">AUTHORITATIVE AUDIT TRAIL</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Comprehensive engineering telemetry audit, fault history, and epistemic assumptions register.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn btn-primary"
            style={{ background: '#0284c7' }}
          >
            <RefreshCw size={14} /> {loading ? 'Compiling Report...' : 'Generate New Report'}
          </button>

          {report && (
            <button onClick={handleDownloadJson} className="btn btn-secondary">
              <Download size={14} /> Export JSON
            </button>
          )}
        </div>
      </div>

      {report ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Metadata Card */}
          <div className="aerospace-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                  Report ID: {report.id}
                </span>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Generated: {report.created_at} | Mission: {report.mission}
                </div>
              </div>
              <span className="badge badge-normal">VERIFIED STATE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px' }}>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--text-muted)' }}>DURATION</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {report.simulation_duration_s} s
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--text-muted)' }}>FINAL BATTERY SOC</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: report.summary.final_battery_soc > 25 ? 'var(--status-normal)' : 'var(--status-critical)' }}>
                  {report.summary.final_battery_soc} %
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--text-muted)' }}>FINAL TEMP</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {report.summary.final_internal_temp_c} °C
                </div>
              </div>
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                <div style={{ color: 'var(--text-muted)' }}>DOWNLINK TOTAL</div>
                <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {report.summary.total_downlinked_mb} MB
                </div>
              </div>
            </div>
          </div>

          {/* Science Yield & Active Faults */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="aerospace-card">
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>
                Science Payload Acquisition Statistics
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Completed Imagery Scenes:</span>
                  <span className="font-mono" style={{ color: 'var(--status-normal)', fontWeight: 600 }}>
                    {report.summary.images_completed}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Deferred Imaging Events:</span>
                  <span className="font-mono" style={{ color: 'var(--status-warning)', fontWeight: 600 }}>
                    {report.summary.images_deferred}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Failed Acquisitions:</span>
                  <span className="font-mono" style={{ color: 'var(--status-critical)', fontWeight: 600 }}>
                    {report.summary.images_failed}
                  </span>
                </div>
              </div>
            </div>

            <div className="aerospace-card">
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>
                Active Anomalies & Fault History
              </div>
              {report.summary.active_faults.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  No active anomalies were present at report generation timestamp.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {report.summary.active_faults.map((f: any, idx: number) => (
                    <div key={idx} style={{ fontSize: '12px', color: 'var(--status-critical)' }}>
                      • [{f.fault_id}] {f.subsystem} ({f.parameter}) - {(f.severity * 100).toFixed(0)}% severity
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Epistemic Declarations */}
          <div className="aerospace-card" style={{ background: 'rgba(255,255,255,0.015)' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Epistemic Declarations & Engineering Baseline
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              <div><b>Model Classification:</b> {report.epistemic_declarations.model_type}</div>
              <div><b>Fidelity Declaration:</b> {report.epistemic_declarations.fidelity}</div>
              <div><b>Parameter Authoritative Source:</b> {report.epistemic_declarations.parameters_source}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="aerospace-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Click "Generate New Report" to compile the formal simulation audit log from current canonical spacecraft telemetry.
        </div>
      )}
    </div>
  );
};

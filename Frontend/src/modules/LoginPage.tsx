import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Shield, Lock, User, ArrowLeft, ArrowRight, Satellite, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, setActiveModule } = useSimulation();

  const [username, setUsername] = useState('mission_admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide call sign / username and access password');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Access authorization rejected. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        background:
          'radial-gradient(circle at 50% 15%, rgba(157, 0, 255, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 28%, #0d1222 0%, #060a16 45%, #020409 100%)',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflow: 'hidden',
      }}
    >
      {/* Background Star Grid Texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(157, 0, 255, 0.15) 1px, transparent 1px), radial-gradient(rgba(212, 175, 55, 0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px, 80px 80px',
          backgroundPosition: '0 0, 20px 20px',
          pointerEvents: 'none',
        }}
      />

      {/* Top back navigation */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '32px',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setActiveModule('landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(8, 14, 26, 0.8)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            color: '#CBD5E1',
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(12px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent-gold)';
            e.currentTarget.style.borderColor = 'var(--accent-gold)';
            e.currentTarget.style.transform = 'translateX(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#CBD5E1';
            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.25)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <ArrowLeft size={16} />
          <span>Return to Mission Overview</span>
        </button>
      </div>

      {/* Card Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(180deg, rgba(12, 20, 36, 0.92) 0%, rgba(7, 13, 24, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(157, 0, 255, 0.28)',
          borderRadius: '16px',
          padding: '40px 32px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(157, 0, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header Badge */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #1e1b2e 0%, #0d121f 100%)',
              border: '1px solid rgba(212, 175, 55, 0.5)',
              boxShadow: '0 0 24px rgba(212, 175, 55, 0.3)',
              marginBottom: '14px',
            }}
          >
            <Satellite size={26} color="var(--accent-gold)" />
          </div>

          <div
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-gold)',
              letterSpacing: '2.5px',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            MISSION ORBIT-X1 // ACCESS PORTAL
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '0.4px',
              color: '#FFFFFF',
              margin: '0 0 6px 0',
            }}
          >
            ORBITAL <span style={{ color: 'var(--accent-gold)' }}>TWIN</span>
          </h2>

          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#E2E8F0',
              marginBottom: '8px',
            }}
          >
            Mission Control Authentication
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '20px',
              fontSize: '11.5px',
              color: 'var(--accent-gold)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
            }}
          >
            <Shield size={12} />
            <span>Authorized Mission Administrator Access</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '12.5px',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                color: '#94A3B8',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Username
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                transition: 'border-color 0.2s',
              }}
            >
              <User size={16} color="#64748B" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mission_admin"
                required
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '26px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11.5px',
                fontFamily: 'var(--font-mono)',
                color: '#94A3B8',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 14px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                transition: 'border-color 0.2s',
              }}
            >
              <Lock size={16} color="#64748B" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoFocus
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#FFFFFF',
                  fontSize: '14px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Quick Demo Fill */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                Demo: mission_admin / admin123
              </span>
              <button
                type="button"
                onClick={() => {
                  setUsername('mission_admin');
                  setPassword('admin123');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-gold)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Autofill Demo
              </button>
            </div>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '14px',
              background: 'var(--grad-primary)',
              border: '1px solid rgba(212, 175, 55, 0.55)',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 700,
              letterSpacing: '0.8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(212, 175, 55, 0.28)',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              textTransform: 'uppercase',
            }}
          >
            {loading ? (
              <span>Authorizing Uplink...</span>
            ) : (
              <>
                <Shield size={16} />
                <span>ENTER MISSION CONTROL</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div
          style={{
            marginTop: '26px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#64748B',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>ORBITAL TWIN PLATFORM v1.0.0</span>
          <span style={{ margin: '0 6px' }}>•</span>
          <span>FULL ACCESS ARCHITECTURE</span>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;

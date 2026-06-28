import React, { useState } from 'react';
import { login } from '../utils/api';
import { Lock, User, AlertCircle, Info } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await login(username, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#f8fafc'
    }}>
      {/* Brand Sidebar Panel (Left Side - Hidden on small mobile screens) */}
      <div className="login-sidebar" style={{
        flex: '1.2',
        background: 'linear-gradient(135deg, #0e4d41 0%, #05463a 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative subtle circles in background */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          border: '1px solid rgba(216, 193, 76, 0.1)',
          top: '-10%',
          left: '-10%',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          bottom: '-10%',
          right: '-10%',
          pointerEvents: 'none'
        }} />

        <div style={{
          zIndex: 2,
          textAlign: 'center',
          maxWidth: '450px',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          {/* Logo Emblem Container */}
          <div style={{
            width: '180px',
            height: '220px',
            margin: '0 auto 2rem',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '2px solid var(--color-accent)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            <img 
              src="/short_logo.png" 
              alt="DLRRD Emblem" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }} 
            />
          </div>

          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            marginBottom: '1rem',
            letterSpacing: '0.025em',
            textTransform: 'uppercase',
            color: 'var(--color-accent)'
          }}>
            Facility Management
          </h2>
          <p style={{
            fontSize: '0.95rem',
            color: '#b0c5c1',
            lineHeight: 1.6,
            fontWeight: 400
          }}>
            Department of Land Reform and Rural Development (DLRRD). Secure municipal utility invoice verification, auditing, and payment processing system.
          </p>
        </div>
        
        {/* Footer info in brand panel */}
        <div style={{
          position: 'absolute',
          bottom: '1.5rem',
          fontSize: '0.75rem',
          color: '#83a39d',
          zIndex: 2
        }}>
          &copy; {new Date().getFullYear()} DLRRD South Africa. All Rights Reserved.
        </div>
      </div>

      {/* Login Form Panel (Right Side) */}
      <div className="login-form-panel" style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          {/* Main Logo with Name */}
          <div style={{
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <img 
              src="/logo_with_name.png" 
              alt="DLRRD Logo" 
              style={{
                maxWidth: '240px',
                height: 'auto',
                marginBottom: '1rem'
              }} 
            />
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--color-primary)'
            }}>
              Sign In
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              marginTop: '0.25rem'
            }}>
              Enter your credentials to access the system
            </p>
          </div>

          {/* Login Form Card */}
          <div style={{
            backgroundColor: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            boxShadow: 'var(--shadow-md)'
          }}>
            <form onSubmit={handleSubmit}>
              {/* Error Message */}
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem',
                  marginBottom: '1.25rem',
                  color: '#b91c1c',
                  fontSize: '0.875rem'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Username field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="username">Username</label>
                <div style={{ position: 'relative' }}>
                  <User 
                    size={16} 
                    style={{
                      position: 'absolute',
                      left: '0.875rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)'
                    }} 
                  />
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock 
                    size={16} 
                    style={{
                      position: 'absolute',
                      left: '0.875rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)'
                    }} 
                  />
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter admin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.95rem',
                  backgroundColor: 'var(--color-primary)',
                  border: '1px solid var(--color-accent)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 6px -1px rgba(14, 77, 65, 0.2)'
                }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Test credentials banner */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              backgroundColor: 'var(--color-bg-cream)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              marginTop: '1.5rem',
              fontSize: '0.8125rem',
              color: 'var(--color-accent-dark)'
            }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <div>
                <strong>Test Credentials:</strong>
                <p style={{ marginTop: '0.125rem' }}>
                  Username: <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '1px 4px', borderRadius: '2px' }}>admin</code><br />
                  Password: <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '1px 4px', borderRadius: '2px' }}>admin</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styled Responsive overrides using CSS inside component */}
      <style>{`
        @media (max-width: 768px) {
          .login-sidebar {
            display: none !important;
          }
          .login-form-panel {
            flex: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_RESET = 'https://vinosschool.com/api/reset-password.php';
const LOGO_URL = 'https://www.afmjonline.com/pages/user/images/logo.png';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      setTokenValid(true);
    } else {
      setTokenValid(false);
      setError('Missing reset token. Please request a new link.');
    }
    // If you want to validate the token with an API call before showing the form, you can do it here.
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    const toastId = toast.loading('Resetting password...');

    try {
      const res = await fetch(API_RESET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      toast.success('Password reset successfully!', { id: toastId });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // If token is missing, show error with a link to request a new one
  if (tokenValid === false) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.title}>Invalid or Missing Token</h2>
          <p style={styles.subtitle}>{error}</p>
          <p style={{ marginTop: '12px' }}>
            <Link to="/forgot-password" style={styles.link}>Request a new reset link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <img src={LOGO_URL} alt="AFMJ Logo" style={styles.logo} />
        </div>
        <h2 style={styles.title}>Set New Password</h2>
        <p style={styles.subtitle}>Enter your new password below.</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>New Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...styles.input, paddingRight: '44px' }}
                disabled={loading}
                placeholder="Enter new password"
                required
                minLength={6}
              />
              <button
                type="button"
                style={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              disabled={loading}
              placeholder="Confirm new password"
              required
            />
          </div>

          {error && <span style={styles.error}>{error}</span>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>

          <p style={styles.backLink}>
            <Link to="/login" style={styles.link}>← Back to Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    padding: '20px',
  },
  card: {
    background: '#ffffff',
    padding: '40px',
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
  },
  logoWrapper: {
    marginBottom: '24px',
  },
  logo: {
    maxWidth: '160px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginBottom: '24px',
    lineHeight: 1.5,
  },
  inputGroup: {
    marginBottom: '18px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontWeight: 500,
    fontSize: '0.9rem',
    color: '#1e293b',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '1rem',
    outline: 'none',
    backgroundColor: '#f8fafc',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    transition: 'color 0.2s',
  },
  error: {
    display: 'block',
    marginTop: '4px',
    color: '#dc2626',
    fontSize: '0.8rem',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: '40px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '6px',
  },
  backLink: {
    marginTop: '16px',
    fontSize: '0.9rem',
  },
  link: {
    color: '#16a34a',
    textDecoration: 'underline',
  },
};

export default ResetPassword;
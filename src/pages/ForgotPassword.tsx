import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_FORGOT = 'https://vinosschool.com/api/forgot-password.php';
const API_RESET = 'https://vinosschool.com/api/reset-password.php';
const LOGO_URL = 'https://www.afmjonline.com/pages/user/images/logo.png';

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation>({
    isValid: false,
    errors: [],
    strength: 'weak',
  });

  const validatePassword = (password: string): PasswordValidation => {
    const errors: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('At least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('At least one special character');
    }

    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    ];
    const passed = checks.filter(Boolean).length;
    if (passed >= 5) strength = 'strong';
    else if (passed >= 3) strength = 'medium';
    else strength = 'weak';

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  };

  useEffect(() => {
    if (newPassword.length > 0) {
      setPasswordValidation(validatePassword(newPassword));
    } else {
      setPasswordValidation({ isValid: false, errors: [], strength: 'weak' });
    }
  }, [newPassword]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    const toastId = toast.loading('Sending OTP...');

    try {
      const res = await fetch(API_FORGOT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      toast.success('OTP sent to your email.', { id: toastId });
      setStep('reset');
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    if (!passwordValidation.isValid) {
      setError('Please meet all password requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
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
        body: JSON.stringify({ email, otp, password: newPassword }),
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

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return '#16a34a';
      case 'medium': return '#f59e0b';
      default: return '#dc2626';
    }
  };

  const getStrengthLabel = (strength: string) => {
    switch (strength) {
      case 'strong': return 'Strong';
      case 'medium': return 'Medium';
      default: return 'Weak';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoWrapper}>
          <img src={LOGO_URL} alt="AFMJ Logo" style={styles.logo} />
        </div>

        {step === 'email' ? (
          <>
            <h2 style={styles.title}>Reset Your Password</h2>
            <p style={styles.subtitle}>
              Enter your email address and we'll send you a 6-digit OTP to reset your password.
            </p>
            <form onSubmit={handleSendOtp}>
              <div style={styles.inputGroup}>
                <label htmlFor="email" style={styles.label}>Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                  placeholder="your@email.com"
                  required
                />
                {error && <span style={styles.error}>{error}</span>}
              </div>
              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
              <p style={styles.backLink}>
                <Link to="/login" style={styles.link}>← Back to Login</Link>
              </p>
            </form>
          </>
        ) : (
          <>
            <h2 style={styles.title}>Enter OTP & New Password</h2>
            <p style={styles.subtitle}>
              We sent a 6-digit OTP to <strong>{email}</strong>. Enter it below along with your new password.
            </p>
            <form onSubmit={handleReset}>
              <div style={styles.inputGroup}>
                <label htmlFor="otp" style={styles.label}>OTP Code</label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={styles.input}
                  disabled={loading}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label htmlFor="newPassword" style={styles.label}>New Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ ...styles.input, paddingRight: '44px' }}
                    disabled={loading}
                    placeholder="Enter new password"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    style={styles.eyeButton}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
                {newPassword.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '4px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: passwordValidation.isValid ? '100%' : 
                                 passwordValidation.errors.length <= 2 ? '60%' : '30%',
                          height: '100%',
                          background: getStrengthColor(passwordValidation.strength),
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: getStrengthColor(passwordValidation.strength) }}>
                        {getStrengthLabel(passwordValidation.strength)}
                      </span>
                    </div>
                    <ul style={{ marginTop: '8px', paddingLeft: '0', listStyle: 'none', fontSize: '0.8rem' }}>
                      {[
                        'At least 8 characters',
                        'At least one uppercase letter',
                        'At least one lowercase letter',
                        'At least one number',
                        'At least one special character',
                      ].map((req) => {
                        const isMet = !passwordValidation.errors.includes(req);
                        return (
                          <li key={req} style={{ color: isMet ? '#16a34a' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{isMet ? '✅' : '⬜'}</span> {req}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
              <div style={styles.inputGroup}>
                <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    ...styles.input,
                    borderColor: confirmPassword && newPassword && confirmPassword !== newPassword ? '#dc2626' : 
                                confirmPassword && newPassword && confirmPassword === newPassword ? '#16a34a' : '#e2e8f0',
                  }}
                  disabled={loading}
                  placeholder="Confirm new password"
                  required
                />
                {confirmPassword && newPassword && confirmPassword !== newPassword && (
                  <span style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    Passwords do not match
                  </span>
                )}
                {confirmPassword && newPassword && confirmPassword === newPassword && (
                  <span style={{ color: '#16a34a', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    ✓ Passwords match
                  </span>
                )}
              </div>
              {error && <span style={styles.error}>{error}</span>}
              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <p style={styles.backLink}>
                <button
                  onClick={() => { setStep('email'); setError(''); }}
                  style={{ ...styles.link, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ← Back to email entry
                </button>
              </p>
            </form>
          </>
        )}
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
    transition: 'border-color 0.2s',
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
    cursor: 'pointer',
  },
};

export default ForgotPassword;
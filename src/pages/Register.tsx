import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_REGISTER = 'https://vinosschool.com/api/register.php';
const LOGO_URL = 'https://www.afmjonline.com/pages/user/images/logo.png';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'author',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string; color: string }>({
    score: 0,
    label: 'Weak',
    color: '#ef4444',
  });

  // OTP verification state
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [otpResendLoading, setOtpResendLoading] = useState(false);

  // ========== VALIDATION HELPERS ==========
  const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const validatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const strengthMap: { [key: number]: { label: string; color: string } } = {
      0: { label: 'Very Weak', color: '#ef4444' },
      1: { label: 'Weak', color: '#ef4444' },
      2: { label: 'Fair', color: '#f59e0b' },
      3: { label: 'Good', color: '#3b82f6' },
      4: { label: 'Strong', color: '#10b981' },
      5: { label: 'Very Strong', color: '#10b981' },
    };
    return { score, ...strengthMap[score] };
  };

  const validate = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {};

    if (!formData.name.trim()) newErrors.name = 'Full name is required';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/\d/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/[^a-zA-Z0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) newErrors.role = 'Please select a role';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ========== HANDLERS ==========
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name as keyof RegisterFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }

    if (name === 'password') {
      setPasswordStrength(validatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const toastId = toast.loading('Creating your account...');

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      const res = await fetch(API_REGISTER + '?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid server response');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      toast.success('Registration successful! Please verify your email.', { id: toastId });
      setRegisteredEmail(formData.email);
      setShowOtpScreen(true);
      setOtp('');
      setVerificationError('');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setVerificationError('Please enter a valid 6-digit OTP.');
      return;
    }

    setVerificationLoading(true);
    setVerificationError('');
    const toastId = toast.loading('Verifying OTP...');

    try {
      const res = await fetch(API_REGISTER + '?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail, otp }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid server response');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Verification failed');
      }

      toast.success('Account verified! You can now login.', { id: toastId });
      setTimeout(() => navigate('/login'), 1500);
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error(error.message, { id: toastId });
      setVerificationError(error.message);
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpResendLoading(true);
    const toastId = toast.loading('Resending OTP...');

    try {
      const res = await fetch(API_REGISTER + '?action=resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid server response');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      toast.success('A new OTP has been sent to your email.', { id: toastId });
      setVerificationError('');
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error(error.message, { id: toastId });
    } finally {
      setOtpResendLoading(false);
    }
  };

  const renderOtpScreen = () => (
    <div style={styles.formCard}>
      <h2 style={styles.formTitle}>Verify Your Email</h2>
      <p style={styles.formSubtitle}>
        We've sent a 6‑digit OTP to <strong>{registeredEmail}</strong>. 
        Please enter it below to complete your registration.
      </p>

      <div style={styles.inputGroup}>
        <label htmlFor="otp" style={styles.label}>One‑Time Password (OTP)</label>
        <input
          type="text"
          id="otp"
          name="otp"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          style={styles.input}
          placeholder="Enter 6-digit OTP"
          disabled={verificationLoading || otpResendLoading}
          maxLength={6}
          autoFocus
        />
        {verificationError && <span style={styles.error}>{verificationError}</span>}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
        <button
          type="button"
          onClick={handleVerifyOtp}
          style={{
            ...styles.button,
            flex: 1,
            opacity: verificationLoading ? 0.7 : 1,
            cursor: verificationLoading ? 'not-allowed' : 'pointer',
          }}
          disabled={verificationLoading || otpResendLoading}
        >
          {verificationLoading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <button
          type="button"
          onClick={handleResendOtp}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#16a34a',
            fontWeight: 500,
            cursor: 'pointer',
            fontSize: '0.9rem',
            textDecoration: 'underline',
          }}
          disabled={otpResendLoading}
        >
          {otpResendLoading ? 'Sending...' : 'Resend OTP'}
        </button>
      </div>

      <p style={styles.mobileLogin} className="register-mobile-login">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.grid} className="register-grid">
        {/* Left Side – Branding */}
        <div style={styles.branding} className="register-branding">
          <div style={styles.brandContent}>
            <div style={styles.logoWrapper}>
              <img src={LOGO_URL} alt="AFMJ Logo" style={styles.brandLogo} className="register-brand-logo" />
            </div>
            <h1 style={styles.brandTitle} className="register-brand-title">African Medical Journal</h1>
            <p style={styles.brandSubtitle}>
              Join our community of researchers, reviewers, and editors.
            </p>
            <div style={styles.features} className="register-features">
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>📄</span>
                <span>Submit your research</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>🔍</span>
                <span>Peer-review manuscripts</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>📚</span>
                <span>Access published articles</span>
              </div>
            </div>
            <p style={styles.brandFooter} className="register-desktop-login">
              Already have an account? <Link to="/login" style={styles.brandLink}>Login</Link>
            </p>
          </div>
        </div>

        {/* Right Side – Form */}
        <div style={styles.formWrapper} className="register-form-wrapper">
          {showOtpScreen ? (
            renderOtpScreen()
          ) : (
            <div style={styles.formCard}>
              <h2 style={styles.formTitle}>Create Account</h2>
              <p style={styles.formSubtitle}>Fill in the details below to get started.</p>

              <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div style={styles.inputGroup}>
                  <label htmlFor="name" style={styles.label}>Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    style={styles.input}
                    disabled={loading}
                    placeholder="e.g., Dr. John Doe"
                  />
                  {errors.name && <span style={styles.error}>{errors.name}</span>}
                </div>

                {/* Email */}
                <div style={styles.inputGroup}>
                  <label htmlFor="email" style={styles.label}>Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    style={styles.input}
                    disabled={loading}
                    placeholder="your@email.com"
                  />
                  {errors.email && <span style={styles.error}>{errors.email}</span>}
                </div>

                {/* Password with Toggle */}
                <div style={styles.inputGroup}>
                  <label htmlFor="password" style={styles.label}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      style={{ ...styles.input, paddingRight: '70px' }}
                      disabled={loading}
                      placeholder="Enter a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {errors.password && <span style={styles.error}>{errors.password}</span>}
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div style={{ marginTop: '6px' }}>
                      <div
                        style={{
                          height: '4px',
                          borderRadius: '2px',
                          background: '#e5e7eb',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${(passwordStrength.score / 5) * 100}%`,
                            height: '100%',
                            background: passwordStrength.color,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: passwordStrength.color,
                          marginTop: '2px',
                          fontWeight: 500,
                        }}
                      >
                        {passwordStrength.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>
                        Min 8 chars, uppercase, lowercase, number, special character
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password with Toggle */}
                <div style={styles.inputGroup}>
                  <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      style={{ ...styles.input, paddingRight: '70px' }}
                      disabled={loading}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {errors.confirmPassword && <span style={styles.error}>{errors.confirmPassword}</span>}
                  {formData.confirmPassword && formData.password && formData.password !== formData.confirmPassword && (
                    <span style={{ ...styles.error, color: '#ef4444' }}>Passwords do not match</span>
                  )}
                </div>

                {/* Role */}
                <div style={styles.inputGroup}>
                  <label htmlFor="role" style={styles.label}>I want to register as</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    style={styles.input}
                    disabled={loading}
                  >
                    <option value="author">Author</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  {errors.role && <span style={styles.error}>{errors.role}</span>}
                </div>

                <button type="submit" style={styles.button} disabled={loading}>
                  {loading ? 'Creating...' : 'Register'}
                </button>

                <p style={styles.mobileLogin} className="register-mobile-login">
                  Already have an account? <Link to="/login">Login</Link>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Inline responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .register-grid {
            flex-direction: column !important;
            min-height: auto !important;
          }
          .register-branding {
            width: 100% !important;
            padding: 30px 20px !important;
            text-align: center !important;
          }
          .register-form-wrapper {
            width: 100% !important;
            padding: 20px !important;
          }
          .register-brand-logo {
            max-width: 120px !important;
          }
          .register-brand-title {
            font-size: 1.5rem !important;
          }
          .register-features {
            justify-content: center !important;
            align-items: center !important;
          }
          .register-mobile-login {
            display: block !important;
          }
          .register-desktop-login {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .register-mobile-login {
            display: none !important;
          }
          .register-desktop-login {
            display: block !important;
          }
        }
        @media (max-width: 480px) {
          .register-form-wrapper {
            padding: 16px !important;
          }
          .register-branding {
            padding: 20px 16px !important;
          }
          input, select {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    padding: '20px',
  },
  grid: {
    display: 'flex',
    width: '100%',
    maxWidth: '1100px',
    background: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    minHeight: '600px',
  },
  branding: {
    flex: '1 1 45%',
    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    padding: '48px 40px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    color: '#ffffff',
  },
  brandContent: {
    maxWidth: '340px',
    margin: '0 auto',
  },
  logoWrapper: {
    display: 'inline-block',
    background: '#ffffff',
    padding: '8px 16px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  brandLogo: {
    maxWidth: '160px',
    display: 'block',
  },
  brandTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: '12px',
    lineHeight: 1.2,
  },
  brandSubtitle: {
    fontSize: '1.1rem',
    opacity: 0.9,
    marginBottom: '24px',
    lineHeight: 1.5,
  },
  features: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '32px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '1rem',
    opacity: 0.95,
  },
  featureIcon: {
    fontSize: '1.2rem',
  },
  brandFooter: {
    fontSize: '0.95rem',
    opacity: 0.9,
  },
  brandLink: {
    color: '#ffffff',
    fontWeight: 600,
    textDecoration: 'underline',
  },
  formWrapper: {
    flex: '1 1 55%',
    padding: '40px 48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: '420px',
  },
  formTitle: {
    fontSize: '1.8rem',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '4px',
  },
  formSubtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginBottom: '24px',
  },
  inputGroup: {
    marginBottom: '18px',
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
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: '#f8fafc',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
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
  mobileLogin: {
    textAlign: 'center' as const,
    marginTop: '16px',
    color: '#64748b',
    fontSize: '0.9rem',
  },
};

export default Register;
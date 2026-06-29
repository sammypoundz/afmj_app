import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const API_LOGIN = 'https://vinosschool.com/api/login.php';
const LOGO_URL = 'https://www.afmjonline.com/pages/user/images/logo.png';

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  session_id?: string;
  error?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { refetchUser, setSessionId } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    const toastId = toast.loading('Logging in...');

    try {
      const res = await fetch(API_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const text = await res.text();
      let data: LoginResponse;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid server response');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      if (!data.user?.role) {
        throw new Error('Missing user role in response');
      }
      if (!data.session_id) {
        throw new Error('Missing session ID in response');
      }

      setSessionId(data.session_id);

      toast.success('Login successful!', { id: toastId });

      await refetchUser();

      toast.success(`Welcome ${data.user.name}!`, { duration: 3000 });

      const role = data.user.role;
      if (role === 'reviewer') navigate('/reviewer/dashboard');
      else if (role === 'editor') navigate('/editor/dashboard');
      else if (role === 'author') navigate('/author/dashboard');
      else if (role === 'admin') navigate('/eic/dashboard');
      else navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.grid} className="login-grid">
        {/* Left Side – Branding */}
        <div style={styles.branding} className="login-branding">
          <div style={styles.brandContent}>
            <div style={styles.logoWrapper}>
              <img src={LOGO_URL} alt="AFMJ Logo" style={styles.brandLogo} className="login-brand-logo" />
            </div>
            <h1 style={styles.brandTitle} className="login-brand-title">African Medical Journal</h1>

            {/* Desktop subtitle + features */}
            <div className="login-desktop-content">
              <p style={styles.brandSubtitle}>
                Welcome back to the African Medical Journal.
                <br />
                Access your dashboard to manage submissions, reviews, and publications.
              </p>
              <div style={styles.features} className="login-features">
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
            </div>

            {/* Mobile version – short summary */}
            <div className="login-mobile-content">
              <p style={styles.brandSubtitleMobile}>
                Access your dashboard to manage submissions, reviews, and publications.
              </p>
            </div>

            <p style={styles.brandFooter} className="login-desktop-link">
              Don't have an account? <Link to="/register" style={styles.brandLink}>Register</Link>
            </p>
          </div>
        </div>

        {/* Right Side – Form */}
        <div style={styles.formWrapper} className="login-form-wrapper">
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Welcome Back</h2>
            <p style={styles.formSubtitle}>Login to your account to continue.</p>

            <form onSubmit={handleSubmit}>
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

              <div style={styles.inputGroup}>
                <label htmlFor="password" style={styles.label}>Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    style={{ ...styles.input, paddingRight: '44px' }}
                    disabled={loading}
                    placeholder="Enter your password"
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
                {errors.password && <span style={styles.error}>{errors.password}</span>}
              </div>

              {/* Forgot Password link */}
              <div style={{ textAlign: 'right', marginBottom: '12px' }}>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: '0.85rem',
                    color: '#16a34a',
                    textDecoration: 'underline',
                    opacity: loading ? 0.6 : 1,
                    pointerEvents: loading ? 'none' : 'auto',
                  }}
                >
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <p style={styles.mobileLink} className="login-mobile-link">
                Don't have an account? <Link to="/register">Register</Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Inline responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .login-grid {
            flex-direction: column !important;
            min-height: auto !important;
          }
          .login-branding {
            width: 100% !important;
            padding: 30px 20px !important;
            text-align: center !important;
          }
          .login-form-wrapper {
            width: 100% !important;
            padding: 20px !important;
          }
          .login-brand-logo {
            max-width: 120px !important;
          }
          .login-brand-title {
            font-size: 1.5rem !important;
          }
          .login-desktop-content {
            display: none !important;
          }
          .login-mobile-content {
            display: block !important;
          }
          .login-features {
            justify-content: center !important;
            align-items: center !important;
          }
          .login-mobile-link {
            display: block !important;
          }
          .login-desktop-link {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .login-mobile-content {
            display: none !important;
          }
          .login-desktop-content {
            display: block !important;
          }
          .login-mobile-link {
            display: none !important;
          }
          .login-desktop-link {
            display: block !important;
          }
        }
        @media (max-width: 480px) {
          .login-form-wrapper {
            padding: 16px !important;
          }
          .login-branding {
            padding: 20px 16px !important;
          }
          input {
            font-size: 16px !important; /* prevents iOS zoom */
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
  brandSubtitleMobile: {
    fontSize: '0.95rem',
    opacity: 0.9,
    marginBottom: '16px',
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
  mobileLink: {
    textAlign: 'center' as const,
    marginTop: '16px',
    color: '#64748b',
    fontSize: '0.9rem',
  },
};

export default Login;
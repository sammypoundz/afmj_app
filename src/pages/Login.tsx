import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// Use relative path – works with proxy
// const API_LOGIN = '/api/login.php';
const API_LOGIN = 'https://vinosschool.com/api/login.php';

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
  session_id?: string;   // Added: session ID returned by the server
  error?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { refetchUser, setSessionId } = useAuth(); // get setSessionId from context
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});

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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
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
        // No credentials: 'include' – we're not using cookies
      });

      // Ensure we can parse JSON even if response is not 200
      const text = await res.text();
      let data: LoginResponse;
      try {
        // console.log('Raw response:', text);  // 👈 Add this line
        data = JSON.parse(text);

        // console.log(data);
      } catch {
        throw new Error('Invalid server response');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      // Sanity checks
      if (!data.user?.role) {
        throw new Error('Missing user role in response');
      }
      if (!data.session_id) {
        throw new Error('Missing session ID in response');
      }

      // Store the session ID in AuthContext (and localStorage via the context)
      setSessionId(data.session_id);

      toast.success('Login successful!', { id: toastId });

      // Refresh the global auth state – now the session ID will be sent in the request
      await refetchUser();

      toast.success(`Welcome ${data.user.name}!`, { duration: 3000 });

      // Redirect based on role
      const role = data.user.role;
      if (role === 'reviewer') navigate('/reviewer/dashboard');
      else if (role === 'editor') navigate('/editor/dashboard');
      else if (role === 'author') navigate('/author/dashboard');
      else if (role === 'admin') navigate('/eic/dashboard');
      else navigate('/dashboard'); // fallback
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Login to AFMJ</h2>

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
          />
          {errors.email && <span style={styles.error}>{errors.email}</span>}
        </div>

        <div style={styles.inputGroup}>
          <label htmlFor="password" style={styles.label}>Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
            disabled={loading}
          />
          {errors.password && <span style={styles.error}>{errors.password}</span>}
        </div>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p style={styles.footer}>
          Don't have an account? <a href="/register">Register</a>
        </p>
      </form>
    </div>
  );
};

// Styles remain unchanged
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '20px',
  },
  form: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 600,
    color: '#16a34a',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: '#f9fafb',
  },
  error: {
    display: 'block',
    marginTop: '4px',
    color: '#dc2626',
    fontSize: '0.85rem',
  },
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: '40px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: '10px',
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: '20px',
    color: '#6b7280',
  },
};

export default Login;
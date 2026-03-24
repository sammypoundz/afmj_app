import React, { createContext, useContext, useEffect, useState } from 'react';

type UserRole = 'author' | 'reviewer' | 'editor' | 'publisher' | 'admin';

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  // optional fields if your API returns them
  // institution?: string;
  // bio?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  sessionId: string | null;
  setSessionId: (id: string) => void;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  downloadFile: (url: string, filename?: string) => Promise<void>; // 👈 added
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    // Load from localStorage on initial render
    return localStorage.getItem('session_id');
  });

  // Helper to make authenticated requests with the session ID header
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (sessionId) {
      headers.set('X-Session-Id', sessionId);
    }
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'omit', // no cookies
    });
    return response;
  };

  // Download a file with authentication
  const downloadFile = async (url: string, filename?: string): Promise<void> => {
    try {
      const response = await authFetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Try to get filename from Content-Disposition header
      let finalFilename = filename;
      if (!finalFilename) {
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match && match[1]) {
            finalFilename = match[1].replace(/['"]/g, '');
          }
        }
      }
      if (!finalFilename) {
        // Fallback: extract from URL
        const urlParts = url.split('/');
        finalFilename = decodeURIComponent(urlParts[urlParts.length - 1]) || 'download';
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download error:', error);
      throw error; // re-throw so caller can handle
    }
  };

  const fetchUser = async () => {
    // If no session ID, we can't fetch the user
    if (!sessionId) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await authFetch('/api/me.php');
      if (res.ok) {
        const data = await res.json();
        // console.log('debug data:', data);
        // Check for either 'authenticated' flag or direct user object
        if (data.authenticated === true && data.user) {
          setUser(data.user);
        } else if (data.id && data.name) {
          // Fallback: if the endpoint returns the user directly
          setUser(data);
        } else {
          setUser(null);
          // If the response indicates an invalid session, clear the stored session ID
          if (data.error === 'Invalid session' || data.error === 'Not logged in') {
            localStorage.removeItem('session_id');
            setSessionId(null);
          }
        }
      } else {
        setUser(null);
        // For 401/403, also clear session ID
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('session_id');
          setSessionId(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // When sessionId changes, store it in localStorage and re‑fetch user
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('session_id', sessionId);
      fetchUser();
    } else {
      localStorage.removeItem('session_id');
      setUser(null);
      // If we're loading because of a logout, we might need to setIsLoading(false) here,
      // but fetchUser will set it. We'll keep loading false if no session.
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Initial load: if there's a sessionId, fetchUser() will be called by the above effect.
  // If there's no sessionId, we set loading to false immediately.
  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
    }
  }, [sessionId]);

  const logout = async () => {
    try {
      // Call logout endpoint with the session ID header
      await authFetch('/api/logout.php', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      // Clear state and storage regardless of server response
      setUser(null);
      localStorage.removeItem('session_id');
      setSessionId(null);
    }
  };

  const refetchUser = fetchUser;

  const value = {
    user,
    isLoading,
    sessionId,
    setSessionId,
    logout,
    refetchUser,
    authFetch,
    downloadFile, // 👈 expose downloadFile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
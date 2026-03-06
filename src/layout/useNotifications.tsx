import { useState, useCallback, useEffect } from 'react';

export interface Notification {
  id: number;
  type: string;          // now a flexible string (not enum)
  title: string;
  description: string;
  date: string;
  relatedManuscriptId?: number;
  read: boolean;
}

const API_BASE = "https://afmjonline.com/api/EICnotificationsAPI.php";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}?action=list&limit=50`);
      const data = await res.json();
      if (res.ok) {
        setNotifications(data);
      } else {
        setError(data.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError('Network error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}?action=markRead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, read: true } : n))
        );
      } else {
        console.error('Failed to mark as read:', data.error);
      }
    } catch (err) {
      console.error('Network error marking as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}?action=markAllRead`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      } else {
        console.error('Failed to mark all as read:', data.error);
      }
    } catch (err) {
      console.error('Network error marking all as read:', err);
    }
  }, []);

  // Fetch on mount and refresh every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    unreadCount,
    refresh: fetchNotifications
  };
};
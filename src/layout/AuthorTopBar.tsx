import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = "https://afmjonline.com/api/authorApi.php";

interface UserInfo {
  id: number;
  name: string;
  email: string;
  institution: string | null;
  orcid: string | null;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  description: string | null;
  related_manuscript_id: number | null;
  is_read: boolean;
  created_at: string;
}

const styles = {
  header: {
    height: 70,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    borderBottom: "1px solid #e5e7eb",
    background: "#ffffff",
  },
  left: {
    display: "flex",
    flexDirection: "column" as const,
  },
  title: {
    margin: 0,
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#0f172a",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: "0.8rem",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  newSubmissionBtn: {
    padding: "8px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 500,
    transition: "background 0.2s",
  },
  notificationContainer: {
    position: "relative" as const,
    cursor: "pointer",
  },
  bellIcon: {
    fontSize: "1.2rem",
    color: "#4b5563",
    transition: "color 0.2s",
  },
  badge: {
    position: "absolute" as const,
    top: -6,
    right: -10,
    background: "#dc2626",
    color: "#fff",
    fontSize: "0.7rem",
    padding: "2px 6px",
    borderRadius: "50%",
    minWidth: "18px",
    textAlign: "center" as const,
  },
  dropdown: {
    position: "absolute" as const,
    top: "calc(100% + 10px)",
    right: 0,
    width: "360px",
    maxHeight: "480px",
    overflowY: "auto" as const,
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    border: "1px solid #e2e8f0",
    zIndex: 1000,
  },
  dropdownHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
  },
  dropdownTitle: {
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  markAllBtn: {
    background: "none",
    border: "none",
    color: "#16a34a",
    fontSize: "0.8rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  notificationList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  notificationItem: (isRead: boolean) => ({
    padding: "12px 16px",
    borderBottom: "1px solid #e2e8f0",
    background: isRead ? "#fff" : "#f0fdf4",
    transition: "background 0.2s",
    cursor: "pointer",
  }),
  notificationTitle: {
    fontWeight: 600,
    color: "#0f172a",
    fontSize: "0.9rem",
    marginBottom: "4px",
  },
  notificationDesc: {
    color: "#475569",
    fontSize: "0.8rem",
    marginBottom: "4px",
  },
  notificationMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.7rem",
    color: "#94a3b8",
  },
  emptyState: {
    padding: "32px 16px",
    textAlign: "center" as const,
    color: "#94a3b8",
  },
  profile: {
    textAlign: "right" as const,
  },
  profileName: {
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "#0f172a",
  },
  profileInstitution: {
    fontSize: "0.7rem",
    color: "#6b7280",
  },
  logoutBtn: {
    padding: "6px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.8rem",
    transition: "background 0.2s",
  },
  link: {
    color: "#16a34a",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
};

const AuthorTopBar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user info and notifications on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, notifRes] = await Promise.all([
          fetch(`${API_BASE}?action=getProfile`),
          fetch(`${API_BASE}?action=getNotifications`),
        ]);
        if (!userRes.ok) throw new Error("Failed to load user");
        if (!notifRes.ok) throw new Error("Failed to load notifications");

        const userData = await userRes.json();
        const notifData = await notifRes.json();

        setUser(userData);
        setNotifications(notifData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = async (notif: Notification) => {
    // Mark as read (could call API)
    // For now, just close dropdown and navigate if manuscript_id exists
    setShowNotifications(false);
    if (notif.related_manuscript_id) {
      navigate(`/author/manuscript/${notif.related_manuscript_id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    // Call API to mark all as read (not implemented in this example)
    // For demo, update local state
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  };

  const handleLogout = () => {
    // Clear session/token and redirect to login
    // localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  return (
    <header style={styles.header}>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <div style={styles.left}>
        <h4 style={styles.title}>Journal Author Portal</h4>
        <small style={styles.subtitle}>Manage your research submissions</small>
      </div>

      <div style={styles.right}>
        {/* Quick Submit */}
        <button
          onClick={() => navigate("/author/submit")}
          style={styles.newSubmissionBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1d4ed8")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#2563eb")}
        >
          + New Submission
        </button>

        {/* Notifications */}
        <div style={styles.notificationContainer} ref={dropdownRef}>
          <div
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ display: "flex", alignItems: "center" }}
          >
            <Bell size={20} style={styles.bellIcon} />
            {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
          </div>

          {showNotifications && (
            <div style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <h4 style={styles.dropdownTitle}>Notifications</h4>
                {unreadCount > 0 && (
                  <button style={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={styles.emptyState}>No notifications</div>
              ) : (
                <ul style={styles.notificationList}>
                  {notifications.map((notif) => (
                    <li
                      key={notif.id}
                      style={styles.notificationItem(notif.is_read)}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div style={styles.notificationTitle}>{notif.title}</div>
                      {notif.description && (
                        <div style={styles.notificationDesc}>{notif.description}</div>
                      )}
                      <div style={styles.notificationMeta}>
                        <span>{formatTime(notif.created_at)}</span>
                        {notif.related_manuscript_id && (
                          <span style={styles.link}>
                            <ExternalLink size={12} />
                            View
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div style={styles.profile}>
          <strong style={styles.profileName}>
            {user?.name || (loading ? "Loading..." : "Author")}
          </strong>
          <br />
          <small style={styles.profileInstitution}>
            {user?.institution || (loading ? "" : "Author")}
          </small>
        </div>

        {/* Logout */}
        <button
          style={styles.logoutBtn}
          onClick={handleLogout}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default AuthorTopBar;
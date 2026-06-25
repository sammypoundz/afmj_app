import { useState, useEffect, useMemo, useCallback } from "react";
import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, FileText, Mail, CreditCard, X, CheckCheck, Reply } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

interface Notification {
  id: number;
  type: string;
  title: string;
  description: string;
  relatedManuscriptId: number | null;
  read: boolean;
  date: string;
}

const typeDisplay: Record<string, { label: string; icon: React.ElementType }> = {
  'manuscript-upload':    { label: 'Manuscript Upload', icon: FileText },
  'review-submitted':     { label: 'Review Submitted', icon: FileText },
  'revision-requested':   { label: 'Revision Requested', icon: FileText },
  'manuscript-rejected':  { label: 'Manuscript Rejected', icon: FileText },
  'manuscript-accepted':  { label: 'Manuscript Accepted', icon: FileText },
  'payment-received':     { label: 'Payment Received', icon: CreditCard },
  'email-sent':           { label: 'Email Sent', icon: Mail },
  'reviewer-assigned':    { label: 'Reviewer Assigned', icon: FileText },
  'editor-assigned':      { label: 'Editor Assigned', icon: FileText },
  'ticket-received':      { label: 'Ticket from Author', icon: Mail },
};

const NOTIF_API = "https://vinosschool.com/api/EICnotificationsAPI.php";

const Notifications: FC = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<Notification | null>(null);
  const [filterType, setFilterType] = useState<string | "all">("all");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${NOTIF_API}?action=list&limit=100`);
      if (!res.ok) {
        toast.error("Failed to load notifications");
        return;
      }
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      toast.error("Error loading notifications");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      const res = await authFetch(`${NOTIF_API}?action=markRead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        toast.error("Failed to mark as read");
        return;
      }
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error("Error marking as read:", err);
      toast.error("Error updating notification");
    }
  }, [authFetch]);

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await authFetch(`${NOTIF_API}?action=markAllRead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        toast.error("Failed to mark all as read");
        return;
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Error marking all as read:", err);
      toast.error("Error updating notifications");
    }
  }, [authFetch]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(notifications.map(n => n.type));
    return Array.from(types);
  }, [notifications]);

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    notifications.forEach(n => {
      result[n.type] = (result[n.type] || 0) + 1;
    });
    return result;
  }, [notifications]);

  const filtered = useMemo(
    () => notifications.filter(n => filterType === "all" || n.type === filterType),
    [notifications, filterType]
  );

  const getIcon = (type: string) => {
    const def = typeDisplay[type];
    if (def) {
      const Icon = def.icon;
      return <Icon size={18} />;
    }
    return <Bell size={18} />;
  };

  const getTypeLabel = (type: string) => {
    const def = typeDisplay[type];
    if (def) return def.label;
    return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) {
      markAsRead(n.id);
    }
    setModalOpen(n);
  };

  // FIXED: accept null and handle it
  const viewManuscript = (id: number | null) => {
    if (!id) return;
    navigate(`/eic/manuscripts/${id}`);
    setModalOpen(null);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Helper to parse ticket description
  const parseTicket = (description: string) => {
    const lines = description.split('\n');
    let from = '';
    let message = description;
    if (lines.length > 0 && lines[0].startsWith('From:')) {
      from = lines[0].replace('From:', '').trim();
      message = lines.slice(1).join('\n').trim();
    }
    return { from, message };
  };

  if (loading) {
    return <div style={{ padding: 16 }}>Loading notifications...</div>;
  }

  return (
    <div className="content" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <Bell size={20} /> Notifications
          {unreadCount > 0 && (
            <span style={{ fontSize: 14, background: "#ef4444", color: "#fff", padding: "2px 8px", borderRadius: 999 }}>
              {unreadCount} unread
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid #d1d5db",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <button
          onClick={() => setFilterType("all")}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            background: filterType === "all" ? "#4f46e5" : "#f3f4f6",
            color: filterType === "all" ? "#fff" : "#374151",
            fontWeight: filterType === "all" ? 600 : 400,
          }}
        >
          All ({notifications.length})
        </button>
        {uniqueTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              background: filterType === type ? "#4f46e5" : "#f3f4f6",
              color: filterType === type ? "#fff" : "#374151",
              fontWeight: filterType === type ? 600 : 400,
            }}
          >
            {getTypeLabel(type)} ({counts[type]})
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && <div>No notifications.</div>}
        {filtered.map((n) => (
          <div
            key={n.id}
            onClick={() => handleNotificationClick(n)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderRadius: 8,
              cursor: "pointer",
              background: n.read ? "#f9fafb" : "#eef2ff",
              border: "1px solid #e5e7eb",
              fontSize: 13,
            }}
          >
            <div>{getIcon(n.type)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{n.title}</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                {n.type === "ticket-received" 
                  ? parseTicket(n.description).from 
                  : n.description}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>{n.date}</div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 3000,
          }}
          onClick={() => setModalOpen(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "95%",
              maxWidth: 500,
              padding: 24,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>{modalOpen.title}</h4>
              <button
                onClick={() => setModalOpen(null)}
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Special rendering for tickets */}
            {modalOpen.type === "ticket-received" ? (
              <>
                {(() => {
                  const { from, message } = parseTicket(modalOpen.description);
                  return (
                    <>
                      <div style={{ marginBottom: 8 }}>
                        <strong>From:</strong> <a href={`mailto:${from}`}>{from}</a>
                      </div>
                      <div style={{ marginBottom: 12, whiteSpace: "pre-wrap", background: "#f8fafc", padding: 12, borderRadius: 8 }}>
                        {message}
                      </div>
                      <div style={{ marginBottom: 12, fontSize: 13, color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                        <strong>Need to reply?</strong> Please login to your email and reply to <a href={`mailto:${from}`}>{from}</a>.
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <a
                          href={`mailto:${from}?subject=${encodeURIComponent(modalOpen.title)}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 16px",
                            borderRadius: 8,
                            background: "#4f46e5",
                            color: "#fff",
                            textDecoration: "none",
                            fontSize: 13,
                          }}
                        >
                          <Reply size={16} /> Reply via Email
                        </a>
                        {modalOpen.relatedManuscriptId && (
                          <button
                            onClick={() => viewManuscript(modalOpen.relatedManuscriptId)}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 8,
                              border: "none",
                              background: "#e5e7eb",
                              cursor: "pointer",
                              fontSize: 13,
                            }}
                          >
                            View Manuscript
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              // Generic notification display
              <>
                <div style={{ marginBottom: 12, color: "#374151", lineHeight: 1.6 }}>
                  {modalOpen.description}
                </div>
                <div style={{ marginBottom: 12, fontSize: 12, color: "#6b7280" }}>
                  Date: {modalOpen.date}
                </div>
                {modalOpen.relatedManuscriptId && (
                  <button
                    onClick={() => viewManuscript(modalOpen.relatedManuscriptId)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "#4f46e5",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    View Manuscript
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
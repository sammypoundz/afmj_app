import { useState, useMemo } from "react";
import type { FC } from "react";

import { useNotifications } from "../../layout/useNotifications";
import type { Notification } from "../../layout/useNotifications"; // type is now string

import { useNavigate } from "react-router-dom";
import { Bell, FileText, Mail, CreditCard, X } from "lucide-react";

// Mapping from type string to display label and icon
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
  // Add more mappings as needed – the system will fallback gracefully
};

const Notifications: FC = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead } = useNotifications();
  const [modalOpen, setModalOpen] = useState<Notification | null>(null);
  const [filterType, setFilterType] = useState<string | "all">("all");

  // Get unique notification types present in the data
  const uniqueTypes = useMemo(() => {
    const types = new Set(notifications.map(n => n.type));
    return Array.from(types);
  }, [notifications]);

  // Count per type (dynamic)
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    notifications.forEach(n => {
      result[n.type] = (result[n.type] || 0) + 1;
    });
    return result;
  }, [notifications]);

  // Filter notifications by selected type
  const filtered = useMemo(
    () => notifications.filter(n => filterType === "all" || n.type === filterType),
    [notifications, filterType]
  );

  // Get icon component based on type (with fallback)
  const getIcon = (type: string) => {
    const def = typeDisplay[type];
    if (def) {
      const Icon = def.icon;
      return <Icon size={18} />;
    }
    return <Bell size={18} />; // fallback
  };

  // Get display label for a type (with fallback formatting)
  const getTypeLabel = (type: string) => {
    const def = typeDisplay[type];
    if (def) return def.label;
    // Fallback: replace hyphens with spaces and capitalize words
    return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleNotificationClick = (n: Notification) => {
    markAsRead(n.id);
    setModalOpen(n);
  };

  const viewManuscript = (id?: number) => {
    if (!id) return;
    navigate(`/manuscripts/${id}`);
    setModalOpen(null);
  };

  return (
    <div className="content" style={{ padding: 16 }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Bell size={20} /> Notifications
      </h2>

      {/* Dynamic category tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <button
          key="all"
          onClick={() => setFilterType("all")}
          style={{
            padding: "6px 12px",
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
              padding: "6px 12px",
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
              padding: 10,
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
              <div style={{ color: "#6b7280", fontSize: 12 }}>{n.description}</div>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{n.date}</div>
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
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "95%",
              maxWidth: 500,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h4 style={{ margin: 0 }}>{modalOpen.title}</h4>
              <button
                onClick={() => setModalOpen(null)}
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 12, color: "#374151" }}>{modalOpen.description}</div>
            <div style={{ marginBottom: 12, fontSize: 12, color: "#6b7280" }}>
              Date: {modalOpen.date}
            </div>

            {modalOpen.relatedManuscriptId && (
              <button
                onClick={() => viewManuscript(modalOpen.relatedManuscriptId)}
                style={{
                  padding: "6px 12px",
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
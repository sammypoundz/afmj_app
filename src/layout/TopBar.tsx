import { useState, useRef, useEffect, useMemo } from "react";
import type { FC } from "react";
import { Bell, Search, UserCircle, X, Loader, LogOut, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import debounce from "lodash/debounce";
import toast from "react-hot-toast";

const API_BASE = "https://vinosschool.com/api/EICmanusciptsapi.php";
const NOTIF_API = "https://vinosschool.com/api/EICnotificationsAPI.php";
const VERIFY_API = "https://vinosschool.com/api/verify_status.php";
const REGISTER_API = "https://vinosschool.com/api/register.php";

interface Notification {
  id: number;
  type: string;
  title: string;
  description: string;
  relatedManuscriptId: number | null;
  read: boolean;
  date: string;
}

interface VerificationStatus {
  email_verified: boolean;
  email: string;
}

const TopBar: FC = () => {
  const navigate = useNavigate();
  const { authFetch, logout } = useAuth();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: number; title: string; author: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ===== EMAIL VERIFICATION STATE =====
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [resending, setResending] = useState(false);

  // ===== NOTIFICATIONS STATE =====
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastTicketIds, setLastTicketIds] = useState<Set<number>>(new Set());

  // ===== FETCH VERIFICATION STATUS =====
  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const res = await authFetch(VERIFY_API);
        if (res.ok) {
          const data = await res.json();
          setVerification({
            email_verified: data.email_verified,
            email: data.email,
          });
        } else {
          console.error("Failed to fetch verification status:", res.status);
        }
      } catch (err) {
        console.error("Error fetching verification status:", err);
      } finally {
        setVerificationLoading(false);
      }
    };
    fetchVerification();
  }, [authFetch]);

  // ===== FETCH NOTIFICATIONS =====
  const fetchNotifications = async () => {
    try {
      const res = await authFetch(`${NOTIF_API}?action=list&limit=50`);
      if (!res.ok) {
        console.error("Failed to fetch notifications:", res.status);
        return;
      }
      const data = await res.json();
      setNotifications(data);
      const unread = data.filter((n: Notification) => !n.read).length;
      setUnreadCount(unread);
      return data;
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // ===== TICKET POPUP =====
  useEffect(() => {
    const unreadTickets = notifications.filter(
      (n) => !n.read && n.type === "ticket-received"
    );
    if (unreadTickets.length === 0) return;

    const newTicketIds = unreadTickets
      .map((n) => n.id)
      .filter((id) => !lastTicketIds.has(id));

    if (newTicketIds.length > 0) {
      toast(
        (t) => (
          <div>
            <strong>📩 New ticket from an author!</strong>
            <div style={{ marginTop: 6, fontSize: 14 }}>
              {unreadTickets.length} unread ticket{unreadTickets.length > 1 ? "s" : ""}
            </div>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate("/eic/notifications");
              }}
              style={{
                marginTop: 8,
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "4px 12px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              View
            </button>
          </div>
        ),
        { duration: 8000 }
      );
      const allIds = new Set(unreadTickets.map((n) => n.id));
      setLastTicketIds(allIds);
    }
  }, [notifications]);

  // ===== SINGLE ACTION: RESEND OTP & REDIRECT =====
  const handleResendVerification = async () => {
    if (!verification?.email) {
      toast.error("Email address not found.");
      return;
    }

    setResending(true);
    const toastId = toast.loading("Sending verification email...");

    try {
      const res = await authFetch(`${REGISTER_API}?action=resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verification.email }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid server response");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to resend verification email");
      }

      toast.success("A new verification email has been sent.", { id: toastId });
      
      // Redirect to verification page
      navigate("/verify-email");
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error(error.message, { id: toastId });
    } finally {
      setResending(false);
    }
  };

  // ===== SEARCH DEBOUNCE =====
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query || query.length < 2) {
          setResults([]);
          setDropdownOpen(false);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const res = await fetch(`${API_BASE}?action=search&q=${encodeURIComponent(query)}`);
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();
          setResults(data);
          setDropdownOpen(data.length > 0);
        } catch (err) {
          console.error("Search error:", err);
          setResults([]);
          setDropdownOpen(false);
        } finally {
          setLoading(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(search);
    return () => debouncedSearch.cancel();
  }, [search, debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectManuscript = (id: number) => {
    navigate(`/eic/manuscripts/${id}`);
    setSearch("");
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const clearSearch = () => {
    setSearch("");
    setDropdownOpen(false);
  };

  const responsiveStyles = `
    @media (max-width: 767px) {
      .eic-topbar { padding: 8px 12px !important; }
      .eic-topbar .title { display: none !important; }
      .eic-topbar .search-container { flex: 1 !important; }
      .eic-topbar .search-input { width: 100% !important; }
      .eic-topbar .user-label { display: none !important; }
      .eic-topbar .logout-text { display: none !important; }
      .eic-topbar .center-container { gap: 8px !important; }
    }
    @media (max-width: 480px) {
      .eic-topbar .search-input { font-size: 0.85rem !important; }
      .eic-topbar .center-container { gap: 6px !important; }
    }
    .verification-banner {
      flex-direction: column !important;
      text-align: center !important;
      gap: 8px !important;
    }
    .verification-banner .banner-actions {
      flex-direction: column !important;
      width: 100% !important;
    }
  `;

  return (
    <>
      <style>{responsiveStyles}</style>

      {/* ===== EMAIL VERIFICATION BANNER – single action ===== */}
      {!verificationLoading && verification && !verification.email_verified && (
        <div
          className="verification-banner"
          style={{
            background: "#fef3c7",
            borderBottom: "2px solid #f59e0b",
            padding: "10px 20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            fontSize: "0.95rem",
            color: "#92400e",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={20} />
            <span>
              <strong>Email not verified.</strong> Please verify your email to access all features.
            </span>
          </div>
          <div className="banner-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handleResendVerification}
              disabled={resending}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "6px 16px",
                borderRadius: "6px",
                cursor: resending ? "not-allowed" : "pointer",
                opacity: resending ? 0.6 : 1,
                fontWeight: 500,
              }}
            >
              {resending ? "Sending..." : "Resend Verification"}
            </button>
          </div>
        </div>
      )}

      <header
        className="eic-topbar"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 12,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div className="center-container" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 className="title" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Editor-in-Chief Panel
          </h1>

          {/* Search */}
          <div ref={searchRef} style={{ position: "relative" }}>
            <div
              className="search-container"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                padding: "4px 8px",
                background: "#f9fafb",
              }}
            >
              <Search size={16} />
              <input
                className="search-input"
                placeholder="Search manuscript, author, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  width: 200,
                }}
              />
              {loading && <Loader size={16} className="animate-spin" />}
              {search && !loading && (
                <X size={16} style={{ cursor: "pointer" }} onClick={clearSearch} />
              )}
            </div>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  marginTop: 4,
                  maxHeight: 200,
                  overflowY: "auto",
                  zIndex: 1000,
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
              >
                {results.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelectManuscript(m.id)}
                    style={{
                      padding: 8,
                      cursor: "pointer",
                      borderBottom: "1px solid #f3f4f6",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <div style={{ fontWeight: 600 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {m.author} • ID: {m.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button
            onClick={() => navigate("/eic/notifications")}
            style={{
              position: "relative",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Profile */}
          <div
            onClick={() => navigate("/eic/profile")}
            style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
          >
            <UserCircle size={22} />
            <span className="user-label">EIC</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "#6b7280",
            }}
          >
            <LogOut size={18} />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </header>
    </>
  );
};

export default TopBar;
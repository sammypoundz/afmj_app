import { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const VERIFY_API = "https://vinosschool.com/api/verify_status.php";
const REGISTER_API = "https://vinosschool.com/api/register.php";

const styles = {
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px",
    height: "64px",
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    position: "sticky" as const,
    top: 0,
    zIndex: 100,
  },
  left: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  right: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
  },
  userMenu: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    borderRadius: "40px",
    background: "#f8fafc",
    cursor: "pointer",
    transition: "background 0.2s",
    border: "1px solid #e2e8f0",
    maxWidth: "200px",
  },
  userName: {
    fontWeight: 500,
    color: "#0f172a",
    fontSize: "0.95rem",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chevron: {
    color: "#64748b",
    transition: "transform 0.2s",
    flexShrink: 0,
  },
  chevronOpen: {
    transform: "rotate(180deg)",
  },
  dropdown: {
    position: "absolute" as const,
    top: "calc(100% + 8px)",
    right: 0,
    minWidth: "160px",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    padding: "8px 0",
    zIndex: 1000,
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "10px 16px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: "0.95rem",
    color: "#1e293b",
    transition: "background 0.2s",
  },
  icon: {
    color: "#64748b",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: "6px",
    color: "#6b7280",
    transition: "all 0.2s",
    flexShrink: 0,
  },
};

const ReviewerTopBar = () => {
  const navigate = useNavigate();
  const { user, logout, authFetch } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ===== EMAIL VERIFICATION STATE =====
  const [verification, setVerification] = useState<{ email_verified: boolean; email: string } | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [resending, setResending] = useState(false);

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

  // ===== HANDLE RESEND OTP & REDIRECT =====
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
      navigate("/verify-email");
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error(error.message, { id: toastId });
    } finally {
      setResending(false);
    }
  };

  // ===== CLOSE DROPDOWN ON OUTSIDE CLICK =====
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfile = () => {
    navigate("/reviewer/profile");
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const displayName = user?.name || user?.email || "Reviewer";

  const responsiveStyles = `
    @media (max-width: 767px) {
      .reviewer-topbar {
        padding-left: 56px !important;
      }
      .reviewer-topbar .title {
        font-size: 1rem;
      }
      .reviewer-topbar .user-name {
        font-size: 0.85rem;
      }
      .reviewer-topbar .logout-text {
        display: none;
      }
      .reviewer-topbar .user-menu {
        max-width: 160px;
      }
    }
    @media (min-width: 768px) {
      .reviewer-topbar .logout-text {
        display: inline;
      }
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

      {/* ===== EMAIL VERIFICATION BANNER ===== */}
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

      <header className="reviewer-topbar" style={styles.topbar}>
        <div style={styles.left}>
          <h3 className="title" style={styles.title}>
            Reviewer Workspace
          </h3>
        </div>

        <div style={styles.right}>
          {/* User menu with dropdown */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <div
              className="user-menu"
              style={styles.userMenu}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
            >
              <span className="user-name" style={styles.userName}>
                {displayName}
              </span>
              <ChevronDown
                size={16}
                style={{
                  ...styles.chevron,
                  ...(dropdownOpen ? styles.chevronOpen : {}),
                }}
              />
            </div>

            {dropdownOpen && (
              <div style={styles.dropdown}>
                <button
                  style={styles.dropdownItem}
                  onClick={handleProfile}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <User size={16} style={styles.icon} />
                  <span>Profile</span>
                </button>
              </div>
            )}
          </div>

          {/* Logout button */}
          <button
            style={styles.logoutBtn}
            onClick={handleLogout}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={18} />
            <span className="logout-text" style={{ marginLeft: "4px" }}>
              Logout
            </span>
          </button>
        </div>
      </header>
    </>
  );
};

export default ReviewerTopBar;
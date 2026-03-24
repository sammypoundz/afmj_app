import { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Styles object for consistency
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
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  right: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
  },
  userName: {
    fontWeight: 500,
    color: "#0f172a",
    fontSize: "0.95rem",
  },
  chevron: {
    color: "#64748b",
    transition: "transform 0.2s",
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
  },
};

const ReviewerTopBar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // If user is not loaded yet, show placeholder
  const displayName = user?.name || user?.email || "Reviewer";

  return (
    <header style={styles.topbar}>
      <div style={styles.left}>
        <h3 style={styles.title}>Reviewer Workspace</h3>
      </div>

      <div style={styles.right}>
        {/* User menu with dropdown for profile */}
        <div style={styles.right} ref={dropdownRef}>
          <div
            style={styles.userMenu}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
          >
            <span style={styles.userName}>{displayName}</span>
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
              {/* Removed logout from dropdown – now separate button */}
            </div>
          )}
        </div>

        {/* Separate logout button */}
        <button
          style={styles.logoutBtn}
          onClick={handleLogout}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default ReviewerTopBar;
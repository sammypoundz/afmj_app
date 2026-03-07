import { useState, useEffect, useRef } from "react";
import { User, LogOut, ChevronDown } from "lucide-react";

const API_BASE = "https://afmjonline.com/api/reviewerApi.php";

interface UserInfo {
  id: number;
  name: string;
  email: string;
  role: string;
}

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
  dropdownItemHover: {
    background: "#f1f5f9",
  },
  icon: {
    color: "#64748b",
  },
};

const ReviewerTopBar = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}?action=getCurrentUser`);
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Clear session/token and redirect to login
    // localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleProfile = () => {
    window.location.href = "/reviewer/profile";
  };

  return (
    <header style={styles.topbar}>
      <div style={styles.left}>
        <h3 style={styles.title}>Reviewer Workspace</h3>
      </div>

      <div style={styles.right} ref={dropdownRef}>
        <div
          style={styles.userMenu}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
        >
          <span style={styles.userName}>{user?.name || "Loading..."}</span>
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
            <button
              style={styles.dropdownItem}
              onClick={handleLogout}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <LogOut size={16} style={styles.icon} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default ReviewerTopBar;
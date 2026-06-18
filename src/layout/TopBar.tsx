import { useState, useRef, useEffect, useMemo } from "react";
import type { FC } from "react";
import { Bell, Search, UserCircle, X, Loader, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "./useNotifications";
import { useAuth } from "../contexts/AuthContext";
import debounce from "lodash/debounce";

const API_BASE = "https://vinosschool.com/api/EICmanusciptsapi.php";

const TopBar: FC = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { logout } = useAuth();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: number; title: string; author: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search
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

  // Close dropdown when clicking outside
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
    navigate(`/manuscripts/${id}`);
    setSearch("");
    setDropdownOpen(false);
  };

  const clearSearch = () => {
    setSearch("");
    setResults([]);
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Responsive styles
  const responsiveStyles = `
    @media (max-width: 767px) {
      .eic-topbar {
        padding: 8px 12px !important;
      }
      .eic-topbar .title {
        display: none !important;
      }
      .eic-topbar .search-container {
        flex: 1 !important;
      }
      .eic-topbar .search-input {
        width: 100% !important;
      }
      .eic-topbar .user-label {
        display: none !important;
      }
      .eic-topbar .logout-text {
        display: none !important;
      }
      .eic-topbar .center-container {
        gap: 8px !important;
      }
    }
    @media (max-width: 480px) {
      .eic-topbar .search-input {
        font-size: 0.85rem !important;
      }
      .eic-topbar .center-container {
        gap: 6px !important;
      }
    }
  `;

  return (
    <>
      <style>{responsiveStyles}</style>
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
          {/* Title */}
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
            onClick={() => navigate("/notifications")}
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
import { useState, useRef, useEffect } from "react";
import type { FC } from "react";
import { Bell, Search, Settings, UserCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "./useNotifications"; // <-- path to the hook

const TopBar: FC = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications(); // Live unread counter

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: number; title: string; author: string }[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const mockManuscripts = [
    { id: 101, title: "COVID-19 Vaccination Strategies", author: "Dr. Aisha Bello" },
    { id: 102, title: "Urban Malaria Control Strategies", author: "Dr. Ibrahim Musa" },
    { id: 103, title: "Maternal Health Outcomes in Lagos", author: "Dr. Aisha Bello" },
  ];

  useEffect(() => {
    if (!search) {
      setResults([]);
      setDropdownOpen(false);
      return;
    }
    const filtered = mockManuscripts.filter(
      (m) =>
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.author.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toString().includes(search)
    );
    setResults(filtered);
    setDropdownOpen(filtered.length > 0);
  }, [search]);

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
    navigate(`/manuscripts/${id}/logs`);
    setSearch("");
    setDropdownOpen(false);
  };

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>Editor-in-Chief Panel</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Search */}
        <div ref={searchRef} style={{ position: "relative" }}>
          <div
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
            {search && (
              <X
                size={16}
                style={{ cursor: "pointer" }}
                onClick={() => setSearch("")}
              />
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
                  }}
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

        {/* Settings */}
        <button
          onClick={() => navigate("/eic/settings")}
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          <Settings size={18} />
        </button>

        {/* Profile */}
        <div
          onClick={() => navigate("/eic/ProfileAndLogs")}
          style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <UserCircle size={22} />
          <span>EIC</span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;

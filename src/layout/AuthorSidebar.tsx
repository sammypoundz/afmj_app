import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  RefreshCcw,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const AuthorSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: collapsed ? "12px" : "10px 14px",
    borderRadius: 8,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: collapsed ? "center" : "flex-start",
    gap: collapsed ? 0 : 10,
    marginBottom: 6,
    background: isActive ? "#dcfce7" : "transparent",
    color: isActive ? "#15803d" : "#334155",
    fontWeight: 600,
    transition: "all .2s ease",
    whiteSpace: "nowrap" as const,
  });

  const sidebarWidth = collapsed ? 80 : 260;

  return (
    <aside
      style={{
        width: sidebarWidth,
        padding: collapsed ? "16px 8px" : 24,
        borderRight: "1px solid rgba(22,163,74,0.12)",
        background: "linear-gradient(180deg,#ffffff,#f6fef9)",
        minHeight: "100vh",
        transition: "width 0.2s ease, padding 0.2s ease",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          marginBottom: 32,
        }}
      >
        {!collapsed && (
          <h3
            style={{
              fontWeight: 700,
              color: "#0f172a",
              margin: 0,
            }}
          >
            Author Panel
          </h3>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
          }}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav>
        <NavLink to="/author/dashboard" style={linkStyle}>
          <LayoutDashboard size={18} />
          {!collapsed && "Dashboard"}
        </NavLink>
        <NavLink to="/author/submissions" style={linkStyle}>
          <FileText size={18} />
          {!collapsed && "My Submissions"}
        </NavLink>
        <NavLink to="/author/submit" style={linkStyle}>
          <UploadCloud size={18} />
          {!collapsed && "Submit Manuscript"}
        </NavLink>
        <NavLink to="/author/revisions" style={linkStyle}>
          <RefreshCcw size={18} />
          {!collapsed && "Revisions"}
        </NavLink>
        <NavLink to="/author/published" style={linkStyle}>
          <BookOpen size={18} />
          {!collapsed && "Published"}
        </NavLink>
        <NavLink to="/author/profile" style={linkStyle}>
          <User size={18} />
          {!collapsed && "Profile"}
        </NavLink>
      </nav>
    </aside>
  );
};

export default AuthorSidebar;
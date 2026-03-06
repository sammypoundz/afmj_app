import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  RefreshCcw,
  BookOpen,
  User
} from "lucide-react";

const AuthorSidebar = () => {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: "10px 14px",
    borderRadius: 8,
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
    background: isActive ? "#dcfce7" : "transparent",
    color: isActive ? "#15803d" : "#334155",
    fontWeight: 600,
    transition: "all .2s ease",
  });

  return (
    <aside
      style={{
        width: 260,
        padding: 24,
        borderRight: "1px solid rgba(22,163,74,0.12)",
        background: "linear-gradient(180deg,#ffffff,#f6fef9)",
        minHeight: "100vh",
      }}
    >
      <h3
        style={{
          marginBottom: 32,
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        Author Panel
      </h3>

      <nav>
        <NavLink to="/author/dashboard" style={linkStyle}>
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>

        <NavLink to="/author/submissions" style={linkStyle}>
          <FileText size={18} />
          My Submissions
        </NavLink>

        <NavLink to="/author/submit" style={linkStyle}>
          <UploadCloud size={18} />
          Submit Manuscript
        </NavLink>

        <NavLink to="/author/revisions" style={linkStyle}>
          <RefreshCcw size={18} />
          Revisions
        </NavLink>

        <NavLink to="/author/published" style={linkStyle}>
          <BookOpen size={18} />
          Published
        </NavLink>

        <NavLink to="/author/profile" style={linkStyle}>
          <User size={18} />
          Profile
        </NavLink>
      </nav>
    </aside>
  );
};

export default AuthorSidebar;
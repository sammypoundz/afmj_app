import { Home, FileText, Users, Settings } from "lucide-react";
import Dashboard from "../pages/Dashboard";

const AppShell = () => {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          background: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          padding: "20px",
        }}
      >
        <h2 style={{ color: "#007437", marginBottom: "30px" }}>
          AMJ Journal
        </h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <NavItem icon={<Home size={18} />} label="Dashboard" />
          <NavItem icon={<FileText size={18} />} label="Manuscripts" />
          <NavItem icon={<Users size={18} />} label="Reviewers" />
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1 }}>
        <Dashboard />
      </main>
    </div>
  );
};

type NavItemProps = {
  icon: React.ReactNode;
  label: string;
};

const NavItem = ({ icon, label }: NavItemProps) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "10px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      color: "#374151",
    }}
  >
    <span style={{ color: "#007437" }}>{icon}</span>
    <span>{label}</span>
  </div>
);

export default AppShell;

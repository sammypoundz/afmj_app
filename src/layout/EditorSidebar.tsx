import type { FC } from "react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { editorMenu } from "./editorMenu";

const counters: Record<string, number> = {
  "New Submissions": 3,
  "Under Review": 5,
  "Revisions": 2,
};

const EditorSidebar: FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getPath = (label: string) => {
    switch (label) {
      case "Dashboard":
        return "/editor/dashboard";
      case "New Submissions":
        return "/editor/manuscripts/new";
      case "Under Review":
        return "/editor/manuscripts/review";
      case "Revisions":
        return "/editor/manuscripts/revisions";
      case "Accepted":
        return "/editor/manuscripts/accepted";
      case "Rejected":
        return "/editor/manuscripts/rejected";
      default:
        return "/editor/dashboard";
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        {!collapsed && <h2 className="logo">AMJ • Editor</h2>}

        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {editorMenu.map((group) => (
        <div key={group.section} className="menu-group">
          {!collapsed && <p className="menu-title">{group.section}</p>}

          {group.items.map((item) => {
            const Icon = item.icon;
            const path = getPath(item.label);

            // 🔥 Important: supports dynamic workspace routes
            const isActive = location.pathname.startsWith(path);

            const count = counters[item.label] || 0;

            return (
              <div
                key={item.label}
                className="menu-item"
                onClick={() => navigate(path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "space-between",
                  cursor: "pointer",
                  background: isActive ? "#dcfce7" : "transparent",
                  color: isActive ? "#16a34a" : "#111827",
                  borderRadius: 8,
                  padding: "6px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon size={20} />
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {!collapsed && count > 0 && (
                  <span
                    style={{
                      background: "#dc2626",
                      color: "#fff",
                      fontSize: 11,
                      padding: "2px 7px",
                      borderRadius: 999,
                    }}
                  >
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
};

export default EditorSidebar;
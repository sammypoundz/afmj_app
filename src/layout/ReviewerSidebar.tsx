import type { FC } from "react";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { reviewerMenu } from "./reviewerMenu";

const counters: Record<string, number> = {
  Invitations: 2,
  "Active Reviews": 4,
  Revisions: 1,
  Overdue: 1,
};

const ReviewerSidebar: FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const getPath = (label: string) => {
    switch (label) {
      case "Dashboard":
        return "/reviewer/dashboard";
      case "Invitations":
        return "/reviewer/invitations";
      case "Active Reviews":
        return "/reviewer/active";
      case "Revisions":
        return "/reviewer/revisions";
      case "Completed":
        return "/reviewer/completed";
      case "Overdue":
        return "/reviewer/overdue";
      default:
        return "/reviewer/dashboard";
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        {!collapsed && <h2 className="logo">AMJ • Reviewer</h2>}

        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {reviewerMenu.map((group) => (
        <div key={group.section} className="menu-group">
          {!collapsed && <p className="menu-title">{group.section}</p>}

          {group.items.map((item) => {
            const Icon = item.icon;
            const path = getPath(item.label);
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
                  background: isActive ? "#dbeafe" : "transparent",
                  color: isActive ? "#1d4ed8" : "#111827",
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

export default ReviewerSidebar;
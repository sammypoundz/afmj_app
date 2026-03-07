import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { reviewerMenu } from "./reviewerMenu";

// Define the shape of data returned by getDashboardStats
interface DashboardStats {
  invitations: number;
  active: number;
  revisions: number;
  completed: number;
  overdue: number;
}

const API_BASE = "https://afmjonline.com/api/reviewerApi.php";

const ReviewerSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch dashboard statistics on component mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE}?action=getDashboardStats`);
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data: DashboardStats = await response.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        // Optionally show a fallback or retry
      }
    };

    fetchStats();
  }, []);

  // Map menu labels to routes
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

  // Return the appropriate counter for a given menu label
  const getCount = (label: string): number => {
    if (!stats) return 0;
    switch (label) {
      case "Invitations":
        return stats.invitations;
      case "Active Reviews":
        return stats.active;
      case "Revisions":
        return stats.revisions;
      case "Overdue":
        return stats.overdue;
      case "Completed":
        return stats.completed;
      default:
        return 0;
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
            const count = getCount(item.label);

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
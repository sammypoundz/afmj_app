import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { reviewerMenu } from "./reviewerMenu";

interface DashboardStats {
  invitations: number;
  active: number;
  revisions: number;
  completed: number;
  overdue: number;
}

const API_BASE = "https://vinosschool.com/api/reviewerApi.php";
// const API_BASE = "/api/reviewerApi.php";
const LOGO_URL = "https://www.afmjonline.com/pages/user/images/logo.png";
const FAVICON_URL = "https://www.afmjonline.com/pages/user/images/images%20(2)_1675592375901.jpeg";

const ReviewerSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { authFetch, sessionId } = useAuth();
  const intervalRef = useRef<number | null>(null);

  const fetchStats = async () => {
    if (!sessionId) return;
    try {
      const response = await authFetch(`${API_BASE}?action=getDashboardStats`);
      if (!response.ok) {
        if (response.status === 401) navigate("/login");
        throw new Error("Failed to fetch stats");
      }
      const data: DashboardStats = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchStats();
      intervalRef.current = setInterval(fetchStats, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, authFetch, navigate]);

  const getPath = (label: string) => {
    const paths: Record<string, string> = {
      Dashboard: "/reviewer/dashboard",
      Invitations: "/reviewer/invitations",
      "Active Reviews": "/reviewer/active",
      Revisions: "/reviewer/revisions",
      Completed: "/reviewer/completed",
      Overdue: "/reviewer/overdue",
    };
    return paths[label] || "/reviewer/dashboard";
  };

  const getCount = (label: string): number => {
    if (!stats) return 0;
    const counts: Record<string, number> = {
      Invitations: stats.invitations,
      "Active Reviews": stats.active,
      Revisions: stats.revisions,
      Overdue: stats.overdue,
      Completed: stats.completed,
    };
    return counts[label] || 0;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) setMobileOpen(false);
  };

  const responsiveStyles = `
    @media (max-width: 767px) {
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        z-index: 1000;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        width: 280px;
        background: #fff;
        box-shadow: 2px 0 12px rgba(0,0,0,0.1);
      }
      .sidebar.mobile-open {
        transform: translateX(0);
      }
      .sidebar.collapsed {
        transform: translateX(-100%);
      }
      .mobile-menu-btn {
        position: fixed;
        top: 1rem;
        left: 1rem;
        z-index: 1001;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .sidebar-header {
        padding: 1rem;
      }
      .collapse-btn {
        display: none;
      }
    }
    @media (min-width: 768px) {
      .mobile-menu-btn {
        display: none;
      }
      .sidebar {
        transition: width 0.2s ease;
      }
      .sidebar.collapsed {
        width: 80px;
      }
      .sidebar:not(.collapsed) {
        width: 280px;
      }
      .sidebar-header {
        padding: 1rem;
      }
      .collapse-btn {
        background: #f1f5f9;
        border: none;
        border-radius: 6px;
        width: 28px;
        height: 28px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .collapse-btn:hover {
        background: #e2e8f0;
      }
    }
  `;

  return (
    <>
      <style>{responsiveStyles}</style>

      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        <div className="sidebar-header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              width: "100%",
            }}
          >
            {!collapsed ? (
              // Expanded state: show full logo + collapse button
              <>
                <img
                  src={LOGO_URL}
                  alt="AFMJ Logo"
                  style={{
                    maxWidth: "180px",
                    width: "100%",
                    height: "auto",
                    objectFit: "contain",
                  }}
                />
                <button
                  className="collapse-btn"
                  onClick={() => setCollapsed(true)}
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft size={18} />
                </button>
              </>
            ) : (
              // Collapsed state: show favicon + expand button inline
              <>
                <img
                  src={FAVICON_URL}
                  alt="AFMJ Icon"
                  style={{
                    width: "32px",
                    height: "32px",
                    objectFit: "contain",
                    borderRadius: "4px",
                  }}
                />
                <button
                  className="collapse-btn"
                  onClick={() => setCollapsed(false)}
                  aria-label="Expand sidebar"
                  style={{
                    marginLeft: "8px",
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
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
                  onClick={() => handleNavigation(path)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    cursor: "pointer",
                    background: isActive ? "#dbeafe" : "transparent",
                    color: isActive ? "#1d4ed8" : "#111827",
                    borderRadius: 8,
                    padding: "6px 12px",
                    margin: "2px 8px",
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
    </>
  );
};

export default ReviewerSidebar;
import type { FC } from "react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { eicMenu } from "./EICSidebar";

// Mapping from menu label to API response key
const labelToApiKey: Record<string, string> = {
  "New Submissions": "newSubmissions",
  "Under Review": "underReview",
  "Revision Requested": "revisionRequested",  // new
  "Revised": "revised",                       // new
  "Accepted": "accepted",
  "Rejected": "rejected",
  "Published": "published",
  "Publication Decision": "publicationDecision",
  "Reviewers": "reviewers",
  "Editors": "editors",
  "Authors": "authors"
};

// Only these labels will show a counter badge
const attentionLabels = new Set([
  "New Submissions",
  "Under Review",
  "Revision Requested",  // new
  "Revised",             // new
  "Accepted",
  "Rejected",
  "Published",
  "Publication Decision"
]);

const API_BASE = "http://afmjonline.com/api/EICcountersAPI.php";

const Sidebar: FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch counters on mount and every 30 seconds
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch(`${API_BASE}?action=dashboardCounts`);
        const data = await res.json();
        if (res.ok) {
          setCounts(data);
        } else {
          console.error("Failed to fetch counters:", data.error);
        }
      } catch (err) {
        console.error("Error fetching counters:", err);
      }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Top / Logo */}
      <div className="sidebar-header">
        {!collapsed && <h2 className="logo">AMJ • EIC</h2>}

        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Menu */}
      {eicMenu.map((group) => (
        <div key={group.section} className="menu-group">
          {!collapsed && <p className="menu-title">{group.section}</p>}

          {group.items.map((item) => {
            const Icon = item.icon;

            let path = "#";

            /* Dashboard */
            if (item.label === "Dashboard") path = "/dashboard";

            /* Manuscripts */
            else if (group.section === "Manuscripts") {
              path = `/manuscripts/${item.label
                .toLowerCase()
                .replace(/\s+/g, "-")}`;
            }

            /* Users */
            else if (group.section === "Users") {
              if (item.label === "Reviewers") path = "/users/reviewers";
              else if (item.label === "Editors") path = "/users/editors";
              else if (item.label === "Authors") path = "/users/authors";
            }

            /* Publications */
            else if (group.section === "Publications") {
              if (item.label === "Journal Issues") path = "/publications/issues";
              else if (item.label === "Create Issue") path = "/publications/create";
              else if (item.label === "Publication Decision")
                path = "/publications/decision";
            }

            /* System */
            else if (group.section === "System") {
              if (item.label === "Analytics") path = "/eic/analytics";
              else if (item.label === "Settings") path = "/eic/settings";
              else if (item.label === "Profile & Logs") path = "/eic/ProfileAndLogs";
            }

            // Get count from API response
            const apiKey = labelToApiKey[item.label];
            const count = apiKey ? (counts[apiKey] || 0) : 0;

            // Determine if this item should show a badge
            const showBadge = attentionLabels.has(item.label) && count > 0;

            // Check active state
            const isActive = location.pathname === path;

            return (
              <div
                key={item.label}
                className="menu-item"
                onClick={() => {
                  if (path !== "#") navigate(path);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "space-between",
                  cursor: "pointer",
                  background: isActive ? "#dcfce7" : "transparent",
                  color: isActive ? "#16a34a" : "#111827",
                  borderRadius: 8,
                  padding: "6px 12px",
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Icon size={20} />
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {!collapsed && showBadge && (
                  <span
                    style={{
                      background: "#dc2626",
                      color: "#fff",
                      fontSize: "11px",
                      padding: "2px 7px",
                      borderRadius: "999px",
                      minWidth: "20px",
                      textAlign: "center",
                      lineHeight: "16px",
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

export default Sidebar;
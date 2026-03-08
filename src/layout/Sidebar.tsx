import type { FC } from "react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Bell } from "lucide-react"; // added Bell icon
import { eicMenu } from "./EICSidebar";

// Mapping from menu label to API response key
const labelToApiKey: Record<string, string> = {
  "New Submissions": "newSubmissions",
  "Under Review": "underReview",
  "Revision Requested": "revisionRequested",
  "Revised": "revised",
  "Accepted": "accepted",
  "Rejected": "rejected",
  "Published": "published",
  "Publication Decision": "publicationDecision",
  "Reviewers": "reviewers",
  "Editors": "editors",
  "Authors": "authors"
  // Notifications do not have an API key yet
};

// Only these labels will show a counter badge
const attentionLabels = new Set([
  "New Submissions",
  "Under Review",
  "Revision Requested",
  "Revised",
  "Accepted",
  "Rejected",
  "Published",
  "Publication Decision"
]);

const API_BASE = "https://afmjonline.com/api/EICcountersAPI.php";

// Local menu definition – based on eicMenu but with "Notifications" inserted in System section
const buildMenu = () => {
  // Deep copy eicMenu to avoid mutating the imported constant
  const menu = eicMenu.map(section => ({
    ...section,
    items: [...section.items]
  }));

  // Find System section
  const systemSection = menu.find(s => s.section === "System");
  if (systemSection) {
    // Find index of Analytics (assuming it exists)
    const analyticsIndex = systemSection.items.findIndex(item => item.label === "Analytics");
    if (analyticsIndex !== -1) {
      // Insert Notifications right before Analytics
      systemSection.items.splice(analyticsIndex, 0, {
        label: "Notifications",
        icon: Bell
      });
    } else {
      // If Analytics not found, just push at the end
      systemSection.items.push({ label: "Notifications", icon: Bell });
    }
  }
  return menu;
};

const Sidebar: FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const location = useLocation();

  const menu = buildMenu(); // build once per render

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
      {menu.map((group) => (
        <div key={group.section} className="menu-group">
          {/* Section title – now bolder */}
          {!collapsed && (
            <p
              className="menu-title"
              style={{
                fontWeight: 600,
                fontSize: "0.85rem",
                letterSpacing: "0.3px",
              }}
            >
              {group.section}
            </p>
          )}

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

            /* Publications */
            else if (group.section === "Publications") {
              if (item.label === "Published") path = "/manuscripts/published";
              else if (item.label === "Publication Decision") path = "/publications/decision";
            }

            /* Users */
            else if (group.section === "Users") {
              if (item.label === "Reviewers") path = "/users/reviewers";
              else if (item.label === "Editors") path = "/users/editors";
              else if (item.label === "Authors") path = "/users/authors";
            }

            /* System */
            else if (group.section === "System") {
              if (item.label === "Analytics") path = "/eic/analytics";
              else if (item.label === "Profile & Logs") path = "/eic/ProfileAndLogs";
              else if (item.label === "Notifications") path = "/notifications"; // placeholder
            }

            // Get count from API response (only for labels that have an API key)
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
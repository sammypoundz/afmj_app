import type { FC } from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Bell, Menu } from "lucide-react";
import { eicMenu } from "./EICSidebar";
import { useSidebarCounts, useEicManuscriptCounts } from "./useSidebarCounts";

// Logo URLs
const LOGO_URL = "https://www.afmjonline.com/pages/user/images/logo.png";
const FAVICON_URL = "https://www.afmjonline.com/pages/user/images/images%20(2)_1675592375901.jpeg";

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
};

// Maps sidebar labels to the EXACT `status` value the ManuscriptCategoryView
// page passes to the list API, so badges always match the page content.
const labelToCategoryStatus: Record<string, string> = {
  "New Submissions": "New Submissions",
  "Under Review": "Under Review",
  "Revision Requested": "Revisions",
  "Revised": "Revised",
  "Accepted": "Accepted",
  "Rejected": "Rejected",
  "Published": "Published",
};

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

const buildMenu = () => {
  const menu = eicMenu.map(section => ({
    ...section,
    items: [...section.items]
  }));

  const systemSection = menu.find(s => s.section === "System");
  if (systemSection) {
    const analyticsIndex = systemSection.items.findIndex(item => item.label === "Analytics");
    if (analyticsIndex !== -1) {
      systemSection.items.splice(analyticsIndex, 0, {
        label: "Notifications",
        icon: Bell
      });
    } else {
      systemSection.items.push({ label: "Notifications", icon: Bell });
    }
  }
  return menu;
};

const Sidebar: FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { counts } = useSidebarCounts<Record<string, number>>("eic");
  // In-sync manuscript category counts (same endpoint + filter as the category pages)
  const { counts: manuscriptCounts } = useEicManuscriptCounts();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileOpen]);

  const handleNavigation = (path: string) => {
    if (path !== "#") navigate(path);
    if (window.innerWidth < 768) setMobileOpen(false);
  };

  const responsiveStyles = `
    @media (max-width: 767px) {
      .eic-sidebar {
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
      .eic-sidebar.mobile-open {
        transform: translateX(0);
      }
      .eic-sidebar.collapsed {
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
      .eic-sidebar {
        transition: width 0.2s ease;
      }
      .eic-sidebar.collapsed {
        width: 80px;
      }
      .eic-sidebar:not(.collapsed) {
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
        ref={sidebarRef}
        className={`eic-sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
        style={{
          background: "#fff",
          borderRight: "1px solid #e2e8f0",
          minHeight: "100vh",
          overflowX: "hidden",
          transition: "width 0.2s ease, transform 0.3s ease",
        }}
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
                  style={{ marginLeft: "8px" }}
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {buildMenu().map((group) => (
          <div key={group.section} className="menu-group">
            {!collapsed && (
              <p
                className="menu-title"
                style={{
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  letterSpacing: "0.3px",
                  color: "#64748b",
                  margin: "16px 8px 8px 12px",
                }}
              >
                {group.section}
              </p>
            )}

            {group.items.map((item) => {
              const Icon = item.icon;

              let path = "#";

              /* Dashboard */
              if (item.label === "Dashboard") path = "/eic/dashboard";

              /* Manuscripts */
              else if (group.section === "Manuscripts") {
                // "Revision Requested" opens the same "Revisions" category the
                // manuscripts overview page links to, keeping routes in sync.
                if (item.label === "Revision Requested") {
                  path = "/eic/manuscripts/revisions";
                } else {
                  const status = item.label.toLowerCase().replace(/\s+/g, "-");
                  path = `/eic/manuscripts/${status}`;
                }
              }

              /* Publications */
              else if (group.section === "Publications") {
                if (item.label === "Published") {
                  // ✅ FIX: Use manuscripts view instead of separate Published component
                  path = "/eic/manuscripts/published";
                } else if (item.label === "Publication Decision") {
                  path = "/eic/publications/decision";
                } else if (item.label === "Journal Issues") {
                  path = "/eic/publications/issues";
                }
              }

              /* Users */
              else if (group.section === "Users") {
                if (item.label === "Reviewers") path = "/eic/users/reviewers";
                else if (item.label === "Editors") path = "/eic/users/editors";
                else if (item.label === "Authors") path = "/eic/users/authors";
              }

              /* System */
              else if (group.section === "System") {
                if (item.label === "Analytics") path = "/eic/analytics";
                else if (item.label === "Profile & Logs") path = "/eic/profile";
                else if (item.label === "Notifications") path = "/eic/notifications";
                else if (item.label === "Settings") path = "/eic/settings";
              }

              // Manuscript categories use the in-sync counts; everything else
              // (users, etc.) falls back to the counter API.
              const categoryStatus = labelToCategoryStatus[item.label];
              const count = categoryStatus
                ? (manuscriptCounts[categoryStatus] ?? 0)
                : (() => {
                    const apiKey = labelToApiKey[item.label];
                    return apiKey ? (counts[apiKey] || 0) : 0;
                  })();
              const showBadge = attentionLabels.has(item.label) && count > 0;
              const isActive = location.pathname === path;

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
                    background: isActive ? "#dcfce7" : "transparent",
                    color: isActive ? "#16a34a" : "#111827",
                    borderRadius: 8,
                    padding: "6px 12px",
                    margin: "2px 8px",
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
    </>
  );
};

export default Sidebar;
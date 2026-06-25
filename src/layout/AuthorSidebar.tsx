import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  RefreshCcw,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
  Menu,
  History,
  CreditCard,
} from "lucide-react";

// Images
const LOGO_URL = "https://www.afmjonline.com/pages/user/images/logo.png";
const FAVICON_URL = "https://www.afmjonline.com/pages/user/images/images%20(2)_1675592375901.jpeg";

// Menu groups and items
const authorMenu = [
  {
    section: "Manuscripts",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/author/dashboard" },
      { label: "My Submissions", icon: FileText, path: "/author/submissions" },
      { label: "Submit Manuscript", icon: UploadCloud, path: "/author/submit" },
      { label: "Revisions", icon: RefreshCcw, path: "/author/revisions" },
      { label: "Published", icon: BookOpen, path: "/author/published" },
      { label: "Galley History", icon: History, path: "/author/galley-history" },
      { label: "Payment History", icon: CreditCard, path: "/author/payment-history" },
    ],
  },
  {
    section: "Account",
    items: [
      { label: "Profile", icon: User, path: "/author/profile" },
    ],
  },
];

const AuthorSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
    navigate(path);
    if (window.innerWidth < 768) setMobileOpen(false);
  };

  const responsiveStyles = `
    @media (max-width: 767px) {
      .author-sidebar {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        z-index: 1000;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        width: 280px;
        background: linear-gradient(180deg, #ffffff, #f6fef9);
        box-shadow: 2px 0 12px rgba(0,0,0,0.1);
      }
      .author-sidebar.mobile-open {
        transform: translateX(0);
      }
      .author-sidebar.collapsed {
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
      .author-sidebar {
        transition: width 0.2s ease;
      }
      .author-sidebar.collapsed {
        width: 80px;
      }
      .author-sidebar:not(.collapsed) {
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
        className={`author-sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
        style={{
          background: "linear-gradient(180deg, #ffffff, #f6fef9)",
          borderRight: "1px solid rgba(22,163,74,0.12)",
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

        {authorMenu.map((group) => (
          <div key={group.section} className="menu-group">
            {!collapsed && (
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#64748b",
                  margin: "16px 8px 8px 12px",
                }}
              >
                {group.section}
              </p>
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <div
                  key={item.label}
                  onClick={() => handleNavigation(item.path)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    cursor: "pointer",
                    background: isActive ? "#dcfce7" : "transparent",
                    color: isActive ? "#15803d" : "#334155",
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
                </div>
              );
            })}
          </div>
        ))}
      </aside>
    </>
  );
};

export default AuthorSidebar;
import type { FC } from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Search, UserCircle, X, AlertCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import debounce from "lodash/debounce";
import toast from "react-hot-toast";

const VERIFY_API = "https://vinosschool.com/api/verify_status.php";
const REGISTER_API = "https://vinosschool.com/api/register.php";
const EDITOR_API = "https://vinosschool.com/api/editorApi.php";

const EditorTopBar: FC = () => {
  const navigate = useNavigate();
  const { authFetch, logout } = useAuth();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    { id: number; title: string; author: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ===== EMAIL VERIFICATION STATE =====
  const [verification, setVerification] = useState<{ email_verified: boolean; email: string } | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [resending, setResending] = useState(false);

  // ===== FETCH VERIFICATION STATUS =====
  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const res = await authFetch(VERIFY_API);
        if (res.ok) {
          const data = await res.json();
          setVerification({
            email_verified: data.email_verified,
            email: data.email,
          });
        } else {
          console.error("Failed to fetch verification status:", res.status);
        }
      } catch (err) {
        console.error("Error fetching verification status:", err);
      } finally {
        setVerificationLoading(false);
      }
    };
    fetchVerification();
  }, [authFetch]);

  // ===== HANDLE RESEND OTP & REDIRECT =====
  const handleResendVerification = async () => {
    if (!verification?.email) {
      toast.error("Email address not found.");
      return;
    }

    setResending(true);
    const toastId = toast.loading("Sending verification email...");

    try {
      const res = await authFetch(`${REGISTER_API}?action=resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verification.email }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid server response");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to resend verification email");
      }

      toast.success("A new verification email has been sent.", { id: toastId });
      navigate("/verify-email");
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error(error.message, { id: toastId });
    } finally {
      setResending(false);
    }
  };

  // ===== SEARCH – ONLY MANUSCRIPTS ASSIGNED TO EDITOR =====
  const debouncedSearch = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query || query.length < 2) {
          setResults([]);
          setOpen(false);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const res = await authFetch(
            `${EDITOR_API}?action=searchAssigned&q=${encodeURIComponent(query)}`
          );
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();
          setResults(data);
          setOpen(data.length > 0);
        } catch (err) {
          console.error("Search error:", err);
          setResults([]);
          setOpen(false);
        } finally {
          setLoading(false);
        }
      }, 300),
    [authFetch]
  );

  useEffect(() => {
    debouncedSearch(search);
    return () => debouncedSearch.cancel();
  }, [search, debouncedSearch]);

  // ===== CLOSE DROPDOWN ON OUTSIDE CLICK =====
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: number) => {
    navigate(`/editor/manuscripts/${id}`);
    setSearch("");
    setOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const clearSearch = () => {
    setSearch("");
    setResults([]);
    setOpen(false);
  };

  const responsiveStyles = `
    .editor-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      background: #ffffff;
      border-bottom: 1px solid #e5e7eb;
      height: 56px;
    }

    .editor-topbar .title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      white-space: nowrap;
    }

    .editor-topbar .right-section {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .editor-topbar .search-wrapper {
      position: relative;
    }

    .editor-topbar .search-box {
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 6px 10px;
      background: #f9fafb;
      width: 240px;
      transition: width 0.2s ease;
    }

    .editor-topbar .search-box input {
      border: none;
      outline: none;
      background: transparent;
      width: 100%;
      font-size: 14px;
    }

    .editor-topbar .user-label,
    .editor-topbar .logout-text {
      display: inline;
    }

    .verification-banner {
      flex-direction: column !important;
      text-align: center !important;
      gap: 8px !important;
    }
    .verification-banner .banner-actions {
      flex-direction: column !important;
      width: 100% !important;
    }

    /* === RESPONSIVE === */
    @media (max-width: 768px) {
      .editor-topbar .search-box {
        width: 160px;
      }
      .editor-topbar .title {
        font-size: 16px;
      }
      .editor-topbar .right-section {
        gap: 10px;
      }
      .editor-topbar .user-label {
        display: none;
      }
      .editor-topbar .logout-text {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .editor-topbar {
        padding: 0 10px;
        height: 50px;
      }
      .editor-topbar .title {
        font-size: 14px;
      }
      .editor-topbar .search-box {
        width: 120px;
        padding: 4px 8px;
      }
      .editor-topbar .search-box input {
        font-size: 12px;
      }
      .editor-topbar .right-section {
        gap: 6px;
      }
    }
  `;

  return (
    <>
      <style>{responsiveStyles}</style>

      {/* ===== EMAIL VERIFICATION BANNER ===== */}
      {!verificationLoading && verification && !verification.email_verified && (
        <div
          className="verification-banner"
          style={{
            background: "#fef3c7",
            borderBottom: "2px solid #f59e0b",
            padding: "10px 20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            fontSize: "0.95rem",
            color: "#92400e",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={20} />
            <span>
              <strong>Email not verified.</strong> Please verify your email to access all features.
            </span>
          </div>
          <div className="banner-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handleResendVerification}
              disabled={resending}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "6px 16px",
                borderRadius: "6px",
                cursor: resending ? "not-allowed" : "pointer",
                opacity: resending ? 0.6 : 1,
                fontWeight: 500,
              }}
            >
              {resending ? "Sending..." : "Resend Verification"}
            </button>
          </div>
        </div>
      )}

      <header className="editor-topbar">
        <h1 className="title">Editor Panel</h1>

        <div className="right-section">
          {/* ===== SEARCH ===== */}
          <div className="search-wrapper" ref={searchRef}>
            <div className="search-box">
              <Search size={16} />
              <input
                placeholder="Search assigned manuscripts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <X
                  size={14}
                  style={{ cursor: "pointer" }}
                  onClick={clearSearch}
                />
              )}
              {loading && (
                <div
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #d1d5db",
                    borderTop: "2px solid #16a34a",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              )}
            </div>

            {open && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  marginTop: 6,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                  zIndex: 50,
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {results.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {m.author} • ID {m.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ===== PROFILE ===== */}
          <div
            onClick={() => navigate("/editor/profile")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              color: "#374151",
              fontSize: 14,
            }}
          >
            <UserCircle size={22} />
            <span className="user-label">Editor</span>
          </div>

          {/* ===== LOGOUT ===== */}
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              color: "#6b7280",
              padding: "4px 8px",
              borderRadius: 4,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut size={18} />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </header>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default EditorTopBar;
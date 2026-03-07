import { useState, useEffect, useCallback } from "react";
import type { FC } from "react";
import {
  Users, X, ShieldCheck, ShieldOff, Loader,
  Mail, Building2, Award, Calendar, ChevronLeft, ChevronRight,
  UserPlus, ChevronsLeft, ChevronsRight
} from "lucide-react";
import debounce from "lodash/debounce";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = "https://afmjonline.com/api/EICUsersApi.php";

// ================= Types =================
interface PastReview {
  manuscriptTitle: string;
  decision: string;
  date: string;
}

interface Reviewer {
  id: number;
  name: string;
  email: string;
  expertise: string[];
  affiliation: string;
  activeAssignments: number;
  completedReviews: number;
  status: "active" | "inactive";
  bio: string;
  suspended: boolean;
  pastReviews: PastReview[];
}

interface Manuscript {
  id: number;
  title: string;
}

// ================= Modern Green Theme =================
const theme = {
  primary: "#16a34a",
  primaryLight: "#dcfce7",
  primaryDark: "#166534",
  grayBg: "#f9fafb",
  border: "#e5e7eb",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#f59e0b",
  cardBg: "#ffffff",
  shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  shadowLg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
};

const styles = {
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 600,
    color: theme.textPrimary,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filtersBar: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "12px",
    marginBottom: "24px",
    padding: "16px",
    background: theme.cardBg,
    borderRadius: "12px",
    border: `1px solid ${theme.border}`,
    boxShadow: theme.shadow,
    alignItems: "center",
  },
  input: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: `1px solid ${theme.border}`,
    fontSize: "0.95rem",
    outline: "none",
    background: theme.grayBg,
    minWidth: "240px",
    flex: 1,
  },
  select: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: `1px solid ${theme.border}`,
    fontSize: "0.95rem",
    background: theme.grayBg,
    minWidth: "160px",
    cursor: "pointer",
  },
  buttonPrimary: {
    background: theme.primary,
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "40px",
    fontWeight: 500,
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "background 0.2s",
    boxShadow: `0 2px 4px ${theme.primary}40`,
  },
  buttonSecondary: {
    background: "#fff",
    border: `1px solid ${theme.border}`,
    color: theme.textPrimary,
    padding: "8px 16px",
    borderRadius: "40px",
    fontWeight: 500,
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  buttonDanger: {
    background: "#fee2e2",
    border: `1px solid #fecaca`,
    color: theme.danger,
    padding: "8px 16px",
    borderRadius: "40px",
    fontWeight: 500,
    fontSize: "0.9rem",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "20px",
    marginTop: "20px",
  },
  card: {
    background: theme.cardBg,
    borderRadius: "16px",
    border: `1px solid ${theme.border}`,
    boxShadow: theme.shadow,
    overflow: "hidden",
    transition: "transform 0.2s, boxShadow 0.2s",
    cursor: "pointer",
  },
  cardHeader: {
    padding: "20px",
    borderBottom: `1px solid ${theme.border}`,
    background: theme.grayBg,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: theme.primaryLight,
    color: theme.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: "1.2rem",
  },
  cardContent: {
    padding: "20px",
  },
  cardStats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "16px",
  },
  statItem: {
    background: theme.grayBg,
    borderRadius: "12px",
    padding: "12px",
    textAlign: "center" as const,
  },
  statValue: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: theme.textPrimary,
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: "0.75rem",
    color: theme.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  expertiseTag: {
    background: theme.primaryLight,
    color: theme.primaryDark,
    padding: "4px 10px",
    borderRadius: "40px",
    fontSize: "0.8rem",
    fontWeight: 500,
  },
  statusBadge: (active: boolean, suspended: boolean) => ({
    background: suspended ? "#fee2e2" : (active ? theme.primaryLight : "#f3f4f6"),
    color: suspended ? theme.danger : (active ? theme.primary : theme.textSecondary),
    padding: "4px 12px",
    borderRadius: "40px",
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  }),
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px",
  },
  modalContent: {
    background: theme.cardBg,
    borderRadius: "24px",
    maxWidth: "600px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto" as const,
    boxShadow: theme.shadowLg,
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: `1px solid ${theme.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`,
    color: "#fff",
    borderTopLeftRadius: "24px",
    borderTopRightRadius: "24px",
  },
  modalBody: {
    padding: "24px",
  },
  modalFooter: {
    padding: "20px 24px",
    borderTop: `1px solid ${theme.border}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  pagination: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    marginTop: "24px",
    flexWrap: "wrap" as const,
  },
  pageButton: (active: boolean) => ({
    padding: "8px 14px",
    borderRadius: "10px",
    border: `1px solid ${theme.border}`,
    background: active ? theme.primary : "#fff",
    color: active ? "#fff" : theme.textPrimary,
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
    transition: "all 0.2s",
  }),
  rowsPerPage: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "auto",
  },
  reviewsPagination: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginTop: "16px",
  },
};

// ================= Component =================
const AllReviewers: FC = () => {
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expertiseFilter, setExpertiseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<Reviewer | null>(null);
  const [profileTab, setProfileTab] = useState<"profile" | "reviews">("profile");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReviewer, setNewReviewer] = useState({
    name: "",
    email: "",
    affiliation: "",
    expertise: "",
    bio: ""
  });
  const [assignModal, setAssignModal] = useState(false);
  const [assignReviewer, setAssignReviewer] = useState<Reviewer | null>(null);
  const [selectedManuscript, setSelectedManuscript] = useState("");
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loadingManuscripts, setLoadingManuscripts] = useState(false);

  // Pagination for main list
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10); // rows per page

  // Pagination for past reviews in modal
  const [reviewsPage, setReviewsPage] = useState(1);
  const reviewsPerPage = 5;

  const allExpertise = Array.from(
    new Set(reviewers.flatMap((r) => r.expertise))
  );

  // Fetch reviewers
  const fetchReviewers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        action: "listReviewers",
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append("search", search);
      if (expertiseFilter) params.append("expertise", expertiseFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`${API_BASE}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch reviewers");

      setReviewers(data.data);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, expertiseFilter, statusFilter]);

  useEffect(() => {
    fetchReviewers();
  }, [fetchReviewers]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  // Fetch manuscripts for assign modal
  const fetchManuscripts = async () => {
    setLoadingManuscripts(true);
    try {
      const res = await fetch(`${API_BASE}?action=listManuscripts`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch manuscripts");
      setManuscripts(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingManuscripts(false);
    }
  };

  const openAssignModal = (reviewer: Reviewer) => {
    setAssignReviewer(reviewer);
    setAssignModal(true);
    fetchManuscripts();
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newActive = currentStatus === "active" ? 0 : 1;
    const toastId = toast.loading("Updating status...");
    try {
      const res = await fetch(`${API_BASE}?action=updateReviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          active: newActive,
          suspended: newActive === 1 ? 0 : undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success("Status updated", { id: toastId });
      fetchReviewers();
      if (selected?.id === id) {
        fetchReviewerDetails(id);
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  const suspendReviewer = async (id: number, currentlySuspended: boolean) => {
    const toastId = toast.loading(currentlySuspended ? "Removing suspension..." : "Suspending...");
    try {
      const res = await fetch(`${API_BASE}?action=updateReviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          suspended: currentlySuspended ? 0 : 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(currentlySuspended ? "Suspension removed" : "Reviewer suspended", { id: toastId });
      fetchReviewers();
      if (selected?.id === id) {
        fetchReviewerDetails(id);
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  const fetchReviewerDetails = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}?action=getReviewer&id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch details");
      setSelected(data);
      setReviewsPage(1); // reset past reviews pagination
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddReviewer = async () => {
    if (!newReviewer.name || !newReviewer.email) {
      toast.error("Name and email are required");
      return;
    }
    const toastId = toast.loading("Registering reviewer...");
    try {
      const res = await fetch(`${API_BASE}?action=addReviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReviewer),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      toast.success("Reviewer registered", { id: toastId });
      setShowAddModal(false);
      setNewReviewer({ name: "", email: "", affiliation: "", expertise: "", bio: "" });
      fetchReviewers();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  const assignManuscriptToReviewer = async () => {
    if (!assignReviewer || !selectedManuscript) {
      toast.error("Please select a manuscript");
      return;
    }
    const toastId = toast.loading("Assigning manuscript...");
    try {
      const res = await fetch(`${API_BASE}?action=assignManuscript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewer_id: assignReviewer.id,
          manuscript_id: parseInt(selectedManuscript),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assignment failed");
      toast.success("Manuscript assigned", { id: toastId });
      setAssignModal(false);
      setAssignReviewer(null);
      setSelectedManuscript("");
      fetchReviewers();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  // Pagination for past reviews in modal
  const totalReviewsPages = selected ? Math.ceil(selected.pastReviews.length / reviewsPerPage) : 1;
  const paginatedReviews = selected
    ? selected.pastReviews.slice((reviewsPage - 1) * reviewsPerPage, reviewsPage * reviewsPerPage)
    : [];

  return (
    <div style={styles.container}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Users size={28} color={theme.primary} />
          All Reviewers {!loading && <span style={{ fontSize: "1rem", color: theme.textSecondary }}>({totalItems})</span>}
        </h1>
        <button style={styles.buttonPrimary} onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} />
          Register Reviewer
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filtersBar}>
        <input
          style={styles.input}
          placeholder="Search by name or email..."
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
        <select
          style={styles.select}
          value={expertiseFilter}
          onChange={(e) => {
            setExpertiseFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All expertise</option>
          {allExpertise.map((ex) => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>
        <select
          style={styles.select}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as any);
            setPage(1);
          }}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Rows per page selector */}
        <div style={styles.rowsPerPage}>
          <span style={{ fontSize: "0.9rem", color: theme.textSecondary }}>Show:</span>
          <select
            style={styles.select}
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        {loading && <Loader size={20} className="animate-spin" style={{ marginLeft: "auto", color: theme.primary }} />}
      </div>

      {/* Reviewer Cards Grid */}
      {error ? (
        <div style={{ textAlign: "center", padding: 40, color: theme.danger }}>{error}</div>
      ) : (
        <div style={styles.cardGrid}>
          {reviewers.map((r) => (
            <div
              key={r.id}
              style={styles.card}
              onClick={() => {
                fetchReviewerDetails(r.id);
                setProfileTab("profile");
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = theme.shadowLg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = theme.shadow;
              }}
            >
              <div style={styles.cardHeader}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={styles.cardAvatar}>
                    {r.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{r.name}</div>
                    <div style={{ fontSize: "0.85rem", color: theme.textSecondary, display: "flex", alignItems: "center", gap: "4px" }}>
                      <Mail size={12} /> {r.email}
                    </div>
                  </div>
                </div>
                <span style={styles.statusBadge(r.status === "active", r.suspended)}>
                  {r.suspended ? "Suspended" : r.status}
                </span>
              </div>

              <div style={styles.cardContent}>
                <div style={styles.cardStats}>
                  <div style={styles.statItem}>
                    <div style={styles.statValue}>{r.activeAssignments}</div>
                    <div style={styles.statLabel}>Active</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statValue}>{r.completedReviews}</div>
                    <div style={styles.statLabel}>Completed</div>
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "0.85rem", color: theme.textSecondary, marginBottom: "6px" }}>Expertise</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {r.expertise.slice(0, 3).map((ex) => (
                      <span key={ex} style={styles.expertiseTag}>{ex}</span>
                    ))}
                    {r.expertise.length > 3 && (
                      <span style={styles.expertiseTag}>+{r.expertise.length - 3}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                  <div style={{ fontSize: "0.85rem", color: theme.textSecondary }}>
                    <Building2 size={14} style={{ display: "inline", marginRight: 4 }} />
                    {r.affiliation || "No affiliation"}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      style={styles.buttonSecondary}
                      onClick={(e) => {
                        e.stopPropagation();
                        openAssignModal(r);
                      }}
                    >
                      <Award size={14} />
                      Assign
                    </button>
                    <button
                      style={r.status === "active" ? styles.buttonDanger : styles.buttonSecondary}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus(r.id, r.status);
                      }}
                    >
                      {r.status === "active" ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && reviewers.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 60, color: theme.textSecondary }}>
          <Users size={48} color={theme.border} />
          <p style={{ marginTop: 16 }}>No reviewers found. Try adjusting your filters.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            style={styles.pageButton(false)}
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            title="First page"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            style={styles.pageButton(false)}
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (page > 3) {
                pageNum = page - 3 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
            }
            if (pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                style={styles.pageButton(page === pageNum)}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            style={styles.pageButton(false)}
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight size={16} />
          </button>
          <button
            style={styles.pageButton(false)}
            onClick={() => handlePageChange(totalPages)}
            disabled={page === totalPages}
            title="Last page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      )}

      {/* Profile Modal */}
      {selected && (
        <div style={styles.modalOverlay} onClick={() => setSelected(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 20 }}>
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{selected.name}</h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.9 }}>{selected.email}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${theme.border}`, display: "flex", gap: "12px" }}>
              <button
                style={profileTab === "profile" ? styles.buttonPrimary : styles.buttonSecondary}
                onClick={() => setProfileTab("profile")}
              >
                Profile
              </button>
              <button
                style={profileTab === "reviews" ? styles.buttonPrimary : styles.buttonSecondary}
                onClick={() => setProfileTab("reviews")}
              >
                Past Reviews {selected.pastReviews.length > 0 && `(${selected.pastReviews.length})`}
              </button>
            </div>

            <div style={styles.modalBody}>
              {profileTab === "profile" ? (
                <>
                  <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                    <div style={{ flex: 1, background: theme.grayBg, borderRadius: "12px", padding: "16px" }}>
                      <div style={{ fontSize: "0.8rem", color: theme.textSecondary, textTransform: "uppercase" }}>Affiliation</div>
                      <div style={{ fontWeight: 500, marginTop: 4 }}>{selected.affiliation || "—"}</div>
                    </div>
                    <div style={{ flex: 1, background: theme.grayBg, borderRadius: "12px", padding: "16px" }}>
                      <div style={{ fontSize: "0.8rem", color: theme.textSecondary, textTransform: "uppercase" }}>Status</div>
                      <div style={{ marginTop: 4 }}>
                        <span style={styles.statusBadge(selected.status === "active", selected.suspended)}>
                          {selected.suspended ? "Suspended" : selected.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                    <div style={styles.statItem}>
                      <div style={styles.statValue}>{selected.activeAssignments}</div>
                      <div style={styles.statLabel}>Active Assignments</div>
                    </div>
                    <div style={styles.statItem}>
                      <div style={styles.statValue}>{selected.completedReviews}</div>
                      <div style={styles.statLabel}>Completed Reviews</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px" }}>Expertise</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {selected.expertise.map((ex) => (
                        <span key={ex} style={styles.expertiseTag}>{ex}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px" }}>Biography</div>
                    <div style={{ background: theme.grayBg, borderRadius: "12px", padding: "16px", lineHeight: 1.6 }}>
                      {selected.bio || "No biography provided."}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {paginatedReviews.length > 0 ? (
                      paginatedReviews.map((review, idx) => (
                        <div key={idx} style={{ border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "16px" }}>
                          <div style={{ fontWeight: 600 }}>{review.manuscriptTitle}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.9rem", color: theme.textSecondary }}>
                            <span>Decision: <span style={{ color: review.decision.toLowerCase().includes("accept") ? theme.success : theme.warning }}>{review.decision}</span></span>
                            <span><Calendar size={14} style={{ display: "inline", marginRight: 4 }} />{review.date}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px", color: theme.textSecondary }}>No past reviews.</div>
                    )}
                  </div>

                  {/* Past reviews pagination */}
                  {totalReviewsPages > 1 && (
                    <div style={styles.reviewsPagination}>
                      <button
                        style={styles.pageButton(false)}
                        onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
                        disabled={reviewsPage === 1}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontSize: "0.9rem", padding: "8px 0" }}>
                        {reviewsPage} / {totalReviewsPages}
                      </span>
                      <button
                        style={styles.pageButton(false)}
                        onClick={() => setReviewsPage(p => Math.min(totalReviewsPages, p + 1))}
                        disabled={reviewsPage === totalReviewsPages}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary} onClick={() => setSelected(null)}>Close</button>
              <button style={styles.buttonPrimary} onClick={() => openAssignModal(selected)}>Assign Manuscript</button>
              <button
                style={selected.suspended ? styles.buttonPrimary : styles.buttonDanger}
                onClick={() => suspendReviewer(selected.id, selected.suspended)}
              >
                {selected.suspended ? "Remove Suspension" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && assignReviewer && (
        <div style={styles.modalOverlay} onClick={() => setAssignModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Assign Manuscript</h3>
              <button onClick={() => setAssignModal(false)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ marginBottom: "16px" }}>Select a manuscript to assign to <strong>{assignReviewer.name}</strong></p>
              {loadingManuscripts ? (
                <div style={{ textAlign: "center", padding: "20px" }}><Loader className="animate-spin" /></div>
              ) : (
                <select
                  value={selectedManuscript}
                  onChange={(e) => setSelectedManuscript(e.target.value)}
                  style={{ ...styles.select, width: "100%", marginBottom: "20px" }}
                >
                  <option value="">Choose manuscript</option>
                  {manuscripts.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary} onClick={() => setAssignModal(false)}>Cancel</button>
              <button style={styles.buttonPrimary} onClick={assignManuscriptToReviewer} disabled={loadingManuscripts}>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Register New Reviewer</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <input style={styles.input} placeholder="Full name *" value={newReviewer.name} onChange={(e) => setNewReviewer({ ...newReviewer, name: e.target.value })} />
                <input style={styles.input} type="email" placeholder="Email *" value={newReviewer.email} onChange={(e) => setNewReviewer({ ...newReviewer, email: e.target.value })} />
                <input style={styles.input} placeholder="Affiliation" value={newReviewer.affiliation} onChange={(e) => setNewReviewer({ ...newReviewer, affiliation: e.target.value })} />
                <input style={styles.input} placeholder="Expertise (comma separated)" value={newReviewer.expertise} onChange={(e) => setNewReviewer({ ...newReviewer, expertise: e.target.value })} />
                <textarea style={{ ...styles.input, minHeight: "100px", resize: "vertical" }} placeholder="Bio" value={newReviewer.bio} onChange={(e) => setNewReviewer({ ...newReviewer, bio: e.target.value })} />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button style={styles.buttonPrimary} onClick={handleAddReviewer}>Register</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllReviewers;
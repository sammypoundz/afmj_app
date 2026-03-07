import { useState, useEffect, useCallback } from "react";
import type { FC } from "react";
import {
  Users, X, ShieldCheck, ShieldOff, Loader,
  Mail, Building2, Calendar, ChevronLeft, ChevronRight,
  UserPlus, ChevronsLeft, ChevronsRight, BookOpen
} from "lucide-react";
import debounce from "lodash/debounce";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = "https://afmjonline.com/api/EICUsersApi.php";

// ================= Types =================
interface PastAction {
  manuscriptTitle: string;
  action: string;
  date: string;
}

interface Editor {
  id: number;
  name: string;
  email: string;
  specialization: string[];
  affiliation: string;
  activeAssignments: number;
  completedActions: number;
  status: "active" | "inactive";
  bio: string;
  suspended: boolean;
  pastActions: PastAction[];
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
  buttonSuccess: {
    background: theme.primaryLight,
    border: `1px solid ${theme.primary}`,
    color: theme.primaryDark,
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
  specializationTag: {
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
  workloadBadge: (count: number) => ({
    background: count >= 3 ? "#fef3c7" : "#e0f2fe",
    color: count >= 3 ? "#92400e" : "#0369a1",
    padding: "2px 8px",
    borderRadius: "40px",
    fontSize: "0.7rem",
    fontWeight: 500,
    display: "inline-block",
    marginLeft: "8px",
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
  actionsPagination: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginTop: "16px",
  },
};

// ================= Component =================
const AllEditors: FC = () => {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selected, setSelected] = useState<Editor | null>(null);
  const [profileTab, setProfileTab] = useState<"profile" | "actions">("profile");
  const [assignModal, setAssignModal] = useState(false);
  const [assignEditor, setAssignEditor] = useState<Editor | null>(null);
  const [selectedManuscript, setSelectedManuscript] = useState("");
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loadingManuscripts, setLoadingManuscripts] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEditor, setNewEditor] = useState({
    name: "",
    email: "",
    affiliation: "",
    specialization: "",
    bio: ""
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  // Pagination for past actions in modal
  const [actionsPage, setActionsPage] = useState(1);
  const actionsPerPage = 5;

  const allSpecializations = Array.from(
    new Set(editors.flatMap((e) => e.specialization))
  );

  // Fetch editors
  const fetchEditors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        action: "listEditors",
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append("search", search);
      if (specializationFilter) params.append("specialization", specializationFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`${API_BASE}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch editors");

      setEditors(data.data);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, specializationFilter, statusFilter]);

  useEffect(() => {
    fetchEditors();
  }, [fetchEditors]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearch(value);
      setPage(1);
    }, 500),
    []
  );

  // Fetch manuscripts for assign modal (for editors)
  const fetchManuscripts = async () => {
    setLoadingManuscripts(true);
    try {
      const res = await fetch(`${API_BASE}?action=listManuscripts&for=editor`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch manuscripts");
      setManuscripts(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingManuscripts(false);
    }
  };

  const openAssignModal = (editor: Editor) => {
    setAssignEditor(editor);
    setAssignModal(true);
    fetchManuscripts();
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newActive = currentStatus === "active" ? 0 : 1;
    const toastId = toast.loading("Updating status...");
    try {
      const res = await fetch(`${API_BASE}?action=updateEditor`, {
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
      fetchEditors();
      if (selected?.id === id) {
        fetchEditorDetails(id);
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  const suspendEditor = async (id: number, currentlySuspended: boolean) => {
    const toastId = toast.loading(currentlySuspended ? "Removing suspension..." : "Suspending...");
    try {
      const res = await fetch(`${API_BASE}?action=updateEditor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          suspended: currentlySuspended ? 0 : 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(currentlySuspended ? "Suspension removed" : "Editor suspended", { id: toastId });
      fetchEditors();
      if (selected?.id === id) {
        fetchEditorDetails(id);
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  const fetchEditorDetails = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}?action=getEditor&id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch details");
      setSelected(data);
      setActionsPage(1);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddEditor = async () => {
    if (!newEditor.name || !newEditor.email) {
      toast.error("Name and email are required");
      return;
    }
    const toastId = toast.loading("Registering editor...");
    try {
      const res = await fetch(`${API_BASE}?action=addEditor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEditor),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      toast.success("Editor registered", { id: toastId });
      setShowAddModal(false);
      setNewEditor({ name: "", email: "", affiliation: "", specialization: "", bio: "" });
      fetchEditors();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  const assignManuscriptToEditor = async () => {
    if (!assignEditor || !selectedManuscript) {
      toast.error("Please select a manuscript");
      return;
    }
    const toastId = toast.loading("Assigning manuscript...");
    try {
      const res = await fetch(`${API_BASE}?action=assignManuscriptToEditor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editor_id: assignEditor.id,
          manuscript_id: parseInt(selectedManuscript),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assignment failed");
      toast.success("Manuscript assigned", { id: toastId });
      setAssignModal(false);
      setAssignEditor(null);
      setSelectedManuscript("");
      fetchEditors();
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

  // Pagination for past actions
  const totalActionsPages = selected ? Math.ceil(selected.pastActions.length / actionsPerPage) : 1;
  const paginatedActions = selected
    ? selected.pastActions.slice((actionsPage - 1) * actionsPerPage, actionsPage * actionsPerPage)
    : [];

  return (
    <div style={styles.container}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Users size={28} color={theme.primary} />
          Editors Management {!loading && <span style={{ fontSize: "1rem", color: theme.textSecondary }}>({totalItems})</span>}
        </h1>
        <button style={styles.buttonPrimary} onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} />
          Register Editor
        </button>
      </div>

      {/* Filters */}
      <div style={styles.filtersBar}>
        <input
          style={styles.input}
          placeholder="Search editor by name or email..."
          defaultValue={search}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
        <select
          style={styles.select}
          value={specializationFilter}
          onChange={(e) => {
            setSpecializationFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All subject areas</option>
          {allSpecializations.map((sp) => (
            <option key={sp} value={sp}>{sp}</option>
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

        {/* Rows per page */}
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

      {/* Cards Grid */}
      {error ? (
        <div style={{ textAlign: "center", padding: 40, color: theme.danger }}>{error}</div>
      ) : (
        <div style={styles.cardGrid}>
          {editors.map((editor) => (
            <div
              key={editor.id}
              style={styles.card}
              onClick={() => {
                fetchEditorDetails(editor.id);
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
                    {editor.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{editor.name}</div>
                    <div style={{ fontSize: "0.85rem", color: theme.textSecondary, display: "flex", alignItems: "center", gap: "4px" }}>
                      <Mail size={12} /> {editor.email}
                    </div>
                  </div>
                </div>
                <span style={styles.statusBadge(editor.status === "active", editor.suspended)}>
                  {editor.suspended ? "Suspended" : editor.status}
                </span>
              </div>

              <div style={styles.cardContent}>
                <div style={styles.cardStats}>
                  <div style={styles.statItem}>
                    <div style={styles.statValue}>{editor.activeAssignments}</div>
                    <div style={styles.statLabel}>Active</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={styles.statValue}>{editor.completedActions}</div>
                    <div style={styles.statLabel}>Completed</div>
                  </div>
                </div>

                {editor.activeAssignments >= 3 && !editor.suspended && (
                  <div style={{ marginBottom: "12px" }}>
                    <span style={styles.workloadBadge(editor.activeAssignments)}>
                      High workload ({editor.activeAssignments} manuscripts)
                    </span>
                  </div>
                )}

                <div style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "0.85rem", color: theme.textSecondary, marginBottom: "6px" }}>Subject areas</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {editor.specialization.slice(0, 3).map((sp) => (
                      <span key={sp} style={styles.specializationTag}>{sp}</span>
                    ))}
                    {editor.specialization.length > 3 && (
                      <span style={styles.specializationTag}>+{editor.specialization.length - 3}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
                  <div style={{ fontSize: "0.85rem", color: theme.textSecondary }}>
                    <Building2 size={14} style={{ display: "inline", marginRight: 4 }} />
                    {editor.affiliation || "No affiliation"}
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      style={styles.buttonSecondary}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        openAssignModal(editor);
                      }}
                    >
                      <BookOpen size={14} />
                      Assign
                    </button>
                    <button
                      style={editor.status === "active" ? styles.buttonDanger : styles.buttonSecondary}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        toggleStatus(editor.id, editor.status);
                      }}
                    >
                      {editor.status === "active" ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && editors.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: 60, color: theme.textSecondary }}>
          <Users size={48} color={theme.border} />
          <p style={{ marginTop: 16 }}>No editors found. Try adjusting your filters.</p>
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

            {/* Actions Bar */}
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${theme.border}`, display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button style={styles.buttonSuccess} onClick={() => openAssignModal(selected)}>
                <BookOpen size={16} />
                Assign manuscript
              </button>
              <button style={selected.suspended ? styles.buttonPrimary : styles.buttonDanger} onClick={() => suspendEditor(selected.id, selected.suspended)}>
                {selected.suspended ? "Remove suspension" : "Suspend"}
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "6px", padding: "10px 14px" }}>
              <button
                style={profileTab === "profile" ? styles.buttonPrimary : styles.buttonSecondary}
                onClick={() => setProfileTab("profile")}
              >
                Editor Profile
              </button>
              <button
                style={profileTab === "actions" ? styles.buttonPrimary : styles.buttonSecondary}
                onClick={() => setProfileTab("actions")}
              >
                Editorial History {selected.pastActions.length > 0 && `(${selected.pastActions.length})`}
              </button>
            </div>

            {/* Body */}
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
                      <div style={styles.statLabel}>Manuscripts in handling</div>
                    </div>
                    <div style={styles.statItem}>
                      <div style={styles.statValue}>{selected.completedActions}</div>
                      <div style={styles.statLabel}>Editorial actions</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "8px" }}>Subject areas</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {selected.specialization.map((sp) => (
                        <span key={sp} style={styles.specializationTag}>{sp}</span>
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
                    {paginatedActions.length > 0 ? (
                      paginatedActions.map((action, idx) => (
                        <div key={idx} style={{ border: `1px solid ${theme.border}`, borderRadius: "12px", padding: "16px" }}>
                          <div style={{ fontWeight: 600 }}>{action.manuscriptTitle}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "0.9rem", color: theme.textSecondary }}>
                            <span>
                              Action: <span style={{
                                color: action.action === "Accepted" ? theme.success : 
                                      action.action === "Rejected" ? theme.danger : theme.warning
                              }}>{action.action}</span>
                            </span>
                            <span><Calendar size={14} style={{ display: "inline", marginRight: 4 }} />{action.date}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: "center", padding: "40px", color: theme.textSecondary }}>No editorial history.</div>
                    )}
                  </div>

                  {/* Past actions pagination */}
                  {totalActionsPages > 1 && (
                    <div style={styles.actionsPagination}>
                      <button
                        style={styles.pageButton(false)}
                        onClick={() => setActionsPage(p => Math.max(1, p - 1))}
                        disabled={actionsPage === 1}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontSize: "0.9rem", padding: "8px 0" }}>
                        {actionsPage} / {totalActionsPages}
                      </span>
                      <button
                        style={styles.pageButton(false)}
                        onClick={() => setActionsPage(p => Math.min(totalActionsPages, p + 1))}
                        disabled={actionsPage === totalActionsPages}
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
            </div>
          </div>
        </div>
      )}

      {/* Assign Manuscript Modal */}
      {assignModal && assignEditor && (
        <div style={styles.modalOverlay} onClick={() => setAssignModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Assign Manuscript to Editor</h3>
              <button onClick={() => setAssignModal(false)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={{ marginBottom: "16px" }}>Select a manuscript to assign to <strong>{assignEditor.name}</strong></p>
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
              <button style={styles.buttonPrimary} onClick={assignManuscriptToEditor} disabled={loadingManuscripts}>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Editor Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Register New Editor</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <input style={styles.input} placeholder="Full name *" value={newEditor.name} onChange={(e) => setNewEditor({ ...newEditor, name: e.target.value })} />
                <input style={styles.input} type="email" placeholder="Email *" value={newEditor.email} onChange={(e) => setNewEditor({ ...newEditor, email: e.target.value })} />
                <input style={styles.input} placeholder="Affiliation" value={newEditor.affiliation} onChange={(e) => setNewEditor({ ...newEditor, affiliation: e.target.value })} />
                <input style={styles.input} placeholder="Subject areas (comma separated)" value={newEditor.specialization} onChange={(e) => setNewEditor({ ...newEditor, specialization: e.target.value })} />
                <textarea style={{ ...styles.input, minHeight: "100px", resize: "vertical" }} placeholder="Biography" value={newEditor.bio} onChange={(e) => setNewEditor({ ...newEditor, bio: e.target.value })} />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button style={styles.buttonPrimary} onClick={handleAddEditor}>Register</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllEditors;
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  BookOpen,
  Plus,
  List,
  Reply,
  Eye,
  AlertCircle,
  CreditCard,
  FileCheck,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

const API_BASE = "https://vinosschool.com/api/authorApi.php";
const DOWNLOAD_API = "https://vinosschool.com/api/download.php";

interface DashboardStats {
  totalSubmissions: number;
  underReview: number;
  revisionsRequired: number;
  accepted: number;
  rejected: number;
  published: number;
}

interface ActiveManuscript {
  id: number;
  manuscriptId: string;
  title: string;
  status: string;
  submittedAt: string;
  hasPendingRevision: boolean;
}

interface PendingAction {
  id: number;
  manuscriptId: string;
  title: string;
  actionType: "galley" | "payment";
  galleyProofStatus?: string;
  galleyProofFile?: string | null;
  galleyProofComment?: string | null;
  galleyAuthorResponse?: string | null;
  galleyFinalFile?: string | null;
  paymentAmount?: number | null;
  paymentAmountUsd?: number | null;
  paymentStatus?: string;
  paymentInstructions?: string | null;
  paymentProof?: string | null;
}

const styles = {
  page: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: "24px",
  },
  pendingSection: {
    marginBottom: "28px",
  },
  pendingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "16px",
  },
  pendingCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  pendingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  actionBadge: (type: "galley" | "payment") => ({
    background: type === "galley" ? "#dbeafe" : "#fef3c7",
    color: type === "galley" ? "#1e40af" : "#92400e",
    padding: "4px 10px",
    borderRadius: "40px",
    fontSize: "0.75rem",
    fontWeight: 600,
  }),
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: "16px",
  },
  modalContent: {
    background: "#fff",
    borderRadius: "16px",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto" as const,
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  modalHeader: (type: "galley" | "payment") => ({
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
    background: type === "galley" ? "#dbeafe" : "#fef3c7",
    borderTopLeftRadius: "16px",
    borderTopRightRadius: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }),
  modalBody: {
    padding: "24px",
  },
  modalFooter: {
    padding: "20px 24px",
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  buttonPrimary: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "40px",
    fontWeight: 500,
    cursor: "pointer",
  },
  buttonSecondary: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    padding: "10px 20px",
    borderRadius: "40px",
    fontWeight: 500,
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    marginBottom: "28px",
  },
  kpiCard: {
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
    transition: "all 0.2s",
    cursor: "pointer",
    textDecoration: "none",
    display: "block",
  },
  kpiHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  kpiIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: "14px",
    background: "#16a34a15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#16a34a",
  },
  kpiValue: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
    lineHeight: 1.2,
  },
  kpiLabel: {
    fontSize: "0.9rem",
    color: "#64748b",
    margin: 0,
  },
  actionsPanel: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  sectionTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: "16px",
  },
  listItem: {
    display: "flex",
    flexWrap: "wrap" as const,
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
  },
  manuscriptId: {
    fontFamily: "monospace",
    fontSize: "0.9rem",
    color: "#16a34a",
    fontWeight: 600,
  },
  manuscriptTitle: {
    fontSize: "0.9rem",
    color: "#1e293b",
    margin: "2px 0",
  },
  badge: (type: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      success: { bg: "#dcfce7", text: "#16a34a" },
      warning: { bg: "#fef9c3", text: "#eab308" },
      info: { bg: "#dbeafe", text: "#2563eb" },
      danger: { bg: "#fee2e2", text: "#dc2626" },
    };
    const color = colors[type] || { bg: "#e2e8f0", text: "#475569" };
    return {
      background: color.bg,
      color: color.text,
      padding: "4px 12px",
      borderRadius: "40px",
      fontSize: "0.8rem",
      fontWeight: 500,
    };
  },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    borderTop: "1px solid #e5e7eb",
    marginTop: "16px",
  },
  paginationButton: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  paginationButtonDisabled: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    background: "#f3f4f6",
    color: "#9ca3af",
    cursor: "not-allowed",
  },
  pageNumber: (active: boolean) => ({
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid",
    borderColor: active ? "#0d6efd" : "#d1d5db",
    background: active ? "#0d6efd" : "#fff",
    color: active ? "#fff" : "#374151",
    cursor: "pointer",
    minWidth: "36px",
  }),
};

// Helper: convert plain text with URLs into clickable links
const formatWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#16a34a", textDecoration: "underline" }}>
        {part}
      </a>
    ) : (
      part
    )
  );
};

const responsiveStyles = `
  @media (max-width: 768px) {
    .author-dashboard { padding: 16px !important; }
    .dashboard-title { font-size: 1.5rem !important; margin-bottom: 16px !important; }
    .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
    .kpi-card { padding: 16px !important; }
    .kpi-value { font-size: 1.5rem !important; }
    .kpi-label { font-size: 0.8rem !important; }
    .kpi-icon-wrapper { width: 40px !important; height: 40px !important; }
    .pending-grid { gap: 12px !important; }
    .action-buttons { flex-wrap: wrap !important; gap: 8px !important; }
    .action-buttons button { width: 100% !important; justify-content: center !important; }
    .manuscript-list-item { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
    .manuscript-list-item > div:first-child { width: 100% !important; }
    .manuscript-list-item button { align-self: flex-end !important; }
  }
  @media (max-width: 480px) {
    .kpi-grid { grid-template-columns: 1fr !important; }
    .pending-grid { grid-template-columns: 1fr !important; }
    .action-buttons button { padding: 8px 12px !important; font-size: 0.9rem !important; }
    .section-title { font-size: 1rem !important; }
  }
`;

const AuthorDashboard = () => {
  const navigate = useNavigate();
  const { authFetch, sessionId } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [manuscripts, setManuscripts] = useState<ActiveManuscript[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null);
  const [galleyComment, setGalleyComment] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);

  // Pagination state for Active Manuscripts
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const handleUnauthorized = () => {
    toast.error("Session expired. Please log in again.");
    navigate("/login");
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const [statsRes, manuscriptsRes, pendingRes] = await Promise.all([
          authFetch(`${API_BASE}?action=getDashboardStats`),
          authFetch(`${API_BASE}?action=getActiveManuscripts`),
          authFetch(`${API_BASE}?action=getPendingPrePublicationActions`),
        ]);

        if (statsRes.status === 401 || manuscriptsRes.status === 401 || pendingRes.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!statsRes.ok || !manuscriptsRes.ok || !pendingRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const statsData = await statsRes.json();
        const manuscriptsData = await manuscriptsRes.json();
        const pendingData = await pendingRes.json();

        setStats(statsData);
        setManuscripts(manuscriptsData);
        setPendingActions(pendingData);
      } catch (err) {
        console.error("Error fetching dashboard:", err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [authFetch, sessionId, navigate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [manuscripts]);

  const handleOpenManuscript = (id: number) => navigate(`/eic/author/manuscript/${id}`);

  const getStatusBadge = (status: string, hasPendingRevision: boolean) => {
    if (hasPendingRevision) {
      return <span style={styles.badge("warning")}>Revision Pending</span>;
    }
    switch (status) {
      case "submitted":
        return <span style={styles.badge("info")}>Submitted</span>;
      case "under_review":
        return <span style={styles.badge("success")}>Under Review</span>;
      case "accepted":
        return <span style={styles.badge("success")}>Accepted</span>;
      case "rejected":
        return <span style={styles.badge("danger")}>Rejected</span>;
      case "published":
        return <span style={styles.badge("success")}>Published</span>;
      default:
        return <span style={styles.badge("info")}>{status}</span>;
    }
  };

  const openActionModal = (action: PendingAction) => {
    setSelectedAction(action);
    setModalOpen(true);
    setGalleyComment("");
    setSelectedFile(null);
    setPaymentProofFile(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedAction(null);
    setGalleyComment("");
    setSelectedFile(null);
    setPaymentProofFile(null);
  };

  const downloadFile = async (fileUrl: string | null | undefined, fileName: string) => {
    if (!fileUrl) {
      toast.error("No file available to download");
      return;
    }
    const toastId = toast.loading("Downloading file...");
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(fileUrl)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      let extension = "";
      const parts = fileUrl.split(".");
      if (parts.length > 1) {
        extension = parts.pop() || "";
        if (extension.includes("?")) extension = extension.split("?")[0];
      }
      const fullFileName = `${fileName}${extension ? "." + extension : ""}`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fullFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success("File downloaded successfully", { id: toastId });
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download file", { id: toastId });
    }
  };

  const handleGalleyProofSubmit = async () => {
    if (!selectedAction) return;

    if (!galleyComment.trim() && !selectedFile) {
      toast.error("Please provide a response or upload a file");
      return;
    }

    setProcessing(true);
    const toastId = toast.loading("Submitting...");

    const formData = new FormData();
    formData.append("manuscript_id", selectedAction.id.toString());
    formData.append("action", "reject");
    formData.append("comment", galleyComment);
    if (selectedFile) {
      formData.append("final_file", selectedFile);
    }

    try {
      const res = await authFetch(`${API_BASE}?action=updateGalleyProof`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error(result.error || "Submission failed");
      }

      toast.success("Your response has been submitted. The editorial team will review it.", { id: toastId });

      const pendingRes = await authFetch(`${API_BASE}?action=getPendingPrePublicationActions`);
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingActions(pendingData);
      } else if (pendingRes.status === 401) {
        handleUnauthorized();
      }

      closeModal();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentMade = async () => {
    if (!selectedAction) return;
    setProcessing(true);
    const toastId = toast.loading("Notifying admin...");

    const formData = new FormData();
    formData.append("manuscript_id", selectedAction.id.toString());
    if (paymentProofFile) {
      formData.append("payment_proof", paymentProofFile);
    }

    try {
      const res = await authFetch(`${API_BASE}?action=notifyPaymentMade`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        throw new Error(result.error || "Failed to notify admin");
      }
      toast.success("Thank you! The editorial team has been notified.", { id: toastId });
      closeModal();

      const pendingRes = await authFetch(`${API_BASE}?action=getPendingPrePublicationActions`);
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingActions(pendingData);
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  // Pagination calculations
  const totalManuscripts = manuscripts.length;
  const totalPages = Math.ceil(totalManuscripts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentManuscripts = manuscripts.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div className="author-dashboard" style={styles.page}>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
        <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
          <div style={{ width: 40, height: 40, border: "4px solid #16a34a20", borderTop: "4px solid #16a34a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  // Routes exactly matching the sidebar's manuscript paths
  const kpiData = [
    { icon: FileText, label: "Total Submissions", value: stats?.totalSubmissions ?? 0, path: "/eic/manuscripts/new-submissions" },
    { icon: Clock, label: "Under Review", value: stats?.underReview ?? 0, path: "/eic/manuscripts/under-review" },
    { icon: RefreshCcw, label: "Revisions Required", value: stats?.revisionsRequired ?? 0, path: "/eic/manuscripts/revision-requested" },
    { icon: CheckCircle2, label: "Accepted", value: stats?.accepted ?? 0, path: "/eic/manuscripts/accepted" },
    { icon: XCircle, label: "Rejected", value: stats?.rejected ?? 0, path: "/eic/manuscripts/rejected" },
    { icon: BookOpen, label: "Published", value: stats?.published ?? 0, path: "/eic/manuscripts/published" },
  ];

  return (
    <>
      <style>{responsiveStyles}</style>
      <div className="author-dashboard" style={styles.page}>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

        <h1 className="dashboard-title" style={styles.title}>Author Dashboard</h1>

        {/* Pending Pre‑Publication Actions */}
        {pendingActions.length > 0 && (
          <div style={styles.pendingSection}>
            <h3 className="section-title" style={styles.sectionTitle}>Actions Required</h3>
            <div className="pending-grid" style={styles.pendingGrid}>
              {pendingActions.map((action) => (
                <div
                  key={`${action.actionType}-${action.id}`}
                  style={styles.pendingCard}
                  onClick={() => openActionModal(action)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#16a34a";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
                  }}
                >
                  <div style={styles.pendingHeader}>
                    <span style={styles.actionBadge(action.actionType)}>
                      {action.actionType === "galley" ? "📄 Galley Proof" : "💰 Payment"}
                    </span>
                    <AlertCircle size={18} color="#f59e0b" />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "1rem", color: "#0f172a" }}>
                    {action.title}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                    {action.manuscriptId}
                  </div>
                  {action.actionType === "payment" && action.paymentAmount && (
                    <div style={{ marginTop: "8px", fontWeight: 600, color: "#16a34a" }}>
                      Amount: ₦{action.paymentAmount}
                      {action.paymentAmountUsd && (
                        <span style={{ fontSize: "0.75rem", marginLeft: "8px", color: "#64748b", fontWeight: 400 }}>
                          (~${action.paymentAmountUsd} USD)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="kpi-grid" style={styles.kpiGrid}>
          {kpiData.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={index}
                to={kpi.path}
                className="kpi-card"
                style={{
                  ...styles.kpiCard,
                  ...(hoveredKpi === index ? {
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.1)",
                    borderColor: "#16a34a",
                  } : {}),
                }}
                onMouseEnter={() => setHoveredKpi(index)}
                onMouseLeave={() => setHoveredKpi(null)}
              >
                <div style={styles.kpiHeader}>
                  <div className="kpi-icon-wrapper" style={styles.kpiIconWrapper}>
                    <Icon size={24} />
                  </div>
                </div>
                <h3 className="kpi-value" style={styles.kpiValue}>{kpi.value}</h3>
                <p className="kpi-label" style={styles.kpiLabel}>{kpi.label}</p>
              </Link>
            );
          })}
        </div>

        {/* Author Actions – keeping as is, but they may need EIC versions if used */}
        <div style={styles.actionsPanel}>
          <div className="section-title" style={styles.sectionTitle}>Author Actions</div>
          <div className="action-buttons" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/eic/submit" style={{ ...styles.buttonPrimary, display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <Plus size={16} />
              New Submission
            </Link>
            <Link to="/eic/submissions" style={{ ...styles.buttonSecondary, display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <List size={16} />
              View Submissions
            </Link>
            <Link to="/eic/revisions" style={{ ...styles.buttonSecondary, display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <Reply size={16} />
              Respond to Revision
            </Link>
          </div>
        </div>

        {/* Active Manuscripts with Pagination */}
        <div style={styles.actionsPanel}>
          <div className="section-title" style={styles.sectionTitle}>Active Manuscripts</div>
          {totalManuscripts === 0 ? (
            <p style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>
              No active manuscripts.
            </p>
          ) : (
            <>
              {currentManuscripts.map((man) => (
                <div key={man.id} className="manuscript-list-item" style={styles.listItem}>
                  <div>
                    <div style={styles.manuscriptId}>{man.manuscriptId}</div>
                    <div style={styles.manuscriptTitle}>{man.title}</div>
                  </div>
                  {getStatusBadge(man.status, man.hasPendingRevision)}
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {new Date(man.submittedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <button
                    className="btn-outline"
                    style={{ ...styles.buttonSecondary, display: "flex", alignItems: "center", gap: 6 }}
                    onClick={() => handleOpenManuscript(man.id)}
                  >
                    <Eye size={14} />
                    Open
                  </button>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={styles.pagination}>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    Showing {startIndex + 1} to {Math.min(endIndex, totalManuscripts)} of {totalManuscripts} entries
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={currentPage === 1 ? styles.paginationButtonDisabled : styles.paginationButton}
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          style={styles.pageNumber(currentPage === page)}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={currentPage === totalPages ? styles.paginationButtonDisabled : styles.paginationButton}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Modal */}
        {modalOpen && selectedAction && (
          <div style={styles.modalOverlay} onClick={closeModal}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader(selectedAction.actionType)}>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  {selectedAction.actionType === "galley" ? <FileCheck size={20} /> : <CreditCard size={20} />}
                  {selectedAction.actionType === "galley" ? "Galley Proof Review" : "Payment Required"}
                </h3>
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>

              <div style={styles.modalBody}>
                <p><strong>Manuscript:</strong> {selectedAction.title}</p>
                <p><strong>ID:</strong> {selectedAction.manuscriptId}</p>

                {selectedAction.actionType === "galley" ? (
                  <>
                    <p><strong>Galley Proof File:</strong></p>
                    {selectedAction.galleyProofFile ? (
                      <button
                        style={{ ...styles.buttonSecondary, marginBottom: "12px" }}
                        onClick={() => downloadFile(selectedAction.galleyProofFile, `GalleyProof_${selectedAction.manuscriptId}`)}
                      >
                        <Download size={16} style={{ marginRight: 6 }} />
                        Download Galley Proof
                      </button>
                    ) : (
                      <p>No file available</p>
                    )}
                    {selectedAction.galleyProofComment && (
                      <>
                        <p><strong>Editor's Comment:</strong></p>
                        <p style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px" }}>
                          {selectedAction.galleyProofComment}
                        </p>
                      </>
                    )}

                    {/* Show author's previous response if any */}
                    {selectedAction.galleyAuthorResponse && (
                      <>
                        <p><strong>Your Previous Response:</strong></p>
                        <p style={{ background: "#e6f7e6", padding: "12px", borderRadius: "8px" }}>
                          {selectedAction.galleyAuthorResponse}
                        </p>
                      </>
                    )}
                    {selectedAction.galleyFinalFile && (
                      <>
                        <p><strong>Your Previously Uploaded File:</strong></p>
                        <button
                          style={{ ...styles.buttonSecondary, marginBottom: "12px" }}
                          onClick={() => downloadFile(selectedAction.galleyFinalFile, `FinalFile_${selectedAction.manuscriptId}`)}
                        >
                          <Download size={16} style={{ marginRight: 6 }} />
                          Download Your Final File
                        </button>
                      </>
                    )}

                    <div style={{ marginTop: "20px" }}>
                      <label style={{ fontWeight: 500, display: "block", marginBottom: "8px" }}>
                        Your Response / Comments :
                      </label>
                      <textarea
                        value={galleyComment}
                        onChange={(e) => setGalleyComment(e.target.value)}
                        placeholder="Add your response or any changes made..."
                        rows={4}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          fontSize: "0.95rem",
                          resize: "vertical",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>

                    <div style={{ marginTop: "20px" }}>
                      <label style={{ fontWeight: 500, display: "block", marginBottom: "8px" }}>
                        Upload Itemized Corrections/Comments:
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        style={{ marginBottom: "8px" }}
                      />
                      {selectedFile && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "8px", borderRadius: "8px" }}>
                          <FileText size={16} />
                          <span>{selectedFile.name}</span>
                          <button
                            onClick={() => setSelectedFile(null)}
                            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <p><strong>Amount Due:</strong> ₦{selectedAction.paymentAmount}</p>
                    {selectedAction.paymentAmountUsd && (
                      <p><strong>Amount (USD):</strong> ${selectedAction.paymentAmountUsd}</p>
                    )}
                    <p><strong>Status:</strong> {selectedAction.paymentStatus}</p>
                    
                    {selectedAction.paymentInstructions && (
                      <>
                        <p><strong>Payment Instructions:</strong></p>
                        <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", whiteSpace: "pre-wrap" }}>
                          {formatWithLinks(selectedAction.paymentInstructions)}
                        </div>
                      </>
                    )}

                    {/* Show existing payment proof if any */}
                    {selectedAction.paymentProof && (
                      <>
                        <p><strong>Your Uploaded Payment Proof:</strong></p>
                        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                          <button
                            style={{ ...styles.buttonSecondary, display: "flex", alignItems: "center", gap: "6px" }}
                            onClick={() => downloadFile(selectedAction.paymentProof, `payment_proof_${selectedAction.manuscriptId}`)}
                          >
                            <Download size={16} /> Download Proof
                          </button>
                        </div>
                      </>
                    )}

                    <div style={{ marginTop: "20px" }}>
                      <label style={{ fontWeight: 500, display: "block", marginBottom: "8px" }}>
                        Upload Payment Proof (receipt/screenshot):
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                        style={{ marginBottom: "8px" }}
                      />
                      {paymentProofFile && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "8px", borderRadius: "8px" }}>
                          <FileText size={16} />
                          <span>{paymentProofFile.name}</span>
                          <button
                            onClick={() => setPaymentProofFile(null)}
                            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    <p style={{ marginTop: 16 }}>
                      After completing the payment, upload proof and click the button below to notify the editorial team.
                    </p>
                  </>
                )}
              </div>

              <div style={styles.modalFooter}>
                <button style={styles.buttonSecondary} onClick={closeModal} disabled={processing}>
                  Cancel
                </button>
                {selectedAction.actionType === "galley" ? (
                  <button
                    style={styles.buttonPrimary}
                    onClick={handleGalleyProofSubmit}
                    disabled={processing}
                  >
                    {processing ? "Submitting..." : <><Upload size={16} style={{ marginRight: 6 }} /> Submit Response</>}
                  </button>
                ) : (
                  <button
                    style={styles.buttonPrimary}
                    onClick={handlePaymentMade}
                    disabled={processing}
                  >
                    {processing ? "Notifying..." : "Payment Made"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AuthorDashboard;
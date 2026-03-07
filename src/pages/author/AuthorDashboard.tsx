import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = "https://afmjonline.com/api/authorApi.php";

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
  paymentAmount?: number | null;
  paymentStatus?: string;
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
  // Redesigned KPI section
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
    cursor: "pointer", // optional: make cards clickable
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
  // Keep existing styles for other sections
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
};

const AuthorDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [manuscripts, setManuscripts] = useState<ActiveManuscript[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [hoveredKpi, setHoveredKpi] = useState<number | null>(null); // optional hover index

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, manuscriptsRes, pendingRes] = await Promise.all([
          fetch(`${API_BASE}?action=getDashboardStats`),
          fetch(`${API_BASE}?action=getActiveManuscripts`),
          fetch(`${API_BASE}?action=getPendingPrePublicationActions`),
        ]);

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
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleNewSubmission = () => navigate("/author/submit");
  const handleViewSubmissions = () => navigate("/author/submissions");
  const handleRespondRevision = () => navigate("/author/revisions");
  const handleOpenManuscript = (id: number) => navigate(`/author/manuscript/${id}`);

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
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedAction(null);
  };

  const handleGalleyProofAction = async (action: "approve" | "reject") => {
    if (!selectedAction) return;
    setProcessing(true);
    const toastId = toast.loading("Processing...");

    try {
      // Simulate API call – you need to implement a new endpoint like "updateGalleyProof"
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(`Galley proof ${action === "approve" ? "approved" : "rejected"} successfully`, { id: toastId });
      closeModal();
      // Refresh pending actions
      const res = await fetch(`${API_BASE}?action=getPendingPrePublicationActions`);
      if (res.ok) {
        const data = await res.json();
        setPendingActions(data);
      }
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedAction) return;
    // For now, just show a message; you can integrate a payment gateway later
    toast.success("Redirecting to payment gateway...");
    closeModal();
  };

  const downloadFile = (url: string | null | undefined) => {
    if (url) window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
        <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
          <div style={{ width: 40, height: 40, border: "4px solid #16a34a20", borderTop: "4px solid #16a34a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  // KPI data array for mapping
  const kpiData = [
    { icon: FileText, label: "Total Submissions", value: stats?.totalSubmissions ?? 0 },
    { icon: Clock, label: "Under Review", value: stats?.underReview ?? 0 },
    { icon: RefreshCcw, label: "Revisions Required", value: stats?.revisionsRequired ?? 0 },
    { icon: CheckCircle2, label: "Accepted", value: stats?.accepted ?? 0 },
    { icon: XCircle, label: "Rejected", value: stats?.rejected ?? 0 },
    { icon: BookOpen, label: "Published", value: stats?.published ?? 0 },
  ];

  return (
    <div style={styles.page}>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <h1 style={styles.title}>Author Dashboard</h1>

      {/* Pending Pre‑Publication Actions */}
      {pendingActions.length > 0 && (
        <div style={styles.pendingSection}>
          <h3 style={styles.sectionTitle}>Actions Required</h3>
          <div style={styles.pendingGrid}>
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
                    Amount: ${action.paymentAmount}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Redesigned KPI Cards (3 per row) */}
      <div style={styles.kpiGrid}>
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={index}
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
              onClick={() => {
                // Optionally navigate to relevant section when card clicked
                if (kpi.label === "Total Submissions") navigate("/author/submissions");
                else if (kpi.label === "Under Review") navigate("/author/submissions?filter=under_review");
                else if (kpi.label === "Revisions Required") navigate("/author/revisions");
                else if (kpi.label === "Accepted") navigate("/author/submissions?filter=accepted");
                else if (kpi.label === "Rejected") navigate("/author/submissions?filter=rejected");
                else if (kpi.label === "Published") navigate("/author/published");
              }}
            >
              <div style={styles.kpiHeader}>
                <div style={styles.kpiIconWrapper}>
                  <Icon size={24} />
                </div>
                {/* Optional: add a small trend indicator here */}
              </div>
              <h3 style={styles.kpiValue}>{kpi.value}</h3>
              <p style={styles.kpiLabel}>{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={styles.actionsPanel}>
        <div style={styles.sectionTitle}>Author Actions</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn-primary" style={btnRow} onClick={handleNewSubmission}>
            <Plus size={16} />
            New Submission
          </button>
          <button className="btn-outline" style={btnRow} onClick={handleViewSubmissions}>
            <List size={16} />
            View Submissions
          </button>
          <button className="btn-outline" style={btnRow} onClick={handleRespondRevision}>
            <Reply size={16} />
            Respond to Revision
          </button>
        </div>
      </div>

      {/* Active Manuscripts */}
      <div style={styles.actionsPanel}>
        <div style={styles.sectionTitle}>Active Manuscripts</div>
        {manuscripts.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>
            No active manuscripts.
          </p>
        ) : (
          manuscripts.map((man) => (
            <div key={man.id} style={styles.listItem}>
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
                style={btnRow}
                onClick={() => handleOpenManuscript(man.id)}
              >
                <Eye size={14} />
                Open
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {modalOpen && selectedAction && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={styles.modalHeader(selectedAction.actionType)}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                {selectedAction.actionType === "galley" ? <FileCheck size={20} /> : <CreditCard size={20} />}
                {selectedAction.actionType === "galley" ? "Galley Proof Review" : "Payment Required"}
              </h3>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={styles.modalBody}>
              <p><strong>Manuscript:</strong> {selectedAction.title}</p>
              <p><strong>ID:</strong> {selectedAction.manuscriptId}</p>

              {selectedAction.actionType === "galley" ? (
                <>
                  <p><strong>Galley Proof File:</strong></p>
                  {selectedAction.galleyProofFile ? (
                    <button
                      style={{ ...styles.buttonSecondary, marginBottom: "12px" }}
                      onClick={() => downloadFile(selectedAction.galleyProofFile)}
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
                  <p style={{ marginTop: 16 }}>
                    Please review the galley proof. If you approve, it will be sent for publication. If you need changes, please provide comments.
                  </p>
                </>
              ) : (
                <>
                  <p><strong>Amount Due:</strong> ${selectedAction.paymentAmount}</p>
                  <p><strong>Status:</strong> {selectedAction.paymentStatus}</p>
                  <p style={{ marginTop: 16 }}>
                    Please complete the payment to proceed with publication.
                  </p>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={styles.modalFooter}>
              <button style={styles.buttonSecondary} onClick={closeModal} disabled={processing}>
                Cancel
              </button>
              {selectedAction.actionType === "galley" ? (
                <>
                  <button
                    style={{ ...styles.buttonSecondary, borderColor: "#dc2626", color: "#dc2626" }}
                    onClick={() => handleGalleyProofAction("reject")}
                    disabled={processing}
                  >
                    Request Changes
                  </button>
                  <button
                    style={styles.buttonPrimary}
                    onClick={() => handleGalleyProofAction("approve")}
                    disabled={processing}
                  >
                    Approve
                  </button>
                </>
              ) : (
                <button
                  style={styles.buttonPrimary}
                  onClick={handlePayment}
                  disabled={processing}
                >
                  Proceed to Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const btnRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export default AuthorDashboard;
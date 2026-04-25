import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

const API_BASE = "https://afmjonline.com/api/authorApi.php";

interface PaymentRecord {
  id: number;
  manuscriptId: string;
  title: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "notified";
  paymentDate: string | null;
  transactionId: string | null;
  instructions: string | null;
  notifiedAt: string | null;
  createdAt: string;
}

const styles = {
  page: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "transparent",
    border: "none",
    color: "#16a34a",
    cursor: "pointer",
    fontSize: "0.9rem",
    padding: "8px 12px",
    borderRadius: "8px",
    transition: "background 0.2s",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    marginBottom: "20px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  cardHeader: (status: string) => {
    const colors: Record<string, { bg: string }> = {
      completed: { bg: "#f0fdf4" },
      pending: { bg: "#fffbeb" },
      notified: { bg: "#e0f2fe" },
      failed: { bg: "#fef2f2" },
    };
    const { bg } = colors[status] || colors.pending;
    return {
      padding: "16px 20px",
      borderBottom: "1px solid #e2e8f0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap" as const,
      gap: "12px",
      background: bg,
    };
  },
  manuscriptInfo: {
    flex: 1,
  },
  manuscriptId: {
    fontFamily: "monospace",
    fontSize: "0.85rem",
    color: "#16a34a",
    fontWeight: 600,
  },
  titleText: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "#0f172a",
    marginTop: "4px",
  },
  statusBadge: (status: string) => {
    const config = {
      completed: { bg: "#dcfce7", color: "#16a34a", icon: CheckCircle, text: "Completed" },
      pending: { bg: "#fef3c7", color: "#92400e", icon: Clock, text: "Pending" },
      notified: { bg: "#dbeafe", color: "#1e40af", icon: AlertCircle, text: "Notified" },
      failed: { bg: "#fee2e2", color: "#dc2626", icon: XCircle, text: "Failed" },
    };
    const { bg, color, } = config[status as keyof typeof config] || config.pending;
    return {
      background: bg,
      color: color,
      padding: "4px 12px",
      borderRadius: "40px",
      fontSize: "0.8rem",
      fontWeight: 600,
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
    };
  },
  cardBody: {
    padding: "20px",
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  label: {
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "#64748b",
  },
  value: {
    fontSize: "0.95rem",
    fontWeight: 500,
    color: "#1e293b",
  },
  amount: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#16a34a",
  },
  instructionsBox: {
    background: "#f8fafc",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "12px",
    fontSize: "0.9rem",
    color: "#1e293b",
    whiteSpace: "pre-wrap" as const,
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
  emptyState: {
    textAlign: "center" as const,
    padding: "60px 20px",
    color: "#64748b",
  },
};

const AuthorPaymentHistory = () => {
  const navigate = useNavigate();
  const { authFetch, sessionId } = useAuth();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    fetchHistory();
  }, [sessionId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}?action=getPaymentHistory`);
      if (res.status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch payment history");
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load payment history");
    } finally {
      setLoading(false);
    }
  };

  // Pagination
  const totalRecords = records.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecords = records.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
          <div style={{ width: 40, height: 40, border: "4px solid #16a34a20", borderTop: "4px solid #16a34a", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Toaster position="top-right" />
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => navigate("/author/dashboard")}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <h1 style={styles.title}>Payment History</h1>
      </div>

      {currentRecords.length === 0 ? (
        <div style={styles.emptyState}>
          <CreditCard size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
          <p>No payment records found.</p>
          <p style={{ fontSize: "0.9rem" }}>When a payment is required for your manuscript, it will appear here.</p>
        </div>
      ) : (
        <>
          {currentRecords.map((record) => (
            <div key={record.id} style={styles.card}>
              <div style={styles.cardHeader(record.status)}>
                <div style={styles.manuscriptInfo}>
                  <div style={styles.manuscriptId}>{record.manuscriptId}</div>
                  <div style={styles.titleText}>{record.title}</div>
                </div>
                <div style={styles.statusBadge(record.status)}>
                  {record.status === "completed" && <CheckCircle size={14} />}
                  {record.status === "pending" && <Clock size={14} />}
                  {record.status === "notified" && <AlertCircle size={14} />}
                  {record.status === "failed" && <XCircle size={14} />}
                  {record.status === "completed"
                    ? "Completed"
                    : record.status === "notified"
                    ? "Notified"
                    : record.status === "failed"
                    ? "Failed"
                    : "Pending"}
                </div>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.detailRow}>
                  <span style={styles.label}>Amount</span>
                  <span style={styles.amount}>${record.amount.toFixed(2)}</span>
                </div>

                {record.transactionId && (
                  <div style={styles.detailRow}>
                    <span style={styles.label}>Transaction ID</span>
                    <span style={styles.value}>{record.transactionId}</span>
                  </div>
                )}

                {record.paymentDate && (
                  <div style={styles.detailRow}>
                    <span style={styles.label}>Payment Date</span>
                    <span style={styles.value}>
                      {new Date(record.paymentDate).toLocaleString()}
                    </span>
                  </div>
                )}

                {record.notifiedAt && (
                  <div style={styles.detailRow}>
                    <span style={styles.label}>Notified Admin On</span>
                    <span style={styles.value}>
                      {new Date(record.notifiedAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {record.instructions && (
                  <div style={{ marginTop: "12px" }}>
                    <div style={styles.label}>Payment Instructions</div>
                    <div style={styles.instructionsBox}>{record.instructions}</div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} entries
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
  );
};

export default AuthorPaymentHistory;
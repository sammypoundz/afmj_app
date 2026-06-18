import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

const API_BASE = "https://vinosschool.com/api/authorApi.php";
const DOWNLOAD_API = "https://vinosschool.com/api/download.php";

interface GalleyProofRecord {
  id: number;
  manuscriptId: string;
  title: string;
  galleyProofFile: string | null;
  status: "pending" | "approved" | "rejected";
  editorComment: string | null;
  authorResponse: string | null;
  authorFinalFile: string | null;
  createdAt: string;
  respondedAt: string | null;
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
  cardHeader: (status: string) => ({
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "12px",
    background:
      status === "approved"
        ? "#f0fdf4"
        : status === "rejected"
        ? "#fef2f2"
        : "#fffbeb",
  }),
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
      pending: { bg: "#fef3c7", color: "#92400e", icon: Clock, text: "Pending" },
      approved: { bg: "#dcfce7", color: "#16a34a", icon: CheckCircle, text: "Approved" },
      rejected: { bg: "#fee2e2", color: "#dc2626", icon: XCircle, text: "Changes Requested" },
    };
    const { bg, color,} = config[status as keyof typeof config];
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
    flexDirection: "column" as const,
    gap: "8px",
    marginBottom: "16px",
  },
  label: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  value: {
    fontSize: "0.95rem",
    color: "#1e293b",
    background: "#f8fafc",
    padding: "12px",
    borderRadius: "8px",
    whiteSpace: "pre-wrap" as const,
  },
  fileButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: "#e9ecef",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    color: "#0d6efd",
    transition: "background 0.2s",
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

const AuthorGalleyHistory = () => {
  const navigate = useNavigate();
  const { authFetch, sessionId } = useAuth();
  const [records, setRecords] = useState<GalleyProofRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset to first page whenever records change (e.g., after a new fetch)
  useEffect(() => {
    setCurrentPage(1);
  }, [records]);

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
      const res = await authFetch(`${API_BASE}?action=getGalleyHistory`);
      if (res.status === 401) {
        toast.error("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch galley history");
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load galley history");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (fileUrl: string, fileName: string) => {
    if (!fileUrl) {
      toast.error("No file available");
      return;
    }
    const toastId = toast.loading("Downloading...");
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
      toast.success("Downloaded successfully", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Download failed", { id: toastId });
    }
  };

  // Client‑side pagination
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
          <div
            style={{
              width: 40,
              height: 40,
              border: "4px solid #16a34a20",
              borderTop: "4px solid #16a34a",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
        <h1 style={styles.title}>Galley Proof History</h1>
      </div>

      {currentRecords.length === 0 ? (
        <div style={styles.emptyState}>
          <FileText size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
          <p>No galley proof records found.</p>
          <p style={{ fontSize: "0.9rem" }}>
            When an editor assigns a galley proof, it will appear here.
          </p>
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
                  {record.status === "pending" && <Clock size={14} />}
                  {record.status === "approved" && <CheckCircle size={14} />}
                  {record.status === "rejected" && <XCircle size={14} />}
                  {record.status === "pending"
                    ? "Pending"
                    : record.status === "approved"
                    ? "Approved"
                    : "Changes Requested"}
                </div>
              </div>

              <div style={styles.cardBody}>
                {/* Galley Proof File */}
                <div style={styles.detailRow}>
                  <div style={styles.label}>Galley Proof File</div>
                  {record.galleyProofFile ? (
                    <button
                      style={styles.fileButton}
                      onClick={() =>
                        downloadFile(
                          record.galleyProofFile!,
                          `GalleyProof_${record.manuscriptId}`
                        )
                      }
                    >
                      <Download size={16} /> Download Galley Proof
                    </button>
                  ) : (
                    <div style={styles.value}>No file available</div>
                  )}
                </div>

                {/* Editor Comment */}
                {record.editorComment && (
                  <div style={styles.detailRow}>
                    <div style={styles.label}>Editor's Comment</div>
                    <div style={styles.value}>{record.editorComment}</div>
                  </div>
                )}

                {/* Author Response */}
                {record.authorResponse && (
                  <div style={styles.detailRow}>
                    <div style={styles.label}>Your Response</div>
                    <div style={styles.value}>{record.authorResponse}</div>
                  </div>
                )}

                {/* Author Final File */}
                {record.authorFinalFile && (
                  <div style={styles.detailRow}>
                    <div style={styles.label}>Your Final Manuscript</div>
                    <button
                      style={styles.fileButton}
                      onClick={() =>
                        downloadFile(
                          record.authorFinalFile!,
                          `FinalManuscript_${record.manuscriptId}`
                        )
                      }
                    >
                      <Download size={16} /> Download Your File
                    </button>
                  </div>
                )}

                {/* Timestamps */}
                <div
                  style={{
                    display: "flex",
                    gap: "24px",
                    flexWrap: "wrap",
                    marginTop: "8px",
                  }}
                >
                  <div>
                    <div style={styles.label}>Assigned On</div>
                    <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                      {new Date(record.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {record.respondedAt && (
                    <div>
                      <div style={styles.label}>Responded On</div>
                      <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                        {new Date(record.respondedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of{" "}
                {totalRecords} entries
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={
                    currentPage === 1
                      ? styles.paginationButtonDisabled
                      : styles.paginationButton
                  }
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <div style={{ display: "flex", gap: "4px" }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        style={styles.pageNumber(currentPage === page)}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={
                    currentPage === totalPages
                      ? styles.paginationButtonDisabled
                      : styles.paginationButton
                  }
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

export default AuthorGalleyHistory;
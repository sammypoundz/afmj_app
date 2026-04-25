import { type FC, useState, useEffect } from "react";
import { RotateCcw, Eye, Download, X, ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API = "/api/reviewerApi.php";
const DOWNLOAD_API = "https://afmjonline.com/api/download.php";

interface CompletedItem {
  id: number;
  manuscriptId: string;
  manuscript_id_numeric: number;
  title: string;
  completedAt: string;
  recommendation: string | null;
  attachment: string | null;
}

interface ManuscriptDetails {
  id: number;
  slug: string;
  title: string;
  abstract: string | null;
  background: string | null;
  objective: string | null;
  methods: string | null;
  results: string | null;
  conclusion: string | null;
  study_type: string | null;
  author_name: string;
  file_path: string | null;
  additional_reviewer_files?: { path: string; purpose: string | null }[];
}

interface ReviewDetails {
  originality: number;
  methodology: number;
  clarity: number;
  relevance: number;
  commentsToAuthor: string;
  confidentialComments: string;
  recommendation: string;
  attachment: string | null;
}

const Spinner = () => (
  <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid #ccc", borderTopColor: "#0d6efd", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
);

const globalStyle = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .badge.success {
    background: #d1fae5;
    color: #065f46;
  }
  .badge.warning {
    background: #fef3c7;
    color: #92400e;
  }
  .badge.danger {
    background: #fee2e2;
    color: #991b1b;
  }
  .badge.info {
    background: #e0e7ff;
    color: #3730a3;
  }
  .score-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .score-card {
    background: #f9fafb;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
  }
  .score-label {
    font-size: 0.7rem;
    color: #6b7280;
    text-transform: capitalize;
  }
  .score-value {
    font-size: 1.2rem;
    font-weight: 600;
    color: #111827;
  }
`;

const ReviewerCompleted: FC = () => {
  const [completed, setCompleted] = useState<CompletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedManuscript, setSelectedManuscript] = useState<ManuscriptDetails | null>(null);
  const [selectedReviewDetails, setSelectedReviewDetails] = useState<ReviewDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingDetailsId, setViewingDetailsId] = useState<number | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<number | null>(null);
  const [downloadingManuscript, setDownloadingManuscript] = useState(false);
  const [downloadingReviewAttachment, setDownloadingReviewAttachment] = useState(false);
  const [downloadingAdditionalFile, setDownloadingAdditionalFile] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { authFetch, sessionId } = useAuth();

  const fetchCompleted = async (showRefreshSpinner = false) => {
    if (!sessionId) {
      setLoading(false);
      setError("No active session. Please log in.");
      return;
    }

    if (showRefreshSpinner) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await authFetch(`${API}?action=listCompleted`);
      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
          return;
        }
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      setCompleted(data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to load completed reviews:", err);
      setError("Could not load completed reviews. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchCompleted();
    } else {
      setLoading(false);
      setError("Please log in to view completed reviews.");
    }
  }, [sessionId]);

  const fetchManuscriptDetails = async (manuscriptNumericId: number) => {
    try {
      const res = await authFetch(`${API}?action=getManuscriptPreviewByManuscriptId&manuscript_id=${manuscriptNumericId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch manuscript details");
      }
      const data = await res.json();
      return data as ManuscriptDetails;
    } catch (err) {
      console.error(err);
      toast.error("Could not load manuscript details");
      return null;
    }
  };

  const fetchReviewDetails = async (reviewId: number) => {
    try {
      const res = await authFetch(`${API}?action=getReviewDetails&review_id=${reviewId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch review details");
      }
      const data = await res.json();
      return data as ReviewDetails;
    } catch (err) {
      console.error(err);
      toast.error("Could not load review details");
      return null;
    }
  };

  const handleViewDetails = async (item: CompletedItem) => {
    setViewingDetailsId(item.id);
    const [manuscriptDetails, reviewDetails] = await Promise.all([
      fetchManuscriptDetails(item.manuscript_id_numeric),
      fetchReviewDetails(item.id)
    ]);
    setViewingDetailsId(null);
    if (manuscriptDetails && reviewDetails) {
      setSelectedManuscript(manuscriptDetails);
      setSelectedReviewDetails(reviewDetails);
      setModalOpen(true);
    }
  };

  const downloadFile = async (filePath: string | null, fileName: string) => {
    if (!filePath) {
      toast.error("No file available");
      return;
    }
    const toastId = toast.loading("Downloading...");
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(filePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      let extension = "";
      const parts = filePath.split(".");
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
      toast.update(toastId, {
        render: "Downloaded successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast.update(toastId, {
        render: "Download failed",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const downloadReviewAttachment = async (attachmentPath: string | null, manuscriptId: number, manuscriptSlug: string) => {
    setDownloadingAttachmentId(manuscriptId);
    await downloadFile(attachmentPath, `review_attachment_${manuscriptSlug}`);
    setDownloadingAttachmentId(null);
  };

  const downloadManuscriptFile = async () => {
    if (!selectedManuscript) return;
    setDownloadingManuscript(true);
    await downloadFile(selectedManuscript.file_path, `manuscript_${selectedManuscript.slug}`);
    setDownloadingManuscript(false);
  };

  const downloadReviewerAttachment = async () => {
    if (!selectedReviewDetails?.attachment) return;
    setDownloadingReviewAttachment(true);
    await downloadFile(selectedReviewDetails.attachment, `reviewer_attachment_${selectedManuscript?.slug || 'review'}`);
    setDownloadingReviewAttachment(false);
  };

  const downloadAdditionalFile = async (filePath: string, fileName: string) => {
    setDownloadingAdditionalFile(fileName);
    await downloadFile(filePath, fileName);
    setDownloadingAdditionalFile(null);
  };

  // Pagination
  const totalRecords = completed.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = completed.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getRecommendationClass = (rec: string | null) => {
    if (!rec) return "badge info";
    switch (rec.toLowerCase()) {
      case 'accept': return "badge success";
      case 'minor_revision': return "badge warning";
      case 'major_revision': return "badge danger";
      case 'reject': return "badge danger";
      default: return "badge info";
    }
  };

  const formatRecommendation = (rec: string | null) => {
    if (!rec) return "No recommendation";
    return rec.replace(/_/g, ' ');
  };

  return (
    <>
      <style>{globalStyle}</style>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <div className="page">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <h2>Completed Reviews</h2>
          <button
            onClick={() => fetchCompleted(true)}
            disabled={refreshing || !sessionId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "#f3f4f6",
              cursor: refreshing || !sessionId ? "not-allowed" : "pointer",
              opacity: refreshing || !sessionId ? 0.6 : 1,
            }}
          >
            {refreshing ? <Spinner /> : <RotateCcw size={16} />}
            Refresh
          </button>
        </div>

        <div className="panel" style={{ padding: "16px" }}>
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
              <Spinner />
            </div>
          )}
          {error && (
            <div style={{ color: "#dc2626", padding: "16px", textAlign: "center" }}>
              {error}
            </div>
          )}
          {!loading && !error && completed.length === 0 && (
            <p style={{ padding: "16px", color: "#6b7280", textAlign: "center" }}>
              No completed reviews yet.
            </p>
          )}
          {!loading && !error && completed.length > 0 && (
            <>
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    marginBottom: "12px",
                    borderBottom: "1px solid #eee",
                    paddingBottom: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <strong>{item.manuscriptId}</strong>
                    <p style={{ margin: "4px 0" }}>{item.title}</p>
                    <small>Completed: {new Date(item.completedAt).toLocaleDateString()}</small>
                    {item.attachment && (
                      <div style={{ marginTop: "4px" }}>
                        <button
                          onClick={() => downloadReviewAttachment(item.attachment, item.id, item.manuscriptId)}
                          disabled={downloadingAttachmentId === item.id}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#0d6efd",
                            cursor: downloadingAttachmentId === item.id ? "wait" : "pointer",
                            fontSize: "0.85rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            opacity: downloadingAttachmentId === item.id ? 0.6 : 1,
                          }}
                        >
                          {downloadingAttachmentId === item.id ? <Spinner /> : <Download size={14} />}
                          Download Review Attachment
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className={getRecommendationClass(item.recommendation)}>
                      {formatRecommendation(item.recommendation)}
                    </span>
                    <button
                      onClick={() => handleViewDetails(item)}
                      disabled={viewingDetailsId === item.id}
                      style={{
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        cursor: viewingDetailsId === item.id ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        opacity: viewingDetailsId === item.id ? 0.6 : 1,
                      }}
                    >
                      {viewingDetailsId === item.id ? <Spinner /> : <Eye size={16} />}
                      View Details
                    </button>
                  </div>
                </div>
              ))}

              {totalPages > 1 && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 0 0",
                  borderTop: "1px solid #e5e7eb",
                  marginTop: "16px",
                }}>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} entries
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        background: currentPage === 1 ? "#f3f4f6" : "#fff",
                        color: currentPage === 1 ? "#9ca3af" : "#374151",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid",
                            borderColor: currentPage === page ? "#0d6efd" : "#d1d5db",
                            background: currentPage === page ? "#0d6efd" : "#fff",
                            color: currentPage === page ? "#fff" : "#374151",
                            cursor: "pointer",
                            minWidth: "36px",
                          }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        background: currentPage === totalPages ? "#f3f4f6" : "#fff",
                        color: currentPage === totalPages ? "#9ca3af" : "#374151",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal for Manuscript Details + Review Details */}
      {modalOpen && selectedManuscript && selectedReviewDetails && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "16px",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X size={24} />
            </button>

            <h2 style={{ marginBottom: "8px" }}>{selectedManuscript.title}</h2>
            <p style={{ color: "#6b7280", marginBottom: "16px" }}>
              <strong>Manuscript ID:</strong> {selectedManuscript.slug}<br />
              <strong>Author:</strong> {selectedManuscript.author_name}<br />
              <strong>Study Type:</strong> {selectedManuscript.study_type || "Not specified"}
            </p>

            <div style={{ marginBottom: "24px" }}>
              <h3>Your Review</h3>
              <div className="score-grid">
                <div className="score-card">
                  <div className="score-label">Originality</div>
                  <div className="score-value">{selectedReviewDetails.originality || "—"}</div>
                </div>
                <div className="score-card">
                  <div className="score-label">Methodology</div>
                  <div className="score-value">{selectedReviewDetails.methodology || "—"}</div>
                </div>
                <div className="score-card">
                  <div className="score-label">Clarity</div>
                  <div className="score-value">{selectedReviewDetails.clarity || "—"}</div>
                </div>
                <div className="score-card">
                  <div className="score-label">Relevance</div>
                  <div className="score-value">{selectedReviewDetails.relevance || "—"}</div>
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <span className={getRecommendationClass(selectedReviewDetails.recommendation)}>
                  {formatRecommendation(selectedReviewDetails.recommendation)}
                </span>
              </div>
              {selectedReviewDetails.commentsToAuthor && (
                <div style={{ marginBottom: "12px" }}>
                  <strong>Comments to Author</strong>
                  <div style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", marginTop: "4px" }}>
                    {selectedReviewDetails.commentsToAuthor}
                  </div>
                </div>
              )}
              {selectedReviewDetails.confidentialComments && (
                <div style={{ marginBottom: "12px" }}>
                  <strong>Confidential Comments (Editor only)</strong>
                  <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "8px", marginTop: "4px", color: "#991b1b" }}>
                    {selectedReviewDetails.confidentialComments}
                  </div>
                </div>
              )}
              {selectedReviewDetails.attachment && (
                <div>
                  <button
                    onClick={downloadReviewerAttachment}
                    disabled={downloadingReviewAttachment}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 16px",
                      background: "#e0e7ff",
                      color: "#3730a3",
                      border: "none",
                      borderRadius: "6px",
                      cursor: downloadingReviewAttachment ? "wait" : "pointer",
                      opacity: downloadingReviewAttachment ? 0.6 : 1,
                    }}
                  >
                    {downloadingReviewAttachment ? <Spinner /> : <Download size={16} />}
                    Download Your Attachment
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <h3>Manuscript File</h3>
              <button
                onClick={downloadManuscriptFile}
                disabled={downloadingManuscript}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: "#0d6efd",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: downloadingManuscript ? "wait" : "pointer",
                  opacity: downloadingManuscript ? 0.6 : 1,
                }}
              >
                {downloadingManuscript ? <Spinner /> : <Download size={16} />}
                Download Manuscript
              </button>
            </div>

            {/* Additional Documents for Reviewers */}
            {selectedManuscript.additional_reviewer_files && selectedManuscript.additional_reviewer_files.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Paperclip size={18} /> Additional Documents
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedManuscript.additional_reviewer_files.map((file, idx) => {
                    const fileName = file.path.split('/').pop() || `document_${idx+1}`;
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9fafb", padding: "8px 12px", borderRadius: "8px" }}>
                        <div>
                          <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{fileName}</span>
                          {file.purpose && (
                            <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: "8px" }}>({file.purpose})</span>
                          )}
                        </div>
                        <button
                          onClick={() => downloadAdditionalFile(file.path, `AFMJ_${selectedManuscript.id}_${fileName}`)}
                          disabled={downloadingAdditionalFile === fileName}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            background: "#fff",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            cursor: downloadingAdditionalFile === fileName ? "wait" : "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          {downloadingAdditionalFile === fileName ? <Spinner /> : <Download size={14} />}
                          Download
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedManuscript.abstract && (
              <div style={{ marginBottom: "16px" }}>
                <h3>Abstract</h3>
                <p>{selectedManuscript.abstract}</p>
              </div>
            )}
            {selectedManuscript.background && (
              <div style={{ marginBottom: "16px" }}>
                <h3>Background</h3>
                <p>{selectedManuscript.background}</p>
              </div>
            )}
            {selectedManuscript.objective && (
              <div style={{ marginBottom: "16px" }}>
                <h3>Objective</h3>
                <p>{selectedManuscript.objective}</p>
              </div>
            )}
            {selectedManuscript.methods && (
              <div style={{ marginBottom: "16px" }}>
                <h3>Methods</h3>
                <p>{selectedManuscript.methods}</p>
              </div>
            )}
            {selectedManuscript.results && (
              <div style={{ marginBottom: "16px" }}>
                <h3>Results</h3>
                <p>{selectedManuscript.results}</p>
              </div>
            )}
            {selectedManuscript.conclusion && (
              <div style={{ marginBottom: "16px" }}>
                <h3>Conclusion</h3>
                <p>{selectedManuscript.conclusion}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewerCompleted;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  BookOpen,
  Target,
  CheckCircle,
  User,
  X,
  Calendar,
  Clock,
  Download,
  BarChart,
  FlaskConical,
  Paperclip,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

// const API_BASE = "/api/reviewerApi.php";
const API_BASE = "https://vinosschool.com/api/reviewerApi.php";

interface ActiveReview {
  id: number;
  manuscript_id: number;
  manuscriptId: string;
  title: string;
  dueDate: string;
}

interface AdditionalFile {
  path: string;
  purpose: string | null;
}

interface ManuscriptPreview {
  id: number;
  slug: string;
  title: string;
  abstract: string;
  background: string;
  objective: string;
  methods?: string;
  results?: string;
  conclusion: string;
  study_type: string;
  author_name: string;
  file_path?: string;
  additional_reviewer_files?: AdditionalFile[];
}

const Spinner = ({ size = 20, color = "#16a34a" }) => (
  <span
    style={{
      width: size,
      height: size,
      border: `3px solid ${color}20`,
      borderTop: `3px solid ${color}`,
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
      display: "inline-block",
    }}
  />
);

const GlobalStyles = () => (
  <style>{`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @media (max-width: 768px) {
      .responsive-margin-top {
        margin-top: 12px !important;
      }
    }
  `}</style>
);

const formatManuscriptId = (manuscriptId: number, submissionYear?: number) => {
  const year = submissionYear || new Date().getFullYear();
  return `AFMJ-${year}-${manuscriptId}`;
};

const ReviewerActiveReviews = () => {
  const [reviews, setReviews] = useState<ActiveReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ActiveReview | null>(null);
  const [previewData, setPreviewData] = useState<ManuscriptPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const navigate = useNavigate();
  const { authFetch, sessionId } = useAuth();

  const fetchActiveReviews = async () => {
    if (!sessionId) {
      navigate("/login");
      return;
    }

    try {
      const res = await authFetch(`${API_BASE}?action=listActive`);
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/login");
          return;
        }
        throw new Error(`Failed to fetch active reviews: ${res.status}`);
      }
      const data = await res.json();
      // Sort reviews by dueDate descending (latest first)
      const sortedReviews = [...data].sort((a, b) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        // If invalid dates, treat as old (fallback)
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateB.getTime() - dateA.getTime();
      });
      setReviews(sortedReviews);
    } catch (err) {
      console.error("Error fetching active reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveReviews();
  }, [sessionId]);

  const openPreview = async (review: ActiveReview) => {
    setSelectedReview(review);
    setModalOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await authFetch(`${API_BASE}?action=getManuscriptPreview&review_id=${review.id}`);
      if (!res.ok) {
        if (res.status === 401) {
          navigate("/login");
          return;
        }
        throw new Error("Failed to load manuscript details");
      }
      const data = await res.json();
      setPreviewData(data);
    } catch (err) {
      console.error("Error loading manuscript preview:", err);
      alert("Failed to load manuscript details. Please try again.");
      setModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedReview(null);
    setPreviewData(null);
  };

  const handleContinue = () => {
    if (!selectedReview) return;
    closeModal();
    navigate(`/reviewer/submit/${selectedReview.id}`, {
      state: { manuscriptId: selectedReview.manuscriptId, title: selectedReview.title },
    });
  };

  const handleDownload = async (filePath: string, customFileName: string) => {
    if (!filePath) return;

    setDownloadingFile(customFileName);
    try {
      const response = await authFetch(`https://vinosschool.com/api/download.php?file=${encodeURIComponent(filePath)}`);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download the file. Please try again.");
    } finally {
      setDownloadingFile(null);
    }
  };

  const goBack = () => navigate(-1);

  if (loading) {
    return (
      <>
        <GlobalStyles />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
          <Spinner size={40} />
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
          <button
            onClick={goBack}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              cursor: "pointer",
              color: "#16a34a",
              transition: "all 0.2s",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 600, color: "#0f172a", margin: 0 }}>
            Active Reviews
          </h1>
        </div>

        {reviews.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "48px 24px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
            }}
          >
            <Calendar size={48} color="#94a3b8" />
            <p style={{ color: "#64748b", fontSize: "1.1rem", marginTop: "16px" }}>
              No active reviews at the moment.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {reviews.map((review) => (
              <div
                key={review.id}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "20px 24px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)")}
              >
                <div style={{ flex: "1 1 300px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        background: "#16a34a10",
                        color: "#16a34a",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        padding: "2px 10px",
                        borderRadius: "20px",
                        border: "1px solid #16a34a20",
                      }}
                    >
                      {review.manuscript_id
                        ? formatManuscriptId(review.manuscript_id)
                        : review.manuscriptId}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#0f172a", margin: "4px 0" }}>
                    {review.title}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                    <Clock size={14} />
                    <span style={{ fontSize: "0.9rem" }}>Due: {review.dueDate}</span>
                  </div>
                </div>

                <button
                  onClick={() => openPreview(review)}
                  className="responsive-margin-top"
                  style={{
                    background: "#16a34a",
                    color: "#fff",
                    border: "none",
                    padding: "12px 24px",
                    borderRadius: "40px",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "background 0.2s",
                    boxShadow: "0 4px 8px rgba(22,163,74,0.2)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#0d9488")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#16a34a")}
                >
                  Continue Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {modalOpen && selectedReview && (
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
          onClick={closeModal}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              width: "700px",
              maxWidth: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #16a34a, #0d9488)",
                padding: "20px 24px",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={20} />
                Manuscript Preview
              </h3>
              <button
                onClick={closeModal}
                style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", opacity: 0.8 }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto" }}>
              {previewLoading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <Spinner size={40} />
                  <p>Loading manuscript details...</p>
                </div>
              ) : previewData ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div
                    style={{
                      background: "#f9fafb",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>
                        Manuscript ID
                      </div>
                      <div style={{ fontFamily: "monospace", fontWeight: 600, color: "#16a34a" }}>
                        {selectedReview.manuscript_id
                          ? formatManuscriptId(selectedReview.manuscript_id)
                          : previewData.slug}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>
                        Study Type
                      </div>
                      <div style={{ fontWeight: 500 }}>{previewData.study_type}</div>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Author</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 500 }}>
                        <User size={14} color="#6b7280" />
                        {previewData.author_name}
                      </div>
                    </div>
                  </div>

                  {/* Main Manuscript Download */}
                  {previewData.file_path && (
                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => {
                          const manuscriptId = selectedReview.manuscript_id || parseInt(selectedReview.manuscriptId);
                          const extension = previewData.file_path!.split('.').pop() || '';
                          const fileName = `AFMJ_${manuscriptId}${extension ? '.' + extension : ''}`;
                          handleDownload(previewData.file_path!, fileName);
                        }}
                        disabled={downloadingFile === "main"}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 18px",
                          background: "#f3f4f6",
                          color: "#1f2937",
                          borderRadius: "8px",
                          textDecoration: "none",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                          border: "1px solid #e5e7eb",
                          transition: "background 0.2s",
                          cursor: downloadingFile === "main" ? "not-allowed" : "pointer",
                          opacity: downloadingFile === "main" ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => downloadingFile !== "main" && (e.currentTarget.style.background = "#e5e7eb")}
                        onMouseLeave={(e) => downloadingFile !== "main" && (e.currentTarget.style.background = "#f3f4f6")}
                      >
                        {downloadingFile === "main" ? <Spinner size={16} /> : <Download size={18} />}
                        {downloadingFile === "main" ? "Downloading..." : "Download Manuscript"}
                      </button>
                    </div>
                  )}

                  {/* Additional Documents Section */}
                  {previewData.additional_reviewer_files && previewData.additional_reviewer_files.length > 0 && (
                    <div style={{ marginTop: "16px", borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <Paperclip size={18} color="#16a34a" />
                        <span style={{ fontWeight: 600, color: "#16a34a" }}>Additional Documents</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {previewData.additional_reviewer_files.map((file, idx) => {
                          const fileName = file.path.split('/').pop() || `document_${idx+1}`;
                          const downloadKey = `additional_${idx}`;
                          return (
                            <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9fafb", padding: "8px 12px", borderRadius: "8px" }}>
                              <div>
                                <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>{fileName}</span>
                                {file.purpose && (
                                  <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: "8px" }}>({file.purpose})</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDownload(file.path, `AFMJ_${selectedReview.manuscript_id}_${fileName}`)}
                                disabled={downloadingFile === downloadKey}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "6px 12px",
                                  background: "#fff",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  cursor: downloadingFile === downloadKey ? "not-allowed" : "pointer",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {downloadingFile === downloadKey ? <Spinner size={14} /> : <Download size={14} />}
                                Download
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Rest of the manuscript details (abstract, background, etc.) unchanged */}
                  <h4 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827", margin: "8px 0 4px" }}>
                    {previewData.title}
                  </h4>

                  {previewData.abstract && (
                    <div style={{ borderLeft: "4px solid #16a34a", paddingLeft: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <BookOpen size={18} color="#16a34a" />
                        <span style={{ fontWeight: 600, color: "#16a34a" }}>Abstract</span>
                      </div>
                      <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.abstract}</p>
                    </div>
                  )}

                  {previewData.background && (
                    <div style={{ borderLeft: "4px solid #0d9488", paddingLeft: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <FileText size={18} color="#0d9488" />
                        <span style={{ fontWeight: 600, color: "#0d9488" }}>Background</span>
                      </div>
                      <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.background}</p>
                    </div>
                  )}

                  {previewData.objective && (
                    <div style={{ borderLeft: "4px solid #7c3aed", paddingLeft: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <Target size={18} color="#7c3aed" />
                        <span style={{ fontWeight: 600, color: "#7c3aed" }}>Objective</span>
                      </div>
                      <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.objective}</p>
                    </div>
                  )}

                  {previewData.methods && (
                    <div style={{ borderLeft: "4px solid #f97316", paddingLeft: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <FlaskConical size={18} color="#f97316" />
                        <span style={{ fontWeight: 600, color: "#f97316" }}>Methods</span>
                      </div>
                      <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.methods}</p>
                    </div>
                  )}

                  {previewData.results && (
                    <div style={{ borderLeft: "4px solid #a855f7", paddingLeft: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <BarChart size={18} color="#a855f7" />
                        <span style={{ fontWeight: 600, color: "#a855f7" }}>Results</span>
                      </div>
                      <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.results}</p>
                    </div>
                  )}

                  {previewData.conclusion && (
                    <div style={{ borderLeft: "4px solid #d97706", paddingLeft: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <CheckCircle size={18} color="#d97706" />
                        <span style={{ fontWeight: 600, color: "#d97706" }}>Conclusion</span>
                      </div>
                      <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.conclusion}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: "#dc2626", textAlign: "center" }}>Failed to load manuscript details.</p>
              )}
            </div>

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                padding: "20px 24px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                background: "#f9fafb",
              }}
            >
              <button
                onClick={closeModal}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#16a34a",
                  color: "#fff",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#0d9488")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#16a34a")}
              >
                Continue to Review
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewerActiveReviews;
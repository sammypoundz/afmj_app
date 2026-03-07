import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, BookOpen, Target, CheckCircle, User, X, Calendar, Clock, Download } from "lucide-react";

const API_BASE = "https://afmjonline.com/api/reviewerApi.php";

interface OverdueReview {
  id: number;
  manuscriptId: string;
  title: string;
  dueDate: string;
  accepted_at: string | null; // null if not accepted
}

interface ManuscriptPreview {
  id: number;
  slug: string;
  title: string;
  abstract: string;
  background: string;
  objective: string;
  conclusion: string;
  study_type: string;
  author_name: string;
  file_path?: string;
}

// Spinner component (green)
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

// Global keyframes and responsive utility class
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
    .badge {
      background-color: #f0ad4e;
      color: white;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 0.75rem;
      margin-left: 8px;
    }
    .btn-disabled {
      background-color: #ccc;
      cursor: not-allowed;
      border: none;
      padding: 12px 24px;
      border-radius: 40px;
      font-size: 0.95rem;
      font-weight: 500;
      color: #666;
    }
  `}</style>
);

const ReviewerOverdue = () => {
  const [overdueReviews, setOverdueReviews] = useState<OverdueReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<OverdueReview | null>(null);
  const [previewData, setPreviewData] = useState<ManuscriptPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOverdue = async () => {
      try {
        const response = await fetch(`${API_BASE}?action=listOverdue`);
        if (!response.ok) {
          throw new Error("Failed to fetch overdue reviews");
        }
        const data: OverdueReview[] = await response.json();
        setOverdueReviews(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOverdue();
  }, []);

  const openPreview = async (review: OverdueReview) => {
    if (!review.accepted_at) return; // should not happen because button is disabled, but safeguard

    setSelectedReview(review);
    setModalOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);

    try {
      const res = await fetch(`${API_BASE}?action=getManuscriptPreview&review_id=${review.id}`);
      const data = await res.json();
      if (res.ok) {
        setPreviewData(data);
      } else {
        alert(data.error || "Failed to load manuscript details");
        setModalOpen(false);
      }
    } catch (err) {
      alert("Network error");
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

  if (error) {
    return (
      <>
        <GlobalStyles />
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px" }}>
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px" }}>
        {/* Header with back button */}
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
            Overdue Reviews
          </h1>
        </div>

        {/* Reviews list */}
        {overdueReviews.length === 0 ? (
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
              No overdue reviews.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {overdueReviews.map((review) => {
              const isAccepted = review.accepted_at !== null;
              return (
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
                        {review.manuscriptId}
                      </span>
                      {!isAccepted && <span className="badge">Expired</span>}
                    </div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "#0f172a", margin: "4px 0" }}>
                      {review.title}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                      <Clock size={14} />
                      <span style={{ fontSize: "0.9rem" }}>
                        Was due: {new Date(review.dueDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {isAccepted ? (
                    <button
                      onClick={() => openPreview(review)}
                      className="responsive-margin-top"
                      style={{
                        background: "#dc2626", // red for overdue
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
                        boxShadow: "0 4px 8px rgba(220,38,38,0.2)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#b91c1c")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#dc2626")}
                    >
                      Submit Now
                    </button>
                  ) : (
                    <button className="btn-disabled responsive-margin-top" disabled>
                      Expired
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal (identical to active reviews modal) */}
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
            {/* Modal Header with red gradient (to indicate overdue) */}
            <div
              style={{
                background: "linear-gradient(135deg, #dc2626, #b91c1c)",
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
                Overdue Manuscript Preview
              </h3>
              <button
                onClick={closeModal}
                style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", opacity: 0.8 }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px", overflowY: "auto" }}>
              {previewLoading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <Spinner size={40} />
                  <p>Loading manuscript details...</p>
                </div>
              ) : previewData ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Meta information card */}
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
                      <div style={{ fontFamily: "monospace", fontWeight: 600, color: "#dc2626" }}>
                        {previewData.slug}
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

                  {/* Download button (if file exists) */}
                  {previewData.file_path && (
                    <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                      <a
                        href={previewData.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
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
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                      >
                        <Download size={18} />
                        Download Manuscript
                      </a>
                    </div>
                  )}

                  {/* Title */}
                  <h4 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827", margin: "8px 0 4px" }}>
                    {previewData.title}
                  </h4>

                  {/* Abstract */}
                  {previewData.abstract && (
                    <div style={{ borderLeft: "4px solid #dc2626", paddingLeft: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <BookOpen size={18} color="#dc2626" />
                        <span style={{ fontWeight: 600, color: "#dc2626" }}>Abstract</span>
                      </div>
                      <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.abstract}</p>
                    </div>
                  )}

                  {/* Background */}
                  {previewData.background && (
                    <div style={{ borderLeft: "4px solid #b91c1c", paddingLeft: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <FileText size={18} color="#b91c1c" />
                        <span style={{ fontWeight: 600, color: "#b91c1c" }}>Background</span>
                      </div>
                      <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.background}</p>
                    </div>
                  )}

                  {/* Objective */}
                  {previewData.objective && (
                    <div style={{ borderLeft: "4px solid #9b1c1c", paddingLeft: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <Target size={18} color="#9b1c1c" />
                        <span style={{ fontWeight: 600, color: "#9b1c1c" }}>Objective</span>
                      </div>
                      <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.objective}</p>
                    </div>
                  )}

                  {/* Conclusion */}
                  {previewData.conclusion && (
                    <div style={{ borderLeft: "4px solid #7f1d1d", paddingLeft: "16px", marginTop: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <CheckCircle size={18} color="#7f1d1d" />
                        <span style={{ fontWeight: 600, color: "#7f1d1d" }}>Conclusion</span>
                      </div>
                      <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.conclusion}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: "#dc2626", textAlign: "center" }}>Failed to load manuscript details.</p>
              )}
            </div>

            {/* Modal Footer */}
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
                  background: "#dc2626",
                  color: "#fff",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#b91c1c")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#dc2626")}
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

export default ReviewerOverdue;
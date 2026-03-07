import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeft, FileText, MessageSquare, Lock, CheckCircle, Star, Paperclip } from "lucide-react";

const API_BASE = "https://afmjonline.com/api/reviewerApi.php";

// Spinner component (green theme)
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

// Global keyframes for spinner
const GlobalStyles = () => (
  <style>{`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}</style>
);

const ReviewSubmissionPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manuscriptInfo, setManuscriptInfo] = useState<{ manuscriptId: string; title: string } | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [reviewId, setReviewId] = useState<number | null>(null);

  const [scores, setScores] = useState({
    originality: 0,
    methodology: 0,
    clarity: 0,
    relevance: 0,
  });

  const [commentsToAuthor, setCommentsToAuthor] = useState("");
  const [confidentialComments, setConfidentialComments] = useState("");
  const [recommendation, setRecommendation] = useState("");

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        toast.error("No review ID provided");
        navigate("/reviewer/revisions");
        return;
      }

      const revId = parseInt(id);
      setReviewId(revId);
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}?action=getManuscriptPreview&review_id=${revId}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Failed to load manuscript details");
          navigate("/reviewer/revisions");
          return;
        }
        setManuscriptInfo({
          manuscriptId: data.slug,
          title: data.title,
        });
      } catch (err) {
        console.error(err);
        toast.error("An error occurred while loading data");
        navigate("/reviewer/revisions");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const handleScoreChange = (field: string, value: number) => {
    setScores({ ...scores, [field]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachmentFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!recommendation) {
      toast.error("Please select a recommendation");
      return;
    }
    if (!reviewId) {
      toast.error("No review ID available – cannot submit");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting review...");

    const formData = new FormData();
    formData.append("review_id", reviewId.toString());
    formData.append("originality", scores.originality.toString());
    formData.append("methodology", scores.methodology.toString());
    formData.append("clarity", scores.clarity.toString());
    formData.append("relevance", scores.relevance.toString());
    formData.append("commentsToAuthor", commentsToAuthor);
    formData.append("confidentialComments", confidentialComments);
    formData.append("recommendation", recommendation.toLowerCase().replace(" ", "_"));
    if (attachmentFile) {
      formData.append("attachment", attachmentFile);
    }

    try {
      const res = await fetch(`${API_BASE}?action=submitReview`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Review submitted successfully!", { id: toastId });
        navigate("/reviewer/active");
      } else {
        toast.error(data.error || "Submission failed", { id: toastId });
      }
    } catch (err) {
      toast.error("Network error", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => navigate(-1);

  if (loading) {
    return (
      <>
        <GlobalStyles />
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
          <Spinner size={40} color="#16a34a" />
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <Toaster position="top-right" />
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
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
            Submit Review
          </h1>
        </div>

        {/* Manuscript info card */}
        {manuscriptInfo && (
          <div
            style={{
              background: "linear-gradient(135deg, #f0fdf4, #ffffff)",
              borderLeft: "4px solid #16a34a",
              borderRadius: "16px",
              padding: "20px 24px",
              marginBottom: "24px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <FileText size={24} color="#16a34a" />
            <div>
              <div style={{ fontSize: "0.9rem", color: "#16a34a", fontWeight: 500 }}>
                {manuscriptInfo.manuscriptId}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
                {manuscriptInfo.title}
              </div>
            </div>
          </div>
        )}

        {/* Evaluation Criteria */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 0, marginBottom: "20px", color: "#0f172a" }}>
            <Star size={20} color="#16a34a" />
            Evaluation Criteria
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {Object.keys(scores).map((key) => (
              <div key={key} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontWeight: 500, color: "#334155", textTransform: "capitalize" }}>{key}</label>
                <select
                  value={scores[key as keyof typeof scores]}
                  onChange={(e) => handleScoreChange(key, Number(e.target.value))}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    fontSize: "0.95rem",
                    outline: "none",
                    transition: "border 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#16a34a")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                >
                  <option value={0}>Select score</option>
                  <option value={1}>1 - Poor</option>
                  <option value={2}>2 - Fair</option>
                  <option value={3}>3 - Good</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={5}>5 - Excellent</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Comments to Author */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 0, marginBottom: "16px", color: "#0f172a" }}>
            <MessageSquare size={20} color="#16a34a" />
            Comments to Author
          </h3>
          <textarea
            rows={6}
            value={commentsToAuthor}
            onChange={(e) => setCommentsToAuthor(e.target.value)}
            placeholder="Provide constructive feedback..."
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              transition: "border 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#16a34a")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        {/* Confidential Comments */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 0, marginBottom: "16px", color: "#0f172a" }}>
            <Lock size={20} color="#16a34a" />
            Confidential Comments to Editor
          </h3>
          <textarea
            rows={4}
            value={confidentialComments}
            onChange={(e) => setConfidentialComments(e.target.value)}
            placeholder="Only visible to the editor..."
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              transition: "border 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#16a34a")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          />
        </div>

        {/* Attachment Upload */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 0, marginBottom: "16px", color: "#0f172a" }}>
            <Paperclip size={20} color="#16a34a" />
            Attachment for Author (Optional)
          </h3>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "0.95rem",
            }}
          />
          {attachmentFile && (
            <p style={{ marginTop: "8px", fontSize: "0.9rem", color: "#4b5563" }}>
              Selected: {attachmentFile.name}
            </p>
          )}
        </div>

        {/* Final Recommendation */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 0, marginBottom: "16px", color: "#0f172a" }}>
            <CheckCircle size={20} color="#16a34a" />
            Final Recommendation
          </h3>
          <select
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              fontSize: "0.95rem",
              outline: "none",
              transition: "border 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#16a34a")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
          >
            <option value="">Select recommendation</option>
            <option value="accept">Accept</option>
            <option value="minor_revision">Minor Revision</option>
            <option value="major_revision">Major Revision</option>
            <option value="reject">Reject</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !reviewId}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "40px",
            border: "none",
            background: submitting || !reviewId ? "#9ca3af" : "#16a34a",
            color: "#fff",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: submitting || !reviewId ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "background 0.2s",
            boxShadow: submitting || !reviewId ? "none" : "0 8px 16px rgba(22,163,74,0.2)",
          }}
          onMouseEnter={(e) => !submitting && reviewId && (e.currentTarget.style.background = "#0d9488")}
          onMouseLeave={(e) => !submitting && reviewId && (e.currentTarget.style.background = "#16a34a")}
        >
          {submitting ? <Spinner size={20} color="#fff" /> : "Submit Review"}
        </button>
      </div>
    </>
  );
};

export default ReviewSubmissionPage;
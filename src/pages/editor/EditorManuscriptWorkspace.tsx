import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ArrowLeft, Download, Users, Clock, CheckCircle, XCircle, Loader } from "lucide-react";
import toast from "react-hot-toast";

const DOWNLOAD_API = "https://vinosschool.com/api/download.php";

interface ManuscriptDetail {
  id: number;
  title: string;
  slug: string;
  abstract: string;
  status: string;
  submittedAt: string;
  author: string;
  study_type: string;
  keywords: string;
  files: {
    manuscript: string | null;
    cover_letter: string | null;
    circulating: string | null;
  };
}

interface Reviewer {
  name: string;
  status: string;
  accepted_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  scores?: {
    originality: number | null;
    methodology: number | null;
    clarity: number | null;
    relevance: number | null;
    comments_to_author: string | null;
    confidential_comments: string | null;
    recommendation: string | null;
  };
}

const EditorManuscriptWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [manuscript, setManuscript] = useState<ManuscriptDetail | null>(null);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Reviewer | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [revisionType, setRevisionType] = useState<"major_revision" | "minor_revision" | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await authFetch(
          `https://vinosschool.com/api/editorApi.php?action=getManuscriptDetails&id=${id}`
        );
        if (!res.ok) throw new Error("Failed to fetch manuscript details");
        const data = await res.json();
        setManuscript(data.manuscript);
        setReviewers(data.reviewers || []);
      } catch (err) {
        console.error(err);
        setError("Could not load manuscript.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id, authFetch]);

  const refreshDetails = async () => {
    try {
      const res = await authFetch(
        `https://vinosschool.com/api/editorApi.php?action=getManuscriptDetails&id=${id}`
      );
      if (res.ok) {
        const data = await res.json();
        setManuscript(data.manuscript);
        setReviewers(data.reviewers || []);
      }
    } catch (err) {
      console.error("Refresh failed", err);
    }
  };

  const downloadFile = async (filePath: string | null, fileName: string) => {
    if (!filePath) {
      toast.error("No file available for download.");
      return;
    }
    setDownloadLoading(fileName);
    const toastId = toast.loading("Downloading...");
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(filePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      let extension = "";
      const parts = filePath.split(".");
      if (parts.length > 1) {
        extension = parts.pop() || "";
        if (extension.includes("?")) extension = extension.split("?")[0];
      }
      const finalName = fileName + (extension ? "." + extension : "");
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download successful", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Download failed", { id: toastId });
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleDecision = async (decision: "accept" | "reject" | "major_revision" | "minor_revision") => {
    if (decision === "major_revision" || decision === "minor_revision") {
      setRevisionType(decision);
      setShowRevisionModal(true);
      return;
    }
    await submitDecision(decision, "");
  };

  const submitDecision = async (decision: string, comments: string) => {
    setActionLoading(decision);
    const toastId = toast.loading("Processing decision...");

    try {
      const res = await authFetch(
        "https://vinosschool.com/api/editorApi.php?action=makeDecision",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manuscript_id: parseInt(id!),
            decision: decision,
            comments: comments,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Decision failed");
      toast.success("Decision recorded successfully", { id: toastId });
      setShowRevisionModal(false);
      setRevisionComment("");
      await refreshDetails();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevisionSubmit = () => {
    if (!revisionComment.trim()) {
      toast.error("Please provide comments for the revision.");
      return;
    }
    submitDecision(revisionType!, revisionComment);
  };

  const completedReviews = reviewers.filter(r => r.completed_at).length;
  const pendingReviews = reviewers.filter(r => !r.completed_at && r.status !== 'declined').length;
  const totalReviews = reviewers.length;

  if (loading) return <div className="content" style={{ padding: 20 }}>Loading manuscript...</div>;
  if (error) return <div className="content" style={{ padding: 20 }}>{error}</div>;
  if (!manuscript) return <div className="content" style={{ padding: 20 }}>Manuscript not found.</div>;

  const responsiveStyles = `
    @media (max-width: 768px) {
      .workspace-grid {
        grid-template-columns: 1fr !important;
      }
      .workspace-header {
        flex-wrap: wrap;
      }
      .workspace-header h2 {
        font-size: 1.2rem !important;
      }
      .workspace-panel {
        padding: 16px !important;
      }
      .workspace-actions button {
        width: 100% !important;
        justify-content: center;
        margin-bottom: 8px;
      }
    }
    @media (max-width: 480px) {
      .workspace {
        padding: 12px !important;
      }
      .workspace-summary {
        flex-direction: column !important;
        gap: 8px !important;
      }
    }
  `;

  return (
    <div className="content workspace" style={{ padding: 20 }}>
      <style>{responsiveStyles}</style>

      {/* Revision Modal */}
      {showRevisionModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setShowRevisionModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 500,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              {revisionType === "major_revision" ? "Major Revision" : "Minor Revision"}
            </h3>
            <p style={{ color: "#6b7280" }}>Please provide detailed comments for the author.</p>
            <textarea
              value={revisionComment}
              onChange={(e) => setRevisionComment(e.target.value)}
              rows={6}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontFamily: "inherit",
                resize: "vertical",
                marginBottom: 16,
              }}
              placeholder="Provide feedback to the author..."
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowRevisionModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRevisionSubmit}
                disabled={actionLoading === revisionType}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#16a34a",
                  color: "#fff",
                  cursor: actionLoading === revisionType ? "not-allowed" : "pointer",
                  opacity: actionLoading === revisionType ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {actionLoading === revisionType && <Loader size={16} className="animate-spin" />}
                Submit
              </button>
            </div>
            <style>{`
              .animate-spin {
                animation: spin 0.8s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}

      <div className="workspace-header" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid #e5e7eb",
            background: "#fff",
            padding: "6px 10px",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h2 style={{ margin: 0 }}>Manuscript Workspace</h2>
      </div>

      <div className="panel" style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, marginBottom: 6 }}>{manuscript.title}</h3>
        <div style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>Manuscript ID: <strong>{id}</strong></div>
        <div className="workspace-summary" style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <span><strong>Status:</strong> {manuscript.status}</span>
          <span><strong>Submitted:</strong> {new Date(manuscript.submittedAt).toLocaleDateString()}</span>
          <span><strong>Author:</strong> {manuscript.author}</span>
        </div>
      </div>

      <div className="workspace-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>

        <div style={{ display: "grid", gap: 24 }}>
          <div className="panel" style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0 }}>Manuscript Files</h3>
            {manuscript.files?.manuscript && (
              <div
                className="metric"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer" }}
                onClick={() => downloadFile(manuscript.files.manuscript, `Manuscript_${manuscript.id}`)}
              >
                {downloadLoading === `Manuscript_${manuscript.id}` ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                <span>Main manuscript</span>
              </div>
            )}
            {manuscript.files?.cover_letter && (
              <div
                className="metric"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer" }}
                onClick={() => downloadFile(manuscript.files.cover_letter, `CoverLetter_${manuscript.id}`)}
              >
                {downloadLoading === `CoverLetter_${manuscript.id}` ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                <span>Cover letter</span>
              </div>
            )}
            {manuscript.files?.circulating && (
              <div
                className="metric"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer" }}
                onClick={() => downloadFile(manuscript.files.circulating, `Circulating_${manuscript.id}`)}
              >
                {downloadLoading === `Circulating_${manuscript.id}` ? (
                  <Loader size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                <span>Circulating file</span>
              </div>
            )}
            {!manuscript.files?.manuscript && !manuscript.files?.cover_letter && !manuscript.files?.circulating && (
              <div style={{ color: "#6b7280", padding: "8px 0" }}>No files available</div>
            )}
          </div>

          <div className="panel" style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0 }}>Assigned Reviewers</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: 8 }}>Reviewer</th>
                    <th style={{ padding: 8 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewers.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: 8, textAlign: "center" }}>No reviewers assigned</td></tr>
                  ) : (
                    reviewers.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: 8 }}>{r.name}</td>
                        <td style={{ padding: 8 }}>{r.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => navigate("/editor/assign-reviewers")}
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "8px 12px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <Users size={16} /> Assign more reviewers
            </button>
          </div>

          {/* Reviews Summary - Clickable */}
          <div className="panel" style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0 }}>Reviews Summary</h3>
            {totalReviews === 0 ? (
              <div style={{ color: "#6b7280", padding: "8px 0", fontSize: "0.95rem" }}>
                No reviewers assigned yet.
              </div>
            ) : (
              <>
                <div 
                  className="metric clickable" 
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #f3f4f6", cursor: completedReviews > 0 ? "pointer" : "default" }}
                  onClick={() => {
                    if (completedReviews > 0) {
                      const completed = reviewers.filter(r => r.completed_at);
                      setSelectedReview(completed[0]);
                    }
                  }}
                >
                  <CheckCircle size={18} color="#16a34a" />
                  <span><strong>{completedReviews}</strong> reviews submitted</span>
                </div>
                <div className="metric" style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                  <Clock size={18} color="#f59e0b" />
                  <span><strong>{pendingReviews}</strong> reviews pending</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 8 }}>
                  Total assigned: {totalReviews} reviewer{totalReviews > 1 ? "s" : ""}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 24 }}>
          <div className="panel" style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0 }}>Editorial Actions</h3>
            <div className="workspace-actions">
              <button
                onClick={() => handleDecision("accept")}
                disabled={actionLoading === "accept"}
                style={{
                  width: "100%",
                  marginBottom: 10,
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid #16a34a",
                  background: actionLoading === "accept" ? "#d1d5db" : "#ecfdf5",
                  color: actionLoading === "accept" ? "#6b7280" : "#166534",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: actionLoading === "accept" ? "not-allowed" : "pointer",
                  opacity: actionLoading === "accept" ? 0.6 : 1,
                }}
              >
                {actionLoading === "accept" ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Recommend Acceptance
              </button>
              <button
                onClick={() => handleDecision("minor_revision")}
                disabled={actionLoading === "minor_revision"}
                style={{
                  width: "100%",
                  marginBottom: 10,
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid #f59e0b",
                  background: actionLoading === "minor_revision" ? "#d1d5db" : "#fffbeb",
                  color: actionLoading === "minor_revision" ? "#6b7280" : "#92400e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: actionLoading === "minor_revision" ? "not-allowed" : "pointer",
                  opacity: actionLoading === "minor_revision" ? 0.6 : 1,
                }}
              >
                {actionLoading === "minor_revision" ? <Loader size={16} className="animate-spin" /> : null}
                Request Minor Revision
              </button>
              <button
                onClick={() => handleDecision("major_revision")}
                disabled={actionLoading === "major_revision"}
                style={{
                  width: "100%",
                  marginBottom: 10,
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid #f59e0b",
                  background: actionLoading === "major_revision" ? "#d1d5db" : "#fffbeb",
                  color: actionLoading === "major_revision" ? "#6b7280" : "#92400e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: actionLoading === "major_revision" ? "not-allowed" : "pointer",
                  opacity: actionLoading === "major_revision" ? 0.6 : 1,
                }}
              >
                {actionLoading === "major_revision" ? <Loader size={16} className="animate-spin" /> : null}
                Request Major Revision
              </button>
              <button
                onClick={() => handleDecision("reject")}
                disabled={actionLoading === "reject"}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid #dc2626",
                  background: actionLoading === "reject" ? "#d1d5db" : "#fef2f2",
                  color: actionLoading === "reject" ? "#6b7280" : "#991b1b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: actionLoading === "reject" ? "not-allowed" : "pointer",
                  opacity: actionLoading === "reject" ? 0.6 : 1,
                }}
              >
                {actionLoading === "reject" ? <Loader size={16} className="animate-spin" /> : <XCircle size={16} />}
                Recommend Rejection
              </button>
            </div>
          </div>

          <div className="panel" style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0 }}>Editor Notes</h3>
            <textarea
              placeholder="Internal notes (not visible to authors)..."
              style={{
                width: "100%",
                minHeight: 120,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>
      </div>

      {/* Review Details Modal */}
      {selectedReview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setSelectedReview(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 600,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Review Details</h3>
              <button onClick={() => setSelectedReview(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <p><strong>Reviewer:</strong> {selectedReview.name}</p>
            <p><strong>Status:</strong> {selectedReview.status}</p>
            {selectedReview.completed_at && (
              <p><strong>Completed:</strong> {new Date(selectedReview.completed_at).toLocaleDateString()}</p>
            )}
            {selectedReview.scores && (
              <>
                <hr />
                <h4>Scores</h4>
                <p><strong>Originality:</strong> {selectedReview.scores.originality ?? 'N/A'}</p>
                <p><strong>Methodology:</strong> {selectedReview.scores.methodology ?? 'N/A'}</p>
                <p><strong>Clarity:</strong> {selectedReview.scores.clarity ?? 'N/A'}</p>
                <p><strong>Relevance:</strong> {selectedReview.scores.relevance ?? 'N/A'}</p>
                <p><strong>Recommendation:</strong> {selectedReview.scores.recommendation ?? 'N/A'}</p>
                {selectedReview.scores.comments_to_author && (
                  <>
                    <h4>Comments to Author</h4>
                    <p style={{ background: "#f8fafc", padding: 10, borderRadius: 6 }}>{selectedReview.scores.comments_to_author}</p>
                  </>
                )}
                {selectedReview.scores.confidential_comments && (
                  <>
                    <h4>Confidential Comments (Editor only)</h4>
                    <p style={{ background: "#fef3c7", padding: 10, borderRadius: 6 }}>{selectedReview.scores.confidential_comments}</p>
                  </>
                )}
              </>
            )}
            <button onClick={() => setSelectedReview(null)} style={{ marginTop: 16, padding: "8px 16px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorManuscriptWorkspace;
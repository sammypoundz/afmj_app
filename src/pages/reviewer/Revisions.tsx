import { type FC, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, FileText, CheckCircle, RotateCcw, AlertTriangle } from "lucide-react";

const API = "https://afmjonline.com/api/reviewerApi.php"; // adjust if needed

interface RevisionItem {
  entryId: number;
  manuscriptId: string;
  manuscript_id: number;
  title: string;
  revisionNumber: number;
  originalComment: string;
  authorResponse: string | null;
  submittedAt: string;
  revisedFile: string | null;
  responseFile: string | null;
  abstract: string | null;
  background: string | null;
  objective: string | null;
  conclusion: string | null;
  studyType: string | null;
  authorName: string;
}

const Spinner = () => (
  <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid #ccc", borderTopColor: "#0d6efd", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
);

const globalStyle = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ReviewerRevisions: FC = () => {
  const navigate = useNavigate();
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<RevisionItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [concernSubmitting, setConcernSubmitting] = useState(false);

  const fetchRevisions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}?action=listRevisions`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setRevisions(data);
    } catch (err) {
      console.error("Failed to load revisions:", err);
      setError("Could not load revisions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisions();
  }, []);

  const handleReviewClick = (rev: RevisionItem) => {
    setSelectedRevision(rev);
    setModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRevision) return;
    setApproveSubmitting(true);
    try {
      const res = await fetch(`${API}?action=markRevisionAddressed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: selectedRevision.entryId }),
      });
      const data = await res.json();
      if (data.success) {
        setRevisions(prev => prev.filter(r => r.entryId !== selectedRevision.entryId));
        setModalOpen(false);
      } else {
        alert(data.error || "Failed to mark as addressed");
      }
    } catch (err) {
      alert("An error occurred while submitting your response.");
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleConcern = async () => {
    if (!selectedRevision) return;
    setConcernSubmitting(true);
    try {
      // 1. Create a new review for this manuscript (auto‑accepted)
      const createRes = await fetch(`${API}?action=createReviewForManuscript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manuscript_id: selectedRevision.manuscript_id })
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create review");

      // 2. Close the modal and navigate to the submission page with the new review ID
      setModalOpen(false);
      navigate(`/reviewer/submit/${createData.review_id}`, {
        state: { fromRevision: true, entryId: selectedRevision.entryId }
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConcernSubmitting(false);
    }
  };

  const anySubmitting = approveSubmitting || concernSubmitting;

  return (
    <>
      <style>{globalStyle}</style>
      <div className="page">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <h2>Revisions to Review</h2>
          <button
            onClick={fetchRevisions}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "#f3f4f6",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RotateCcw size={16} />
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
          {!loading && !error && revisions.length === 0 && (
            <p style={{ padding: "16px", color: "#6b7280", textAlign: "center" }}>
              No pending revisions at this time.
            </p>
          )}
          {!loading && !error && revisions.length > 0 && (
            revisions.map((rev) => (
              <div
                key={rev.entryId}
                className="list-item"
                style={{
                  marginBottom: "12px",
                  borderBottom: "1px solid #eee",
                  paddingBottom: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1 }}>
                  <strong>
                    {rev.manuscriptId} (Revision {rev.revisionNumber})
                  </strong>
                  <p style={{ margin: "4px 0" }}>{rev.title}</p>
                  <small>
                    Original comment: {rev.originalComment.substring(0, 100)}
                    {rev.originalComment.length > 100 && "…"}
                  </small>
                  <br />
                  <small>Submitted: {new Date(rev.submittedAt).toLocaleDateString()}</small>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => handleReviewClick(rev)}
                  style={{ marginLeft: "16px" }}
                >
                  Review Revision
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {modalOpen && selectedRevision && (
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
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                maxWidth: "800px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "24px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                position: "relative",
              }}
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

              <h3 style={{ marginTop: 0 }}>
                {selectedRevision.manuscriptId} – Revision {selectedRevision.revisionNumber}
              </h3>
              <h4>{selectedRevision.title}</h4>
              <p>
                <strong>Author:</strong> {selectedRevision.authorName}
              </p>
              <p>
                <strong>Study Type:</strong> {selectedRevision.studyType}
              </p>

              <hr />

              <h5>Original Comment</h5>
              <div
                style={{
                  background: "#f9fafb",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                }}
              >
                {selectedRevision.originalComment}
              </div>

              <h5>Author Response</h5>
              <div
                style={{
                  background: "#f0fdf4",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                }}
              >
                {selectedRevision.authorResponse || <em>No response provided</em>}
              </div>

              <h5>Files</h5>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
                {selectedRevision.revisedFile && (
                  <a
                    href={`/${selectedRevision.revisedFile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#e0e7ff",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#3730a3",
                    }}
                  >
                    <FileText size={18} /> Revised Manuscript
                  </a>
                )}
                {selectedRevision.responseFile && (
                  <a
                    href={`/${selectedRevision.responseFile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#d1fae5",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "#065f46",
                    }}
                  >
                    <FileText size={18} /> Response to Reviewers
                  </a>
                )}
              </div>

              <h5>Manuscript Details</h5>
              <div style={{ marginBottom: "16px" }}>
                {selectedRevision.abstract && (
                  <>
                    <strong>Abstract</strong>
                    <p>{selectedRevision.abstract}</p>
                  </>
                )}
                {selectedRevision.background && (
                  <>
                    <strong>Background</strong>
                    <p>{selectedRevision.background}</p>
                  </>
                )}
                {selectedRevision.objective && (
                  <>
                    <strong>Objective</strong>
                    <p>{selectedRevision.objective}</p>
                  </>
                )}
                {selectedRevision.conclusion && (
                  <>
                    <strong>Conclusion</strong>
                    <p>{selectedRevision.conclusion}</p>
                  </>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: "20px",
                }}
              >
                <button
                  className="btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={anySubmitting}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    background: "#f3f4f6",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConcern}
                  disabled={anySubmitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#f97316",
                    color: "#fff",
                    cursor: anySubmitting ? "not-allowed" : "pointer",
                    opacity: anySubmitting ? 0.7 : 1,
                  }}
                >
                  {concernSubmitting ? <Spinner /> : <AlertTriangle size={18} />}
                  {concernSubmitting ? "Processing..." : "Concern"}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={anySubmitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#16a34a",
                    color: "#fff",
                    cursor: anySubmitting ? "not-allowed" : "pointer",
                    opacity: anySubmitting ? 0.7 : 1,
                  }}
                >
                  {approveSubmitting ? <Spinner /> : <CheckCircle size={18} />}
                  {approveSubmitting ? "Processing..." : "Approve"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReviewerRevisions;
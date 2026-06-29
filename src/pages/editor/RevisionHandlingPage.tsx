import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Send, X, ArrowLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

interface RevisionItem {
  manuscriptId: number;
  manuscriptTitle: string;
  author: string;
  revisionNumber: number;
  reviewerComment: string;
  submittedAt: string;
  entryId: number;
}

const UPLOAD_URL = "https://vinosschool.com/api/upload.php";

const RevisionHandlingPage = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedManuscript, setSelectedManuscript] = useState<RevisionItem | null>(null);
  const [feedback, setFeedback] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchRevisions();
  }, [authFetch]);

  const fetchRevisions = async () => {
    try {
      const res = await authFetch(
        "https://vinosschool.com/api/editorApi.php?action=getRevisions"
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch revisions");
      }
      const data = await res.json();
      setRevisions(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not load revisions.");
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFeedback = (revision: RevisionItem) => {
    setSelectedManuscript(revision);
    setFeedback("");
    setAttachment(null);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachment(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(UPLOAD_URL, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.path;
  };

  const handleSubmitFeedback = async () => {
    if (!selectedManuscript) return;
    if (!feedback.trim()) {
      toast.error("Please provide feedback comments.");
      return;
    }

    setSending(true);
    const toastId = toast.loading("Sending revision feedback...");

    try {
      let attachmentPath = null;
      if (attachment) {
        attachmentPath = await uploadFile(attachment);
      }

      const payload = {
        entry_id: selectedManuscript.entryId,
        manuscript_id: selectedManuscript.manuscriptId,
        feedback: feedback,
        attachment: attachmentPath,
      };

      const res = await authFetch(
        "https://vinosschool.com/api/editorApi.php?action=sendRevisionFeedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send feedback");
      }

      toast.success("Feedback sent to author!", { id: toastId });
      setModalOpen(false);
      // Refresh the list
      await fetchRevisions();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 30, height: 30, border: "3px solid #e5e7eb", borderTop: "3px solid #16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "#dc2626" }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "6px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
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
        <h2 style={{ margin: 0 }}>Handle Author Revisions</h2>
      </div>

      {revisions.length === 0 ? (
        <div style={{ padding: 20, background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
          No pending revisions.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {revisions.map((rev) => (
            <div
              key={rev.entryId}
              style={{
                border: "1px solid #e5e7eb",
                padding: 18,
                borderRadius: 12,
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={18} />
                <h4 style={{ margin: 0 }}>{rev.manuscriptTitle}</h4>
              </div>

              <div style={{ marginTop: 6, color: "#6b7280" }}>
                Author: {rev.author}
              </div>
              <div style={{ marginTop: 4, fontSize: 14, color: "#6b7280" }}>
                Revision #{rev.revisionNumber} • Submitted: {new Date(rev.submittedAt).toLocaleDateString()}
              </div>

              {rev.reviewerComment && (
                <div style={{ marginTop: 10, background: "#f8fafc", padding: 10, borderRadius: 6 }}>
                  <strong>Reviewer Comment:</strong>
                  <p style={{ margin: "4px 0 0", color: "#374151" }}>{rev.reviewerComment}</p>
                </div>
              )}

              <button
                onClick={() => handleSendFeedback(rev)}
                style={{
                  marginTop: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #16a34a",
                  background: "#ecfdf5",
                  cursor: "pointer",
                  color: "#166534",
                }}
              >
                <Send size={16} />
                Send Revision Feedback
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal for sending feedback */}
      {modalOpen && selectedManuscript && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 60,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 24,
              maxWidth: 500,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Send Revision Feedback</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <p><strong>Manuscript:</strong> {selectedManuscript.manuscriptTitle}</p>
            <p><strong>Author:</strong> {selectedManuscript.author}</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>Feedback Comments *</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={5}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                placeholder="Provide detailed feedback to the author..."
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>Attachment (optional)</label>
              <input type="file" onChange={handleFileChange} style={{ display: "block" }} />
              {attachment && (
                <div style={{ marginTop: 6, fontSize: 14, color: "#16a34a" }}>
                  Selected: {attachment.name}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={sending || !feedback.trim()}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#16a34a",
                  color: "#fff",
                  cursor: sending || !feedback.trim() ? "not-allowed" : "pointer",
                  opacity: sending || !feedback.trim() ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {sending ? "Sending..." : <Send size={16} />}
                {sending ? "Sending..." : "Send Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisionHandlingPage;
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Upload,
  X,
  Clock,
  User,
  AlertCircle,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = "https://afmjonline.com/api/authorApi.php";

interface RevisionEntry {
  entry_id: number;
  revision_id: number;
  revision_number: number;
  submitted_at: string;
  reviewer_comment: string;
  author_response: string | null;
  addressed: boolean;
  reviewer_name: string | null;
}

interface ManuscriptRevision {
  manuscript: {
    id: number;
    slug: string;
    title: string;
    status: string;
  };
  revisionEntries: RevisionEntry[];
}

const styles = {
  page: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "24px 16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  backButton: {
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
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
    marginBottom: "16px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  manuscriptInfo: {
    flex: 1,
  },
  manuscriptId: {
    fontFamily: "monospace",
    fontSize: "0.85rem",
    color: "#16a34a",
    background: "#f0fdf4",
    padding: "2px 10px",
    borderRadius: "20px",
    display: "inline-block",
    marginBottom: "6px",
  },
  manuscriptTitle: {
    fontSize: "1.2rem",
    fontWeight: 600,
    color: "#0f172a",
    margin: "0 0 4px 0",
  },
  metaRow: {
    display: "flex",
    gap: "16px",
    fontSize: "0.85rem",
    color: "#64748b",
    marginTop: "4px",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  statusBadge: (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      "submitted": { bg: "#e2e8f0", text: "#475569" },
      "under_review": { bg: "#fef9c3", text: "#eab308" },
      "accepted": { bg: "#dcfce7", text: "#16a34a" },
      "rejected": { bg: "#fee2e2", text: "#dc2626" },
      "published": { bg: "#dcfce7", text: "#16a34a" },
    };
    const color = colors[status] || { bg: "#e2e8f0", text: "#475569" };
    return {
      background: color.bg,
      color: color.text,
      padding: "4px 12px",
      borderRadius: "40px",
      fontSize: "0.8rem",
      fontWeight: 500,
    };
  },
  expandButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
    padding: "8px",
    borderRadius: "8px",
    transition: "background 0.2s",
  },
  commentsSection: {
    marginTop: "16px",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0",
  },
  commentCard: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px",
    border: "1px solid #e2e8f0",
  },
  commentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  reviewerName: {
    fontWeight: 600,
    color: "#0f172a",
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap" as const,
  },
  commentDate: {
    fontSize: "0.8rem",
    color: "#64748b",
  },
  commentText: {
    color: "#1e293b",
    lineHeight: 1.5,
    marginBottom: "8px",
  },
  responseText: {
    background: "#fff",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    fontSize: "0.9rem",
    color: "#475569",
  },
  uploadSection: {
    marginTop: "20px",
  },
  fileInput: {
    display: "none",
  },
  fileArea: {
    border: "2px dashed #e2e8f0",
    borderRadius: "8px",
    padding: "16px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "background 0.2s",
    marginBottom: "12px",
  },
  fileName: {
    fontSize: "0.9rem",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#f8fafc",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    marginBottom: "8px",
  },
  removeFileBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#dc2626",
  },
  submitButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "40px",
    fontSize: "1rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "48px 24px",
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    color: "#64748b",
  },
  messageArea: {
    marginBottom: "16px",
  },
  messageInput: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
    resize: "vertical" as const,
    minHeight: "80px",
    fontFamily: "inherit",
  },
  submittedMessage: {
    background: "#f0fdf4",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #16a34a",
    marginTop: "8px",
    color: "#166534",
  },
  allAddressedMessage: {
    marginTop: "20px",
    textAlign: "center" as const,
    color: "#16a34a",
  },
};

const entryStatusBadge = (addressed: boolean) => ({
  background: addressed ? "#dcfce7" : "#fef9c3",
  color: addressed ? "#16a34a" : "#eab308",
  padding: "2px 8px",
  borderRadius: "40px",
  fontSize: "0.7rem",
  fontWeight: 500,
  marginLeft: "8px",
});

const AuthorRevisions = () => {
  const navigate = useNavigate();
  const [revisions, setRevisions] = useState<ManuscriptRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedManuscriptId, setExpandedManuscriptId] = useState<number | null>(null);
  const [files, setFiles] = useState<{
    [manuscriptId: number]: { revised: File | null; response: File | null };
  }>({});
  const [responseMessages, setResponseMessages] = useState<{ [key: number]: string }>({});
  const [submitting, setSubmitting] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchRevisions();
  }, []);

  const fetchRevisions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?action=getRevisions`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch revisions");
      }
      const data = await res.json();
      setRevisions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (manuscriptId: number) => {
    setExpandedManuscriptId(expandedManuscriptId === manuscriptId ? null : manuscriptId);
  };

  const handleFileChange = (
    manuscriptId: number,
    type: "revised" | "response",
    file: File | null
  ) => {
    setFiles((prev) => ({
      ...prev,
      [manuscriptId]: {
        ...prev[manuscriptId],
        [type]: file,
      },
    }));
  };

  const removeFile = (manuscriptId: number, type: "revised" | "response") => {
    setFiles((prev) => ({
      ...prev,
      [manuscriptId]: {
        ...prev[manuscriptId],
        [type]: null,
      },
    }));
  };

  const handleResponseMessageChange = (manuscriptId: number, message: string) => {
    setResponseMessages((prev) => ({ ...prev, [manuscriptId]: message }));
  };

  const handleSubmit = async (manuscriptId: number) => {
    const manuscriptFiles = files[manuscriptId];
    const message = responseMessages[manuscriptId]?.trim();

    if (!manuscriptFiles?.revised) {
      toast.error("Please upload the revised manuscript");
      return;
    }
    if (!message) {
      toast.error("Please enter your response to the reviewer");
      return;
    }

    setSubmitting((prev) => ({ ...prev, [manuscriptId]: true }));
    const toastId = toast.loading("Submitting revision...");

    const formData = new FormData();
    formData.append("manuscript_id", manuscriptId.toString());
    formData.append("response_message", message);
    formData.append("revised_file", manuscriptFiles.revised);
    if (manuscriptFiles.response) {
      formData.append("response_file", manuscriptFiles.response);
    }

    try {
      const res = await fetch(`${API_BASE}?action=submitRevision`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Submission failed");

      toast.success("Revision submitted successfully!", { id: toastId });
      await fetchRevisions(); // Refresh the list
      // Clear files and message for this manuscript
      setFiles((prev) => ({ ...prev, [manuscriptId]: { revised: null, response: null } }));
      setResponseMessages((prev) => ({ ...prev, [manuscriptId]: "" }));
      setExpandedManuscriptId(null);
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setSubmitting((prev) => ({ ...prev, [manuscriptId]: false }));
    }
  };

  const goBack = () => navigate(-1);

  if (loading) {
    return (
      <div style={styles.page}>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
        <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
          <div style={{
            width: 40,
            height: 40,
            border: "4px solid #16a34a20",
            borderTop: "4px solid #16a34a",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "16px", borderRadius: "8px" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <div style={styles.header}>
        <button
          onClick={goBack}
          style={styles.backButton}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={styles.title}>Revisions Required</h1>
      </div>

      {revisions.length === 0 ? (
        <div style={styles.emptyState}>
          <AlertCircle size={48} color="#94a3b8" />
          <p style={{ marginTop: "16px", fontSize: "1.1rem" }}>
            No revisions pending at the moment.
          </p>
        </div>
      ) : (
        revisions.map((item) => {
          const man = item.manuscript;
          const isExpanded = expandedManuscriptId === man.id;
          const isSubmitting = submitting[man.id] || false;
          const hasPending = item.revisionEntries.some(entry => !entry.addressed);
          const pendingCount = item.revisionEntries.filter(entry => !entry.addressed).length;

          return (
            <div key={man.id} style={styles.card}>
              {/* Header */}
              <div style={styles.cardHeader} onClick={() => toggleExpand(man.id)}>
                <div style={styles.manuscriptInfo}>
                  <span style={styles.manuscriptId}>{man.slug}</span>
                  <h3 style={styles.manuscriptTitle}>{man.title}</h3>
                  <div style={styles.metaRow}>
                    <span style={styles.metaItem}>
                      <Clock size={14} />
                      {pendingCount} pending comment{pendingCount !== 1 ? "s" : ""}
                    </span>
                    <span style={styles.metaItem}>
                      <User size={14} />
                      {item.revisionEntries[0]?.reviewer_name || "Reviewer"}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={styles.statusBadge(man.status)}>{man.status}</span>
                  <button style={styles.expandButton}>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={styles.commentsSection}>
                  {/* Revision entries */}
                  {item.revisionEntries.map((entry) => (
                    <div key={entry.entry_id} style={styles.commentCard}>
                      <div style={styles.commentHeader}>
                        <span style={styles.reviewerName}>
                          {entry.reviewer_name || "Reviewer"}
                          <span style={entryStatusBadge(entry.addressed)}>
                            {entry.addressed ? "Addressed" : "Pending"}
                          </span>
                        </span>
                        <span style={styles.commentDate}>
                          {new Date(entry.submitted_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={styles.commentText}>{entry.reviewer_comment}</p>
                      {entry.author_response && (
                        <div style={styles.submittedMessage}>
                          <strong>Your response:</strong> {entry.author_response}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* If there are pending entries, show the submission form */}
                  {hasPending ? (
                    <div style={styles.uploadSection}>
                      <h4 style={{ marginBottom: "12px", color: "#0f172a" }}>
                        Submit Your Revision
                      </h4>

                      {/* Response message (required) */}
                      <div style={styles.messageArea}>
                        <label style={{ fontWeight: 500, marginBottom: "4px", display: "block" }}>
                          <MessageSquare size={16} style={{ marginRight: "4px" }} />
                          Your response to reviewer *
                        </label>
                        <textarea
                          value={responseMessages[man.id] || ""}
                          onChange={(e) => handleResponseMessageChange(man.id, e.target.value)}
                          placeholder="Explain how you've addressed the reviewer's comments..."
                          style={styles.messageInput}
                          disabled={isSubmitting}
                          required
                        />
                      </div>

                      {/* Revised manuscript file */}
                      <input
                        type="file"
                        id={`revised-${man.id}`}
                        accept=".pdf,.doc,.docx"
                        style={styles.fileInput}
                        onChange={(e) =>
                          handleFileChange(man.id, "revised", e.target.files?.[0] || null)
                        }
                      />
                      {!files[man.id]?.revised ? (
                        <div
                          style={styles.fileArea}
                          onClick={() => document.getElementById(`revised-${man.id}`)?.click()}
                        >
                          <Upload size={24} color="#94a3b8" />
                          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
                            Click to upload revised manuscript *
                          </p>
                        </div>
                      ) : (
                        <div style={styles.fileName}>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <FileText size={16} />
                            {files[man.id].revised!.name}
                          </span>
                          <button
                            style={styles.removeFileBtn}
                            onClick={() => removeFile(man.id, "revised")}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      {/* Response letter file (optional) */}
                      <input
                        type="file"
                        id={`response-${man.id}`}
                        accept=".pdf,.doc,.docx,.txt"
                        style={styles.fileInput}
                        onChange={(e) =>
                          handleFileChange(man.id, "response", e.target.files?.[0] || null)
                        }
                      />
                      {!files[man.id]?.response ? (
                        <div
                          style={styles.fileArea}
                          onClick={() => document.getElementById(`response-${man.id}`)?.click()}
                        >
                          <Upload size={24} color="#94a3b8" />
                          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
                            Upload response letter (optional)
                          </p>
                        </div>
                      ) : (
                        <div style={styles.fileName}>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <FileText size={16} />
                            {files[man.id].response!.name}
                          </span>
                          <button
                            style={styles.removeFileBtn}
                            onClick={() => removeFile(man.id, "response")}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => handleSubmit(man.id)}
                        disabled={isSubmitting}
                        style={{
                          ...styles.submitButton,
                          ...(isSubmitting ? styles.submitButtonDisabled : {}),
                        }}
                        onMouseEnter={(e) =>
                          !isSubmitting && (e.currentTarget.style.background = "#0d9488")
                        }
                        onMouseLeave={(e) =>
                          !isSubmitting && (e.currentTarget.style.background = "#16a34a")
                        }
                      >
                        {isSubmitting ? "Submitting..." : "Submit Revision"}
                      </button>
                    </div>
                  ) : (
                    // All comments addressed – show a message
                    <div style={styles.allAddressedMessage}>
                      <CheckCircle size={32} color="#16a34a" />
                      <p style={{ marginTop: "8px", fontWeight: 500 }}>
                        All revisions have been submitted.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default AuthorRevisions;
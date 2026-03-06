import type { FC } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Eye,
  UserCheck,
  User,
  FileText,
  X,
  Check,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Edit3,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  History,
} from "lucide-react";
import { useState, useEffect } from "react";

/* ================= API ================= */
const API = "https://afmjonline.com/api/EICmanusciptsapi.php";

/* ================= Global Styles for Animations ================= */
const GlobalStyles = () => (
  <style>{`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .spinner-animation {
      animation: spin 0.7s linear infinite;
    }
  `}</style>
);

/* ================= Spinner ================= */
const Spinner = ({ dark = false }: { dark?: boolean }) => (
  <span
    className="spinner-animation"
    style={{
      width: 14,
      height: 14,
      border: `2px solid ${dark ? "#198754" : "#fff"}`,
      borderTop: "2px solid transparent",
      borderRadius: "50%",
      display: "inline-block",
    }}
  />
);

/* ================= Types ================= */
interface RevisionEntry {
  reviewer: string;
  reviewerComment: string;
  authorResponse: string;
  addressed: boolean;
}

interface Revision {
  id?: number;
  revisionNumber: number;
  submittedAt: string;
  revisedFile: string;
  responseFile: string;
  entries: RevisionEntry[];
  entryStats?: {
    total: number;
    addressed: number;
    pending: number;
  };
}

interface Manuscript {
  id: number;
  title: string;
  authors: string;
  studyType: string | null;
  status: string;
  date: string;
  abstract?: string | null;
  background?: string | null;
  conclusion?: string | null;
  objective?: string | null;
  reviewers?: string[];
  editors?: string[];
  reviewerProgress?: ReviewerProgress[];
  revisions?: Revision[];
  editorId?: number | null;
  editor?: string;
  // New fields from API
  pendingReviews?: number;
  hasRevisions?: boolean;
  hasUploadedRevision?: boolean;
}

interface Reviewer {
  id: number;
  name: string;
}

interface Editor {
  id: number;
  name: string;
}

type ReviewStatus = "not_opened" | "reviewing" | "reviewed";

// Updated ReviewerProgress to include scores and recommendation
interface ReviewerProgress {
  reviewer: string;
  status: ReviewStatus;
  comment?: string;
  attachment?: string;
  scores?: {
    originality: number | null;
    methodology: number | null;
    clarity: number | null;
    relevance: number | null;
    commentsToAuthor: string | null;
    confidentialComments: string | null;
    recommendation: string | null;
  };
}

/* ================= Helpers ================= */
const deslugify = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const formatManuscriptId = (id: number) =>
  `AFMJ-2026-${id.toString().padStart(3, "0")}`;

const glassBtnStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(6px)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  borderRadius: "6px",
  padding: "6px",
  cursor: "pointer",
  transition: "0.2s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const hoverGlass = (e: React.MouseEvent<HTMLButtonElement>) => {
  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.2)";
};
const leaveGlass = (e: React.MouseEvent<HTMLButtonElement>) => {
  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.1)";
};

/* ================= Pagination Component ================= */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px",
        borderTop: "1px solid #e5e7eb",
        marginTop: "16px",
      }}
    >
      <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
        Showing {startItem} to {endItem} of {totalItems} entries
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
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
              onClick={() => onPageChange(page)}
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
          onClick={() => onPageChange(currentPage + 1)}
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
  );
};

/* ================= Reviewer Modal ================= */
interface ReviewerModalProps {
  reviewers: Reviewer[];
  currentReviewers: string[];
  onClose: () => void;
  onSave: (selected: string[]) => Promise<void>;
}

const ReviewerSelectionModal: FC<ReviewerModalProps> = ({
  reviewers,
  currentReviewers,
  onClose,
  onSave,
}) => {
  const [selected, setSelected] = useState<string[]>([...currentReviewers]);
  const [saving, setSaving] = useState(false);

  const toggleReviewer = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1100,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "90%",
          maxWidth: "600px",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Select Reviewers</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "12px",
            marginTop: "16px",
          }}
        >
          {reviewers.map((r) => (
            <div
              key={r.id}
              onClick={() => toggleReviewer(r.name)}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: selected.includes(r.name) ? "2px solid #0d6efd" : "1px solid #d1d5db",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                background: selected.includes(r.name) ? "#e7f1ff" : "#fff",
                transition: "0.2s",
              }}
            >
              <UserCheck size={32} color={selected.includes(r.name) ? "#0d6efd" : "#6b7280"} />
              <span style={{ marginTop: "8px", fontSize: "0.9rem", textAlign: "center" }}>{r.name}</span>
              {selected.includes(r.name) && <Check size={16} style={{ marginTop: "6px", color: "#0d6efd" }} />}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "#f3f4f6",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave(selected);
              setSaving(false);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: "#0d6efd",
              color: "#fff",
              cursor: "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Spinner /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= Revision History Modal ================= */
interface RevisionHistoryModalProps {
  manuscriptId: number;
  onClose: () => void;
  onUpdated: () => void;
  allReviewers: Reviewer[];
}

const RevisionHistoryModal: FC<RevisionHistoryModalProps> = ({
  manuscriptId,
  onClose,
  onUpdated,
  allReviewers,
}) => {
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRevisions, setExpandedRevisions] = useState<number[]>([0]); // First revision expanded by default
  const [refreshing, setRefreshing] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  const loadData = async () => {
    try {
      const response = await fetch(`${API}?action=show&id=${manuscriptId}`);
      const data = await response.json();
      setManuscript(data);
    } catch (err) {
      console.error("Failed to load revision history:", err);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };
    load();
  }, [manuscriptId]);

  const toggleRevision = (index: number) => {
    setExpandedRevisions(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    onUpdated();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (!manuscript) return null;

  const revisions = manuscript.revisions || [];
  const hasRevisions = revisions.length > 0;

  // Find the latest revision (highest revisionNumber)
  const latestRevision = revisions.length > 0
    ? revisions.reduce((latest, rev) =>
        rev.revisionNumber > latest.revisionNumber ? rev : latest
      , revisions[0])
    : null;

  const pendingReviewersFromLatest = latestRevision
    ? latestRevision.entries
        .filter(e => !e.addressed)
        .map(e => e.reviewer)
    : [];

  const hasPending = pendingReviewersFromLatest.length > 0;

  return (
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
          background: "#fefefe",
          borderRadius: "12px",
          width: "95%",
          maxWidth: "900px",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          borderTop: "6px solid #f59e0b",
          position: "relative",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            zIndex: 10,
          }}
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: "24px", paddingRight: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <History size={28} color="#f59e0b" />
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#111827",
                margin: 0,
              }}
            >
              Revision History
            </h2>
          </div>
          <p style={{ color: "#6b7280", marginBottom: "4px", fontSize: "1rem" }}>
            <strong>{manuscript.title}</strong>
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            ID: {formatManuscriptId(manuscript.id)} | Authors: {manuscript.authors} | 
            Total Revisions: {revisions.length}
          </p>
        </div>

        {/* No Revisions State */}
        {!hasRevisions && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#6b7280",
              background: "#f9fafb",
              borderRadius: "12px",
              border: "2px dashed #e5e7eb",
            }}
          >
            <Edit3 size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
            <p>No revision history available for this manuscript.</p>
          </div>
        )}

        {/* Revisions Timeline */}
        {hasRevisions && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {revisions.map((rev, index) => {
              const isExpanded = expandedRevisions.includes(index);
              const totalEntries = rev.entries?.length || 0;
              const addressedEntries = rev.entries?.filter(e => e.addressed).length || 0;
              const allAddressed = totalEntries > 0 && addressedEntries === totalEntries;

              return (
                <div
                  key={rev.id || index}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#ffffff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  {/* Revision Header - Clickable */}
                  <div
                    onClick={() => toggleRevision(index)}
                    style={{
                      padding: "16px 20px",
                      background: allAddressed 
                        ? "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)"
                        : "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: isExpanded ? "1px solid #e5e7eb" : "none",
                      transition: "0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          background: allAddressed ? "#10b981" : "#f59e0b",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          fontSize: "1.2rem",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                      >
                        {rev.revisionNumber}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: allAddressed ? "#065f46" : "#92400e", fontSize: "1.1rem" }}>
                          Revision {rev.revisionNumber}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: allAddressed ? "#059669" : "#a16207", marginTop: "2px" }}>
                          Submitted on {rev.submittedAt}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {totalEntries > 0 && (
                        <span
                          style={{
                            padding: "6px 14px",
                            borderRadius: "999px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            background: allAddressed ? "#d1fae5" : "#fef3c7",
                            color: allAddressed ? "#065f46" : "#92400e",
                            border: `1px solid ${allAddressed ? "#a7f3d0" : "#fde68a"}`,
                          }}
                        >
                          {addressedEntries}/{totalEntries} Addressed
                        </span>
                      )}
                      <div style={{ 
                        transform: isExpanded ? "rotate(-90deg)" : "rotate(90deg)",
                        transition: "transform 0.2s",
                        color: allAddressed ? "#065f46" : "#92400e"
                      }}>
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ padding: "20px" }}>
                      {/* Files Section */}
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginBottom: "20px",
                          flexWrap: "wrap",
                        }}
                      >
                        {rev.revisedFile && (
                          <a
                            href={`/${rev.revisedFile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "12px 18px",
                              background: "#e0e7ff",
                              color: "#3730a3",
                              borderRadius: "8px",
                              textDecoration: "none",
                              fontSize: "0.9rem",
                              fontWeight: 500,
                              transition: "0.2s",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText size={18} />
                            <span>Revised Manuscript</span>
                            <Paperclip size={16} style={{ marginLeft: "4px", opacity: 0.7 }} />
                          </a>
                        )}

                        {rev.responseFile && (
                          <a
                            href={`/${rev.responseFile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "12px 18px",
                              background: "#d1fae5",
                              color: "#065f46",
                              borderRadius: "8px",
                              textDecoration: "none",
                              fontSize: "0.9rem",
                              fontWeight: 500,
                              transition: "0.2s",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText size={18} />
                            <span>Response to Reviewers</span>
                            <Paperclip size={16} style={{ marginLeft: "4px", opacity: 0.7 }} />
                          </a>
                        )}
                      </div>

                      {/* Reviewer Comments & Author Responses */}
                      {rev.entries && rev.entries.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                          <h4
                            style={{
                              fontSize: "1rem",
                              fontWeight: 600,
                              color: "#374151",
                              marginBottom: "4px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <UserCheck size={18} color="#0d6efd" />
                            Reviewer Comments & Author Responses
                          </h4>

                          {rev.entries.map((entry, entryIndex) => (
                            <div
                              key={entryIndex}
                              style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: "10px",
                                overflow: "hidden",
                                background: "#f9fafb",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                              }}
                            >
                              {/* Reviewer Info */}
                              <div
                                style={{
                                  padding: "12px 16px",
                                  background: "#ffffff",
                                  borderBottom: "1px solid #e5e7eb",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      borderRadius: "50%",
                                      background: "#e0e7ff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <User size={16} color="#0d6efd" />
                                  </div>
                                  <span style={{ fontWeight: 600, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                                    {entry.reviewer}
                                    {!entry.addressed && (
                                      <span style={{
                                        fontSize: "0.7rem",
                                        background: "#f59e0b",
                                        color: "#fff",
                                        padding: "2px 6px",
                                        borderRadius: "12px",
                                        fontWeight: 600,
                                        marginLeft: "4px"
                                      }}>
                                        Revision Requested
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "6px 12px",
                                    borderRadius: "999px",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    background: entry.addressed ? "#d1fae5" : "#fee2e2",
                                    color: entry.addressed ? "#065f46" : "#991b1b",
                                    border: `1px solid ${entry.addressed ? "#a7f3d0" : "#fecaca"}`,
                                  }}
                                >
                                  {entry.addressed ? <Check size={14} /> : <X size={14} />}
                                  {entry.addressed ? "Addressed" : "Pending"}
                                </span>
                              </div>

                              {/* Comment & Response */}
                              <div style={{ padding: "16px" }}>
                                {/* Reviewer Comment */}
                                <div style={{ marginBottom: "16px" }}>
                                  <div
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#6b7280",
                                      marginBottom: "8px",
                                      fontWeight: 600,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <Edit3 size={14} color="#9ca3af" />
                                    Reviewer Comment
                                  </div>
                                  <div
                                    style={{
                                      color: "#374151",
                                      lineHeight: 1.6,
                                      padding: "14px",
                                      background: "#ffffff",
                                      borderRadius: "8px",
                                      border: "1px solid #e5e7eb",
                                      fontSize: "0.95rem",
                                    }}
                                  >
                                    {entry.reviewerComment || (
                                      <em style={{ color: "#9ca3af" }}>No comment provided</em>
                                    )}
                                  </div>
                                </div>

                                {/* Author Response */}
                                <div>
                                  <div
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#6b7280",
                                      marginBottom: "8px",
                                      fontWeight: 600,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <CheckCircle size={14} color="#9ca3af" />
                                    Author Response
                                  </div>
                                  <div
                                    style={{
                                      color: "#374151",
                                      lineHeight: 1.6,
                                      padding: "14px",
                                      background: entry.addressed ? "#f0fdf4" : "#ffffff",
                                      borderRadius: "8px",
                                      border: entry.addressed ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                                      fontSize: "0.95rem",
                                    }}
                                  >
                                    {entry.authorResponse || (
                                      <em style={{ color: "#9ca3af" }}>No response provided yet</em>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "24px",
                            color: "#6b7280",
                            background: "#f9fafb",
                            borderRadius: "8px",
                          }}
                        >
                          <p>No detailed entries available for this revision.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "2px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "#f3f4f6",
                color: "#374151",
                cursor: refreshing ? "not-allowed" : "pointer",
                fontSize: "0.9rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: refreshing ? 0.7 : 1,
              }}
            >
              {refreshing ? <Spinner dark /> : <RotateCcw size={16} />}
              Refresh
            </button>

            {/* Reassign to Pending Reviewers button */}
            <button
              onClick={() => setShowReassignModal(true)}
              disabled={!hasPending || reassigning}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: !hasPending ? "#f3f4f6" : "#fff",
                color: !hasPending ? "#9ca3af" : "#374151",
                cursor: !hasPending ? "not-allowed" : "pointer",
                fontSize: "0.9rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: reassigning ? 0.7 : 1,
              }}
            >
              {reassigning ? <Spinner dark /> : <UserCheck size={16} />}
              Reassign to Pending Reviewers
            </button>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: "#0d6efd",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Reassign Modal */}
      {showReassignModal && (
        <ReviewerSelectionModal
          reviewers={allReviewers}
          currentReviewers={pendingReviewersFromLatest}
          onClose={() => setShowReassignModal(false)}
          onSave={async (selectedNames) => {
            setReassigning(true);
            const ids = selectedNames
              .map(name => allReviewers.find(r => r.name === name)?.id)
              .filter(Boolean) as number[];
            await fetch(`${API}?action=assignReviewers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ manuscript_id: manuscriptId, reviewers: ids }),
            });
            setReassigning(false);
            setShowReassignModal(false);
            onUpdated(); // reload revision data
          }}
        />
      )}
    </div>
  );
};

/* ================= Manuscript Modal (with detailed reviewer feedback) ================= */
interface ModalProps {
  manuscriptId: number;
  onClose: () => void;
  onUpdated: () => void;
}

const ManuscriptModal: FC<ModalProps> = ({ manuscriptId, onClose, onUpdated }) => {
  const navigate = useNavigate();

  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState<string | null>(null);
  const [assignedEditorId, setAssignedEditorId] = useState<number | null>(null);
  const [productionLoading, setProductionLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [m, rvs, eds] = await Promise.all([
          fetch(`${API}?action=show&id=${manuscriptId}`).then((r) => r.json()),
          fetch(`${API}?action=reviewers`).then((r) => r.json()),
          fetch(`${API}?action=editors`).then((r) => r.json()),
        ]);

        setManuscript(m);
        setReviewers(rvs);
        setEditors(eds);
        setAssignedEditorId(m.editorId || null);
      } catch (err) {
        console.error("Failed to load manuscript data:", err);
      }
      setLoading(false);
    };

    load();
  }, [manuscriptId]);

  if (loading)
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <Spinner />
      </div>
    );

  if (!manuscript) return null;

  const reviewerProgress: ReviewerProgress[] =
    manuscript.reviewerProgress ?? [];

  const normalizedStatus = manuscript.status?.toString().trim() || "";
  const isAccepted = normalizedStatus.toLowerCase() === "accepted";
  const isUnderReview = normalizedStatus.toLowerCase() === "under review";
  const isNewSubmission = normalizedStatus === "New Submissions";

  const handleAssignReviewers = async (selected: string[]) => {
    setBtnLoading("reviewers");
    const ids = selected
      .map((name) => reviewers.find((r) => r.name === name)?.id)
      .filter(Boolean) as number[];

    await fetch(`${API}?action=assignReviewers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manuscript_id: manuscript.id, reviewers: ids }),
    });
    
    setBtnLoading(null);
    setShowReviewerModal(false);
    onUpdated();
    onClose();
  };

  const handleToggleEditor = async (editorId: number) => {
    setBtnLoading(`editor-${editorId}`);
    
    try {
      if (assignedEditorId === editorId) {
        await fetch(`${API}?action=assignEditor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manuscript_id: manuscript.id, editor_id: null }),
        });
        setAssignedEditorId(null);
      } else {
        await fetch(`${API}?action=assignEditor`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manuscript_id: manuscript.id, editor_id: editorId }),
        });
        setAssignedEditorId(editorId);
      }
      
      onUpdated();
    } catch (err) {
      console.error("Failed to toggle editor:", err);
      setAssignedEditorId(manuscript.editorId || null);
    }
    
    setBtnLoading(null);
  };

  const handleDecision = async (decision: "accept" | "reject" | "revision") => {
    setBtnLoading(decision);
    await fetch(`${API}?action=decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manuscript_id: manuscript.id, decision }),
    });
    setBtnLoading(null);

    onUpdated();
    onClose();
  };

  // Helper to get recommendation color
  const getRecommendationColor = (rec: string | null) => {
    switch (rec?.toLowerCase()) {
      case 'accept': return '#16a34a';
      case 'minor_revision': return '#f59e0b';
      case 'major_revision': return '#dc2626';
      case 'reject': return '#b91c1c';
      default: return '#6b7280';
    }
  };

  return (
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
          background: "#fefefe",
          borderRadius: "12px",
          width: "95%",
          maxWidth: "900px",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          borderTop: "6px solid #198754",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
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

        <h2
          style={{
            fontSize: "1.8rem",
            fontWeight: 700,
            marginBottom: "6px",
            color: "#111827",
          }}
        >
          {manuscript.title}
        </h2>

        <p style={{ color: "#6b7280", marginBottom: "16px" }}>
          ID: {formatManuscriptId(manuscript.id)} | Type: {manuscript.studyType} | Date: {manuscript.date}
        </p>

        {/* Authors */}
        <div style={{ marginBottom: "16px" }}>
          <User size={20} style={{ marginRight: "6px", color: "#0d6efd" }} />
          <strong>Authors:</strong> {manuscript.authors}
        </div>

        {/* Abstract */}
        {manuscript.abstract && (
          <div style={{ marginBottom: "16px" }}>
            <strong>Abstract</strong>
            <p style={{ marginTop: "6px", color: "#374151", lineHeight: 1.6 }}>{manuscript.abstract}</p>
          </div>
        )}

        {/* Background */}
        {manuscript.background && (
          <div style={{ marginBottom: "16px" }}>
            <strong>Background</strong>
            <p style={{ marginTop: "6px", color: "#374151", lineHeight: 1.6 }}>{manuscript.background}</p>
          </div>
        )}

        {/* Objective */}
        {manuscript.objective && (
          <div style={{ marginBottom: "16px" }}>
            <strong>Objective</strong>
            <p style={{ marginTop: "6px", color: "#374151", lineHeight: 1.6 }}>{manuscript.objective}</p>
          </div>
        )}

        {/* Conclusion */}
        {manuscript.conclusion && (
          <div style={{ marginBottom: "16px" }}>
            <strong>Conclusion</strong>
            <p style={{ marginTop: "6px", color: "#374151", lineHeight: 1.6 }}>{manuscript.conclusion}</p>
          </div>
        )}

        {/* ACCEPTED MANUSCRIPT ACTIONS */}
        {isAccepted && (
          <div style={{ marginTop: "24px", padding: "20px", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
            <h3 style={{ marginBottom: "16px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle size={20} /> Finalized Manuscript
            </h3>
            
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button 
                onClick={() => window.open(`/manuscripts/${manuscript.id}.pdf`, "_blank")}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#0d6efd",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                }}
              >
                <FileText size={18} /> Open Final PDF
              </button>

              <button 
                disabled={productionLoading}
                onClick={async () => {
                  setProductionLoading(true);
                  try {
                    const res = await fetch(`${API}?action=startProduction`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ manuscript_id: manuscript.id }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to move to production");
                    onClose();
                    navigate("/publications/decision");
                  } catch (err: any) {
                    alert(err.message);
                  } finally {
                    setProductionLoading(false);
                  }
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#16a34a",
                  color: "#fff",
                  cursor: productionLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  opacity: productionLoading ? 0.7 : 1,
                }}
              >
                {productionLoading ? <Spinner /> : <CheckCircle size={18} />}
                Move to Publication
              </button>
            </div>
          </div>
        )}

        {/* Editors - Toggle Assignment */}
        {isNewSubmission && (
          <div style={{ marginBottom: "16px", marginTop: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <User size={20} style={{ color: "#198754" }} />
              <strong style={{ color: "#374151" }}>Assign Editor:</strong>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {editors.map((e) => {
                const isAssigned = assignedEditorId === e.id;
                const isLoading = btnLoading === `editor-${e.id}`;
                
                return (
                  <button
                    key={e.id}
                    disabled={isLoading}
                    onClick={() => handleToggleEditor(e.id)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      border: isAssigned ? "2px solid #198754" : "1px solid #198754",
                      background: isAssigned ? "#198754" : "#d1e7dd",
                      color: isAssigned ? "#fff" : "#0f5132",
                      cursor: "pointer",
                      opacity: isLoading ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                    }}
                  >
                    {isLoading ? (
                      <Spinner dark={!isAssigned} />
                    ) : isAssigned ? (
                      <>
                        <Check size={16} />
                        {e.name}
                      </>
                    ) : (
                      e.name
                    )}
                  </button>
                );
              })}
            </div>
            
            {assignedEditorId && (
              <p style={{ marginTop: "10px", fontSize: "0.85rem", color: "#6b7280", fontStyle: "italic" }}>
                Click the checked editor to unassign
              </p>
            )}
          </div>
        )}

        {/* Reviewers (assignment button) */}
        {isNewSubmission && (
          <div
            style={{
              marginBottom: "16px",
              marginTop: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <UserCheck size={20} style={{ color: "#0d6efd" }} />
            <strong style={{ color: "#374151" }}>Reviewers:</strong>

            <button
              disabled={btnLoading === "reviewers"}
              onClick={() => setShowReviewerModal(true)}
              style={{
                marginLeft: "8px",
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#0d6efd",
                color: "#fff",
                cursor: "pointer",
                opacity: btnLoading === "reviewers" ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              {btnLoading === "reviewers" ? <Spinner /> : <><UserCheck size={16} /> Select</>}
            </button>

            <span style={{ marginLeft: "12px", color: "#374151", fontSize: "0.9rem" }}>
              {manuscript.reviewers?.join(", ") || "None assigned"}
            </span>
          </div>
        )}

        {/* UNDER REVIEW – detailed reviewer feedback */}
        {isUnderReview && (
          <div style={{ marginTop: "24px" }}>
            <h3 style={{ marginBottom: "16px", color: "#111827", borderBottom: "2px solid #e5e7eb", paddingBottom: "8px" }}>
              Reviewer Feedback
            </h3>

            {reviewerProgress.length === 0 ? (
              <p style={{ color: "#6b7280", fontStyle: "italic" }}>No reviewers assigned yet.</p>
            ) : (
              reviewerProgress.map((progress, index) => {
                const statusLabel =
                  progress.status === "not_opened"
                    ? "Not started"
                    : progress.status === "reviewing"
                    ? "In review"
                    : "Completed";

                const statusStyle =
                  progress.status === "reviewed"
                    ? { background: "#d1fae5", color: "#065f46" }
                    : progress.status === "reviewing"
                    ? { background: "#e0e7ff", color: "#3730a3" }
                    : { background: "#fef3c7", color: "#92400e" };

                return (
                  <div
                    key={index}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "16px",
                      marginBottom: "16px",
                      background: "#ffffff",
                    }}
                  >
                    {/* Reviewer header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <User size={18} color="#0d6efd" />
                        <span style={{ fontWeight: 600, color: "#111827" }}>{progress.reviewer}</span>
                      </div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          borderRadius: "999px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          ...statusStyle,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {/* If review is completed and scores exist */}
                    {progress.status === "reviewed" && progress.scores && (
                      <div style={{ marginTop: "12px" }}>
                        {/* Scores grid */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: "8px",
                            marginBottom: "16px",
                          }}
                        >
                          {["originality", "methodology", "clarity", "relevance"].map((field) => {
                            const value = progress.scores?.[field as keyof typeof progress.scores];
                            return (
                              <div
                                key={field}
                                style={{
                                  background: "#f9fafb",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  textAlign: "center",
                                }}
                              >
                                <div style={{ fontSize: "0.7rem", color: "#6b7280", textTransform: "capitalize" }}>
                                  {field}
                                </div>
                                <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#111827" }}>
                                  {value !== null ? value : "—"}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Recommendation badge */}
                        {progress.scores.recommendation && (
                          <div style={{ marginBottom: "12px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 12px",
                                borderRadius: "20px",
                                background: getRecommendationColor(progress.scores.recommendation),
                                color: "#fff",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                textTransform: "capitalize",
                              }}
                            >
                              {progress.scores.recommendation.replace("_", " ")}
                            </span>
                          </div>
                        )}

                        {/* Comments to author */}
                        {progress.scores.commentsToAuthor && (
                          <div style={{ marginBottom: "12px" }}>
                            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "4px", fontWeight: 600 }}>
                              Comments to Author
                            </div>
                            <div
                              style={{
                                background: "#f9fafb",
                                padding: "12px",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                color: "#374151",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              {progress.scores.commentsToAuthor}
                            </div>
                          </div>
                        )}

                        {/* Confidential comments (only shown to editor) */}
                        {progress.scores.confidentialComments && (
                          <div>
                            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "4px", fontWeight: 600 }}>
                              Confidential Comments (Editor only)
                            </div>
                            <div
                              style={{
                                background: "#fef2f2",
                                padding: "12px",
                                borderRadius: "8px",
                                fontSize: "0.9rem",
                                color: "#991b1b",
                                border: "1px solid #fee2e2",
                              }}
                            >
                              {progress.scores.confidentialComments}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* If reviewed but no scores (legacy) – show old comment field */}
                    {progress.status === "reviewed" && !progress.scores && progress.comment && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "4px", fontWeight: 600 }}>
                          Comment
                        </div>
                        <div
                          style={{
                            background: "#f9fafb",
                            padding: "12px",
                            borderRadius: "8px",
                            fontSize: "0.9rem",
                            color: "#374151",
                          }}
                        >
                          {progress.comment}
                        </div>
                      </div>
                    )}

                    {/* Attachment */}
                    {progress.attachment && (
                      <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "6px", color: "#0d6efd" }}>
                        <Paperclip size={16} />
                        <a href={progress.attachment} target="_blank" rel="noopener noreferrer" style={{ color: "#0d6efd" }}>
                          {progress.attachment}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* EIC decision actions */}
            <div
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                borderTop: "2px solid #e5e7eb",
                paddingTop: "20px",
              }}
            >
              <button
                disabled={btnLoading === "reject"}
                onClick={() => handleDecision("reject")}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: btnLoading === "reject" ? 0.7 : 1,
                }}
              >
                {btnLoading === "reject" ? <Spinner /> : <XCircle size={18} />}
                Reject
              </button>

              <button
                disabled={btnLoading === "revision"}
                onClick={() => handleDecision("revision")}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#f59e0b",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: btnLoading === "revision" ? 0.7 : 1,
                }}
              >
                {btnLoading === "revision" ? <Spinner /> : <Edit3 size={18} />}
                Request Revision
              </button>

              <button
                disabled={btnLoading === "accept"}
                onClick={() => handleDecision("accept")}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#16a34a",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: btnLoading === "accept" ? 0.7 : 1,
                }}
              >
                {btnLoading === "accept" ? <Spinner /> : <CheckCircle size={18} />}
                Accept
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reviewer Selection Modal */}
      {showReviewerModal && (
        <ReviewerSelectionModal
          reviewers={reviewers}
          currentReviewers={manuscript.reviewers || []}
          onClose={() => setShowReviewerModal(false)}
          onSave={handleAssignReviewers}
        />
      )}
    </div>
  );
};

/* ================= Page ================= */
const ManuscriptCategoryView: FC = () => {
  const { status } = useParams();
  const navigate = useNavigate();

  const readableStatus = deslugify(status || "");
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [filteredManuscripts, setFilteredManuscripts] = useState<Manuscript[]>([]);
  const [activeModalId, setActiveModalId] = useState<number | null>(null);
  const [revisionModalId, setRevisionModalId] = useState<number | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [reviewerTarget, setReviewerTarget] = useState<Manuscript | null>(null);
  const [allReviewers, setAllReviewers] = useState<Reviewer[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadList = async () => {
    setLoadingList(true);
    try {
      const [data, reviewers] = await Promise.all([
        fetch(`${API}?action=list&status=${encodeURIComponent(readableStatus)}`).then((r) => r.json()),
        fetch(`${API}?action=reviewers`).then((r) => r.json()),
      ]);
      setManuscripts(data.data || []);
      setAllReviewers(reviewers);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to load manuscripts:", err);
    }
    setLoadingList(false);
  };

  useEffect(() => {
    loadList();
  }, [readableStatus]);

  // Filter manuscripts based on the current category
  useEffect(() => {
    let filtered: Manuscript[] = [];
    if (readableStatus === "Under Review") {
      // Under Review: no revisions OR (has revisions AND pendingReviews > 0)
      filtered = manuscripts.filter(
        (m) => !m.hasRevisions || (m.hasRevisions && m.pendingReviews && m.pendingReviews > 0)
      );
    } else if (readableStatus === "Revision Requested") {
      // Revision Requested: has revisions, no uploaded files, no pending reviews
      filtered = manuscripts.filter(
        (m) => m.hasRevisions && !m.hasUploadedRevision && m.pendingReviews === 0
      );
    } else if (readableStatus === "Revised") {
      // Revised: has revisions, has uploaded files, no pending reviews
      filtered = manuscripts.filter(
        (m) => m.hasRevisions && m.hasUploadedRevision && m.pendingReviews === 0
      );
    } else {
      // For all other categories (New Submissions, Accepted, Rejected, Published)
      filtered = manuscripts;
    }
    setFilteredManuscripts(filtered);
    setCurrentPage(1);
  }, [manuscripts, readableStatus]);

  const totalPages = Math.ceil(filteredManuscripts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentManuscripts = filteredManuscripts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Determine which modal to open based on the current category
  const isRevisionCategory = readableStatus === "Revision Requested" || readableStatus === "Revised";

  const handleRowClick = (m: Manuscript) => {
    if (isRevisionCategory) {
      setRevisionModalId(m.id);
    } else {
      setActiveModalId(m.id);
    }
  };

  const canAssignReviewer = (m: Manuscript): boolean => {
    // Show assign button for:
    // - New Submissions (status 'submitted')
    // - Manuscripts in the "Revised" category (hasRevisions and hasUploadedRevision and no pending reviews)
    if (m.status === "New Submissions") return true;
    if (readableStatus === "Revised" && m.hasUploadedRevision && m.pendingReviews === 0) return true;
    return false;
  };

  return (
    <>
      <GlobalStyles />
      <div className="content">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <button
            onClick={() => navigate("/manuscripts")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#0d6efd",
            }}
          >
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="page-title">
            {readableStatus} ({filteredManuscripts.length})
          </h1>
        </div>

        <div className="panel" style={{ padding: "16px" }}>
          {loadingList ? (
            <div style={{ padding: 20, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Spinner dark />
            </div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>ID</th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>Title</th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>Authors</th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>Type</th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>Date</th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>Review Status</th>
                    <th style={{ padding: "12px 8px", textAlign: "left" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentManuscripts.map((m) => {
                    // Determine row background based on category
                    let rowBg = "transparent";
                    if (readableStatus === "Revised") rowBg = "#d4edda"; // light green for ready
                    else if (readableStatus === "Revision Requested") rowBg = "#fff3cd"; // light yellow for pending

                    return (
                      <tr
                        key={m.id}
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          backgroundColor: rowBg,
                        }}
                      >
                        <td style={{ padding: "12px 8px" }}>{formatManuscriptId(m.id)}</td>
                        <td style={{ padding: "12px 8px" }}>{m.title}</td>
                        <td style={{ padding: "12px 8px" }}>{m.authors}</td>
                        <td style={{ padding: "12px 8px" }}>{m.studyType}</td>
                        <td style={{ padding: "12px 8px" }}>{m.date}</td>
                        <td style={{ padding: "12px 8px" }}>
                          {readableStatus === "Under Review" && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                background: "#cff4fc",
                                color: "#055160",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              Under Review {m.pendingReviews ? `(${m.pendingReviews})` : "(All reviews completed)"}
                            </span>
                          )}
                          {readableStatus === "Revision Requested" && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                background: "#ffc107",
                                color: "#000",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                textTransform: "uppercase",
                              }}
                            >
                              Revision Requested
                            </span>
                          )}
                          {readableStatus === "Revised" && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                background: "#28a745",
                                color: "#fff",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              Revised (Ready)
                            </span>
                          )}
                          {!["Under Review", "Revision Requested", "Revised"].includes(readableStatus) && (
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 8px",
                                borderRadius: "12px",
                                background: "#e2e3e5",
                                color: "#383d41",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                              }}
                            >
                              {m.status}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button
                              title={isRevisionCategory ? "View Revision History" : "Preview"}
                              style={{ ...glassBtnStyle, color: isRevisionCategory ? "#f59e0b" : "#0d6efd" }}
                              onClick={() => handleRowClick(m)}
                              onMouseEnter={hoverGlass}
                              onMouseLeave={leaveGlass}
                            >
                              {isRevisionCategory ? <History size={16} /> : <Eye size={16} />}
                            </button>
                            
                            {canAssignReviewer(m) && (
                              <button
                                title="Assign Reviewer"
                                style={{ ...glassBtnStyle, color: "#0d6efd" }}
                                onClick={() => setReviewerTarget(m)}
                                onMouseEnter={hoverGlass}
                                onMouseLeave={leaveGlass}
                              >
                                <UserCheck size={16} />
                              </button>
                            )}
                            
                            {m.status === "New Submissions" && (
                              <button
                                title="Assign Editor"
                                style={{ ...glassBtnStyle, color: "#198754" }}
                                onClick={() => setActiveModalId(m.id)}
                                onMouseEnter={hoverGlass}
                                onMouseLeave={leaveGlass}
                              >
                                <User size={16} />
                              </button>
                            )}
                            
                            <button
                              title="Open Manuscript"
                              style={{ ...glassBtnStyle, color: "#6c757d" }}
                              onClick={() => window.open(`/manuscripts/${m.id}.pdf`, "_blank")}
                              onMouseEnter={hoverGlass}
                              onMouseLeave={leaveGlass}
                            >
                              <FileText size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredManuscripts.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={filteredManuscripts.length}
                  itemsPerPage={itemsPerPage}
                />
              )}
            </>
          )}
          {!loadingList && filteredManuscripts.length === 0 && (
            <p style={{ padding: "16px", color: "#6b7280" }}>No manuscripts found in this category.</p>
          )}
        </div>

        {/* Regular Manuscript Modal (for non-revision categories) */}
        {activeModalId && (
          <ManuscriptModal
            manuscriptId={activeModalId}
            onClose={() => setActiveModalId(null)}
            onUpdated={loadList}
          />
        )}

        {/* Revision History Modal (for Revision Requested and Revised categories) */}
        {revisionModalId && (
          <RevisionHistoryModal
            manuscriptId={revisionModalId}
            onClose={() => setRevisionModalId(null)}
            onUpdated={loadList}
            allReviewers={allReviewers}
          />
        )}

        {/* Reviewer Selection Modal (standalone) */}
        {reviewerTarget && (
          <ReviewerSelectionModal
            reviewers={allReviewers}
            currentReviewers={reviewerTarget.reviewers || []}
            onClose={() => setReviewerTarget(null)}
            onSave={async (selected) => {
              const ids = selected
                .map((name) => allReviewers.find((r) => r.name === name)?.id)
                .filter(Boolean) as number[];

              await fetch(`${API}?action=assignReviewers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ manuscript_id: reviewerTarget.id, reviewers: ids }),
              });

              setReviewerTarget(null);
              loadList();
            }}
          />
        )}
      </div>
    </>
  );
};

export default ManuscriptCategoryView;
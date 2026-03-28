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
  ArrowUp,
  ArrowDown,
  Download,
  Upload,
  Mail,
  Send,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";

/* ================= API ================= */
const API = "https://afmjonline.com/api/EICmanusciptsapi.php";
const DOWNLOAD_API = "https://afmjonline.com/api/download.php";

/* ================= Global Styles ================= */
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
  objective?: string | null;
  methods?: string | null;
  results?: string | null;
  conclusion?: string | null;
  reviewers?: string[];
  editors?: string[];
  reviewerProgress?: ReviewerProgress[];
  revisions?: Revision[];
  editorId?: number | null;
  editor?: string;
  pendingReviews?: number;
  completedReviews?: number;
  hasRevisions?: boolean;
  hasUploadedRevision?: boolean;
  revisedFilePath?: string;
  filePath?: string;
  circulatingFilePath?: string;   // path of the EIC‑uploaded version
  coverLetterPath?: string;
}

interface Reviewer {
  id: number;
  name: string;
}

interface Editor {
  id: number;
  name: string;
}

type ReviewStatus = "not_opened" | "reviewing" | "reviewed" | "expired";

interface ReviewerProgress {
  reviewer: string;
  reviewerId: number;
  status: ReviewStatus;
  assignedAt?: string;
  acceptedAt?: string;
  dueDate?: string;
  completedAt?: string;
  comment?: string;
  attachment?: string;          // path to reviewer's uploaded file
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

const isReviewExpired = (progress: ReviewerProgress): boolean => {
  if (progress.status === 'reviewed') return false;
  if (!progress.dueDate) return false;
  const now = new Date();
  const due = new Date(progress.dueDate);
  return now > due;
};

const formatRemainingTime = (dueDate: string): string => {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  if (diffMs <= 0) return "Expired";
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return `${diffDays}d ${diffHours}h`;
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

/* ================= Reviewer Selection Modal ================= */
interface ReviewerModalProps {
  reviewers: Reviewer[];
  currentReviewers: string[];
  onClose: () => void;
  onTempSave: (selected: string[]) => void;
}

const ReviewerSelectionModal: FC<ReviewerModalProps> = ({
  reviewers,
  currentReviewers,
  onClose,
  onTempSave,
}) => {
  const [selected, setSelected] = useState<string[]>([...currentReviewers]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const maxReviewers = 3;
  const totalPages = Math.ceil(reviewers.length / pageSize);
  const paginatedReviewers = reviewers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const addReviewer = (name: string) => {
    if (selected.includes(name)) {
      setSelected(prev => prev.filter(r => r !== name));
    } else {
      if (selected.length >= maxReviewers) {
        alert(`You can only select up to ${maxReviewers} reviewers.`);
        return;
      }
      setSelected(prev => [...prev, name]);
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newSelected = [...selected];
    [newSelected[index - 1], newSelected[index]] = [newSelected[index], newSelected[index - 1]];
    setSelected(newSelected);
  };

  const moveDown = (index: number) => {
    if (index === selected.length - 1) return;
    const newSelected = [...selected];
    [newSelected[index], newSelected[index + 1]] = [newSelected[index + 1], newSelected[index]];
    setSelected(newSelected);
  };

  const canSave = selected.length === maxReviewers;

  const goToPreviousPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

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
          <h3>Select Reviewers (exactly {maxReviewers})</h3>
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
          {paginatedReviewers.map((r) => {
            const isSelected = selected.includes(r.name);
            const isDisabled = !isSelected && selected.length >= maxReviewers;
            return (
              <div
                key={r.id}
                onClick={() => !isDisabled && addReviewer(r.name)}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: isSelected ? "2px solid #0d6efd" : "1px solid #d1d5db",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  background: isSelected ? "#e7f1ff" : "#fff",
                  opacity: isDisabled ? 0.5 : 1,
                  transition: "0.2s",
                }}
              >
                <UserCheck size={32} color={isSelected ? "#0d6efd" : "#6b7280"} />
                <span style={{ marginTop: "8px", fontSize: "0.9rem", textAlign: "center" }}>{r.name}</span>
                {isSelected && <Check size={16} style={{ marginTop: "6px", color: "#0d6efd" }} />}
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "16px" }}>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                background: currentPage === 1 ? "#f3f4f6" : "#fff",
                color: currentPage === 1 ? "#9ca3af" : "#374151",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: "0.9rem", color: "#374151" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                background: currentPage === totalPages ? "#f3f4f6" : "#fff",
                color: currentPage === totalPages ? "#9ca3af" : "#374151",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        )}

        {selected.length > 0 && (
          <div style={{ marginTop: "24px" }}>
            <h4>Selected Reviewers (in order of assignment)</h4>
            {selected.map((name, index) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <span style={{ fontWeight: "bold", width: "24px" }}>{index + 1}.</span>
                <span style={{ flex: 1 }}>{name}</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    style={{ background: "none", border: "none", cursor: index === 0 ? "not-allowed" : "pointer", opacity: index === 0 ? 0.5 : 1 }}
                    title="Move Up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === selected.length - 1}
                    style={{ background: "none", border: "none", cursor: index === selected.length - 1 ? "not-allowed" : "pointer", opacity: index === selected.length - 1 ? 0.5 : 1 }}
                    title="Move Down"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    onClick={() => setSelected(prev => prev.filter((_, i) => i !== index))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                    title="Remove"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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
            disabled={!canSave}
            onClick={() => onTempSave(selected)}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: "#0d6efd",
              color: "#fff",
              cursor: canSave ? "pointer" : "not-allowed",
              opacity: canSave ? 1 : 0.5,
            }}
          >
            Save Selection
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= Single Reviewer Modal (for reassign) ================= */
interface SingleReviewerModalProps {
  reviewers: Reviewer[];
  currentReviewerId: number;
  onClose: () => void;
  onSelect: (newReviewerId: number) => Promise<void>;
}

const SingleReviewerModal: FC<SingleReviewerModalProps> = ({
  reviewers,
  currentReviewerId,
  onClose,
  onSelect,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = (id: number) => setSelectedId(id);
  const handleConfirm = async () => {
    if (!selectedId) return;
    setSaving(true);
    await onSelect(selectedId);
    setSaving(false);
    onClose();
  };

  const availableReviewers = reviewers.filter(r => r.id !== currentReviewerId);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1200 }}>
      <div style={{ background: "#fff", borderRadius: "12px", width: "90%", maxWidth: "500px", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Select a New Reviewer</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={24} /></button>
        </div>

        <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "8px" }}>
          {availableReviewers.map(r => (
            <div
              key={r.id}
              onClick={() => handleSelect(r.id)}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: selectedId === r.id ? "2px solid #0d6efd" : "1px solid #d1d5db",
                background: selectedId === r.id ? "#e7f1ff" : "#fff",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <User size={24} color={selectedId === r.id ? "#0d6efd" : "#6b7280"} />
              <span style={{ marginTop: "8px", fontSize: "0.9rem", textAlign: "center" }}>{r.name}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid #d1d5db", background: "#f3f4f6" }}>Cancel</button>
          <button
            disabled={!selectedId || saving}
            onClick={handleConfirm}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: "none",
              background: "#0d6efd",
              color: "#fff",
              cursor: selectedId ? "pointer" : "not-allowed",
              opacity: selectedId ? 1 : 0.5,
            }}
          >
            {saving ? <Spinner /> : "Reassign"}
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
  const { authFetch } = useAuth();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRevisions, setExpandedRevisions] = useState<number[]>([0]);
  const [refreshing, setRefreshing] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

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

  const handleDownload = async (filePath: string, fileKey: string, fileNameBase: string) => {
    setDownloadingFile(fileKey);
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(filePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      
      let extension = "";
      const parts = filePath.split('.');
      if (parts.length > 1) {
        extension = parts.pop() || "";
        if (extension.includes('?')) extension = extension.split('?')[0];
      }
      
      const customFileName = `${fileNameBase}${extension ? '.' + extension : ''}`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download file. Please try again.");
    } finally {
      setDownloadingFile(null);
    }
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
  const latestRevision = revisions.length > 0
    ? revisions.reduce((latest, rev) =>
        rev.revisionNumber > latest.revisionNumber ? rev : latest
      , revisions[0])
    : null;

  const hasPending = latestRevision
    ? latestRevision.entries.some(e => !e.addressed)
    : false;

  const filesComplete = latestRevision
    ? latestRevision.revisedFile && latestRevision.responseFile
    : false;

  const canReassign = !hasPending && filesComplete;

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

                  {isExpanded && (
                    <div style={{ padding: "20px" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginBottom: "20px",
                          flexWrap: "wrap",
                        }}
                      >
                        {rev.revisedFile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(
                                rev.revisedFile,
                                `revised_${rev.revisionNumber}`,
                                `AFMJ_${manuscriptId}_rev${rev.revisionNumber}_revised`
                              );
                            }}
                            disabled={downloadingFile === `revised_${rev.revisionNumber}`}
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
                              border: "none",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#c7d2fe"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#e0e7ff"}
                          >
                            {downloadingFile === `revised_${rev.revisionNumber}` ? (
                              <Spinner dark />
                            ) : (
                              <FileText size={18} />
                            )}
                            <span>Revised Manuscript</span>
                            <Paperclip size={16} style={{ marginLeft: "4px", opacity: 0.7 }} />
                          </button>
                        )}

                        {rev.responseFile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(
                                rev.responseFile,
                                `response_${rev.revisionNumber}`,
                                `AFMJ_${manuscriptId}_rev${rev.revisionNumber}_response`
                              );
                            }}
                            disabled={downloadingFile === `response_${rev.revisionNumber}`}
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
                              border: "none",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#bbf7d0"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "#d1fae5"}
                          >
                            {downloadingFile === `response_${rev.revisionNumber}` ? (
                              <Spinner dark />
                            ) : (
                              <FileText size={18} />
                            )}
                            <span>Response to Reviewers</span>
                            <Paperclip size={16} style={{ marginLeft: "4px", opacity: 0.7 }} />
                          </button>
                        )}
                      </div>

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

                              <div style={{ padding: "16px" }}>
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

            <button
              onClick={() => setShowReassignModal(true)}
              disabled={!canReassign || reassigning}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: !canReassign ? "#f3f4f6" : "#fff",
                color: !canReassign ? "#9ca3af" : "#374151",
                cursor: !canReassign ? "not-allowed" : "pointer",
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

      {showReassignModal && (
        <ReviewerSelectionModal
          reviewers={allReviewers}
          currentReviewers={latestRevision ? latestRevision.entries.filter(e => !e.addressed).map(e => e.reviewer) : []}
          onClose={() => setShowReassignModal(false)}
          onTempSave={async (selectedNames) => {
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
            onUpdated();
          }}
        />
      )}
    </div>
  );
};

/* ================= Manuscript File Modal (for Revised category) ================= */
interface ManuscriptFileModalProps {
  manuscriptId: number;
  title: string;
  currentFilePath: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const ManuscriptFileModal: FC<ManuscriptFileModalProps> = ({
  manuscriptId,
  title,
  currentFilePath,
  onClose,
  onConfirm,
}) => {
  const { authFetch } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("manuscript_id", manuscriptId.toString());
    formData.append("revised_file", selectedFile);
    try {
      const res = await fetch(`${API}?action=updateRevisedFile`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
    } catch (err: any) {
      alert(err.message);
      return;
    } finally {
      setUploading(false);
    }
  };

  const handleProceed = async () => {
    if (selectedFile) {
      await handleUpload();
    }
    onConfirm();
  };

  const handleDownload = async () => {
    if (!currentFilePath) return;
    setDownloading(true);
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(currentFilePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      let extension = "";
      const parts = currentFilePath.split('.');
      if (parts.length > 1) {
        extension = parts.pop() || "";
        if (extension.includes('?')) extension = extension.split('?')[0];
      }
      const customFileName = `AFMJ_${manuscriptId}${extension ? '.' + extension : ''}`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
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
          borderRadius: "16px",
          width: "90%",
          maxWidth: "500px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>Manuscript to Assign</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={24} />
          </button>
        </div>
        <p>
          <strong>{title}</strong>
        </p>
        <div style={{ margin: "16px 0" }}>
          {currentFilePath ? (
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#e9ecef",
                borderRadius: "6px",
                color: "#0d6efd",
                textDecoration: "none",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#dee2e6"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#e9ecef"}
            >
              {downloading ? <Spinner /> : <Download size={16} />}
              {downloading ? "Downloading..." : "Download Current File"}
            </button>
          ) : (
            <span style={{ color: "#6c757d" }}>No file available.</span>
          )}
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontWeight: 500, display: "block", marginBottom: "8px" }}>Replace file (optional)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            ref={fileInputRef}
          />
          {selectedFile && (
            <div style={{ marginTop: "8px", fontSize: "0.9rem", color: "#16a34a" }}>
              Selected: {selectedFile.name}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              background: "#f3f4f6",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            disabled={uploading}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              border: "none",
              background: "#0d6efd",
              color: "#fff",
              cursor: uploading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading ? <Spinner /> : <CheckCircle size={16} />}
            {uploading ? "Uploading..." : "Proceed to Assign"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= EIC File Upload Modal ================= */
interface EICFileUploadModalProps {
  manuscript: Manuscript;
  onClose: () => void;
  onProceed: () => void;
  allReviewers: Reviewer[];
  onAssignReviewers: (selected: string[]) => Promise<void>;
}

const EICFileUploadModal: FC<EICFileUploadModalProps> = ({
  manuscript,
  onClose,
  onProceed,
  allReviewers,
  onAssignReviewers,
}) => {
  const { authFetch } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceFilePath = manuscript.revisedFilePath || manuscript.filePath;

  const handleDownload = async (filePath: string, fileNameBase: string) => {
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(filePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const ext = filePath.split('.').pop()?.split('?')[0] || '';
      const customFileName = `${fileNameBase}${ext ? '.' + ext : ''}`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed");
    }
  };

  const handleUpload = async (): Promise<boolean> => {
    if (!selectedFile) return true;
    setUploading(true);
    const formData = new FormData();
    formData.append("manuscript_id", manuscript.id.toString());
    formData.append("circulating_file", selectedFile);
    try {
      const res = await fetch(`${API}?action=uploadCirculatingFile`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      alert("Circulating file uploaded successfully!");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return true;
    } catch (err: any) {
      alert(err.message);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleProceed = async () => {
    const uploadOk = await handleUpload();
    if (!uploadOk) return;
    setShowReviewerModal(true);
  };

  return (
    <>
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
            borderRadius: "16px",
            width: "90%",
            maxWidth: "600px",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0 }}>Upload Circulating Version</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={24} />
            </button>
          </div>

          <p><strong>{manuscript.title}</strong></p>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontWeight: 500, marginBottom: "8px" }}>Original/Revised File</div>
            {sourceFilePath ? (
              <button
                onClick={() => handleDownload(sourceFilePath, `AFMJ_${manuscript.id}_source`)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  background: "#e9ecef",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Download size={16} /> Download
              </button>
            ) : (
              <span style={{ color: "#6c757d" }}>No file available.</span>
            )}
          </div>

          {manuscript.circulatingFilePath && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontWeight: 500, marginBottom: "8px" }}>Current Circulating Version</div>
              <button
                onClick={() => handleDownload(manuscript.circulatingFilePath!, `AFMJ_${manuscript.id}_circulating`)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  background: "#e9ecef",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Download size={16} /> Download
              </button>
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontWeight: 500, display: "block", marginBottom: "8px" }}>
              Upload New Circulating Version (optional)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              ref={fileInputRef}
            />
            {selectedFile && (
              <div style={{ marginTop: "8px", fontSize: "0.9rem", color: "#16a34a" }}>
                Selected: {selectedFile.name}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: "#f3f4f6",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleProceed}
              disabled={uploading}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                border: "none",
                background: "#0d6efd",
                color: "#fff",
                cursor: uploading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: uploading ? 0.7 : 1,
              }}
            >
              {uploading ? <Spinner /> : <CheckCircle size={16} />}
              {uploading ? "Uploading..." : "Proceed to Assign"}
            </button>
          </div>
        </div>
      </div>

      {showReviewerModal && (
        <ReviewerSelectionModal
          reviewers={allReviewers}
          currentReviewers={[]}
          onClose={() => setShowReviewerModal(false)}
          onTempSave={async (selected) => {
            await onAssignReviewers(selected);
            onProceed();
          }}
        />
      )}
    </>
  );
};

/* ================= Manuscript Modal ================= */
interface ModalProps {
  manuscriptId: number;
  onClose: () => void;
  onUpdated: () => void;
}

const ManuscriptModal: FC<ModalProps> = ({ manuscriptId, onClose, onUpdated }) => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState<string | null>(null);
  const [productionLoading, setProductionLoading] = useState(false);
  const [tempEditorId, setTempEditorId] = useState<number | null>(null);
  const [tempReviewers, setTempReviewers] = useState<string[]>([]);
  const [reassignTarget, setReassignTarget] = useState<{ manuscriptId: number; oldReviewerId: number; oldReviewerName: string } | null>(null);
  const [downloadingFile, setDownloadingFile] = useState(false);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDecision, setEmailDecision] = useState<"reject" | "revision" | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailAttachments, setEmailAttachments] = useState<File[]>([]); // NEW

  const [uploadingCirculating, setUploadingCirculating] = useState(false);
  const [selectedCirculatingFile, setSelectedCirculatingFile] = useState<File | null>(null);
  const circulatingFileInputRef = useRef<HTMLInputElement>(null);

  const [downloadingCoverLetter, setDownloadingCoverLetter] = useState(false);

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
        setTempEditorId(m.editorId || null);
        setTempReviewers(m.reviewers || []);
      } catch (err) {
        console.error("Failed to load manuscript data:", err);
      }
      setLoading(false);
    };

    load();
  }, [manuscriptId]);

  const handleAssignAll = async () => {
    if (!tempEditorId || tempReviewers.length !== 3) return;
    setBtnLoading("assignAll");

    try {
      await fetch(`${API}?action=assignEditor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manuscript_id: manuscript!.id, editor_id: tempEditorId }),
      });

      const reviewerIds = tempReviewers
        .map(name => reviewers.find(r => r.name === name)?.id)
        .filter(Boolean) as number[];

      await fetch(`${API}?action=assignReviewers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manuscript_id: manuscript!.id, reviewers: reviewerIds }),
      });

      onUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to assign:", err);
    } finally {
      setBtnLoading(null);
    }
  };

  const handleReassignReviewer = async (newReviewerId: number) => {
    if (!reassignTarget) return;
    try {
      setBtnLoading("reassign");
      await fetch(`${API}?action=replaceReviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manuscript_id: reassignTarget.manuscriptId,
          old_reviewer_id: reassignTarget.oldReviewerId,
          new_reviewer_id: newReviewerId,
        }),
      });
      const res = await fetch(`${API}?action=show&id=${manuscriptId}`);
      const updated = await res.json();
      setManuscript(updated);
    } catch (err) {
      console.error("Reassign failed", err);
    } finally {
      setBtnLoading(null);
      setReassignTarget(null);
    }
  };

  const openEmailModal = (decision: "reject" | "revision") => {
    if (!manuscript) return;
    setEmailDecision(decision);
    setEmailSubject(`Decision on your submission ${formatManuscriptId(manuscript.id)}`);
    const defaultBody = `Dear Author,\n\nThank you for submitting your manuscript "${manuscript.title}". After careful review, we have decided to ${decision === "reject" ? "reject" : "request revisions"}.\n\n`;
    setEmailBody(defaultBody);
    setEmailAttachments([]); // Reset attachments
    setEmailModalOpen(true);
  };

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setEmailAttachments(prev => [...prev, ...files]);
      e.target.value = ''; // allow re-selecting same file
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setEmailAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendEmailAndDecide = async () => {
    if (!manuscript || !emailDecision) return;
    setEmailSending(true);
    const formData = new FormData();
    formData.append("manuscript_id", manuscript.id.toString());
    formData.append("decision", emailDecision);
    formData.append("subject", emailSubject);
    formData.append("body", emailBody);
    for (let i = 0; i < emailAttachments.length; i++) {
      formData.append("attachments[]", emailAttachments[i]);
    }

    try {
      const emailRes = await fetch(`${API}?action=sendDecisionEmail`, {
        method: "POST",
        body: formData, // Content-Type automatically set to multipart/form-data
      });
      const result = await emailRes.json();
      if (!emailRes.ok) {
        throw new Error(result.error || "Failed to send email");
      }

      // After email is sent, update manuscript status
      const decisionRes = await fetch(`${API}?action=decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manuscript_id: manuscript.id, decision: emailDecision }),
      });
      const decisionResult = await decisionRes.json();
      if (!decisionRes.ok) {
        throw new Error(decisionResult.error || "Failed to update manuscript status");
      }

      setEmailModalOpen(false);
      onUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEmailSending(false);
    }
  };

  const handleDownload = async (filePath: string, fileNameBase: string) => {
    setDownloadingFile(true);
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(filePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      let extension = "";
      const parts = filePath.split('.');
      if (parts.length > 1) {
        extension = parts.pop() || "";
        if (extension.includes('?')) extension = extension.split('?')[0];
      }
      const customFileName = `${fileNameBase}${extension ? '.' + extension : ''}`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed");
    } finally {
      setDownloadingFile(false);
    }
  };

  const handleDownloadCoverLetter = async (filePath: string) => {
    setDownloadingCoverLetter(true);
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(filePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      let extension = "";
      const parts = filePath.split('.');
      if (parts.length > 1) {
        extension = parts.pop() || "";
        if (extension.includes('?')) extension = extension.split('?')[0];
      }
      const customFileName = `AFMJ_${manuscript!.id}_coverletter${extension ? '.' + extension : ''}`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed");
    } finally {
      setDownloadingCoverLetter(false);
    }
  };

  const handleCirculatingUpload = async () => {
    if (!selectedCirculatingFile || !manuscript) return;
    setUploadingCirculating(true);
    const formData = new FormData();
    formData.append("manuscript_id", manuscript.id.toString());
    formData.append("circulating_file", selectedCirculatingFile);
    try {
      const res = await fetch(`${API}?action=uploadCirculatingFile`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      alert("Circulating file uploaded successfully!");
      const updated = await fetch(`${API}?action=show&id=${manuscript.id}`).then(r => r.json());
      setManuscript(updated);
      setSelectedCirculatingFile(null);
      if (circulatingFileInputRef.current) circulatingFileInputRef.current.value = "";
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingCirculating(false);
    }
  };

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

  const reviewerProgress: ReviewerProgress[] = manuscript.reviewerProgress ?? [];
  const normalizedStatus = manuscript.status?.toString().trim() || "";
  const isAccepted = normalizedStatus.toLowerCase() === "accepted";
  const isUnderReview = normalizedStatus.toLowerCase() === "under review";
  const isNewSubmission = normalizedStatus === "New Submissions";

  const handleToggleEditor = (editorId: number) => {
    setTempEditorId(prev => prev === editorId ? null : editorId);
  };

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

        <div style={{ marginBottom: "16px" }}>
          <User size={20} style={{ marginRight: "6px", color: "#0d6efd" }} />
          <strong>Authors:</strong> {manuscript.authors}
        </div>

        {/* Manuscript File Section (download only) */}
        {isNewSubmission && (
          <div style={{ marginBottom: "24px", padding: "16px", background: "#f8f9fa", borderRadius: "12px", border: "1px solid #e9ecef" }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={18} /> Manuscript File
            </h4>
            <div>
              {manuscript.filePath ? (
                <button
                  onClick={() => handleDownload(manuscript.filePath!, `AFMJ_${manuscript.id}`)}
                  disabled={downloadingFile}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    background: "#e9ecef",
                    borderRadius: "6px",
                    color: "#0d6efd",
                    textDecoration: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#dee2e6"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#e9ecef"}
                >
                  {downloadingFile ? <Spinner /> : <Download size={16} />}
                  {downloadingFile ? "Downloading..." : "Download Current File"}
                </button>
              ) : (
                <span style={{ color: "#6c757d" }}>No file uploaded yet.</span>
              )}
            </div>
          </div>
        )}

        {/* Cover Letter Section */}
        {manuscript.coverLetterPath && (
          <div style={{ marginBottom: "24px", padding: "16px", background: "#f8f9fa", borderRadius: "12px", border: "1px solid #e9ecef" }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <FileText size={18} /> Cover Letter
            </h4>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => handleDownloadCoverLetter(manuscript.coverLetterPath!)}
                disabled={downloadingCoverLetter}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  background: "#e9ecef",
                  borderRadius: "6px",
                  color: "#0d6efd",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#dee2e6"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#e9ecef"}
              >
                {downloadingCoverLetter ? <Spinner /> : <Download size={16} />}
                {downloadingCoverLetter ? "Downloading..." : "Download Cover Letter"}
              </button>
            </div>
          </div>
        )}

        {/* Circulating Version Section */}
        <div style={{ marginBottom: "24px", padding: "16px", background: "#f8f9fa", borderRadius: "12px", border: "1px solid #e9ecef" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={18} /> Manuscript for Review (Reviewer Version)
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {manuscript.circulatingFilePath && (
              <div>
                <div style={{ fontWeight: 500, marginBottom: "8px" }}>Current File:</div>
                <button
                  onClick={() => handleDownload(manuscript.circulatingFilePath!, `AFMJ_${manuscript.id}_circulating`)}
                  disabled={downloadingFile}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    background: "#e9ecef",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {downloadingFile ? <Spinner /> : <Download size={16} />}
                  Download Current Circulating File
                </button>
              </div>
            )}
            <div>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "8px" }}>
                Upload New Circulating Version (optional)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setSelectedCirculatingFile(e.target.files?.[0] || null)}
                ref={circulatingFileInputRef}
                style={{ marginBottom: "8px" }}
              />
              {selectedCirculatingFile && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
                  <span style={{ fontSize: "0.9rem", color: "#16a34a" }}>{selectedCirculatingFile.name}</span>
                  <button
                    onClick={handleCirculatingUpload}
                    disabled={uploadingCirculating}
                    style={{
                      padding: "4px 12px",
                      borderRadius: "4px",
                      border: "none",
                      background: "#28a745",
                      color: "#fff",
                      cursor: uploadingCirculating ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {uploadingCirculating ? <Spinner /> : <Check size={14} />}
                    {uploadingCirculating ? "Uploading..." : "Upload"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Abstract and other sections... (unchanged) */}
        {manuscript.abstract && (
          <div style={{ marginBottom: "16px" }}>
            <strong>Abstract</strong>
            <p style={{ marginTop: "6px", color: "#374151", lineHeight: 1.6 }}>{manuscript.abstract}</p>
          </div>
        )}

        {manuscript.background && (
          <div style={{ marginBottom: "16px" }}>
            <strong>Background</strong>
            <p style={{ marginTop: "6px", color: "#374151", lineHeight: 1.6 }}>{manuscript.background}</p>
          </div>
        )}

        {manuscript.objective && (
          <div style={{ marginBottom: "16px" }}>
            <strong>Objective</strong>
            <p style={{ marginTop: "6px", color: "#374151", lineHeight: 1.6 }}>{manuscript.objective}</p>
          </div>
        )}

        {manuscript.methods && (
          <div style={{ marginBottom: "16px" }}>
            <strong>Methods</strong>
            <p style={{ marginTop: "6px", color: "#374151", lineHeight: 1.6 }}>{manuscript.methods}</p>
          </div>
        )}

        {manuscript.results && (
          <div style={{ marginBottom: "16px" }}>
            <strong>Results</strong>
            <p style={{ marginTop: "6px", color: "#374151", lineHeight: 1.6 }}>{manuscript.results}</p>
          </div>
        )}

        {manuscript.conclusion && (
          <div style={{ marginBottom: "16px" }}>
            <strong>Conclusion</strong>
            <p style={{ marginTop: "6px", color: "#374151", lineHeight: 1.6 }}>{manuscript.conclusion}</p>
          </div>
        )}

        {isAccepted && (
          <div style={{ marginTop: "24px", padding: "20px", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
            <h3 style={{ marginBottom: "16px", color: "#166534", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle size={20} /> Finalized Manuscript
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button 
                onClick={() => handleDownload(`/manuscripts/${manuscript.id}.pdf`, `AFMJ_${manuscript.id}`)}
                disabled={downloadingFile}
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
                onMouseEnter={(e) => e.currentTarget.style.background = "#1e40af"}
                onMouseLeave={(e) => e.currentTarget.style.background = "#0d6efd"}
              >
                {downloadingFile ? <Spinner /> : <FileText size={18} />}
                {downloadingFile ? "Downloading..." : "Download Final PDF"}
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

        {isNewSubmission && (
          <div style={{ marginBottom: "16px", marginTop: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <User size={20} style={{ color: "#198754" }} />
              <strong style={{ color: "#374151" }}>Assign Editor:</strong>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {editors.map((e) => {
                const isSelected = tempEditorId === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => handleToggleEditor(e.id)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      border: isSelected ? "2px solid #198754" : "1px solid #198754",
                      background: isSelected ? "#198754" : "#d1e7dd",
                      color: isSelected ? "#fff" : "#0f5132",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                    }}
                  >
                    {isSelected ? (
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
            {tempEditorId && (
              <p style={{ marginTop: "10px", fontSize: "0.85rem", color: "#6b7280", fontStyle: "italic" }}>
                Click the checked editor to unassign
              </p>
            )}
          </div>
        )}

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
              onClick={() => setShowReviewerModal(true)}
              style={{
                marginLeft: "8px",
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#0d6efd",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              <UserCheck size={16} /> Select
            </button>
            <span style={{ marginLeft: "12px", color: "#374151", fontSize: "0.9rem" }}>
              {tempReviewers.join(", ") || "None selected"}
            </span>
          </div>
        )}

        {isNewSubmission && tempEditorId && tempReviewers.length === 3 && (
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleAssignAll}
              disabled={btnLoading === "assignAll"}
              style={{
                padding: "10px 20px",
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
                opacity: btnLoading === "assignAll" ? 0.7 : 1,
              }}
            >
              {btnLoading === "assignAll" ? <Spinner /> : <CheckCircle size={18} />}
              Assign Reviewers & Editor
            </button>
          </div>
        )}

        {isUnderReview && (
          <div style={{ marginTop: "24px" }}>
            <h3 style={{ marginBottom: "16px", color: "#111827", borderBottom: "2px solid #e5e7eb", paddingBottom: "8px" }}>
              Reviewer Feedback
            </h3>
            {reviewerProgress.length === 0 ? (
              <p style={{ color: "#6b7280", fontStyle: "italic" }}>No reviewers assigned yet.</p>
            ) : (
              reviewerProgress.map((progress, index) => {
                const expired = isReviewExpired(progress);
                const remaining = !expired && progress.status !== 'reviewed' && progress.dueDate
                  ? formatRemainingTime(progress.dueDate)
                  : null;

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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "#0d6efd",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                          }}
                        >
                          {index + 1}
                        </div>
                        <span style={{ fontWeight: 600, color: "#111827" }}>{progress.reviewer}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: "999px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            background: progress.status === 'reviewed' ? "#d1fae5" : expired ? "#fee2e2" : progress.status === 'reviewing' ? "#e0e7ff" : "#fef3c7",
                            color: progress.status === 'reviewed' ? "#065f46" : expired ? "#991b1b" : progress.status === 'reviewing' ? "#3730a3" : "#92400e",
                          }}
                        >
                          {progress.status === 'reviewed' ? 'Completed' : expired ? 'Expired' : progress.status === 'reviewing' ? 'In Review' : 'Not Started'}
                        </span>
                        {!expired && progress.status !== 'reviewed' && remaining && (
                          <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>⏳ {remaining}</span>
                        )}
                      </div>
                    </div>

                    {expired && progress.status !== 'reviewed' && (
                      <div style={{ marginBottom: "12px", display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setReassignTarget({
                            manuscriptId: manuscript.id,
                            oldReviewerId: progress.reviewerId,
                            oldReviewerName: progress.reviewer,
                          })}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid #dc2626",
                            background: "#fee2e2",
                            color: "#991b1b",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <UserCheck size={14} /> Reassign
                        </button>
                      </div>
                    )}

                    {progress.status === "reviewed" && progress.scores && (
                      <div style={{ marginTop: "12px" }}>
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

                    {/* Reviewer attachment (reference document) */}
                    {progress.attachment && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "4px", fontWeight: 600 }}>
                          Reviewer Attachment
                        </div>
                        <button
                          onClick={() => handleDownload(progress.attachment!, `reviewer_attachment_${progress.reviewerId}`)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "8px 12px",
                            background: "#f1f5f9",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          <Download size={14} />
                          Download Attachment
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

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
                onClick={() => openEmailModal("reject")}
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
                <XCircle size={18} />
                Reject
              </button>

              <button
                disabled={btnLoading === "revision"}
                onClick={() => openEmailModal("revision")}
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
                <Edit3 size={18} />
                Request Revision
              </button>

              <button
                disabled={btnLoading === "accept"}
                onClick={async () => {
                  setBtnLoading("accept");
                  await fetch(`${API}?action=decision`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ manuscript_id: manuscript.id, decision: "accept" }),
                  });
                  setBtnLoading(null);
                  onUpdated();
                  onClose();
                }}
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

      {showReviewerModal && (
        <ReviewerSelectionModal
          reviewers={reviewers}
          currentReviewers={tempReviewers}
          onClose={() => setShowReviewerModal(false)}
          onTempSave={(selected) => {
            setTempReviewers(selected);
            setShowReviewerModal(false);
          }}
        />
      )}

      {reassignTarget && (
        <SingleReviewerModal
          reviewers={reviewers}
          currentReviewerId={reassignTarget.oldReviewerId}
          onClose={() => setReassignTarget(null)}
          onSelect={handleReassignReviewer}
        />
      )}

      {emailModalOpen && (
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
              borderRadius: "16px",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflow: "auto",
              padding: "24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={20} />
                {emailDecision === "reject" ? "Rejection Email" : "Revision Request Email"}
              </h3>
              <button onClick={() => setEmailModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Email Body</label>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={12}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.95rem",
                  fontFamily: "monospace",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Attachments section */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "8px" }}>
                Attachments (optional)
              </label>
              <input
                type="file"
                multiple
                onChange={handleAddAttachment}
                style={{ marginBottom: "8px" }}
              />
              {emailAttachments.length > 0 && (
                <div style={{ marginTop: "8px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px" }}>
                  <div style={{ fontWeight: 500, marginBottom: "8px" }}>Selected files:</div>
                  {emailAttachments.map((file, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.9rem", flex: 1 }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                      <button
                        onClick={() => handleRemoveAttachment(idx)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}
                        title="Remove"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setEmailModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  background: "#f3f4f6",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={sendEmailAndDecide}
                disabled={emailSending}
                style={{
                  padding: "8px 20px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#0d6efd",
                  color: "#fff",
                  cursor: emailSending ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: emailSending ? 0.7 : 1,
                }}
              >
                {emailSending ? <Spinner /> : <Send size={16} />}
                Send & {emailDecision === "reject" ? "Reject" : "Request Revision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================= Page ================= */
const ManuscriptCategoryView: FC = () => {
  const { status } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const readableStatus = deslugify(status || "");
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [filteredManuscripts, setFilteredManuscripts] = useState<Manuscript[]>([]);
  const [activeModalId, setActiveModalId] = useState<number | null>(null);
  const [revisionModalId, setRevisionModalId] = useState<number | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [reviewerTarget, setReviewerTarget] = useState<Manuscript | null>(null);
  const [allReviewers, setAllReviewers] = useState<Reviewer[]>([]);
  const [fileModalManuscript, setFileModalManuscript] = useState<Manuscript | null>(null);
  const [eicFileModalManuscript, setEicFileModalManuscript] = useState<Manuscript | null>(null);
  const [downloadingManuscriptId, setDownloadingManuscriptId] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadList = async () => {
    setLoadingList(true);
    try {
      const [data, reviewers] = await Promise.all([
        fetch(`${API}?action=list&status=${encodeURIComponent(readableStatus)}`).then((r) => r.json()),
        fetch(`${API}?action=reviewers`).then((r) => r.json()),
      ]);
      const manuscriptsWithCompleted = (data.data || []).map((m: any) => ({
        ...m,
        completedReviews: m.completedReviews ?? 0,
        revisedFilePath: m.revisedFilePath ?? null,
        coverLetterPath: m.coverLetterPath ?? null,
        circulatingFilePath: m.circulatingFilePath ?? null,
      }));
      setManuscripts(manuscriptsWithCompleted);
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

  useEffect(() => {
    let filtered: Manuscript[] = [];
    if (readableStatus === "Under Review") {
      filtered = manuscripts.filter(
        (m) =>
          !m.hasRevisions ||
          (m.hasRevisions &&
            ((m.pendingReviews && m.pendingReviews > 0) ||
              (m.pendingReviews === 0 && m.completedReviews && m.completedReviews > 0)))
      );
    } else if (readableStatus === "Revision Requested") {
      filtered = manuscripts.filter(
        (m) => m.hasRevisions && !m.hasUploadedRevision && m.pendingReviews === 0
      );
    } else if (readableStatus === "Revised") {
      filtered = manuscripts.filter(
        (m) =>
          m.hasRevisions &&
          m.hasUploadedRevision &&
          m.pendingReviews === 0 &&
          (!m.completedReviews || m.completedReviews === 0)
      );
    } else {
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

  const isRevisionCategory = readableStatus === "Revision Requested" || readableStatus === "Revised";

  const handleRowClick = (m: Manuscript) => {
    if (isRevisionCategory) {
      setRevisionModalId(m.id);
    } else {
      setActiveModalId(m.id);
    }
  };

  const canAssignReviewer = (m: Manuscript): boolean => {
    if (m.status === "New Submissions") return true;
    if (readableStatus === "Revised" && m.hasUploadedRevision && m.pendingReviews === 0) return true;
    return false;
  };

  const handleDownloadManuscript = async (manuscriptId: number, filePath: string) => {
    setDownloadingManuscriptId(manuscriptId);
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(filePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      let extension = "";
      const parts = filePath.split('.');
      if (parts.length > 1) {
        extension = parts.pop() || "";
        if (extension.includes('?')) extension = extension.split('?')[0];
      }
      const customFileName = `AFMJ_${manuscriptId}${extension ? '.' + extension : ''}`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed");
    } finally {
      setDownloadingManuscriptId(null);
    }
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
                    let rowBg = "transparent";
                    if (readableStatus === "Revised") rowBg = "#d4edda";
                    else if (readableStatus === "Revision Requested") rowBg = "#fff3cd";

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
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, auto)",
                            gap: "4px",
                            justifyContent: "start",
                          }}>
                            <button
                              title={isRevisionCategory ? "View Revision History" : "Preview"}
                              style={{ ...glassBtnStyle, color: isRevisionCategory ? "#f59e0b" : "#0d6efd", padding: "6px 8px" }}
                              onClick={() => handleRowClick(m)}
                              onMouseEnter={hoverGlass}
                              onMouseLeave={leaveGlass}
                            >
                              {isRevisionCategory ? <History size={16} /> : <Eye size={16} />}
                              <span style={{ marginLeft: "4px" }}>{isRevisionCategory ? "History" : "View"}</span>
                            </button>
                            
                            {canAssignReviewer(m) && (
                              <button
                                title="Assign Reviewer"
                                style={{ ...glassBtnStyle, color: "#0d6efd", padding: "6px 8px" }}
                                onClick={() => setEicFileModalManuscript(m)}
                                onMouseEnter={hoverGlass}
                                onMouseLeave={leaveGlass}
                              >
                                <UserCheck size={16} />
                                <span style={{ marginLeft: "4px" }}>Assign</span>
                              </button>
                            )}
                            
                            {m.status === "New Submissions" && (
                              <button
                                title="Assign Editor"
                                style={{ ...glassBtnStyle, color: "#198754", padding: "6px 8px" }}
                                onClick={() => setActiveModalId(m.id)}
                                onMouseEnter={hoverGlass}
                                onMouseLeave={leaveGlass}
                              >
                                <User size={16} />
                                <span style={{ marginLeft: "4px" }}>Editor</span>
                              </button>
                            )}
                            
                            <button
                              title="Open Manuscript"
                              style={{ ...glassBtnStyle, color: "#6c757d", padding: "6px 8px" }}
                              onClick={() => handleDownloadManuscript(m.id, m.revisedFilePath || m.filePath || `/manuscripts/${m.id}.pdf`)}
                              disabled={downloadingManuscriptId === m.id}
                              onMouseEnter={hoverGlass}
                              onMouseLeave={leaveGlass}
                            >
                              {downloadingManuscriptId === m.id ? (
                                <Spinner />
                              ) : (
                                <FileText size={16} />
                              )}
                              <span style={{ marginLeft: "4px" }}>
                                {downloadingManuscriptId === m.id ? "Downloading..." : "Word Docx"}
                              </span>
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

        {activeModalId && (
          <ManuscriptModal
            manuscriptId={activeModalId}
            onClose={() => setActiveModalId(null)}
            onUpdated={loadList}
          />
        )}

        {revisionModalId && (
          <RevisionHistoryModal
            manuscriptId={revisionModalId}
            onClose={() => setRevisionModalId(null)}
            onUpdated={loadList}
            allReviewers={allReviewers}
          />
        )}

        {reviewerTarget && (
          <ReviewerSelectionModal
            reviewers={allReviewers}
            currentReviewers={reviewerTarget.reviewers || []}
            onClose={() => setReviewerTarget(null)}
            onTempSave={async (selected) => {
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

        {fileModalManuscript && (
          <ManuscriptFileModal
            manuscriptId={fileModalManuscript.id}
            title={fileModalManuscript.title}
            currentFilePath={fileModalManuscript.revisedFilePath ?? null}
            onClose={() => setFileModalManuscript(null)}
            onConfirm={() => {
              setFileModalManuscript(null);
              setReviewerTarget(fileModalManuscript);
              loadList();
            }}
          />
        )}

        {eicFileModalManuscript && (
          <EICFileUploadModal
            manuscript={eicFileModalManuscript}
            onClose={() => setEicFileModalManuscript(null)}
            onProceed={() => {
              setEicFileModalManuscript(null);
              loadList();
            }}
            allReviewers={allReviewers}
            onAssignReviewers={async (selectedNames) => {
              const ids = selectedNames
                .map(name => allReviewers.find(r => r.name === name)?.id)
                .filter(Boolean) as number[];

              await fetch(`${API}?action=assignReviewers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ manuscript_id: eicFileModalManuscript.id, reviewers: ids }),
              });
            }}
          />
        )}
      </div>
    </>
  );
};

export default ManuscriptCategoryView;
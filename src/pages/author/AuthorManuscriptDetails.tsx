import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  // FileText,
  Calendar,
  User,
  Clock,
  Download,
  Mail,
  CheckCircle,
  // XCircle,
  AlertCircle,
  RefreshCcw
  // Eye
} from "lucide-react";

const API_BASE = "https://afmjonline.com/api/authorApi.php";

interface Manuscript {
  id: number;
  slug: string;
  title: string;
  abstract: string;
  background: string;
  objective: string;
  conclusion: string;
  study_type: string;
  status: string;
  file_path: string | null;
  submitted_at: string;
  payment_status: string | null;
  galley_proof_status: string | null;
  galley_proof_file: string | null;
  author_response_file: string | null;
  author_name: string;
  editor_name: string | null;
}

interface Review {
  id: number;
  accepted_at: string | null;
  completed_at: string | null;
  originality: number | null;
  methodology: number | null;
  clarity: number | null;
  relevance: number | null;
  comments_to_author: string | null;
  confidential_comments: string | null;
  recommendation: string | null;
  reviewer_name: string;
}

interface RevisionEntry {
  id: number;
  revision_number: number;
  reviewer_comment: string;
  author_response: string | null;
  addressed: boolean;
  reviewer_name: string;
}

const AuthorManuscriptDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        const res = await fetch(`${API_BASE}?action=getManuscriptDetails&manuscript_id=${id}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch manuscript details");
        }
        const data = await res.json();
        setManuscript(data.manuscript);
        setReviews(data.reviews);
        setRevisions(data.revisions);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const handleDownload = (filePath: string | null) => {
    if (filePath) window.open(filePath, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return { label: "Submitted", color: "#3b82f6", bg: "#eff6ff" };
      case "under_review":
        return { label: "Under Review", color: "#eab308", bg: "#fef9c3" };
      case "accepted":
        return { label: "Accepted", color: "#16a34a", bg: "#dcfce7" };
      case "rejected":
        return { label: "Rejected", color: "#dc2626", bg: "#fee2e2" };
      case "published":
        return { label: "Published", color: "#16a34a", bg: "#dcfce7" };
      default:
        return { label: status, color: "#6b7280", bg: "#f3f4f6" };
    }
  };

  const goBack = () => navigate(-1);

  if (loading) {
    return (
      <div className="page">
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

  if (error || !manuscript) {
    return (
      <div className="page">
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "24px", color: "#b91c1c", background: "#fee2e2", borderRadius: "8px" }}>
          {error || "Manuscript not found"}
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(manuscript.status);
  const hasPendingRevision = revisions.some(r => !r.addressed);

  return (
    <div className="page" style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 16px" }}>
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
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 600, color: "#0f172a", margin: 0 }}>
          Manuscript Details
        </h1>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Title and ID card */}
        <div className="panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <span style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "#16a34a", background: "#f0fdf4", padding: "2px 10px", borderRadius: "20px", display: "inline-block" }}>
                {manuscript.slug}
              </span>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0f172a", margin: "12px 0 8px" }}>
                {manuscript.title}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}>
                  <User size={14} /> {manuscript.author_name}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}>
                  <Calendar size={14} /> Submitted: {new Date(manuscript.submitted_at).toLocaleDateString()}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569" }}>
                  <Clock size={14} /> Study type: {manuscript.study_type}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
              <span style={{ background: statusBadge.bg, color: statusBadge.color, padding: "4px 12px", borderRadius: "40px", fontWeight: 500, fontSize: "0.9rem" }}>
                {statusBadge.label}
              </span>
              {hasPendingRevision && (
                <span style={{ background: "#fef9c3", color: "#eab308", padding: "4px 12px", borderRadius: "40px", fontWeight: 500, fontSize: "0.9rem" }}>
                  Revision Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Editor info */}
        {manuscript.editor_name && (
          <div className="panel" style={{ padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
            <Mail size={20} color="#64748b" />
            <span>Editor assigned: <strong>{manuscript.editor_name}</strong></span>
          </div>
        )}

        {/* Abstract, background, objective, conclusion sections */}
        <div className="panel" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "16px", color: "#0f172a" }}>Manuscript Content</h3>
          {manuscript.abstract && (
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#16a34a", marginBottom: "8px" }}>Abstract</h4>
              <p style={{ color: "#374151", lineHeight: 1.6 }}>{manuscript.abstract}</p>
            </div>
          )}
          {manuscript.background && (
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#0d9488", marginBottom: "8px" }}>Background</h4>
              <p style={{ color: "#374151", lineHeight: 1.6 }}>{manuscript.background}</p>
            </div>
          )}
          {manuscript.objective && (
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#7c3aed", marginBottom: "8px" }}>Objective</h4>
              <p style={{ color: "#374151", lineHeight: 1.6 }}>{manuscript.objective}</p>
            </div>
          )}
          {manuscript.conclusion && (
            <div>
              <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "#d97706", marginBottom: "8px" }}>Conclusion</h4>
              <p style={{ color: "#374151", lineHeight: 1.6 }}>{manuscript.conclusion}</p>
            </div>
          )}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "16px", color: "#0f172a" }}>Reviewer Comments</h3>
            {reviews.map((rev, idx) => (
              <div key={rev.id} style={{ marginBottom: "24px", borderLeft: "3px solid #16a34a", paddingLeft: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600 }}>Reviewer {idx + 1} {rev.reviewer_name && `(${rev.reviewer_name})`}</span>
                  {rev.recommendation && (
                    <span style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: "20px", fontSize: "0.8rem" }}>
                      {rev.recommendation.replace('_', ' ')}
                    </span>
                  )}
                </div>
                {rev.comments_to_author && (
                  <p style={{ color: "#374151", marginBottom: "8px" }}>{rev.comments_to_author}</p>
                )}
                {rev.originality !== null && (
                  <div style={{ display: "flex", gap: "16px", fontSize: "0.9rem", color: "#475569" }}>
                    <span>Originality: {rev.originality}/5</span>
                    <span>Methodology: {rev.methodology}/5</span>
                    <span>Clarity: {rev.clarity}/5</span>
                    <span>Relevance: {rev.relevance}/5</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Revision entries */}
        {revisions.length > 0 && (
          <div className="panel" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "16px", color: "#0f172a" }}>Revision History</h3>
            {revisions.map((rev) => (
              <div key={rev.id} style={{ marginBottom: "20px", borderLeft: "3px solid #eab308", paddingLeft: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600 }}>Revision #{rev.revision_number} – {rev.reviewer_name}</span>
                  {rev.addressed ? (
                    <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle size={16} /> Addressed
                    </span>
                  ) : (
                    <span style={{ color: "#eab308", display: "flex", alignItems: "center", gap: "4px" }}>
                      <AlertCircle size={16} /> Pending
                    </span>
                  )}
                </div>
                <p style={{ color: "#374151", marginBottom: "8px" }}><strong>Reviewer comment:</strong> {rev.reviewer_comment}</p>
                {rev.author_response && (
                  <p style={{ color: "#374151", background: "#f9fafb", padding: "8px", borderRadius: "4px" }}>
                    <strong>Your response:</strong> {rev.author_response}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Download buttons */}
        <div className="panel" style={{ padding: "24px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {manuscript.file_path && (
            <button
              className="btn-outline"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => handleDownload(manuscript.file_path)}
            >
              <Download size={16} />
              Download Manuscript
            </button>
          )}
          {manuscript.galley_proof_file && (
            <button
              className="btn-outline"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => handleDownload(manuscript.galley_proof_file)}
            >
              <Download size={16} />
              Galley Proof
            </button>
          )}
          {manuscript.author_response_file && (
            <button
              className="btn-outline"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => handleDownload(manuscript.author_response_file)}
            >
              <Download size={16} />
              Response Letter
            </button>
          )}
          {/* If there are any decision letters stored, add buttons here */}
        </div>

        {/* If revision required, show action button */}
        {hasPendingRevision && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => navigate(`/author/revision/${manuscript.id}`)}
            >
              <RefreshCcw size={16} />
              Submit Revision
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorManuscriptDetails;
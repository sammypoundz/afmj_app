import { type FC, useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext"; // adjust path if needed

const API = "/api/reviewerApi.php";

interface CompletedItem {
  id: number;
  manuscriptId: string;
  title: string;
  completedAt: string;
  recommendation: string | null;
  attachment: string | null;
}

const Spinner = () => (
  <span style={{ display: "inline-block", width: "16px", height: "16px", border: "2px solid #ccc", borderTopColor: "#0d6efd", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
);

const globalStyle = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .badge.success {
    background: #d1fae5;
    color: #065f46;
  }
  .badge.warning {
    background: #fef3c7;
    color: #92400e;
  }
  .badge.danger {
    background: #fee2e2;
    color: #991b1b;
  }
  .badge.info {
    background: #e0e7ff;
    color: #3730a3;
  }
`;

const ReviewerCompleted: FC = () => {
  const [completed, setCompleted] = useState<CompletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { authFetch, sessionId } = useAuth();

  const fetchCompleted = async () => {
    // If no session ID, we can't authenticate – redirect or wait
    if (!sessionId) {
      setLoading(false);
      setError("No active session. Please log in.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API}?action=listCompleted`);
      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired. Please log in again.");
          // Optionally trigger logout
          return;
        }
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      setCompleted(data);
    } catch (err) {
      console.error("Failed to load completed reviews:", err);
      setError("Could not load completed reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we have a sessionId; otherwise, we can't authenticate.
    if (sessionId) {
      fetchCompleted();
    } else {
      setLoading(false);
      setError("Please log in to view completed reviews.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]); // re‑run when session changes (e.g., after login)

  // Helper to style recommendation badge
  const getRecommendationClass = (rec: string | null) => {
    if (!rec) return "badge info";
    switch (rec.toLowerCase()) {
      case 'accept': return "badge success";
      case 'minor_revision': return "badge warning";
      case 'major_revision': return "badge danger";
      case 'reject': return "badge danger";
      default: return "badge info";
    }
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div className="page">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <h2>Completed Reviews</h2>
          <button
            onClick={fetchCompleted}
            disabled={loading || !sessionId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "#f3f4f6",
              cursor: loading || !sessionId ? "not-allowed" : "pointer",
              opacity: loading || !sessionId ? 0.6 : 1,
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
          {!loading && !error && completed.length === 0 && (
            <p style={{ padding: "16px", color: "#6b7280", textAlign: "center" }}>
              No completed reviews yet.
            </p>
          )}
          {!loading && !error && completed.length > 0 && (
            completed.map((item) => (
              <div
                key={item.id}
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
                  <strong>{item.manuscriptId}</strong>
                  <p style={{ margin: "4px 0" }}>{item.title}</p>
                  <small>Completed: {new Date(item.completedAt).toLocaleDateString()}</small>
                  {item.attachment && (
                    <div style={{ marginTop: "4px" }}>
                      <a
                        href={`/${item.attachment}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.85rem", color: "#0d6efd" }}
                      >
                        View Attachment
                      </a>
                    </div>
                  )}
                </div>
                <span className={getRecommendationClass(item.recommendation)}>
                  {item.recommendation ? item.recommendation.replace('_', ' ') : 'No recommendation'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default ReviewerCompleted;
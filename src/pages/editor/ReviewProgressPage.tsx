import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

interface ReviewProgress {
  manuscriptId: number;
  manuscriptTitle: string;
  totalReviewers: number;
  completedReviews: number;
  progress: number; // percentage
  status: string;
  dueDate: string | null;
}

const ReviewProgressPage = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [progressData, setProgressData] = useState<ReviewProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await authFetch(
          "https://vinosschool.com/api/editorApi.php?action=getReviewProgress"
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch review progress");
        }
        const data = await res.json();
        setProgressData(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Could not load review progress.");
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [authFetch]);

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
        <h2 style={{ margin: 0 }}>Review Progress Monitoring</h2>
      </div>

      {progressData.length === 0 ? (
        <div style={{ padding: 20, background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
          No manuscripts with active reviews.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {progressData.map((item) => (
            <div
              key={item.manuscriptId}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 18,
                background: "#fff",
                cursor: "pointer",
              }}
              onClick={() => navigate(`/editor/manuscripts/${item.manuscriptId}`)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0 }}>{item.manuscriptTitle}</h4>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  {item.completedReviews} / {item.totalReviewers} reviews
                </div>
              </div>

              <div
                style={{
                  height: 8,
                  background: "#e5e7eb",
                  borderRadius: 10,
                  marginTop: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${item.progress}%`,
                    height: "100%",
                    background: item.progress === 100 ? "#16a34a" : "#3b82f6",
                    borderRadius: 10,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>

              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>Progress: {item.progress}%</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {item.progress === 100 ? (
                    <CheckCircle size={16} color="#16a34a" />
                  ) : (
                    <Clock size={16} color="#f59e0b" />
                  )}
                  {item.progress === 100 ? "Completed" : "In progress"}
                </span>
              </div>

              {item.dueDate && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                  Due: {new Date(item.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewProgressPage;
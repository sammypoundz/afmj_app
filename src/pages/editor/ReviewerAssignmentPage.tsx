import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck, Search, UserPlus, ArrowLeft, Loader } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

interface Reviewer {
  id: number;
  name: string;
  email: string;
  expertise: string[];
}

interface Manuscript {
  id: number;
  title: string;
  slug: string;
  author: string;
  status: string;
  assignedReviewers: number; // count of reviewers already assigned
}

const ReviewerAssignmentPage = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedReviewer, setSelectedReviewer] = useState<Record<number, number>>({});
  const [assigning, setAssigning] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [manRes, revRes] = await Promise.all([
          authFetch("https://vinosschool.com/api/editorApi.php?action=getAssignableManuscripts"),
          authFetch("https://vinosschool.com/api/editorApi.php?action=getReviewers"),
        ]);

        if (!manRes.ok || !revRes.ok) {
          throw new Error("Failed to load data");
        }

        const manuscriptsData = await manRes.json();
        const reviewersData = await revRes.json();

        setManuscripts(manuscriptsData);
        setReviewers(reviewersData);
      } catch (err) {
        console.error(err);
        toast.error("Could not load assignment data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authFetch]);

  const handleAssign = async (manuscriptId: number) => {
    const reviewerId = selectedReviewer[manuscriptId];
    if (!reviewerId) {
      toast.error("Please select a reviewer");
      return;
    }

    setAssigning(manuscriptId);
    const toastId = toast.loading("Assigning reviewer...");

    try {
      const res = await authFetch("https://vinosschool.com/api/editorApi.php?action=assignReviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manuscript_id: manuscriptId,
          reviewer_id: reviewerId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Assignment failed");
      }

      toast.success("Reviewer assigned successfully!", { id: toastId });
      // Remove the manuscript from the list or update status
      setManuscripts(manuscripts.filter((m) => m.id !== manuscriptId));
      setSelectedReviewer((prev) => {
        const newState = { ...prev };
        delete newState[manuscriptId];
        return newState;
      });
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setAssigning(null);
    }
  };

  const filteredReviewers = reviewers.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.expertise.some((e) => e.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 30, height: 30, border: "3px solid #e5e7eb", borderTop: "3px solid #16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const responsiveStyles = `
    @media (max-width: 768px) {
      .assignment-grid {
        grid-template-columns: 1fr !important;
      }
      .manuscript-card {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      .manuscript-card .actions {
        flex-direction: column !important;
        gap: 8px !important;
        margin-top: 12px;
      }
      .manuscript-card .actions select,
      .manuscript-card .actions button {
        width: 100% !important;
      }
    }
    @media (max-width: 480px) {
      .assignment-page {
        padding: 16px !important;
      }
    }
  `;

  return (
    <div className="assignment-page" style={{ padding: 24 }}>
      <style>{responsiveStyles}</style>

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
        <h2 style={{ margin: 0 }}>Assign Reviewers</h2>
      </div>

      <div className="assignment-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>

        {/* Left: Manuscripts needing reviewers */}
        <div>
          <h3>Manuscripts needing reviewers</h3>
          {manuscripts.length === 0 ? (
            <div style={{ padding: 20, background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
              No manuscripts require reviewer assignment.
            </div>
          ) : (
            manuscripts.map((man) => (
              <div
                key={man.id}
                className="manuscript-card"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="manuscript-card">
                  <div>
                    <h4 style={{ margin: 0 }}>{man.title}</h4>
                    <div style={{ fontSize: 14, color: "#6b7280" }}>
                      {man.author} • {man.status}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                      Assigned: {man.assignedReviewers} reviewer(s)
                    </div>
                  </div>
                  <div className="actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                      value={selectedReviewer[man.id] || ""}
                      onChange={(e) =>
                        setSelectedReviewer((prev) => ({
                          ...prev,
                          [man.id]: Number(e.target.value),
                        }))
                      }
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        background: "#fff",
                        minWidth: "140px",
                      }}
                    >
                      <option value="">Select reviewer</option>
                      {reviewers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.expertise.slice(0, 2).join(", ")})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssign(man.id)}
                      disabled={assigning === man.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: "none",
                        background: assigning === man.id ? "#9ca3af" : "#16a34a",
                        color: "#fff",
                        cursor: assigning === man.id ? "not-allowed" : "pointer",
                        opacity: assigning === man.id ? 0.7 : 1,
                        minWidth: "100px",
                        justifyContent: "center",
                      }}
                    >
                      {assigning === man.id ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          Assign
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Reviewers list with search */}
        <div>
          <h3>Available Reviewers</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 10px", background: "#fff", marginBottom: 16 }}>
            <Search size={18} color="#6b7280" />
            <input
              placeholder="Search reviewers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                padding: "8px 0",
                width: "100%",
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ display: "grid", gap: 10, maxHeight: 400, overflowY: "auto" }}>
            {filteredReviewers.length === 0 ? (
              <div style={{ padding: 20, background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                No reviewers found.
              </div>
            ) : (
              filteredReviewers.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <UserCheck size={18} color="#16a34a" />
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.name}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{r.email}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Expertise: {r.expertise.join(", ")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
  );
};

export default ReviewerAssignmentPage;
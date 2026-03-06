import { useState, useEffect } from "react";
import { X, FileText, BookOpen, Target, CheckCircle, User } from "lucide-react";

// Global keyframes for spinner animation
const GlobalStyles = () => (
  <style>{`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}</style>
);

const API_BASE = "https://afmjonline.com/api/reviewerApi.php";

interface Invitation {
  id: number;
  manuscriptId: string;
  title: string;
  dueDate: string;
}

interface ManuscriptPreview {
  id: number;
  slug: string;
  title: string;
  abstract: string;
  background: string;
  objective: string;
  conclusion: string;
  study_type: string;
  author_name: string;
}

const ReviewerInvitations = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [previewData, setPreviewData] = useState<ManuscriptPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"accept" | "decline" | null>(null);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?action=listInvitations`);
      const data = await res.json();
      if (res.ok) {
        setInvitations(data);
      } else {
        console.error("Failed to fetch invitations:", data.error);
      }
    } catch (err) {
      console.error("Network error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const openPreview = async (inv: Invitation) => {
    setSelectedInvitation(inv);
    setModalOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await fetch(`${API_BASE}?action=getManuscriptPreview&review_id=${inv.id}`);
      const data = await res.json();
      if (res.ok) {
        setPreviewData(data);
      } else {
        alert(data.error || "Failed to load manuscript details");
        setModalOpen(false);
      }
    } catch (err) {
      alert("Network error");
      setModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedInvitation(null);
    setPreviewData(null);
    setPendingAction(null);
  };

  const handleDecision = async (action: "accept" | "decline") => {
    if (!selectedInvitation) return;
    setPendingAction(action);
    try {
      const res = await fetch(`${API_BASE}?action=${action}Invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: selectedInvitation.id }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchInvitations();
        closeModal();
      } else {
        alert(data.error || "Action failed");
        setPendingAction(null);
      }
    } catch (err) {
      alert("Network error");
      setPendingAction(null);
    }
  };

  if (loading) return <div>Loading invitations...</div>;

  return (
    <>
      <GlobalStyles />
      <div className="page">
        <h2>Review Invitations</h2>

        <div className="panel">
          <h3>Pending Invitations</h3>

          {invitations.length === 0 ? (
            <p>No pending invitations.</p>
          ) : (
            invitations.map((inv) => (
              <div key={inv.id} className="list-item">
                <div>
                  <strong>{inv.manuscriptId}</strong>
                  <p>{inv.title}</p>
                  <small>Response deadline: {inv.dueDate}</small>
                </div>

                <div className="actions">
                  <button
                    className="btn-primary"
                    onClick={() => openPreview(inv)}
                  >
                    View & Respond
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modern Preview Modal */}
        {modalOpen && selectedInvitation && (
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
            onClick={closeModal}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                width: "700px",
                maxWidth: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div style={{
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                padding: "20px 24px",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={20} />
                  Manuscript Preview
                </h3>
                <button
                  onClick={closeModal}
                  style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", opacity: 0.8 }}
                  disabled={pendingAction !== null}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: "24px", overflowY: "auto" }}>
                {previewLoading ? (
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <div style={{ border: "4px solid #f3f4f6", borderTop: "4px solid #2563eb", borderRadius: "50%", width: "40px", height: "40px", margin: "0 auto 16px", animation: "spin 1s linear infinite" }}></div>
                    <p>Loading manuscript details...</p>
                  </div>
                ) : previewData ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* Meta information card */}
                    <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Manuscript ID</div>
                        <div style={{ fontFamily: "monospace", fontWeight: 600, color: "#2563eb" }}>{previewData.slug}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Study Type</div>
                        <div style={{ fontWeight: 500 }}>{previewData.study_type}</div>
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Author</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 500 }}>
                          <User size={14} color="#6b7280" />
                          {previewData.author_name}
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827", margin: "8px 0 4px" }}>{previewData.title}</h4>

                    {/* Abstract */}
                    {previewData.abstract && (
                      <div style={{ borderLeft: "4px solid #2563eb", paddingLeft: "16px", marginTop: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <BookOpen size={18} color="#2563eb" />
                          <span style={{ fontWeight: 600, color: "#2563eb" }}>Abstract</span>
                        </div>
                        <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.abstract}</p>
                      </div>
                    )}

                    {/* Background */}
                    {previewData.background && (
                      <div style={{ borderLeft: "4px solid #059669", paddingLeft: "16px", marginTop: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <FileText size={18} color="#059669" />
                          <span style={{ fontWeight: 600, color: "#059669" }}>Background</span>
                        </div>
                        <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.background}</p>
                      </div>
                    )}

                    {/* Objective */}
                    {previewData.objective && (
                      <div style={{ borderLeft: "4px solid #7c3aed", paddingLeft: "16px", marginTop: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <Target size={18} color="#7c3aed" />
                          <span style={{ fontWeight: 600, color: "#7c3aed" }}>Objective</span>
                        </div>
                        <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.objective}</p>
                      </div>
                    )}

                    {/* Conclusion */}
                    {previewData.conclusion && (
                      <div style={{ borderLeft: "4px solid #d97706", paddingLeft: "16px", marginTop: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <CheckCircle size={18} color="#d97706" />
                          <span style={{ fontWeight: 600, color: "#d97706" }}>Conclusion</span>
                        </div>
                        <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{previewData.conclusion}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: "#dc2626", textAlign: "center" }}>Failed to load manuscript details.</p>
                )}
              </div>

              {/* Footer actions */}
              <div style={{ borderTop: "1px solid #e5e7eb", padding: "20px 24px", display: "flex", justifyContent: "flex-end", gap: "12px", background: "#f9fafb" }}>
                <button
                  onClick={closeModal}
                  disabled={pendingAction !== null}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    color: "#374151",
                    fontWeight: 500,
                    cursor: pendingAction !== null ? "not-allowed" : "pointer",
                    opacity: pendingAction !== null ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecision("decline")}
                  disabled={pendingAction !== null}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    fontWeight: 500,
                    cursor: pendingAction !== null ? "not-allowed" : "pointer",
                    opacity: pendingAction !== null ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {pendingAction === "decline" ? (
                    <>
                      <span style={{ width: "16px", height: "16px", border: "2px solid #fff", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
                      Processing...
                    </>
                  ) : (
                    "Decline"
                  )}
                </button>
                <button
                  onClick={() => handleDecision("accept")}
                  disabled={pendingAction !== null}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#16a34a",
                    color: "#fff",
                    fontWeight: 500,
                    cursor: pendingAction !== null ? "not-allowed" : "pointer",
                    opacity: pendingAction !== null ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {pendingAction === "accept" ? (
                    <>
                      <span style={{ width: "16px", height: "16px", border: "2px solid #fff", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }}></span>
                      Processing...
                    </>
                  ) : (
                    "Accept"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReviewerInvitations;
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Users, Clock, CheckCircle, XCircle } from "lucide-react";

const mockReviewers = [
  { id: 1, name: "Dr. Aisha Bello", status: "Invited" },
  { id: 2, name: "Dr. Ibrahim Musa", status: "Accepted" },
  { id: 3, name: "Dr. Zainab Lawal", status: "Pending" },
];

const EditorManuscriptWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="content" style={{ padding: 20 }}>

      {/* ===== Header ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
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

        <h2 style={{ margin: 0 }}>Manuscript Workspace</h2>
      </div>

      {/* ===== Top summary ===== */}
      <div
        className="panel"
        style={{
          marginBottom: 24,
          display: "grid",
          gap: 8,
        }}
      >
        <h3 style={{ marginBottom: 6 }}>
          AI-assisted Diagnosis in Primary Healthcare
        </h3>

        <div style={{ color: "#6b7280", fontSize: 14 }}>
          Manuscript ID: <strong>{id}</strong>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 8, flexWrap: "wrap" }}>
          <span><strong>Status:</strong> Under Review</span>
          <span><strong>Submitted:</strong> 2026-02-08</span>
          <span><strong>Author:</strong> Dr. Musa Abdullahi</span>
        </div>
      </div>

      {/* ===== Main grid ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 24,
        }}
      >

        {/* ===== Left column ===== */}
        <div style={{ display: "grid", gap: 24 }}>

          {/* Manuscript files */}
          <div className="panel">
            <h3>Manuscript Files</h3>

            <div
              className="metric clickable"
              style={{ marginTop: 10 }}
            >
              <Download size={18} />
              <span>Main manuscript (PDF)</span>
            </div>

            <div
              className="metric clickable"
            >
              <Download size={18} />
              <span>Supplementary file</span>
            </div>
          </div>

          {/* Reviewers */}
          <div className="panel">
            <h3>Assigned Reviewers</h3>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: 8 }}>Reviewer</th>
                  <th style={{ padding: 8 }}>Status</th>
                </tr>
              </thead>

              <tbody>
                {mockReviewers.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: 8 }}>{r.name}</td>
                    <td style={{ padding: 8 }}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "8px 12px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <Users size={16} />
              Assign more reviewers
            </button>
          </div>

          {/* Reviews summary */}
          <div className="panel">
            <h3>Reviews Summary</h3>

            <div className="metric">
              <Clock size={18} />
              <span>2 reviews submitted</span>
            </div>

            <div className="metric">
              <Clock size={18} />
              <span>1 review pending</span>
            </div>
          </div>
        </div>

        {/* ===== Right column ===== */}
        <div style={{ display: "grid", gap: 24 }}>

          {/* Editor actions */}
          <div className="panel">
            <h3>Editorial Actions</h3>

            <button
              style={{
                width: "100%",
                marginBottom: 10,
                padding: "10px",
                borderRadius: 8,
                border: "1px solid #16a34a",
                background: "#ecfdf5",
                color: "#166534",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <CheckCircle size={16} />
              Recommend Acceptance
            </button>

            <button
              style={{
                width: "100%",
                marginBottom: 10,
                padding: "10px",
                borderRadius: 8,
                border: "1px solid #f59e0b",
                background: "#fffbeb",
                color: "#92400e",
                cursor: "pointer",
              }}
            >
              Request Revision
            </button>

            <button
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 8,
                border: "1px solid #dc2626",
                background: "#fef2f2",
                color: "#991b1b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <XCircle size={16} />
              Recommend Rejection
            </button>
          </div>

          {/* Notes */}
          <div className="panel">
            <h3>Editor Notes</h3>

            <textarea
              placeholder="Internal notes (not visible to authors)..."
              style={{
                width: "100%",
                minHeight: 120,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                resize: "vertical",
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

export default EditorManuscriptWorkspace;

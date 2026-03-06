import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 14,
  padding: 20,
  border: "1px solid #e5e7eb",
  boxShadow: "0 4px 10px rgba(0,0,0,0.03)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: 14,
};

const Settings = () => {
    const navigate = useNavigate();
  const [workflow, setWorkflow] = useState({
    minReviewers: 2,
    allowRevisions: true,
    maxRevisions: 2,
  });

  const [payment, setPayment] = useState({
    fee: 45000,
    requirePayment: true,
  });

  const [journal, setJournal] = useState({
    name: "",
    email: "",
    description: "",
  });

  return (
    <div
      className="content"
      style={{
        padding: 24,
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <h2 style={{ margin: 0 }}>System Settings</h2>
      </div>
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Configure how your journal workflow and publication process behaves.
        </p>
      </div>

      {/* ================= Workflow ================= */}
      <section style={{ ...cardStyle, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Workflow Settings
        </h3>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Control reviewer requirements and revision behaviour.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <div style={labelStyle}>Minimum reviewers per manuscript</div>
            <input
              type="number"
              min={1}
              style={inputStyle}
              value={workflow.minReviewers}
              onChange={(e) =>
                setWorkflow({
                  ...workflow,
                  minReviewers: Number(e.target.value),
                })
              }
            />
          </div>

          <div>
            <div style={labelStyle}>Maximum revision rounds</div>
            <input
              type="number"
              min={0}
              disabled={!workflow.allowRevisions}
              style={{
                ...inputStyle,
                background: workflow.allowRevisions ? "#fff" : "#f3f4f6",
              }}
              value={workflow.maxRevisions}
              onChange={(e) =>
                setWorkflow({
                  ...workflow,
                  maxRevisions: Number(e.target.value),
                })
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 22,
            }}
          >
            <input
              type="checkbox"
              checked={workflow.allowRevisions}
              onChange={(e) =>
                setWorkflow({
                  ...workflow,
                  allowRevisions: e.target.checked,
                })
              }
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              Allow revisions
            </span>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            style={{
              background: "#4f46e5",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save workflow settings
          </button>
        </div>
      </section>

      {/* ================= Payments ================= */}
      <section style={{ ...cardStyle, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Payment Settings
        </h3>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Configure publication charges and payment requirements.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <div style={labelStyle}>Publication fee (₦)</div>
            <input
              type="number"
              style={inputStyle}
              value={payment.fee}
              onChange={(e) =>
                setPayment({
                  ...payment,
                  fee: Number(e.target.value),
                })
              }
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 22,
            }}
          >
            <input
              type="checkbox"
              checked={payment.requirePayment}
              onChange={(e) =>
                setPayment({
                  ...payment,
                  requirePayment: e.target.checked,
                })
              }
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              Require payment before publishing
            </span>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            style={{
              background: "#4f46e5",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save payment settings
          </button>
        </div>
      </section>

      {/* ================= Journal ================= */}
      <section style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
          Journal Information
        </h3>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Public information about your journal.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          <div>
            <div style={labelStyle}>Journal name</div>
            <input
              type="text"
              style={inputStyle}
              value={journal.name}
              onChange={(e) =>
                setJournal({ ...journal, name: e.target.value })
              }
            />
          </div>

          <div>
            <div style={labelStyle}>Contact email</div>
            <input
              type="email"
              style={inputStyle}
              value={journal.email}
              onChange={(e) =>
                setJournal({ ...journal, email: e.target.value })
              }
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <div style={labelStyle}>Journal description</div>
            <textarea
              style={{
                ...inputStyle,
                minHeight: 90,
                resize: "vertical",
              }}
              value={journal.description}
              onChange={(e) =>
                setJournal({
                  ...journal,
                  description: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            style={{
              background: "#4f46e5",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save journal information
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;

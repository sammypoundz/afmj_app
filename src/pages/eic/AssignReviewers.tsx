import { useState } from "react";
import type { FC } from "react";
import { UserPlus, X, CheckCircle } from "lucide-react";

/* ================= Types ================= */

interface Manuscript {
  id: number;
  title: string;
  subject: string;
  requiredReviewers: number;
  reviewers: string[];
  status: "Under Review";
  abstract: string;
}

interface Reviewer {
  id: number;
  name: string;
  expertise: string[];
  activeAssignments: number;
}

/* ================= Mock data ================= */

const manuscripts: Manuscript[] = [
  {
    id: 1,
    title: "Antimicrobial Resistance in Urban Hospitals",
    subject: "Public Health",
    requiredReviewers: 3,
    reviewers: ["Rev D"],
    status: "Under Review",
    abstract:
      "This study investigates the prevalence and drivers of antimicrobial resistance in selected urban hospitals."
  },
  {
    id: 2,
    title: "Climate Change and Coastal Ecosystems",
    subject: "Environmental Science",
    requiredReviewers: 3,
    reviewers: [],
    status: "Under Review",
    abstract:
      "This study explores climate change impacts on biodiversity in coastal ecosystems."
  }
];

const reviewers: Reviewer[] = [
  { id: 1, name: "Rev A", expertise: ["Epidemiology"], activeAssignments: 1 },
  { id: 2, name: "Rev B", expertise: ["Microbiology"], activeAssignments: 2 },
  { id: 3, name: "Rev C", expertise: ["Environmental Science"], activeAssignments: 0 },
  { id: 4, name: "Rev D", expertise: ["Public Health"], activeAssignments: 3 }
];

/* ================= Modal ================= */

interface AssignModalProps {
  manuscript: Manuscript;
  onClose: () => void;
  onAssign: (reviewers: string[], dueDate: string) => void;
}

const AssignReviewerModal: FC<AssignModalProps> = ({
  manuscript,
  onClose,
  onAssign
}) => {
  const [selected, setSelected] = useState<string[]>(
    manuscript.reviewers || []
  );
  const [dueDate, setDueDate] = useState("");

  const toggle = (name: string) => {
    setSelected((prev) =>
      prev.includes(name)
        ? prev.filter((r) => r !== name)
        : [...prev, name]
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          width: "95%",
          maxWidth: 650,
          maxHeight: "85vh",
          overflowY: "auto"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <h3>Assign reviewers</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none" }}
          >
            <X />
          </button>
        </div>

        {/* Manuscript info */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f9fafb",
            borderRadius: 8
          }}
        >
          <strong>{manuscript.title}</strong>
          <p style={{ fontSize: 13, color: "#374151" }}>
            {manuscript.abstract}
          </p>
        </div>

        {/* Reviewer list */}
        <div style={{ marginTop: 16 }}>
          <h4>Select reviewers</h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
              gap: 10,
              marginTop: 10
            }}
          >
            {reviewers.map((r) => {
              const active = selected.includes(r.name);

              return (
                <div
                  key={r.id}
                  onClick={() => toggle(r.name)}
                  style={{
                    border: active
                      ? "2px solid #0d6efd"
                      : "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 10,
                    cursor: "pointer",
                    background: active ? "#eff6ff" : "#fff"
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#374151" }}>
                    {r.expertise.join(", ")}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Active: {r.activeAssignments}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Due date */}
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13 }}>Review due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{
              display: "block",
              marginTop: 6,
              padding: 6,
              borderRadius: 6,
              border: "1px solid #d1d5db"
            }}
          />
        </div>

        {/* Actions */}
        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #d1d5db"
            }}
          >
            Cancel
          </button>

          <button
            onClick={() => onAssign(selected, dueDate)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: "#0d6efd",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <CheckCircle size={16} />
            Assign
          </button>
        </div>
      </div>
    </div>
  );
};

/* ================= Page ================= */

const AssignReviewers: FC = () => {
  const [data, setData] = useState<Manuscript[]>(manuscripts);
  const [target, setTarget] = useState<Manuscript | null>(null);

  const handleAssign = (names: string[], dueDate: string) => {
    if (!target) return;

    setData((prev) =>
      prev.map((m) =>
        m.id === target.id
          ? {
              ...m,
              reviewers: names
            }
          : m
      )
    );

    // you can persist dueDate later in backend
    console.log("Assigned reviewers, due:", dueDate);

    setTarget(null);
  };

  return (
    <div className="content">
      <h1 className="page-title">Assign Reviewers</h1>

      <div className="panel" style={{ padding: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th>Manuscript</th>
              <th>Subject</th>
              <th>Required</th>
              <th>Assigned</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {data.map((m) => (
              <tr
                key={m.id}
                style={{ borderBottom: "1px solid #f3f4f6" }}
              >
                <td>{m.title}</td>
                <td>{m.subject}</td>
                <td>{m.requiredReviewers}</td>
                <td>{m.reviewers.length}</td>
                <td>{m.status}</td>
                <td>
                  <button
                    onClick={() => setTarget(m)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: "#0d6efd",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <UserPlus size={16} />
                    Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div style={{ padding: 16, color: "#6b7280" }}>
            No manuscripts awaiting reviewer assignment.
          </div>
        )}
      </div>

      {target && (
        <AssignReviewerModal
          manuscript={target}
          onClose={() => setTarget(null)}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
};

export default AssignReviewers;

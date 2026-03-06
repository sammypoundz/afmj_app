import { FileText, Send } from "lucide-react";

const revisions = [
  { manuscript: "Telemedicine Africa", author: "Dr. Zainab Lawal" },
  { manuscript: "Gene Editing Ethics", author: "Dr. Samuel Okoye" },
];

const RevisionHandlingPage = () => {
  return (
    <div style={{ padding: 24 }}>
      <h2>Handle Author Revisions</h2>

      <div style={{ display: "grid", gap: 18 }}>
        {revisions.map((r, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #e5e7eb",
              padding: 18,
              borderRadius: 12
            }}
          >
            <FileText size={18} />

            <h4>{r.manuscript}</h4>

            <p style={{ color: "#6b7280" }}>
              Author: {r.author}
            </p>

            <button
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #16a34a",
                background: "#ecfdf5",
                cursor: "pointer"
              }}
            >
              <Send size={16} />
              Send Revision Feedback
            </button>

          </div>
        ))}
      </div>

    </div>
  );
};

export default RevisionHandlingPage;
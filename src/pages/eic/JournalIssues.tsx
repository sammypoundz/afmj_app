import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileWarning,
  Eye,
  Send,
} from "lucide-react";

/* ================= Types ================= */

interface JournalIssue {
  id: number;
  manuscriptId: number;
  title: string;
  authors: string;
  issueType: "revision" | "rejection";
  status: "sent" | "acknowledged";
  createdAt: string;
}

/* ================= Sample Data ================= */

const sampleIssues: JournalIssue[] = [
  {
    id: 1,
    manuscriptId: 1,
    title: "COVID-19 Vaccine Efficacy",
    authors: "Dr. B. Johnson",
    issueType: "revision",
    status: "sent",
    createdAt: "2026-02-09",
  },
  {
    id: 2,
    manuscriptId: 4,
    title: "Deep Learning for Radiology",
    authors: "Dr. D. Kim",
    issueType: "rejection",
    status: "sent",
    createdAt: "2026-02-08",
  },
];

/* ================= Component ================= */

const JournalIssues: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="content">
      <h1 className="page-title">Journal Issues</h1>

      <div className="panel">

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Manuscript</th>
              <th>Author(s)</th>
              <th>Issue type</th>
              <th>Status</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {sampleIssues.map((issue) => (
              <tr
                key={issue.id}
                style={{ borderTop: "1px solid #e5e7eb" }}
              >
                <td style={{ padding: "10px 4px" }}>
                  <div style={{ fontWeight: 600 }}>
                    {issue.title}
                  </div>
                </td>

                <td>{issue.authors}</td>

                <td>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      background:
                        issue.issueType === "revision"
                          ? "#dbeafe"
                          : "#fee2e2",
                      color:
                        issue.issueType === "revision"
                          ? "#1d4ed8"
                          : "#991b1b",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FileWarning size={12} />
                    {issue.issueType === "revision"
                      ? "Revision"
                      : "Rejection"}
                  </span>
                </td>

                <td>
                  <span
                    style={{
                      fontSize: "12px",
                      color:
                        issue.status === "sent"
                          ? "#0d6efd"
                          : "#16a34a",
                    }}
                  >
                    {issue.status === "sent"
                      ? "Sent to author"
                      : "Acknowledged"}
                  </span>
                </td>

                <td>{issue.createdAt}</td>

                <td>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      justifyContent: "flex-end",
                    }}
                  >
                    {/* View issue details */}
                    <button
                      title="View issue"
                      onClick={() =>
                        navigate(`/journal-issues/${issue.id}`)
                      }
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <Eye size={16} />
                    </button>

                    {/* Re-send or follow up later */}
                    <button
                      title="Resend to author"
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </div>
  );
};

export default JournalIssues;

import type { FC } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  AlertTriangle,
  Send,
  Edit3,
  Check,
} from "lucide-react";

/* ================= Types ================= */

interface ReviewerComment {
  reviewer: string;
  comment: string;
}

interface Manuscript {
  id: number;
  title: string;
  authors: string;
  reviewerComments: ReviewerComment[];
}

/* ================= Sample Data ================= */

const sampleManuscripts: Manuscript[] = [
  {
    id: 1,
    title: "COVID-19 Vaccine Efficacy",
    authors: "Dr. B. Johnson",
    reviewerComments: [
      {
        reviewer: "Rev E",
        comment:
          "The manuscript is well written, but the statistical analysis section should be expanded.",
      },
      {
        reviewer: "Rev F",
        comment:
          "Please clarify the inclusion criteria and improve the discussion section.",
      },
    ],
  },
];

/* ================= Component ================= */

const CreateIssue: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const manuscript = sampleManuscripts.find(
    (m) => m.id === Number(id)
  );

  const [issueType, setIssueType] = useState<"revision" | "rejection">(
    "revision"
  );

  const [editorMessage, setEditorMessage] = useState("");

  // ✅ editable reviewer comments
  const [comments, setComments] = useState<ReviewerComment[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  /* ================= auto select radio from url ================= */
  useEffect(() => {
    const type = searchParams.get("type");

    // supports ?type=reject and your typo ?type=ject
    if (type === "reject" || type === "jection" || type === "ject") {
      setIssueType("rejection");
    } else if (type === "revision") {
      setIssueType("revision");
    }
  }, [searchParams]);

  /* ================= load editable comments ================= */
  useEffect(() => {
    if (manuscript) {
      setComments(manuscript.reviewerComments);
    }
  }, [manuscript]);

  if (!manuscript) {
    return (
      <div className="content">
        <p>Manuscript not found.</p>
      </div>
    );
  }

  const handleSubmit = () => {
    const payload = {
      manuscriptId: manuscript.id,
      issueType,
      editorMessage,
      reviewerComments: comments, // ✅ edited comments go out
    };

    console.log("Issue payload:", payload);

    navigate("/journal-issues");
  };

  const updateComment = (index: number, value: string) => {
    setComments((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, comment: value } : c
      )
    );
  };

  return (
    <div className="content">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={() => navigate(-1)}   // ✅ go back to where user came from
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#0d6efd",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <h1 className="page-title">Create Journal Issue</h1>
      </div>

      {/* Manuscript info */}
      <div className="panel" style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <FileText size={18} />
          <strong>Manuscript</strong>
        </div>

        <div style={{ fontWeight: 600 }}>
          {manuscript.title}
        </div>
        <div style={{ fontSize: "13px", color: "#6b7280" }}>
          {manuscript.authors}
        </div>
      </div>

      {/* Reviewer comments */}
      <div className="panel" style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <MessageSquare size={18} />
          <strong>Reviewer comments</strong>
        </div>

        {comments.map((c, i) => {
          const isEditing = editingIndex === i;

          return (
            <div
              key={i}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "8px",
                background: "#f9fafb",
                fontSize: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {c.reviewer}
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => setEditingIndex(i)}
                    title="Edit comment"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#0d6efd",
                    }}
                  >
                    <Edit3 size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingIndex(null)}
                    title="Save"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#16a34a",
                    }}
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>

              {!isEditing ? (
                <div style={{ color: "#374151" }}>
                  {c.comment}
                </div>
              ) : (
                <textarea
                  value={c.comment}
                  onChange={(e) =>
                    updateComment(i, e.target.value)
                  }
                  style={{
                    width: "100%",
                    minHeight: "70px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    outline: "none",
                    resize: "vertical",
                    fontSize: "14px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Issue type */}
      <div className="panel" style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <AlertTriangle size={18} />
          <strong>Issue type</strong>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          <label style={{ display: "flex", gap: "6px", cursor: "pointer" }}>
            <input
              type="radio"
              checked={issueType === "revision"}
              onChange={() => setIssueType("revision")}
            />
            Revision request
          </label>

          <label style={{ display: "flex", gap: "6px", cursor: "pointer" }}>
            <input
              type="radio"
              checked={issueType === "rejection"}
              onChange={() => setIssueType("rejection")}
            />
            Rejection
          </label>
        </div>
      </div>

      {/* Message to author */}
      <div className="panel" style={{ marginBottom: "16px" }}>
        <strong>Editor message to author</strong>

        <textarea
          value={editorMessage}
          onChange={(e) => setEditorMessage(e.target.value)}
          placeholder={
            issueType === "revision"
              ? "Write instructions and guidance for the author..."
              : "Write the official reason for rejection..."
          }
          style={{
            width: "100%",
            marginTop: "8px",
            minHeight: "120px",
            padding: "10px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            outline: "none",
            resize: "vertical",
          }}
        />
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
        }}
      >
        <button
          onClick={() => navigate(-1)} // ✅ back to previous page
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            background: "#f3f4f6",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "none",
            background:
              issueType === "revision" ? "#0d6efd" : "#dc2626",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Send size={16} />
          Send to author
        </button>
      </div>
    </div>
  );
};

export default CreateIssue;

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, FileText, Download, File } from "lucide-react";

interface Props {
  title: string;
  status: string;
}

interface Manuscript {
  id: number;
  title: string;
  author: string;
  objective: string;
  conclusion: string;
  submitted: string;
  status: string;
}

const mockManuscripts: Manuscript[] = [
  {
    id: 101,
    title: "AI in Rural Healthcare",
    author: "Dr. Musa Abdullahi",
    objective: "AI-assisted diagnosis evaluation.",
    conclusion: "Improved early detection.",
    submitted: "2026-02-01",
    status: "new",
  },
  {
    id: 101,
    title: "AI in Rural Healthcare",
    author: "Dr. Musa Abdullahi",
    objective: "AI-assisted diagnosis evaluation.",
    conclusion: "Improved early detection.",
    submitted: "2026-02-01",
    status: "new",
  },
  {
    id: 101,
    title: "AI in Rural Healthcare",
    author: "Dr. Musa Abdullahi",
    objective: "AI-assisted diagnosis evaluation.",
    conclusion: "Improved early detection.",
    submitted: "2026-02-01",
    status: "new",
  },
  {
    id: 101,
    title: "AI in Rural Healthcare",
    author: "Dr. Musa Abdullahi",
    objective: "AI-assisted diagnosis evaluation.",
    conclusion: "Improved early detection.",
    submitted: "2026-02-01",
    status: "new",
  },
  {
    id: 101,
    title: "AI in Rural Healthcare",
    author: "Dr. Musa Abdullahi",
    objective: "AI-assisted diagnosis evaluation.",
    conclusion: "Improved early detection.",
    submitted: "2026-02-01",
    status: "new",
  },
  {
    id: 102,
    title: "Blockchain Medical Security",
    author: "Dr. Aisha Bello",
    objective: "Secure patient records.",
    conclusion: "Tampering risk reduced.",
    submitted: "2026-02-03",
    status: "review",
  },
];

const ITEMS_PER_PAGE = 3;

const EditorManuscriptList = ({ title, status }: Props) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<Manuscript | null>(null);

  const filtered = mockManuscripts.filter((m) => m.status === status);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <div style={{ padding: 20 }}>

      <h2>{title}</h2>

      <div style={{ color: "#6b7280", marginBottom: 20 }}>
        Total Manuscripts: {filtered.length}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "#6b7280" }}>
          No manuscripts in this category.
        </p>
      )}

      {paginated.map((m) => (
        <div
          key={m.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 18,
            marginBottom: 16,
            background: "#fff",
            cursor: "pointer",
          }}
          onClick={() => navigate(`/editor/manuscripts/${m.id}`)}
        >

          {/* Header Row */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <File size={18} />
              <h3 style={{ margin: 0 }}>{m.title}</h3>
            </div>

            <div style={{ display: "flex", gap: 14 }}>

              <Eye
                size={18}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setPreview(m);
                }}
              />

              <FileText
                size={18}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/editor/manuscripts/${m.id}`);
                }}
              />

              <Download
                size={18}
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  alert("Download manuscript");
                }}
              />

            </div>
          </div>

          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>
            Manuscript ID: {m.id} | Submitted: {m.submitted}
          </div>

          <div style={{ marginTop: 6 }}>
            <strong>Author:</strong> {m.author}
          </div>

          <div style={{ marginTop: 6 }}>
            <strong>Objective:</strong> {m.objective}
          </div>

          <div style={{ marginTop: 6 }}>
            <strong>Conclusion:</strong> {m.conclusion}
          </div>

        </div>
      ))}

      {/* Pagination */}
{totalPages > 1 && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: 14,
      marginTop: 28,
    }}
  >
    {/* Prev Button */}
    <button
      disabled={page === 1}
      onClick={() => setPage(page - 1)}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        background: page === 1 ? "#f3f4f6" : "#fff",
        color: page === 1 ? "#9ca3af" : "#111827",
        cursor: page === 1 ? "not-allowed" : "pointer",
        transition: "0.2s",
      }}
    >
      ← Prev
    </button>

    {/* Page Indicator */}
    <span
      style={{
        fontWeight: 500,
        color: "#374151",
        fontSize: 14,
      }}
    >
      Page {page} of {totalPages}
    </span>

    {/* Next Button */}
    <button
      disabled={page === totalPages}
      onClick={() => setPage(page + 1)}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        background: page === totalPages ? "#f3f4f6" : "#fff",
        color: page === totalPages ? "#9ca3af" : "#111827",
        cursor: page === totalPages ? "not-allowed" : "pointer",
        transition: "0.2s",
      }}
    >
      Next →
    </button>
  </div>
)}

      {/* Preview Modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 60
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 14,
              width: 500
            }}
          >
            <h3>{preview.title}</h3>
            <p><strong>Author:</strong> {preview.author}</p>
            <p><strong>Objective:</strong> {preview.objective}</p>
            <p><strong>Conclusion:</strong> {preview.conclusion}</p>

            <div style={{ textAlign: "right", marginTop: 20 }}>
              <button onClick={() => setPreview(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EditorManuscriptList;
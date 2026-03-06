import { type FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  UploadCloud,
  ArrowRight,
} from "lucide-react";

interface Manuscript {
  id: number;
  slug: string;
  title: string;
  authors: string;
  study_type: string;
  status: string;
  submitted_at: string;
}

const statusIcons: Record<string, FC<any>> = {
  "New Submission": FileText,
  "Under Review": Clock,
  "Revisions": FileText,
  "Accepted": CheckCircle,
  "Rejected": XCircle,
  "Published": UploadCloud,
};

const statusColors: Record<string, string> = {
  "New Submission": "#0d6efd",
  "Under Review": "#fd7e14",
  "Revisions": "#6f42c1",
  "Accepted": "#198754",
  "Rejected": "#dc3545",
  "Published": "#20c997",
};

const Manuscripts: FC = () => {
  const navigate = useNavigate();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://afmjonline.com/api/manuscripts.php")
      .then(res => res.json())
      .then(data => {
        setManuscripts(data.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching manuscripts:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="content">Loading manuscripts...</div>;

  const statuses = Array.from(new Set(manuscripts.map(m => m.status)));
  const PREVIEW_COUNT = 3;

  const slugify = (status: string) =>
    status.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="content">
      <h1 className="page-title">Manuscripts Overview</h1>

      {statuses.map(status => {
        const allItems = manuscripts.filter(m => m.status === status);
        const previewItems = allItems.slice(0, PREVIEW_COUNT);
        const Icon = statusIcons[status] || FileText;
        const color = statusColors[status] || "#6b7280";
        const route = `/manuscripts/${slugify(status)}`;

        return (
          <section key={status} style={{ marginBottom: "32px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3 style={{ margin: 0 }}>
                {status} ({allItems.length})
              </h3>

              <button
                onClick={() => navigate(route)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#007437",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            <div className="panel">
              <ul className="action-list">
                {previewItems.map(item => (
                  <li
                    key={item.slug}
                    className="metric clickable"
                    onClick={() =>
                      navigate(`${route}/${item.slug}`)
                    }
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          background: "rgba(0,0,0,0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color,
                        }}
                      >
                        <Icon size={18} />
                      </div>

                      <div>
                        <div style={{ fontWeight: 500 }}>{item.title}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {item.authors} • {item.study_type} •{" "}
                          {item.submitted_at}
                        </div>
                      </div>
                    </div>

                    <ArrowRight size={16} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default Manuscripts;
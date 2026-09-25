import { type FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  UploadCloud,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { API_ORIGIN } from "../../apiConfig";

interface Manuscript {
  id: number;
  slug: string;
  title: string;
  authors: string;
  study_type: string;
  status: string;
  submitted_at: string;
  hasRevisions?: boolean;
  hasUploadedRevision?: boolean;
  inProduction?: boolean;
  views?: number;
  downloads?: number;
}

const statusIcons: Record<string, FC<any>> = {
  "New Submissions": FileText,
  "Under Review": Clock,
  "Revisions": FileText,
  "Revised": RotateCcw,
  "Accepted": CheckCircle,
  "Rejected": XCircle,
  "Published": UploadCloud,
};

const statusColors: Record<string, string> = {
  "New Submissions": "#0d6efd",
  "Under Review": "#fd7e14",
  "Revisions": "#6f42c1",
  "Revised": "#198754",
  "Accepted": "#198754",
  "Rejected": "#dc3545",
  "Published": "#20c997",
};

const Manuscripts: FC = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManuscripts = async () => {
      try {
        const res = await authFetch(`${API_ORIGIN}/api2/manuscripts.php`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        
        // Transform data to match expected format
        const transformedData = (data.data || []).map((item: any) => ({
          id: item.id,
          slug: item.slug || `manuscript-${item.id}`,
          title: item.title,
          authors: item.authors,
          study_type: item.studyType || item.study_type || "Research Article",
          status: item.status,
          submitted_at: item.date || item.submitted_at || new Date().toLocaleDateString(),
          hasRevisions: item.hasRevisions || false,
          hasUploadedRevision: item.hasUploadedRevision || false,
          inProduction: item.inProduction || false,
          views: item.views || 0,
          downloads: item.downloads || 0,
        }));
        
        setManuscripts(transformedData);
      } catch (err) {
        console.error("Error fetching manuscripts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchManuscripts();
  }, [authFetch]);

  if (loading) return <div className="content">Loading manuscripts...</div>;

  // Get unique statuses from the data
  const statuses = Array.from(new Set(manuscripts.map((m) => m.status)));
  const PREVIEW_COUNT = 3;

  const slugify = (status: string) =>
    status.toLowerCase().replace(/\s+/g, "-");

  // Helper to get the correct route based on status
  const getRoute = (status: string) => {
    // Map status to the correct route that matches ManuscriptCategoryView filtering
    const statusMap: Record<string, string> = {
      "New Submissions": "/eic/manuscripts/new-submissions",
      "Under Review": "/eic/manuscripts/under-review",
      "Revisions": "/eic/manuscripts/revisions",
      "Revised": "/eic/manuscripts/revised",
      "Accepted": "/eic/manuscripts/accepted",
      "Rejected": "/eic/manuscripts/rejected",
      "Published": "/eic/manuscripts/published",
    };
    return statusMap[status] || `/eic/manuscripts/${slugify(status)}`;
  };

  return (
    <div className="content">
      <h1 className="page-title">Manuscripts Overview</h1>

      {statuses.map((status) => {
        // Filter manuscripts for this status
        let allItems = manuscripts.filter((m) => m.status === status);
        
        // For "Revisions" status, only show manuscripts with pending revisions
        if (status === "Revisions" || status === "Revision Requested") {
          allItems = allItems.filter((m) => m.hasRevisions && !m.hasUploadedRevision);
        }
        // For "Revised" status, only show manuscripts with uploaded revisions
        else if (status === "Revised") {
          allItems = allItems.filter((m) => m.hasRevisions && m.hasUploadedRevision);
        }
        // For "Accepted" status, only show manuscripts NOT in production
        else if (status === "Accepted") {
          allItems = allItems.filter((m) => !m.inProduction);
        }
        
        const previewItems = allItems.slice(0, PREVIEW_COUNT);
        const Icon = statusIcons[status] || FileText;
        const color = statusColors[status] || "#6b7280";
        const route = getRoute(status);

        // Skip empty status groups
        if (allItems.length === 0) return null;

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
                {previewItems.map((item) => (
                  <li
                    key={item.slug}
                    className="metric clickable"
                    onClick={() => navigate(route)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px",
                      borderRadius: "8px",
                      cursor: "pointer",
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
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Save } from "lucide-react";
import { API_ORIGIN } from "../../apiConfig";
import { useAuth } from "../../contexts/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = `${API_ORIGIN}/api2/EICpublicationApi.php`;
const DOWNLOAD_API = `${API_ORIGIN}/api2/download.php`;

interface PublishedManuscript {
  id: number;
  manuscriptId: string;
  title: string;
  authors: string;
  authorName?: string;
  studyType?: string;
  keywords?: string;
  abstract?: string;
  objective?: string;
  methods?: string;
  results?: string;
  conclusion?: string;
  publicationFile?: string;
  publishedAt?: string;
  views?: number;
  downloads?: number;
}

const Published = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [list, setList] = useState<PublishedManuscript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublished = async () => {
      try {
        const res = await fetch(`${API_BASE}?action=listPublished`);
        const data = await res.json();
        if (res.ok) {
          setList(data);
        } else {
          toast.error(data.error || "Failed to load published manuscripts");
        }
      } catch (err) {
        console.error(err);
        toast.error("Network error loading published manuscripts");
      } finally {
        setLoading(false);
      }
    };
    fetchPublished();
  }, []);

  const downloadFile = async (filePath?: string, fileName?: string) => {
    if (!filePath) {
      toast.error("No file available");
      return;
    }
    const toastId = toast.loading("Downloading...");
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(filePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      const parts = filePath.split(".");
      let extension = parts.length > 1 ? parts.pop() || "" : "";
      if (extension.includes("?")) extension = extension.split("?")[0];
      const finalName = fileName || `published_${Date.now()}${extension ? "." + extension : ""}`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.update(toastId, { render: "Downloaded successfully", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      console.error("Download failed:", error);
      toast.update(toastId, { render: "Download failed", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  const openInPublicationPage = (m: PublishedManuscript) => {
    // Redirect to the Publication Decisions page with the edit target
    navigate(`/eic/publications/decision?editPublished=${m.id}`);
  };

  return (
    <div className="content" style={{ padding: "24px", overflowX: "hidden" }}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#0d6efd",
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={28} /> Back
        </button>
        <h1 style={{ margin: 0 }}>Published Articles</h1>
      </div>
      <p style={{ color: "#6b7280", marginBottom: "24px" }}>
        Click <strong>Edit / Continue</strong> on any article to open it in the Publication Decisions page where you can
        update its details or replace the published PDF, then republish.
      </p>

      {loading && <p>Loading published manuscripts...</p>}

      {!loading && list.length === 0 && (
        <p style={{ color: "#6b7280" }}>No published manuscripts yet.</p>
      )}

      {!loading && list.map((m) => (
        <div
          key={m.id}
          style={{
            border: "1px solid #e5e7eb",
            padding: "16px",
            borderRadius: "10px",
            marginBottom: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 300px", wordBreak: "break-word" }}>
            <strong style={{ fontSize: "16px" }}>
              {m.manuscriptId} - {m.title}
            </strong>
            <p style={{ margin: "4px 0", color: "#6b7280" }}>{m.authors || m.authorName}</p>
            <small style={{ color: "#6b7280" }}>
              Published {m.publishedAt ? new Date(m.publishedAt).toLocaleDateString() : "—"} · {m.views ?? 0} views ·{" "}
              {m.downloads ?? 0} downloads
            </small>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginLeft: "auto" }}>
            <button
              onClick={() => downloadFile(m.publicationFile, `published_${m.manuscriptId}`)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                background: "#f3f4f6",
                color: "#374151",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Download size={16} /> PDF
            </button>
            <button
              onClick={() => openInPublicationPage(m)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                background: "#0d6efd",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 500,
              }}
            >
              <Save size={16} /> Edit / Continue
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Published;

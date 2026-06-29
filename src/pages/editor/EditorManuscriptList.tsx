import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Eye, FileText, Download, File, ArrowLeft, X, Loader } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const DOWNLOAD_API = "https://vinosschool.com/api/download.php";

interface Props {
  title: string;
  status: string; // 'new', 'under_review', 'revisions', 'accepted', 'rejected'
}

interface Manuscript {
  id: number;
  title: string;
  author: string;
  submittedAt: string;
  status: string;
  slug: string;
}

interface FullManuscript {
  id: number;
  title: string;
  slug: string;
  abstract: string | null;
  status: string;
  submittedAt: string;
  author: string;
  study_type: string | null;
  keywords: string | null;
  objective: string | null;
  methods: string | null;
  results: string | null;
  conclusion: string | null;
  files: {
    manuscript: string | null;
    cover_letter: string | null;
    circulating: string | null;
  };
}

const ITEMS_PER_PAGE = 5;

const EditorManuscriptList = ({ title, status }: Props) => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<FullManuscript | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchManuscripts = async () => {
      try {
        const res = await authFetch(
          `https://vinosschool.com/api/editorApi.php?action=listManuscripts&type=${status}`
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch manuscripts");
        }
        const data = await res.json();
        setManuscripts(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Could not load manuscripts.");
      } finally {
        setLoading(false);
      }
    };
    fetchManuscripts();
  }, [authFetch, status]);

  const totalManuscripts = manuscripts.length;
  const totalPages = Math.ceil(totalManuscripts / ITEMS_PER_PAGE);
  const paginated = manuscripts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const handleRowClick = (id: number) => {
    navigate(`/editor/manuscripts/${id}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const openPreview = async (manuscript: Manuscript) => {
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await authFetch(
        `https://vinosschool.com/api/editorApi.php?action=getManuscriptDetails&id=${manuscript.id}`
      );
      if (!res.ok) throw new Error("Failed to load manuscript details");
      const data = await res.json();
      setPreview(data.manuscript);
    } catch (err) {
      console.error(err);
      alert("Could not load manuscript details.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadFile = async (filePath: string | null, fileName: string) => {
    if (!filePath) {
      alert("No file available for download.");
      return;
    }
    setDownloadLoading(fileName);
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(filePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      let extension = "";
      const parts = filePath.split(".");
      if (parts.length > 1) {
        extension = parts.pop() || "";
        if (extension.includes("?")) extension = extension.split("?")[0];
      }
      const finalName = fileName + (extension ? "." + extension : "");
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert("Download failed.");
    } finally {
      setDownloadLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 30, height: 30, border: "3px solid #e5e7eb", borderTop: "3px solid #16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "#dc2626" }}>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "6px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
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
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>

      <div style={{ color: "#6b7280", marginBottom: 20 }}>
        Total Manuscripts: {totalManuscripts}
      </div>

      {totalManuscripts === 0 && (
        <p style={{ color: "#6b7280" }}>No manuscripts in this category.</p>
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
            transition: "box-shadow 0.2s",
          }}
          onClick={() => handleRowClick(m.id)}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
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
              <span title="Preview" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Eye
                  size={18}
                  style={{ cursor: "pointer", color: "#3b82f6" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openPreview(m);
                  }}
                />
              </span>
              <span title="Open Workspace" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <FileText
                  size={18}
                  style={{ cursor: "pointer", color: "#16a34a" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(m.id);
                  }}
                />
              </span>
              <span title="Download (via workspace)" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Download
                  size={18}
                  style={{ cursor: "pointer", color: "#6b7280" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowClick(m.id);
                  }}
                />
              </span>
            </div>
          </div>

          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>
            Manuscript ID: {m.id} | Submitted: {formatDate(m.submittedAt)}
          </div>

          <div style={{ marginTop: 6 }}>
            <strong>Author:</strong> {m.author}
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
            }}
          >
            ← Prev
          </button>

          <span style={{ fontWeight: 500, color: "#374151", fontSize: 14 }}>
            Page {page} of {totalPages}
          </span>

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
            background: "rgba(15,23,42,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: 20,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 700,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              position: "relative",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setPreview(null)}
              style={{
                position: "sticky",
                top: 10,
                right: 10,
                float: "right",
                background: "rgba(255,255,255,0.9)",
                border: "1px solid #e5e7eb",
                borderRadius: "50%",
                width: 36,
                height: 36,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                zIndex: 10,
              }}
            >
              <X size={18} />
            </button>

            <div style={{ padding: "24px 32px 32px" }}>
              {previewLoading ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Loader size={32} className="animate-spin" style={{ color: "#16a34a" }} />
                  <p style={{ marginTop: 12, color: "#6b7280" }}>Loading manuscript details...</p>
                </div>
              ) : (
                <>
                  <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: "1.6rem", fontWeight: 600 }}>
                    {preview.title}
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16, fontSize: "0.95rem", color: "#6b7280" }}>
                    <span><strong>ID:</strong> {preview.id}</span>
                    <span><strong>Status:</strong> {preview.status}</span>
                    <span><strong>Author:</strong> {preview.author}</span>
                    <span><strong>Submitted:</strong> {formatDate(preview.submittedAt)}</span>
                  </div>

                  {preview.study_type && (
                    <div style={{ marginBottom: 12 }}>
                      <strong>Study Type:</strong> {preview.study_type}
                    </div>
                  )}
                  {preview.keywords && (
                    <div style={{ marginBottom: 12 }}>
                      <strong>Keywords:</strong> {preview.keywords}
                    </div>
                  )}

                  <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />

                  {preview.abstract && (
                    <div style={{ marginBottom: 16 }}>
                      <strong>Abstract</strong>
                      <p style={{ margin: "6px 0 0", color: "#374151", lineHeight: 1.6 }}>{preview.abstract}</p>
                    </div>
                  )}
                  {preview.objective && (
                    <div style={{ marginBottom: 12 }}>
                      <strong>Objective</strong>
                      <p style={{ margin: "4px 0 0", color: "#374151", lineHeight: 1.6 }}>{preview.objective}</p>
                    </div>
                  )}
                  {preview.methods && (
                    <div style={{ marginBottom: 12 }}>
                      <strong>Methods</strong>
                      <p style={{ margin: "4px 0 0", color: "#374151", lineHeight: 1.6 }}>{preview.methods}</p>
                    </div>
                  )}
                  {preview.results && (
                    <div style={{ marginBottom: 12 }}>
                      <strong>Results</strong>
                      <p style={{ margin: "4px 0 0", color: "#374151", lineHeight: 1.6 }}>{preview.results}</p>
                    </div>
                  )}
                  {preview.conclusion && (
                    <div style={{ marginBottom: 12 }}>
                      <strong>Conclusion</strong>
                      <p style={{ margin: "4px 0 0", color: "#374151", lineHeight: 1.6 }}>{preview.conclusion}</p>
                    </div>
                  )}

                  {/* Files section */}
                  <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />
                  <div style={{ marginBottom: 8 }}>
                    <strong>Files</strong>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 12 }}>
                      {preview.files?.manuscript && (
                        <button
                          onClick={() => downloadFile(preview.files.manuscript, `Manuscript_${preview.id}`)}
                          disabled={!!downloadLoading}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid #e5e7eb",
                            background: downloadLoading === `Manuscript_${preview.id}` ? "#e5e7eb" : "#f9fafb",
                            cursor: downloadLoading === `Manuscript_${preview.id}` ? "not-allowed" : "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          {downloadLoading === `Manuscript_${preview.id}` ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          Main Manuscript
                        </button>
                      )}
                      {preview.files?.cover_letter && (
                        <button
                          onClick={() => downloadFile(preview.files.cover_letter, `CoverLetter_${preview.id}`)}
                          disabled={!!downloadLoading}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid #e5e7eb",
                            background: downloadLoading === `CoverLetter_${preview.id}` ? "#e5e7eb" : "#f9fafb",
                            cursor: downloadLoading === `CoverLetter_${preview.id}` ? "not-allowed" : "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          {downloadLoading === `CoverLetter_${preview.id}` ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          Cover Letter
                        </button>
                      )}
                      {preview.files?.circulating && (
                        <button
                          onClick={() => downloadFile(preview.files.circulating, `Circulating_${preview.id}`)}
                          disabled={!!downloadLoading}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: "1px solid #e5e7eb",
                            background: downloadLoading === `Circulating_${preview.id}` ? "#e5e7eb" : "#f9fafb",
                            cursor: downloadLoading === `Circulating_${preview.id}` ? "not-allowed" : "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          {downloadLoading === `Circulating_${preview.id}` ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          Circulating File
                        </button>
                      )}
                      {(!preview.files?.manuscript && !preview.files?.cover_letter && !preview.files?.circulating) && (
                        <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>No files available</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EditorManuscriptList;
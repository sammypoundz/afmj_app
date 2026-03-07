import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Eye, Calendar, BookOpen, FileText } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = "https://afmjonline.com/api/authorApi.php";

interface PublishedArticle {
  id: number;
  slug: string;
  title: string;
  abstract: string;
  study_type: string;
  file_path: string | null;
  doi: string;
  issue: string;
  published_at: string;
  views: number;
  downloads: number;
}

const styles = {
  page: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "24px 16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    color: "#16a34a",
    transition: "all 0.2s",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "24px",
  },
  card: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
    transition: "all 0.2s",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  cardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 12px 24px rgba(0,0,0,0.1)",
    borderColor: "#16a34a",
  },
  badge: {
    background: "#16a34a10",
    color: "#16a34a",
    padding: "4px 10px",
    borderRadius: "40px",
    fontSize: "0.75rem",
    fontWeight: 600,
    display: "inline-block",
    width: "fit-content",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    fontSize: "0.8rem",
    color: "#64748b",
    marginTop: "4px",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  stats: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "12px",
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "0.8rem",
    color: "#475569",
  },
  abstract: {
    fontSize: "0.9rem",
    color: "#475569",
    lineHeight: 1.5,
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  },
  downloadButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "40px",
    fontSize: "0.9rem",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "background 0.2s",
    marginTop: "8px",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "48px 24px",
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    gridColumn: "1 / -1",
  },
};

const AuthorPublished = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublished();
  }, []);

  const fetchPublished = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?action=getPublishedManuscripts`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch published articles");
      }
      const data = await res.json();
      setArticles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (article: PublishedArticle) => {
    if (!article.file_path) {
      toast.error("No file available for download");
      return;
    }

    // You could increment download count via API
    // For now, just trigger download
    window.open(article.file_path, "_blank");
    toast.success(`Downloading ${article.title}`);
  };

  const goBack = () => navigate(-1);

  if (loading) {
    return (
      <div style={styles.page}>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
        <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
          <div style={{
            width: 40,
            height: 40,
            border: "4px solid #16a34a20",
            borderTop: "4px solid #16a34a",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "16px", borderRadius: "8px" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <div style={styles.header}>
        <button
          onClick={goBack}
          style={styles.backButton}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={styles.title}>Published Articles</h1>
      </div>

      {articles.length === 0 ? (
        <div style={styles.emptyState}>
          <BookOpen size={48} color="#94a3b8" />
          <p style={{ marginTop: "16px", fontSize: "1.1rem" }}>
            No published articles yet.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {articles.map((article) => (
            <div
              key={article.id}
              style={styles.card}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.1)";
                e.currentTarget.style.borderColor = "#16a34a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              <span style={styles.badge}>{article.study_type}</span>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a", margin: 0 }}>
                {article.title}
              </h3>
              <p style={styles.abstract}>{article.abstract}</p>

              <div style={styles.metaRow}>
                <span style={styles.metaItem}>
                  <FileText size={14} />
                  {article.doi}
                </span>
              </div>

              <div style={styles.metaRow}>
                <span style={styles.metaItem}>
                  <Calendar size={14} />
                  {new Date(article.published_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span style={styles.metaItem}>{article.issue}</span>
              </div>

              <div style={styles.stats}>
                <span style={styles.statItem}>
                  <Eye size={14} />
                  {article.views} views
                </span>
                <span style={styles.statItem}>
                  <Download size={14} />
                  {article.downloads} downloads
                </span>
              </div>

              <button
                style={styles.downloadButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(article);
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#0d9488")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#16a34a")}
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthorPublished;
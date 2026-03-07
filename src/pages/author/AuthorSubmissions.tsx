import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

const API_BASE = "https://afmjonline.com/api/authorApi.php";

interface Submission {
  id: string;            // manuscript slug
  title: string;
  section: string;
  status: string;
  submitted: string;
  updated: string;
  numericId: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Style definitions
const styles = {
  page: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "24px 16px",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: "24px",
  },
  panel: {
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
    padding: 0,
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    minWidth: "800px",
  },
  th: {
    padding: "16px",
    textAlign: "left" as const,
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#475569",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  thAction: {
    padding: "16px",
    textAlign: "center" as const,
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#475569",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  tr: {
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "16px",
  },
  tdId: {
    padding: "16px",
    fontFamily: "monospace",
    fontSize: "0.9rem",
    color: "#16a34a",
  },
  tdTitle: {
    padding: "16px",
    fontWeight: 500,
    color: "#0f172a",
  },
  tdSection: {
    padding: "16px",
    color: "#475569",
  },
  tdStatus: {
    padding: "16px",
  },
  tdDate: {
    padding: "16px",
    color: "#475569",
  },
  tdAction: {
    padding: "16px",
    textAlign: "center" as const,
  },
  statusBadge: (color: string) => ({
    background: color,
    color: "#fff",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 500,
    display: "inline-block",
  }),
  buttonOutline: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    fontSize: "0.85rem",
    background: "transparent",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background 0.2s",
    color: "#1e293b",
  },
  buttonOutlineHover: {
    background: "#f8fafc",
  },
  paginationContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
    marginTop: "24px",
  },
  paginationButton: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "8px 16px",
    background: "transparent",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background 0.2s",
    color: "#1e293b",
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  paginationText: {
    color: "#475569",
  },
  spinnerContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "50px",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #16a34a20",
    borderTop: "4px solid #16a34a",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  errorBox: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "16px",
    borderRadius: "8px",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center" as const,
    color: "#64748b",
  },
};

const getStatusColor = (status: string) => {
  if (status.includes("Revision") || status === "Revision Pending") return "#f59e0b";
  if (status === "Under Review") return "#3b82f6";
  if (status === "Accepted" || status === "Published") return "#16a34a";
  if (status === "Rejected") return "#dc2626";
  if (status === "Submitted") return "#6b7280";
  return "#6b7280";
};

const AuthorSubmissions = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}?action=listSubmissions&page=${currentPage}&limit=${limit}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch submissions");
        }
        const data = await res.json();
        setSubmissions(data.data);
        setPagination(data.pagination);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (pagination && newPage >= 1 && newPage <= pagination.pages) {
      setCurrentPage(newPage);
    }
  };

  const handleView = (numericId: number) => {
    navigate(`/author/manuscript/${numericId}`);
  };

  // Hover state handlers for buttons
  const handleButtonMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "#f8fafc";
  };
  const handleButtonMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = "transparent";
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
        <div style={styles.spinnerContainer}>
          <div style={styles.spinner} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.errorBox}>{error}</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>My Submissions</h1>

      <div style={styles.panel}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Section</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Submitted</th>
              <th style={styles.th}>Last Updated</th>
              <th style={styles.thAction}>Action</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.emptyState}>
                  No submissions found.
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id} style={styles.tr}>
                  <td style={styles.tdId}>{sub.id}</td>
                  <td style={styles.tdTitle}>{sub.title}</td>
                  <td style={styles.tdSection}>{sub.section}</td>
                  <td style={styles.tdStatus}>
                    <span style={styles.statusBadge(getStatusColor(sub.status))}>
                      {sub.status}
                    </span>
                  </td>
                  <td style={styles.tdDate}>
                    {new Date(sub.submitted).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td style={styles.tdDate}>
                    {new Date(sub.updated).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td style={styles.tdAction}>
                    <button
                      onClick={() => handleView(sub.numericId)}
                      style={styles.buttonOutline}
                      onMouseEnter={handleButtonMouseEnter}
                      onMouseLeave={handleButtonMouseLeave}
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div style={styles.paginationContainer}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              ...styles.paginationButton,
              ...(currentPage === 1 ? styles.paginationButtonDisabled : {}),
            }}
            onMouseEnter={!currentPage ? undefined : handleButtonMouseEnter}
            onMouseLeave={!currentPage ? undefined : handleButtonMouseLeave}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span style={styles.paginationText}>
            Page {currentPage} of {pagination.pages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.pages}
            style={{
              ...styles.paginationButton,
              ...(currentPage === pagination.pages ? styles.paginationButtonDisabled : {}),
            }}
            onMouseEnter={currentPage === pagination.pages ? undefined : handleButtonMouseEnter}
            onMouseLeave={currentPage === pagination.pages ? undefined : handleButtonMouseLeave}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthorSubmissions;
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  UploadCloud,
  TrendingUp,
  AlertCircle,
  Users,
  ArrowRight,
  UserCheck,
  UserCog,
  Building2,
} from "lucide-react";

// Define the expected shape of the API response
interface DashboardData {
  status: string; // "success" or other
  kpi: {
    total_submissions: number;
    under_review: number;
    accepted: number;
    rejected: number;
    published: number;
  };
  users: {
    authors: number;
    reviewers: number;
    editors: number;
    publishers: number;
  };
  pending: {
    overdue_reviews: number;
    awaiting_assignment: number;
    ready_to_publish: number;
  };
  reviewer_performance: {
    average_review_days: number;
    active_reviewers: number;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();

  // Properly typed state
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ================= FETCH API ================= */
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(
          "https://afmjonline.com/api/dashboard.php",
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        setData(response.data);
      } catch (err) {
        console.error("API Error:", err);
        setError("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Render loading/error states
  if (loading) return <div className="dashboard">Loading dashboard...</div>;
  if (error) return <div className="dashboard">{error}</div>;
  if (!data) return <div className="dashboard">No data received.</div>;
  if (data.status !== "success")
    return <div className="dashboard">Invalid server response.</div>;

  /* ================= KPI DATA FROM API ================= */
  const stats = [
    {
      label: "Total Submissions",
      value: data.kpi.total_submissions,
      icon: FileText,
      path: "/manuscripts",
    },
    {
      label: "Under Review",
      value: data.kpi.under_review,
      icon: Clock,
      path: "/under-review",
    },
    {
      label: "Accepted",
      value: data.kpi.accepted,
      icon: CheckCircle,
      path: "/manuscripts?status=accepted",
    },
    {
      label: "Rejected",
      value: data.kpi.rejected,
      icon: XCircle,
      path: "/manuscripts?status=rejected",
    },
    {
      label: "Published",
      value: data.kpi.published,
      icon: UploadCloud,
      path: "/published",
    },
  ];

  /* ================= USER METRICS FROM API ================= */
  const userMetrics = [
    {
      label: "Authors",
      value: data.users.authors,
      icon: Users,
      path: "/users/authors",
    },
    {
      label: "Reviewers",
      value: data.users.reviewers,
      icon: UserCheck,
      path: "/users/reviewers",
    },
    {
      label: "Editors",
      value: data.users.editors,
      icon: UserCog,
      path: "/users/editors",
    },
    {
      label: "Publishers",
      value: data.users.publishers,
      icon: Building2,
      path: "/users/publishers",
    },
  ];

  return (
    <div className="dashboard">
      {/* ===== KPI SECTION ===== */}
      <section className="metrics-section">
        <h2 className="section-title section-title-light">Overview</h2>

        <div className="kpi-modern-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="kpi-modern-card clickable"
                onClick={() => navigate(stat.path)}
              >
                <div className="kpi-icon">
                  <Icon size={22} />
                </div>

                <div className="kpi-content">
                  <h2>{stat.value}</h2>
                  <p>{stat.label}</p>
                </div>

                <div className="kpi-trend">
                  <TrendingUp size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== USER METRICS ===== */}
      <section className="metrics-section">
        <h2 className="section-title section-title-light">User Metrics</h2>

        <div className="kpi-modern-grid">
          {userMetrics.map((user) => {
            const Icon = user.icon;

            return (
              <div
                key={user.label}
                className="kpi-modern-card clickable"
                onClick={() => navigate(user.path)}
              >
                <div className="kpi-icon">
                  <Icon size={22} />
                </div>

                <div className="kpi-content">
                  <h2>{user.value}</h2>
                  <p>{user.label}</p>
                </div>

                <ArrowRight size={16} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== SECOND ROW ===== */}
      <section className="dashboard-grid">
        {/* Pending Actions */}
        <div className="panel">
          <h3>Pending Actions</h3>

          <ul className="action-list">
            <li onClick={() => navigate("/under-review")}>
              <AlertCircle size={16} className="danger" />
              <span>{data.pending.overdue_reviews} reviews overdue</span>
              <ArrowRight size={16} />
            </li>

            <li onClick={() => navigate("/manuscripts")}>
              <Clock size={16} className="warning" />
              <span>
                {data.pending.awaiting_assignment} manuscripts awaiting assignment
              </span>
              <ArrowRight size={16} />
            </li>

            <li onClick={() => navigate("/published")}>
              <CheckCircle size={16} className="success" />
              <span>
                {data.pending.ready_to_publish} decisions ready for publishing
              </span>
              <ArrowRight size={16} />
            </li>
          </ul>
        </div>

        {/* Reviewer Performance */}
        <div className="panel">
          <h3>Reviewer Performance</h3>

          <div
            className="metric clickable"
            onClick={() => navigate("/reviewers/performance")}
          >
            <Clock size={18} />
            <span>
              Average review time:{" "}
              <strong>{data.reviewer_performance.average_review_days} days</strong>
            </span>
            <ArrowRight size={16} />
          </div>

          <div
            className="metric clickable"
            onClick={() => navigate("/reviewers")}
          >
            <Users size={18} />
            <span>
              Active reviewers:{" "}
              <strong>{data.reviewer_performance.active_reviewers}</strong>
            </span>
            <ArrowRight size={16} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
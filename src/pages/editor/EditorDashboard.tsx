import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Inbox,
  Clock,
  RefreshCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface DashboardStats {
  totalAssigned: number;
  underReview: number;
  revisions: number;
  accepted: number;
  rejected: number;
}

interface PendingActions {
  overdueReviews: number;
  newManuscriptsToTriage: number;
  revisionsAwaitingDecision: number;
}

const EditorDashboard = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    totalAssigned: 0,
    underReview: 0,
    revisions: 0,
    accepted: 0,
    rejected: 0,
  });
  const [pending, setPending] = useState<PendingActions>({
    overdueReviews: 0,
    newManuscriptsToTriage: 0,
    revisionsAwaitingDecision: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsRes, pendingRes] = await Promise.all([
          authFetch("https://vinosschool.com/api/editorApi.php?action=getDashboardStats"),
          authFetch("https://vinosschool.com/api/editorApi.php?action=getPendingActions"),
        ]);

        if (!statsRes.ok || !pendingRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const statsData = await statsRes.json();
        const pendingData = await pendingRes.json();

        setStats(statsData);
        setPending(pendingData);
      } catch (err) {
        console.error(err);
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [authFetch]);

  if (loading) {
    return <div className="dashboard" style={{ padding: 20 }}>Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard" style={{ padding: 20 }}>{error}</div>;
  }

  const statsConfig = [
    {
      label: "Assigned Submissions",
      value: stats.totalAssigned,
      icon: FileText,
      path: "/editor/manuscripts/new",
    },
    {
      label: "Under Review",
      value: stats.underReview,
      icon: Clock,
      path: "/editor/manuscripts/review",
    },
    {
      label: "Revisions",
      value: stats.revisions,
      icon: RefreshCcw,
      path: "/editor/manuscripts/revisions",
    },
    {
      label: "Accepted",
      value: stats.accepted,
      icon: CheckCircle,
      path: "/editor/manuscripts/accepted",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      icon: XCircle,
      path: "/editor/manuscripts/rejected",
    },
  ];

  // Only responsive overrides – no grid/ card style overrides
  const responsiveStyles = `
    @media (max-width: 768px) {
      .editor-dashboard .dashboard-grid {
        flex-direction: column !important;
      }
      .editor-dashboard .panel {
        width: 100% !important;
        margin-bottom: 20px !important;
      }
      .editor-dashboard .section-title {
        font-size: 1.25rem !important;
        margin-bottom: 16px !important;
      }
    }
    @media (max-width: 480px) {
      .editor-dashboard .action-list li,
      .editor-dashboard .metric {
        padding: 12px 16px !important;
        font-size: 0.9rem !important;
      }
      .editor-dashboard .panel {
        padding: 16px !important;
      }
    }
  `;

  return (
    <div className="dashboard editor-dashboard" style={{ padding: "16px 20px" }}>
      <style>{responsiveStyles}</style>

      <section className="metrics-section">
        <h2 className="section-title section-title-light" style={{ fontSize: "1.5rem", marginBottom: 16 }}>
          My Manuscripts Overview
        </h2>

        <div className="kpi-modern-grid">
          {statsConfig.map((stat) => {
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
                  <span>–</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <h3>My Pending Actions</h3>
          <ul className="action-list">
            <li onClick={() => navigate("/editor/manuscripts/review")}>
              <AlertCircle size={16} className="danger" />
              <span>{pending.overdueReviews} reviews overdue</span>
              <ArrowRight size={16} />
            </li>
            <li onClick={() => navigate("/editor/manuscripts/new")}>
              <Inbox size={16} className="warning" />
              <span>{pending.newManuscriptsToTriage} new manuscripts to triage</span>
              <ArrowRight size={16} />
            </li>
            <li onClick={() => navigate("/editor/manuscripts/revisions")}>
              <RefreshCcw size={16} className="success" />
              <span>{pending.revisionsAwaitingDecision} revisions awaiting decision</span>
              <ArrowRight size={16} />
            </li>
          </ul>
        </div>

        <div className="panel">
          <h3>Quick Actions</h3>
          <div className="metric clickable" onClick={() => navigate("/editor/assign-reviewers")}>
            <Inbox size={18} />
            <span>Assign reviewers</span>
            <ArrowRight size={16} />
          </div>
          <div className="metric clickable" onClick={() => navigate("/editor/review-progress")}>
            <Clock size={18} />
            <span>Monitor review progress</span>
            <ArrowRight size={16} />
          </div>
          <div className="metric clickable" onClick={() => navigate("/editor/handle-revisions")}>
            <RefreshCcw size={18} />
            <span>Handle author revisions</span>
            <ArrowRight size={16} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default EditorDashboard;
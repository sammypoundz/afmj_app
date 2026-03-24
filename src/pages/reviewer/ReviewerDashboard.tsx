import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Clock,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext"; // adjust path as needed

const API_BASE = "/api/reviewerApi.php";

const ReviewerDashboard = () => {
  const navigate = useNavigate();
  const { authFetch, sessionId } = useAuth(); // use authenticated fetch
  const [stats, setStats] = useState({
    invitations: 0,
    active: 0,
    revisions: 0,
    completed: 0,
    overdue: 0,
  });
  const [pendingActions, setPendingActions] = useState({
    invitations: 0,
    overdue: 0,
    revisions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch if we have a session ID; otherwise, wait (should not happen on dashboard)
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, actionsRes] = await Promise.all([
          authFetch(`${API_BASE}?action=getDashboardStats`),
          authFetch(`${API_BASE}?action=getPendingActions`)
        ]);

        // Handle unauthorized responses (e.g., session expired)
        if (statsRes.status === 401 || actionsRes.status === 401) {
          // Optionally redirect to login
          navigate('/login');
          return;
        }

        const statsData = await statsRes.json();
        const actionsData = await actionsRes.json();

        if (statsRes.ok) setStats(statsData);
        if (actionsRes.ok) setPendingActions(actionsData);
      } catch (err) {
        console.error("Failed to fetch reviewer dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authFetch, sessionId, navigate]);

  const statItems = [
    {
      label: "Review Invitations",
      value: stats.invitations,
      icon: Mail,
      trend: "+0",
      path: "/reviewer/invitations",
    },
    {
      label: "Active Reviews",
      value: stats.active,
      icon: Clock,
      trend: "+0",
      path: "/reviewer/active",
    },
    {
      label: "Revisions to Review",
      value: stats.revisions,
      icon: RefreshCcw,
      trend: "+0",
      path: "/reviewer/revisions",
    },
    {
      label: "Completed Reviews",
      value: stats.completed,
      icon: CheckCircle,
      trend: "+0",
      path: "/reviewer/completed",
    },
    {
      label: "Overdue Reviews",
      value: stats.overdue,
      icon: AlertTriangle,
      trend: "-0",
      path: "/reviewer/overdue",
    },
  ];

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="dashboard">
      {/* ===== KPI ===== */}
      <section className="metrics-section">
        <h2 className="section-title section-title-light">
          My Review Activity
        </h2>

        <div className="kpi-modern-grid">
          {statItems.map((stat) => {
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
                  <span>{stat.trend}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== SECOND ROW ===== */}
      <section className="dashboard-grid">
        {/* Pending Actions */}
        <div className="panel">
          <h3>My Pending Actions</h3>

          <ul className="action-list">
            <li onClick={() => navigate("/reviewer/invitations")}>
              <Mail size={16} className="warning" />
              <span>{pendingActions.invitations} invitations awaiting response</span>
              <ArrowRight size={16} />
            </li>

            <li onClick={() => navigate("/reviewer/overdue")}>
              <AlertTriangle size={16} className="danger" />
              <span>{pendingActions.overdue} reviews overdue</span>
              <ArrowRight size={16} />
            </li>

            <li onClick={() => navigate("/reviewer/revisions")}>
              <RefreshCcw size={16} className="success" />
              <span>{pendingActions.revisions} revision awaiting review</span>
              <ArrowRight size={16} />
            </li>
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="panel">
          <h3>Quick Actions</h3>

          <div
            className="metric clickable"
            onClick={() => navigate("/reviewer/active")}
          >
            <FileText size={18} />
            <span>Continue active reviews</span>
            <ArrowRight size={16} />
          </div>

          <div
            className="metric clickable"
            onClick={() => navigate("/reviewer/completed")}
          >
            <CheckCircle size={18} />
            <span>View completed reviews</span>
            <ArrowRight size={16} />
          </div>

          <div
            className="metric clickable"
            onClick={() => navigate("/reviewer/profile")}
          >
            <Clock size={18} />
            <span>Update availability</span>
            <ArrowRight size={16} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default ReviewerDashboard;
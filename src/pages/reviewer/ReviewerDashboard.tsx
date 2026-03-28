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
import { useAuth } from "../../contexts/AuthContext";

const API_BASE = "/api/reviewerApi.php";

const ReviewerDashboard = () => {
  const navigate = useNavigate();
  const { authFetch, sessionId } = useAuth();
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

        if (statsRes.status === 401 || actionsRes.status === 401) {
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
    { label: "Review Invitations", value: stats.invitations, icon: Mail, trend: "+0", path: "/reviewer/invitations" },
    { label: "Active Reviews", value: stats.active, icon: Clock, trend: "+0", path: "/reviewer/active" },
    { label: "Revisions to Review", value: stats.revisions, icon: RefreshCcw, trend: "+0", path: "/reviewer/revisions" },
    { label: "Completed Reviews", value: stats.completed, icon: CheckCircle, trend: "+0", path: "/reviewer/completed" },
    { label: "Overdue Reviews", value: stats.overdue, icon: AlertTriangle, trend: "-0", path: "/reviewer/overdue" },
  ];

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <>
      <style>
        {`
          .dashboard {
            padding: 1rem;
            max-width: 1400px;
            margin: 0 auto;
          }
          .kpi-modern-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
          }
          .kpi-modern-card {
            background: #fff;
            border-radius: 1rem;
            padding: 1rem;
            box-shadow: 0 2px 6px rgba(0,0,0,0.05);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border: 1px solid #e5e7eb;
          }
          .kpi-modern-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          }
          .kpi-icon {
            width: 48px;
            height: 48px;
            background: #eef2ff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #3b82f6;
          }
          .kpi-content h2 {
            font-size: 1.8rem;
            font-weight: 700;
            margin: 0;
            line-height: 1.2;
          }
          .kpi-content p {
            margin: 0;
            color: #6b7280;
            font-size: 0.875rem;
          }
          .kpi-trend {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.75rem;
            color: #10b981;
            background: #ecfdf5;
            padding: 0.25rem 0.5rem;
            border-radius: 1rem;
          }
          .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }
          .panel {
            background: #fff;
            border-radius: 1rem;
            padding: 1.25rem;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          .panel h3 {
            margin-top: 0;
            margin-bottom: 1rem;
            font-size: 1.125rem;
            font-weight: 600;
            color: #1f2937;
          }
          .action-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .action-list li {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 0;
            border-bottom: 1px solid #f3f4f6;
            cursor: pointer;
            transition: background 0.2s;
          }
          .action-list li:last-child { border-bottom: none; }
          .action-list li:hover {
            background: #f9fafb;
            padding-left: 0.5rem;
          }
          .warning { color: #f59e0b; }
          .danger { color: #ef4444; }
          .success { color: #10b981; }
          .metric {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 0;
            cursor: pointer;
            transition: background 0.2s;
            border-bottom: 1px solid #f3f4f6;
          }
          .metric:last-child { border-bottom: none; }
          .metric:hover {
            background: #f9fafb;
            padding-left: 0.5rem;
          }

          @media (max-width: 768px) {
            .kpi-modern-grid {
              grid-template-columns: 1fr;
              gap: 0.75rem;
            }
            .kpi-modern-card {
              padding: 0.875rem;
            }
            .kpi-content h2 {
              font-size: 1.4rem;
            }
            .dashboard-grid {
              grid-template-columns: 1fr;
              gap: 1rem;
            }
            .panel {
              padding: 1rem;
            }
            .panel h3 {
              font-size: 1rem;
              margin-bottom: 0.75rem;
            }
            .action-list li,
            .metric {
              font-size: 0.875rem;
              padding: 0.625rem 0;
            }
            .kpi-trend {
              font-size: 0.7rem;
              padding: 0.125rem 0.375rem;
            }
          }

          @media (max-width: 480px) {
            .dashboard {
              padding: 0.75rem;
            }
            .kpi-icon {
              width: 40px;
              height: 40px;
            }
            .kpi-content h2 {
              font-size: 1.2rem;
            }
            .kpi-content p {
              font-size: 0.75rem;
            }
            .action-list li,
            .metric {
              font-size: 0.8rem;
              gap: 0.5rem;
            }
          }
        `}
      </style>

      <div className="dashboard">
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

        <section className="dashboard-grid">
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

          <div className="panel">
            <h3>Quick Actions</h3>
            <div className="metric clickable" onClick={() => navigate("/reviewer/active")}>
              <FileText size={18} />
              <span>Continue active reviews</span>
              <ArrowRight size={16} />
            </div>
            <div className="metric clickable" onClick={() => navigate("/reviewer/completed")}>
              <CheckCircle size={18} />
              <span>View completed reviews</span>
              <ArrowRight size={16} />
            </div>
            <div className="metric clickable" onClick={() => navigate("/reviewer/profile")}>
              <Clock size={18} />
              <span>Update availability</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ReviewerDashboard;
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

const stats = [
  {
    label: "Assigned Submissions",
    value: 27,
    icon: FileText,
    trend: "+6%",
    path: "/editor/manuscripts/new-submissions",
  },
  {
    label: "Under Review",
    value: 14,
    icon: Clock,
    trend: "-3%",
    path: "/editor/manuscripts/under-review",
  },
  {
    label: "Revisions",
    value: 6,
    icon: RefreshCcw,
    trend: "+2%",
    path: "/editor/manuscripts/revisions",
  },
  {
    label: "Accepted",
    value: 9,
    icon: CheckCircle,
    trend: "+4%",
    path: "/editor/manuscripts/accepted",
  },
  {
    label: "Rejected",
    value: 4,
    icon: XCircle,
    trend: "+1%",
    path: "/editor/manuscripts/rejected",
  },
];

const EditorDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard">

      {/* ===== KPI ===== */}
      <section className="metrics-section">
        <h2 className="section-title section-title-light">
          My Manuscripts Overview
        </h2>

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
                  <span>{stat.trend}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== SECOND ROW ===== */}
      <section className="dashboard-grid">

        {/* My pending actions */}
        <div className="panel">
          <h3>My Pending Actions</h3>

          <ul className="action-list">
            <li
              onClick={() =>
                navigate("/editor/manuscripts/under-review")
              }
            >
              <AlertCircle size={16} className="danger" />
              <span>5 reviews overdue</span>
              <ArrowRight size={16} />
            </li>

            <li
              onClick={() =>
                navigate("/editor/manuscripts/new-submissions")
              }
            >
              <Inbox size={16} className="warning" />
              <span>3 new manuscripts to triage</span>
              <ArrowRight size={16} />
            </li>

            <li
              onClick={() =>
                navigate("/editor/manuscripts/revisions")
              }
            >
              <RefreshCcw size={16} className="success" />
              <span>2 revisions awaiting decision</span>
              <ArrowRight size={16} />
            </li>
          </ul>
        </div>

        {/* Quick shortcuts */}
        <div className="panel">
          <h3>Quick Actions</h3>

          <div
            className="metric clickable"
            onClick={() =>
              navigate("/editor/assign-reviewers")
            }
          >
            <Inbox size={18} />
            <span>Assign reviewers</span>
            <ArrowRight size={16} />
          </div>

          <div
            className="metric clickable"
            onClick={() =>
              navigate("/editor/review-progress")
            }
          >
            <Clock size={18} />
            <span>Monitor review progress</span>
            <ArrowRight size={16} />
          </div>

          <div
            className="metric clickable"
            onClick={() =>
              navigate("/editor/revisions")
            }
          >
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

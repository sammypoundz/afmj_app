import {
  FileText,
  Clock,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  BookOpen,
  Plus,
  List,
  Reply,
  Eye
} from "lucide-react";

const AuthorDashboard = () => {
  return (
    <div className="page">

      <div className="page-title">Author Dashboard</div>

      {/* ================= KPI ================= */}

      <div className="kpi-modern-grid">

        <div className="kpi-modern-card">
          <div className="kpi-icon">
            <FileText size={20} />
          </div>
          <div className="kpi-content">
            <h2>8</h2>
            <p>Total Submissions</p>
          </div>
        </div>

        <div className="kpi-modern-card">
          <div className="kpi-icon">
            <Clock size={20} />
          </div>
          <div className="kpi-content">
            <h2>2</h2>
            <p>Under Review</p>
          </div>
        </div>

        <div className="kpi-modern-card secondary">
          <div className="kpi-icon">
            <RefreshCcw size={20} />
          </div>
          <div className="kpi-content">
            <h2>1</h2>
            <p>Revisions Required</p>
          </div>
        </div>

        <div className="kpi-modern-card">
          <div className="kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-content">
            <h2>3</h2>
            <p>Accepted</p>
          </div>
        </div>

        <div className="kpi-modern-card">
          <div className="kpi-icon">
            <XCircle size={20} />
          </div>
          <div className="kpi-content">
            <h2>1</h2>
            <p>Rejected</p>
          </div>
        </div>

        <div className="kpi-modern-card">
          <div className="kpi-icon">
            <BookOpen size={20} />
          </div>
          <div className="kpi-content">
            <h2>1</h2>
            <p>Published</p>
          </div>
        </div>

      </div>

      {/* ================= Actions ================= */}

      <div style={{ marginTop: 28 }} className="panel">

        <div className="section-title">Author Actions</div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>

          <button className="btn-primary" style={btnRow}>
            <Plus size={16} />
            New Submission
          </button>

          <button className="btn-outline" style={btnRow}>
            <List size={16} />
            View Submissions
          </button>

          <button className="btn-outline" style={btnRow}>
            <Reply size={16} />
            Respond to Revision
          </button>

        </div>
      </div>

      {/* ================= Active manuscripts ================= */}

      <div style={{ marginTop: 24 }} className="panel">

        <div className="section-title">Active Manuscripts</div>

        <div className="list-item">
          <div>
            <div style={{ fontWeight: 600 }}>AFMJ-2026-0021</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              AI in Rural Healthcare
            </div>
          </div>

          <span className="badge success">Under Review</span>

          <div style={{ fontSize: 13, color: "#6b7280" }}>
            12 Jan 2026
          </div>

          <button className="btn-outline" style={btnRow}>
            <Eye size={14} />
            Open
          </button>
        </div>

      </div>

    </div>
  );
};

const btnRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6
};

export default AuthorDashboard;
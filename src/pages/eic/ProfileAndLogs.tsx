import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface Log {
  id: number;
  date: string;
  action: string;
  details: string;
}

const mockLogs: Log[] = [
  {
    id: 1,
    date: "2026-02-12 10:34",
    action: "Reviewed Manuscript",
    details: "Reviewed 'COVID-19 Vaccination Strategies' by Dr. Aisha Bello",
  },
  {
    id: 2,
    date: "2026-02-11 15:22",
    action: "Approved Payment",
    details: "Approved ₦45,000 payment from author Aisha Bello",
  },
  {
    id: 3,
    date: "2026-02-10 09:15",
    action: "Published Issue",
    details: "Published Journal Issue Vol 1, No 1",
  },
];

const ProfileAndLogs = () => {
     const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: "Editor-in-Chief",
    email: "eic@journal.com",
    role: "EIC",
  });

  return (
    <div
      className="content"
      style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <button
                  onClick={() => navigate(-1)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Profile & Logs</h2>
        <p style={{ color: "#6b7280", fontSize: 13 }}>
          Manage your profile and review your recent activities on the system.
        </p>
      </div>

      {/* ================= Profile Section ================= */}
      <section className="card-section">
        <h3>Profile Information</h3>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Your basic account details
        </p>

        <div className="form-grid">
          <div>
            <label>Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) =>
                setProfile({ ...profile, name: e.target.value })
              }
            />
          </div>

          <div>
            <label>Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
            />
          </div>

          <div>
            <label>Role</label>
            <input type="text" value={profile.role} disabled />
          </div>
        </div>

        <button className="primary-btn">Save Profile</button>
      </section>

      {/* ================= Logs Section ================= */}
      <section className="card-section">
        <h3>Activity Logs</h3>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Recent activities and system actions
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px" }}>Date</th>
                <th style={{ padding: "10px 12px" }}>Action</th>
                <th style={{ padding: "10px 12px" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {mockLogs.map((log) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    background: "#fff",
                    transition: "background 0.2s",
                  }}
                >
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{log.date}</td>
                  <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 500 }}>
                    {log.action}
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "#4b5563" }}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Scoped CSS */}
      <style>{`
        .card-section {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.03);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          outline: none;
          font-size: 14px;
        }

        input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.1);
        }

        .primary-btn {
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          background: #4f46e5;
          color: #fff;
          font-weight: 500;
          cursor: pointer;
        }

        .primary-btn:hover {
          background: #4338ca;
        }

        table th, table td {
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default ProfileAndLogs;

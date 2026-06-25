import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

interface Log {
  id: number;
  date: string;
  action: string;
  details: string;
}

const ProfileAndLogs = () => {
  const navigate = useNavigate();
  const { authFetch} = useAuth(); // get user info

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "",
  });
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user profile and logs
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get profile
        const profileRes = await authFetch("https://vinosschool.com/api/authorApi.php?action=getProfile");
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile({
            name: data.name || "EIC",
            email: data.email || "",
            role: data.role || "EIC",
          });
        }

        // Get logs
        const logsRes = await authFetch("https://vinosschool.com/api/logsApi.php?action=list&limit=50");
        if (logsRes.ok) {
          const data = await logsRes.json();
          setLogs(data);
        } else {
          toast.error("Could not load activity logs");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authFetch]);

  const handleSaveProfile = async () => {
    try {
      const res = await authFetch("https://vinosschool.com/api/authorApi.php?action=updateProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
        }),
      });
      if (res.ok) {
        toast.success("Profile updated successfully");
        // Optionally log the action
        await authFetch("https://vinosschool.com/api/logsApi.php?action=log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "Updated Profile",
            details: "User updated their profile information.",
          }),
        });
      } else {
        const err = await res.json();
        toast.error(err.error || "Update failed");
      }
    } catch (err) {
      toast.error("Error updating profile");
    }
  };

  if (loading) {
    return <div className="content" style={{ padding: 24 }}>Loading profile and logs...</div>;
  }

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

        <button className="primary-btn" onClick={handleSaveProfile}>
          Save Profile
        </button>
      </section>

      {/* ================= Logs Section ================= */}
      <section className="card-section">
        <h3>Activity Logs</h3>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Recent activities and system actions
        </p>

        {logs.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: 20 }}>
            No activity logs found.
          </p>
        ) : (
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
                {logs.map((log) => (
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
        )}
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
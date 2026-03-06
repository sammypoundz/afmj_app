import { useNavigate } from "react-router-dom";

const AuthorTopBar = () => {
  const navigate = useNavigate();

  return (
    <header
      style={{
        height: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      {/* Left Side */}
      <div>
        <h4 style={{ margin: 0 }}>Journal Author Portal</h4>
        <small style={{ color: "#6b7280" }}>
          Manage your research submissions
        </small>
      </div>

      {/* Right Side */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        
        {/* Quick Submit */}
        <button
          onClick={() => navigate("/author/submit")}
          style={{
            padding: "8px 14px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          + New Submission
        </button>

        {/* Notifications */}
        <div style={{ position: "relative", cursor: "pointer" }}>
          🔔
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -10,
              background: "red",
              color: "#fff",
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: "50%",
            }}
          >
            2
          </span>
        </div>

        {/* Profile */}
        <div style={{ textAlign: "right" }}>
          <strong>Dr. Sarah Johnson</strong>
          <br />
          <small style={{ color: "#6b7280" }}>
            University of Cape Town
          </small>
        </div>

        {/* Logout */}
        <button
          style={{
            padding: "6px 10px",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default AuthorTopBar;
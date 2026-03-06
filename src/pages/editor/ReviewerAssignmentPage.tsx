import { UserCheck, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const reviewers = [
  { id: 1, name: "Dr. Aisha Bello", expertise: "AI Medicine" },
  { id: 2, name: "Dr. Musa Abdullahi", expertise: "Blockchain Health" },
  { id: 3, name: "Dr. Zainab Lawal", expertise: "Public Health" },
];

const ReviewerAssignmentPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>

      <h2>Assign Reviewers</h2>

      <div style={{ marginBottom: 20 }}>
        <Search size={18} />
        <input
          placeholder="Search manuscripts or reviewers..."
          style={{
            marginLeft: 10,
            padding: 8,
            width: "100%",
            maxWidth: 400,
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {reviewers.map(r => (
          <div
            key={r.id}
            style={{
              border: "1px solid #e5e7eb",
              padding: 16,
              borderRadius: 12,
              cursor: "pointer"
            }}
            onClick={() => navigate("/editor/manuscripts/new-submissions")}
          >
            <UserCheck size={18} />
            <h4>{r.name}</h4>
            <p style={{ color: "#6b7280" }}>
              Expertise: {r.expertise}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
};

export default ReviewerAssignmentPage;
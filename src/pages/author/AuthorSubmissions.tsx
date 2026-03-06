import { useNavigate } from "react-router-dom";

const mockSubmissions = [
  {
    id: "AFMJ-2026-0021",
    title: "AI in Rural Healthcare",
    section: "Health Informatics",
    status: "Under Review",
    submitted: "Jan 12, 2026",
    updated: "Feb 01, 2026",
  },
  {
    id: "AFMJ-2026-0017",
    title: "Telemedicine Adoption Models",
    section: "Public Health",
    status: "Major Revision",
    submitted: "Dec 18, 2025",
    updated: "Jan 28, 2026",
  },
  {
    id: "AFMJ-2025-0981",
    title: "Blockchain in Clinical Trials",
    section: "Medical Systems",
    status: "Accepted",
    submitted: "Oct 02, 2025",
    updated: "Nov 20, 2025",
  },
];

const getStatusColor = (status: string) => {
  if (status.includes("Revision")) return "#f59e0b";
  if (status === "Under Review") return "#3b82f6";
  if (status === "Accepted") return "#16a34a";
  if (status === "Rejected") return "#dc2626";
  return "#6b7280";
};

const AuthorSubmissions = () => {
  const navigate = useNavigate();

  return (
    <div>
      <h2>My Submissions</h2>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Section</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Last Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {mockSubmissions.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.title}</td>
              <td>{m.section}</td>
              <td>
                <span
                  style={{
                    background: getStatusColor(m.status),
                    color: "#fff",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                  }}
                >
                  {m.status}
                </span>
              </td>
              <td>{m.submitted}</td>
              <td>{m.updated}</td>
              <td>
                <button
                  onClick={() =>
                    navigate(`/author/manuscript/${m.id}`)
                  }
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuthorSubmissions;
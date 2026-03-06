import { useState } from "react";
import type { FC } from "react";
import { Users, Eye, X, ShieldCheck, ShieldOff } from "lucide-react";

/* ================= Types ================= */

interface Submission {
  manuscriptTitle: string;
  status: "under review" | "accepted" | "rejected" | "revision requested";
  dateSubmitted: string;
  lastUpdated: string;
}

interface Author {
  id: number;
  name: string;
  email: string;
  affiliation: string;
  totalSubmissions: number;
  accepted: number;
  status: "active" | "inactive";
  bio: string;
  submissions: Submission[];
  suspended: boolean;
}

/* ================= Mock data ================= */

const initialAuthors: Author[] = [
  {
    id: 1,
    name: "Dr. Aisha Bello",
    email: "aisha@university.edu",
    affiliation: "University of Lagos",
    totalSubmissions: 5,
    accepted: 3,
    status: "active",
    bio: "Focused on public health and clinical research.",
    submissions: [
      {
        manuscriptTitle: "COVID-19 Vaccination Strategies",
        status: "accepted",
        dateSubmitted: "2025-08-01",
        lastUpdated: "2025-10-05",
      },
      {
        manuscriptTitle: "Malaria Control Programs",
        status: "under review",
        dateSubmitted: "2025-11-20",
        lastUpdated: "2025-12-01",
      },
    ],
    suspended: false,
  },
  {
    id: 2,
    name: "Mr. Chukwuemeka Okafor",
    email: "chukwu@research.org",
    affiliation: "Ahmadu Bello University",
    totalSubmissions: 2,
    accepted: 1,
    status: "active",
    bio: "Works on environmental and sustainability research.",
    submissions: [],
    suspended: false,
  },
];

/* ================= Page ================= */

const AllAuthors: FC = () => {
  const [authors, setAuthors] = useState<Author[]>(initialAuthors);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Author | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "submissions">("profile");

  const filtered = authors.filter((a) => {
    const matchName =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? a.status === statusFilter : true;
    return matchName && matchStatus;
  });

  const toggleStatus = (id: number) => {
    setAuthors((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === "active" ? "inactive" : "active" }
          : a
      )
    );
  };

  // suspendAuthor function removed because it was unused

  return (
    <div className="content">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <h1 style={{ display: "flex", alignItems: "center", fontSize: 16 }}>
          <Users size={18} style={{ marginRight: 4 }} />
          Author Management
        </h1>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #d1d5db", minWidth: 180, fontSize: 12 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #d1d5db", fontSize: 12 }}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ padding: 12, background: "#fff", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th>Name</th>
              <th>Email</th>
              <th>Affiliation</th>
              <th>Subs</th>
              <th>Accepted</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.affiliation}</td>
                <td align="center">{a.totalSubmissions}</td>
                <td align="center">{a.accepted}</td>
                <td align="center">
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      color: "#fff",
                      background: a.status === "active" ? "#10b981" : "#9ca3af",
                    }}
                  >
                    {a.status}
                  </span>
                  {a.suspended && (
                    <div style={{ fontSize: 10, color: "#b91c1c" }}>Suspended</div>
                  )}
                </td>
                <td align="right">
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => {
                        setSelected(a);
                        setActiveTab("profile");
                      }}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                      }}
                    >
                      <Eye size={14} />
                      View
                    </button>
                    <button
                      onClick={() => toggleStatus(a.id)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "none",
                        background: a.status === "active" ? "#ef4444" : "#10b981",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                      }}
                    >
                      {a.status === "active" ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                      {a.status === "active" ? "Disable" : "Enable"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 12, fontSize: 12, color: "#6b7280" }}>No authors found.</div>}
      </div>

      {/* Author profile modal */}
      {selected && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "95%",
              maxWidth: 550,
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,.25)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 16px",
                background: "linear-gradient(135deg,#4f46e5 0%,#6366f1 100%)",
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{selected.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.9 }}>{selected.email}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "none", color: "#fff" }}>
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, padding: "8px 12px", fontSize: 11 }}>
              <button
                onClick={() => setActiveTab("profile")}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === "profile" ? "#eef2ff" : "transparent",
                  color: activeTab === "profile" ? "#4338ca" : "#6b7280",
                }}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab("submissions")}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === "submissions" ? "#eef2ff" : "transparent",
                  color: activeTab === "submissions" ? "#4338ca" : "#6b7280",
                }}
              >
                Submissions
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 16, fontSize: 11, lineHeight: 1.4 }}>
              {activeTab === "profile" && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <div><strong>Affiliation:</strong> {selected.affiliation}</div>
                    <div><strong>Status:</strong> {selected.status} {selected.suspended && "(Suspended)"}</div>
                    <div><strong>Total Submissions:</strong> {selected.totalSubmissions}</div>
                    <div><strong>Accepted:</strong> {selected.accepted}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <strong>Bio:</strong>
                    <div style={{ background: "#f9fafb", padding: 8, borderRadius: 8 }}>{selected.bio}</div>
                  </div>
                </>
              )}

              {activeTab === "submissions" && (
                <>
                  {selected.submissions.length > 0 ? (
                    selected.submissions.map((s, i) => (
                      <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, marginTop: 6 }}>
                        <div>{s.manuscriptTitle}</div>
                        <div style={{ color: "#6b7280", fontSize: 10 }}>
                          Status: {s.status} | Submitted: {s.dateSubmitted} | Updated: {s.lastUpdated}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: 8, color: "#6b7280" }}>No submissions yet.</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllAuthors;
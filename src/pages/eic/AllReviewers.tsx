import { useState } from "react";
import type { FC } from "react";
import { Users, Eye, X, ShieldCheck, ShieldOff } from "lucide-react";

/* ================= Types ================= */

interface PastReview {
  manuscriptTitle: string;
  decision: string;
  date: string;
}

interface Reviewer {
  id: number;
  name: string;
  email: string;
  expertise: string[];
  affiliation: string;
  activeAssignments: number;
  completedReviews: number;
  status: "active" | "inactive";
  bio: string;
  suspended: boolean;
  pastReviews: PastReview[];
}

/* ================= Mock data ================= */

const initialReviewers: Reviewer[] = [
  {
    id: 1,
    name: "Dr. Amina Bello",
    email: "amina@journal.org",
    expertise: ["Public Health", "Epidemiology"],
    affiliation: "University of Lagos",
    activeAssignments: 2,
    completedReviews: 14,
    status: "active",
    bio: "Senior researcher in public health and infectious disease control.",
    suspended: false,
    pastReviews: [
      {
        manuscriptTitle: "Maternal Health Outcomes in Lagos",
        decision: "Minor revision",
        date: "2025-11-03"
      },
      {
        manuscriptTitle: "Urban Malaria Control Strategies",
        decision: "Accepted",
        date: "2025-09-18"
      }
    ]
  },
  {
    id: 2,
    name: "Dr. James Okorie",
    email: "james@journal.org",
    expertise: ["Microbiology"],
    affiliation: "UNN",
    activeAssignments: 4,
    completedReviews: 21,
    status: "active",
    bio: "Focus on antimicrobial resistance and clinical microbiology.",
    suspended: false,
    pastReviews: [
      {
        manuscriptTitle: "Antibiotic Resistance Patterns in Nigeria",
        decision: "Major revision",
        date: "2025-10-10"
      }
    ]
  },
  {
    id: 3,
    name: "Dr. Halima Sadiq",
    email: "halima@journal.org",
    expertise: ["Environmental Science"],
    affiliation: "Ahmadu Bello University",
    activeAssignments: 0,
    completedReviews: 8,
    status: "inactive",
    bio: "Environmental and climate change researcher.",
    suspended: false,
    pastReviews: []
  }
];

/* ================= Mock manuscripts ================= */

const manuscripts = [
  { id: 1, title: "Water Quality Assessment in Northern Nigeria" },
  { id: 2, title: "Public Health Surveillance Using AI" },
  { id: 3, title: "Climate Change Impact on Crop Yield" }
];

/* ================= Page ================= */

const AllReviewers: FC = () => {
  const [reviewers, setReviewers] = useState<Reviewer[]>(initialReviewers);
  const [search, setSearch] = useState("");
  const [expertiseFilter, setExpertiseFilter] = useState("");
  const [selected, setSelected] = useState<Reviewer | null>(null);
  const [profileTab, setProfileTab] = useState<"profile" | "reviews">("profile");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReviewer, setNewReviewer] = useState({
    name: "",
    email: "",
    affiliation: "",
    expertise: "",
    bio: ""
  });
  const [assignModal, setAssignModal] = useState(false);
  const [assignReviewer, setAssignReviewer] = useState<Reviewer | null>(null);
  const [selectedManuscript, setSelectedManuscript] = useState("");

  const allExpertise = Array.from(
    new Set(reviewers.flatMap((r) => r.expertise))
  );

  const filtered = reviewers.filter((r) => {
    const matchName =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase());

    const matchExpertise = expertiseFilter
      ? r.expertise.includes(expertiseFilter)
      : true;

    return matchName && matchExpertise;
  });

  const toggleStatus = (id: number) => {
    setReviewers((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "active" ? "inactive" : "active" }
          : r
      )
    );
  };

  const suspendReviewer = (id: number) => {
    setReviewers((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, suspended: !r.suspended } : r
      )
    );
  };

  const handleAddReviewer = () => {
    if (!newReviewer.name || !newReviewer.email) return;

    const reviewer: Reviewer = {
      id: Date.now(),
      name: newReviewer.name,
      email: newReviewer.email,
      affiliation: newReviewer.affiliation,
      expertise: newReviewer.expertise
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean),
      bio: newReviewer.bio,
      activeAssignments: 0,
      completedReviews: 0,
      status: "active",
      suspended: false,
      pastReviews: []
    };

    setReviewers((prev) => [reviewer, ...prev]);
    setShowAddModal(false);
    setNewReviewer({
      name: "",
      email: "",
      affiliation: "",
      expertise: "",
      bio: ""
    });
  };

  const assignManuscriptToReviewer = () => {
    if (!assignReviewer || !selectedManuscript) return;

    setReviewers((prev) =>
      prev.map((r) =>
        r.id === assignReviewer.id
          ? { ...r, activeAssignments: r.activeAssignments + 1 }
          : r
      )
    );

    setAssignModal(false);
    setAssignReviewer(null);
    setSelectedManuscript("");
  };

  return (
    <div className="content">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10
        }}
      >
        <h1
          className="page-title"
          style={{ display: "flex", alignItems: "center" }}
        >
          <Users size={20} style={{ marginRight: 6 }} />
          All Reviewers
        </h1>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#4f46e5",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          + Register reviewer
        </button>
      </div>

      {/* Filters */}
      <div
        className="panel"
        style={{
          padding: 12,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16
        }}
      >
        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 6,
            border: "1px solid #d1d5db",
            minWidth: 220
          }}
        />

        <select
          value={expertiseFilter}
          onChange={(e) => setExpertiseFilter(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 6,
            border: "1px solid #d1d5db"
          }}
        >
          <option value="">All expertise</option>
          {allExpertise.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="panel" style={{ padding: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th align="left">Name</th>
              <th align="left">Expertise</th>
              <th>Active jobs</th>
              <th>Completed</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td>
                  <strong>{r.name}</strong>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {r.email}
                  </div>
                  {r.suspended && (
                    <div style={{ fontSize: 11, color: "#b91c1c" }}>
                      Suspended
                    </div>
                  )}
                </td>

                <td style={{ fontSize: 13 }}>{r.expertise.join(", ")}</td>

                <td align="center">{r.activeAssignments}</td>
                <td align="center">{r.completedReviews}</td>

                <td align="center">
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      color: "#fff",
                      background:
                        r.status === "active" ? "#10b981" : "#9ca3af"
                    }}
                  >
                    {r.status}
                  </span>
                </td>

                <td align="right">
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end"
                    }}
                  >
                    <button
                      onClick={() => {
                        setSelected(r);
                        setProfileTab("profile");
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <Eye size={16} />
                      View
                    </button>

                    <button
                      onClick={() => toggleStatus(r.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "none",
                        background:
                          r.status === "active" ? "#ef4444" : "#10b981",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      {r.status === "active" ? (
                        <>
                          <ShieldOff size={16} />
                          Disable
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} />
                          Enable
                        </>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ padding: 16, color: "#6b7280" }}>
            No reviewers found.
          </div>
        )}
      </div>

      {/* Profile modal */}
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
            zIndex: 3000
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              width: "95%",
              maxWidth: 560,
              overflow: "hidden",
              boxShadow: "0 30px 60px rgba(0,0,0,.25)"
            }}
          >
            {/* header */}
            <div
              style={{
                padding: "18px 20px",
                background:
                  "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 18
                  }}
                >
                  {selected.name.charAt(0)}
                </div>

                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {selected.name}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>
                    {selected.email}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelected(null);
                  setProfileTab("profile");
                }}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  padding: 8,
                  borderRadius: 8,
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* actions */}
            <div
              style={{
                padding: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                borderBottom: "1px solid #e5e7eb"
              }}
            >
              <button
                onClick={() => {
                  setAssignReviewer(selected);
                  setAssignModal(true);
                }}
                style={{
                  background: "#4f46e5",
                  color: "#fff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                Assign manuscript
              </button>

              <button
                onClick={() => suspendReviewer(selected.id)}
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: "pointer"
                }}
              >
                {selected.suspended
                  ? "Remove suspension"
                  : "Temporarily suspend"}
              </button>
            </div>

            {/* tabs */}
            <div style={{ display: "flex", gap: 6, padding: "10px 14px" }}>
              <button
                onClick={() => setProfileTab("profile")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  background:
                    profileTab === "profile" ? "#eef2ff" : "transparent",
                  color:
                    profileTab === "profile" ? "#4338ca" : "#6b7280"
                }}
              >
                Profile
              </button>

              <button
                onClick={() => setProfileTab("reviews")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  background:
                    profileTab === "reviews" ? "#eef2ff" : "transparent",
                  color:
                    profileTab === "reviews" ? "#4338ca" : "#6b7280"
                }}
              >
                Past reviews
              </button>
            </div>

            {/* body */}
            <div style={{ padding: 20 }}>
              {profileTab === "profile" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      fontSize: 13,
                      color: "#374151",
                      marginBottom: 14
                    }}
                  >
                    <div>
                      <strong>Affiliation:</strong> {selected.affiliation}
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      <span
                        style={{
                          marginLeft: 6,
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          color: "#fff",
                          background:
                            selected.status === "active"
                              ? "#10b981"
                              : "#9ca3af"
                        }}
                      >
                        {selected.status}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 16
                    }}
                  >
                    <div
                      style={{
                        background: "#f9fafb",
                        borderRadius: 12,
                        padding: 14
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Active assignments
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          marginTop: 4
                        }}
                      >
                        {selected.activeAssignments}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#f9fafb",
                        borderRadius: 12,
                        padding: 14
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Completed reviews
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          marginTop: 4
                        }}
                      >
                        {selected.completedReviews}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6
                      }}
                    >
                      Areas of expertise
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {selected.expertise.map((ex) => (
                        <span
                          key={ex}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "#eef2ff",
                            color: "#4338ca",
                            fontSize: 12,
                            fontWeight: 500
                          }}
                        >
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6
                      }}
                    >
                      Biography
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "#4b5563",
                        background: "#f9fafb",
                        padding: 12,
                        borderRadius: 12
                      }}
                    >
                      {selected.bio}
                    </div>
                  </div>
                </>
              )}

              {profileTab === "reviews" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selected.pastReviews.length > 0 ? (
                    selected.pastReviews.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 12,
                          fontSize: 13
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {r.manuscriptTitle}
                        </div>
                        <div style={{ color: "#6b7280", marginTop: 4 }}>
                          Decision: {r.decision} • {r.date}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: 13,
                        color: "#6b7280",
                        padding: 30
                      }}
                    >
                      No past reviews found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign manuscript modal */}
      {assignModal && assignReviewer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4000
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "95%",
              maxWidth: 420,
              borderRadius: 16,
              padding: 20
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12
              }}
            >
              <div>
                <h4 style={{ margin: 0 }}>Assign manuscript</h4>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {assignReviewer.name}
                </div>
              </div>

              <button
                onClick={() => setAssignModal(false)}
                style={{ border: "none", background: "transparent" }}
              >
                <X size={18} />
              </button>
            </div>

            <select
              value={selectedManuscript}
              onChange={(e) => setSelectedManuscript(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                marginBottom: 16
              }}
            >
              <option value="">Select manuscript</option>
              {manuscripts.map((m) => (
                <option key={m.id} value={m.title}>
                  {m.title}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setAssignModal(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff"
                }}
              >
                Cancel
              </button>

              <button
                onClick={assignManuscriptToReviewer}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#4f46e5",
                  color: "#fff",
                  fontWeight: 600
                }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register reviewer modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "95%",
              maxWidth: 480,
              borderRadius: 16,
              padding: 24
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <h3 style={{ margin: 0 }}>Register new reviewer</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ border: "none", background: "transparent" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                placeholder="Full name *"
                value={newReviewer.name}
                onChange={(e) =>
                  setNewReviewer({ ...newReviewer, name: e.target.value })
                }
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb"
                }}
              />
              <input
                placeholder="Email *"
                type="email"
                value={newReviewer.email}
                onChange={(e) =>
                  setNewReviewer({ ...newReviewer, email: e.target.value })
                }
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb"
                }}
              />
              <input
                placeholder="Affiliation"
                value={newReviewer.affiliation}
                onChange={(e) =>
                  setNewReviewer({ ...newReviewer, affiliation: e.target.value })
                }
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb"
                }}
              />
              <input
                placeholder="Expertise (comma separated)"
                value={newReviewer.expertise}
                onChange={(e) =>
                  setNewReviewer({ ...newReviewer, expertise: e.target.value })
                }
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb"
                }}
              />
              <textarea
                placeholder="Bio"
                rows={3}
                value={newReviewer.bio}
                onChange={(e) =>
                  setNewReviewer({ ...newReviewer, bio: e.target.value })
                }
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  resize: "vertical"
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                marginTop: 20
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddReviewer}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "#4f46e5",
                  color: "#fff",
                  fontWeight: 600
                }}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllReviewers;
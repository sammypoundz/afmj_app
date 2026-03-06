import { useState } from "react";
import type { FC } from "react";
import {
  Users,
  Eye,
  X,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

/* ================= Types ================= */

interface PastAction {
  manuscriptTitle: string;
  action: string;
  date: string;
}

interface Editor {
  id: number;
  name: string;
  email: string;
  specialization: string[];
  affiliation: string;
  activeAssignments: number;
  completedActions: number;
  status: "active" | "inactive";
  bio: string;

  suspended: boolean;
  pastActions: PastAction[];
}

/* ================= Mock data ================= */

const initialEditors: Editor[] = [
  {
    id: 1,
    name: "Dr. Ibrahim Musa",
    email: "ibrahim@journal.org",
    specialization: ["Clinical Medicine", "Peer-review management"],
    affiliation: "Ahmadu Bello University",
    activeAssignments: 3,
    completedActions: 28,
    status: "active",
    bio: "Senior handling editor with experience in clinical and public health journals.",
    suspended: false,
    pastActions: [
      {
        manuscriptTitle: "Maternal Health Outcomes in Lagos",
        action: "Assigned reviewers",
        date: "2025-11-12",
      },
      {
        manuscriptTitle: "Urban Malaria Control Strategies",
        action: "Editorial decision sent",
        date: "2025-10-01",
      },
    ],
  },
  {
    id: 2,
    name: "Dr. Zainab Lawal",
    email: "zainab@journal.org",
    specialization: ["Environmental Health"],
    affiliation: "University of Ilorin",
    activeAssignments: 1,
    completedActions: 11,
    status: "active",
    bio: "Editor focusing on environmental and sustainability related submissions.",
    suspended: false,
    pastActions: [],
  },
];

/* ================= Mock manuscripts ================= */

const manuscripts = [
  { id: 1, title: "Water Quality Assessment in Northern Nigeria" },
  { id: 2, title: "Public Health Surveillance Using AI" },
  { id: 3, title: "Climate Change Impact on Crop Yield" },
];

/* ================= Page ================= */

const AllEditors: FC = () => {
  const [editors, setEditors] = useState<Editor[]>(initialEditors);
  const [search, setSearch] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [selected, setSelected] = useState<Editor | null>(null);

  const [profileTab, setProfileTab] =
    useState<"profile" | "actions">("profile");

  const [assignModal, setAssignModal] = useState(false);
  const [assignEditor, setAssignEditor] = useState<Editor | null>(null);
  const [selectedManuscript, setSelectedManuscript] = useState("");

  const allSpecializations = Array.from(
    new Set(editors.flatMap((e) => e.specialization))
  );

  const filtered = editors.filter((e) => {
    const matchName =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());

    const matchSpec = specializationFilter
      ? e.specialization.includes(specializationFilter)
      : true;

    return matchName && matchSpec;
  });

  const toggleStatus = (id: number) => {
    setEditors((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, status: e.status === "active" ? "inactive" : "active" }
          : e
      )
    );
  };

  const suspendEditor = (id: number) => {
    setEditors((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, suspended: !e.suspended } : e
      )
    );
  };

  const assignManuscriptToEditor = () => {
    if (!assignEditor || !selectedManuscript) return;

    setEditors((prev) =>
      prev.map((e) =>
        e.id === assignEditor.id
          ? { ...e, activeAssignments: e.activeAssignments + 1 }
          : e
      )
    );

    setAssignModal(false);
    setAssignEditor(null);
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
          marginBottom: 10,
        }}
      >
        <h1
          className="page-title"
          style={{ display: "flex", alignItems: "center" }}
        >
          <Users size={20} style={{ marginRight: 6 }} />
          Editors management
        </h1>
      </div>

      {/* Filters */}
      <div
        className="panel"
        style={{
          padding: 12,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <input
          placeholder="Search editor by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 6,
            border: "1px solid #d1d5db",
            minWidth: 220,
          }}
        />

        <select
          value={specializationFilter}
          onChange={(e) => setSpecializationFilter(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 6,
            border: "1px solid #d1d5db",
          }}
        >
          <option value="">All subject areas</option>
          {allSpecializations.map((sp) => (
            <option key={sp} value={sp}>
              {sp}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="panel" style={{ padding: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th align="left">Editor</th>
              <th align="left">Subject areas</th>
              <th>Manuscripts in handling</th>
              <th>Editorial actions</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td>
                  <strong>{e.name}</strong>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {e.email}
                  </div>

                  {e.activeAssignments >= 3 && !e.suspended && (
                    <div style={{ fontSize: 11, color: "#92400e" }}>
                      High workload
                    </div>
                  )}

                  {e.suspended && (
                    <div style={{ fontSize: 11, color: "#b91c1c" }}>
                      Suspended
                    </div>
                  )}
                </td>

                <td style={{ fontSize: 13 }}>
                  {e.specialization.join(", ")}
                </td>

                <td align="center">{e.activeAssignments}</td>
                <td align="center">{e.completedActions}</td>

                <td align="center">
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      color: "#fff",
                      background:
                        e.status === "active" ? "#10b981" : "#9ca3af",
                    }}
                  >
                    {e.status}
                  </span>
                </td>

                <td align="right">
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => {
                        setSelected(e);
                        setProfileTab("profile");
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Eye size={16} />
                      Manage
                    </button>

                    <button
                      onClick={() => toggleStatus(e.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "none",
                        background:
                          e.status === "active" ? "#ef4444" : "#10b981",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {e.status === "active" ? (
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
            No editors found.
          </div>
        )}
      </div>

      {/* ================= Profile modal ================= */}
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
              borderRadius: 18,
              width: "95%",
              maxWidth: 560,
              overflow: "hidden",
              boxShadow: "0 30px 60px rgba(0,0,0,.25)",
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
                justifyContent: "space-between",
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
                    fontSize: 18,
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
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Editorial actions */}
            <div
              style={{
                padding: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <button
                onClick={() => {
                  setAssignEditor(selected);
                  setAssignModal(true);
                }}
                style={{
                  background: "#4f46e5",
                  color: "#fff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Assign manuscript
              </button>

              <button
                onClick={() =>
                  alert("Reviewer assignment panel coming soon")
                }
                style={{
                  background: "#eef2ff",
                  color: "#4338ca",
                  border: "1px solid #c7d2fe",
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Assign reviewers
              </button>

              <button
                onClick={() => alert("Decision workflow coming soon")}
                style={{
                  background: "#ecfeff",
                  color: "#0369a1",
                  border: "1px solid #bae6fd",
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Send decision
              </button>

              <button
                onClick={() => suspendEditor(selected.id)}
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  border: "1px solid #fecaca",
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: "pointer",
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
                    profileTab === "profile" ? "#4338ca" : "#6b7280",
                }}
              >
                Editor profile
              </button>

              <button
                onClick={() => setProfileTab("actions")}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  background:
                    profileTab === "actions" ? "#eef2ff" : "transparent",
                  color:
                    profileTab === "actions" ? "#4338ca" : "#6b7280",
                }}
              >
                Editorial history
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
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <strong>Affiliation:</strong>{" "}
                      {selected.affiliation}
                    </div>

                    <div>
                      <strong>Status:</strong>
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
                              : "#9ca3af",
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
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        background: "#f9fafb",
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Manuscripts in handling
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          marginTop: 4,
                        }}
                      >
                        {selected.activeAssignments}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#f9fafb",
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        Editorial actions completed
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          marginTop: 4,
                        }}
                      >
                        {selected.completedActions}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 6,
                      }}
                    >
                      Subject areas
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {selected.specialization.map((sp) => (
                        <span
                          key={sp}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "#eef2ff",
                            color: "#4338ca",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {sp}
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
                        marginBottom: 6,
                      }}
                    >
                      Editor biography
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "#4b5563",
                        background: "#f9fafb",
                        padding: 12,
                        borderRadius: 12,
                      }}
                    >
                      {selected.bio}
                    </div>
                  </div>
                </>
              )}

              {profileTab === "actions" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {selected.pastActions.length > 0 ? (
                    selected.pastActions.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 12,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>
                          {a.manuscriptTitle}
                        </div>
                        <div
                          style={{
                            color: "#6b7280",
                            marginTop: 4,
                          }}
                        >
                          Action: {a.action} • {a.date}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: 13,
                        color: "#6b7280",
                        padding: 30,
                      }}
                    >
                      No editorial history found.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= Assign manuscript modal ================= */}
      {assignModal && assignEditor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4000,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "95%",
              maxWidth: 420,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <h4 style={{ margin: 0 }}>Assign manuscript</h4>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {assignEditor.name}
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
                marginBottom: 16,
              }}
            >
              <option value="">Select manuscript</option>
              {manuscripts.map((m) => (
                <option key={m.id} value={m.title}>
                  {m.title}
                </option>
              ))}
            </select>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => setAssignModal(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              >
                Cancel
              </button>

              <button
                onClick={assignManuscriptToEditor}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#4f46e5",
                  color: "#fff",
                  fontWeight: 600,
                }}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllEditors;

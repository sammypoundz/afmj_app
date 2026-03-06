import type { FC } from "react";
import { useState, useRef, useEffect } from "react";
import { Search, UserCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EditorTopBar: FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    { id: number; title: string; author: string }[]
  >([]);
  const [open, setOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  /* mock editor-visible manuscripts */
  const mockManuscripts = [
    { id: 201, title: "Climate Change and Health", author: "Dr. Aisha Bello" },
    { id: 202, title: "Nutrition in Rural Communities", author: "Dr. Musa Ibrahim" },
    { id: 203, title: "Mental Health in Students", author: "Dr. Zainab Lawal" },
  ];

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const filtered = mockManuscripts.filter(
      (m) =>
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.author.toLowerCase().includes(search.toLowerCase()) ||
        m.id.toString().includes(search)
    );

    setResults(filtered);
    setOpen(filtered.length > 0);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: number) => {
    navigate(`/editor/manuscripts/${id}`);
    setSearch("");
    setOpen(false);
  };

  return (
    <header
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>
        Editor Panel
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Search */}
        <div ref={searchRef} style={{ position: "relative" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: "6px 10px",
              background: "#f9fafb",
              width: 240,
            }}
          >
            <Search size={16} />
            <input
              placeholder="Search manuscript..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: 14,
              }}
            />

            {search && (
              <X
                size={14}
                style={{ cursor: "pointer" }}
                onClick={() => setSearch("")}
              />
            )}
          </div>

          {open && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                marginTop: 6,
                boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                zIndex: 50,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {results.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {m.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {m.author} • ID {m.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div
          onClick={() => navigate("/editor/profile")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            color: "#374151",
            fontSize: 14,
          }}
        >
          <UserCircle size={22} />
          <span>Editor</span>
        </div>
      </div>
    </header>
  );
};

export default EditorTopBar;

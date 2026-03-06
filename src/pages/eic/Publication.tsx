import { useState, useEffect } from "react";
import type { FC, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, CheckCircle, FileText, ArrowLeft, Paperclip, Download } from "lucide-react";

const API_BASE = "https://afmjonline.com/api/EICpublicationApi.php";
const UPLOAD_URL = "https://afmjonline.com/api/upload.php"; // Implement this endpoint

interface Manuscript {
  id: number;
  manuscriptId: string;
  title: string;
  authors: string;
  acceptedDate: string;
  paymentAssigned?: boolean;
  paymentAmount?: number;
  paymentStatus?: "pending" | "paid";
  galleyProofStatus?: "pending" | "withAuthor" | "awaitingReview" | "approved";
  galleyProofComment?: string;
  galleyProofFile?: string; // file path
  authorFile?: string;      // file path
}

const Publication: FC = () => {
  const navigate = useNavigate();
  // Separate state for each tab
  const [pendingList, setPendingList] = useState<Manuscript[]>([]);
  const [paymentList, setPaymentList] = useState<Manuscript[]>([]);
  const [galleyList, setGalleyList] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "payment" | "galleyProof">("pending");
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Convert frontend tab to API type
  const getApiType = (tab: string) => {
    if (tab === "galleyProof") return "galley";
    return tab;
  };

  // Fetch manuscripts for a given tab and update the corresponding state
  const fetchTabData = async (tab: string) => {
    const type = getApiType(tab);
    try {
      const res = await fetch(`${API_BASE}?action=list&type=${type}`);
      const data = await res.json();
      if (res.ok) {
        if (tab === "pending") setPendingList(data);
        else if (tab === "payment") setPaymentList(data);
        else if (tab === "galleyProof") setGalleyList(data);
      } else {
        console.error(`Failed to load ${tab} manuscripts:`, data.error);
      }
    } catch (err) {
      console.error(`Network error fetching ${tab}:`, err);
    }
  };

  // Fetch all tabs on mount
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchTabData("pending"),
        fetchTabData("payment"),
        fetchTabData("galleyProof"),
      ]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Individual fetch helpers for refresh after actions
  const refreshPending = () => fetchTabData("pending");
  const refreshPayment = () => fetchTabData("payment");
  const refreshGalley = () => fetchTabData("galleyProof");

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(UPLOAD_URL, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.path;
  };

  const assignPayment = (m: Manuscript) => {
    setSelectedManuscript(m);
    setPaymentAmount(0);
  };

  const handlePaymentAssign = async (manuscript: Manuscript, free: boolean) => {
    try {
      const payload = {
        manuscript_id: manuscript.id,
        amount: free ? 0 : paymentAmount,
        free,
      };
      const res = await fetch(`${API_BASE}?action=assignPayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedManuscript(null);
      // Refresh both pending and payment lists (pending loses one, payment may gain one)
      await refreshPending();
      await refreshPayment();
      if (free) {
        setActiveTab("galleyProof");
        await refreshGalley(); // free moves to galley, so refresh galley too
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const markPaymentPaid = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}?action=markPaid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manuscript_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Refresh payment and galley lists
      await refreshPayment();
      await refreshGalley();
      setActiveTab("galleyProof");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const sendToAuthor = async (manuscript: Manuscript) => {
    if (!comment || !file) {
      alert("Comment and file are required");
      return;
    }
    setUploading(true);
    try {
      const filePath = await uploadFile(file);
      const res = await fetch(`${API_BASE}?action=sendToAuthor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manuscript_id: manuscript.id,
          comment,
          file_path: filePath,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComment("");
      setFile(null);
      setSelectedManuscript(null);
      // Refresh galley list (status changed)
      await refreshGalley();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const approveGalleyProof = async (manuscript: Manuscript) => {
    try {
      const res = await fetch(`${API_BASE}?action=approveGalley`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manuscript_id: manuscript.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedManuscript(null);
      await refreshGalley(); // status changed to approved
    } catch (err: any) {
      alert(err.message);
    }
  };

  const publishManuscript = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}?action=publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manuscript_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Remove from galley list; refresh galley
      await refreshGalley();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
  };

  const downloadFile = (filePath?: string) => {
    if (!filePath) return;
    window.open(filePath, "_blank");
  };

  // Determine which list to display based on activeTab
  const currentList = 
    activeTab === "pending" ? pendingList :
    activeTab === "payment" ? paymentList :
    galleyList;

  const cardStyle = {
    border: "1px solid #e5e7eb",
    padding: "16px",
    borderRadius: "10px",
    marginBottom: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    transition: "all 0.2s",
  };

  const buttonStyle = {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "0.2s",
  };

  const badge = (text: string, color: string, tooltip?: string) => (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "999px",
        background: color,
        color: "#fff",
        fontSize: "12px",
        fontWeight: 500,
        cursor: tooltip ? "help" : "default",
      }}
      title={tooltip || ""}
    >
      {text}
    </span>
  );

  return (
    <div className="content" style={{ padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#0d6efd",
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={28} /> Back
        </button>
        <h1 style={{ margin: 0 }}>Publication Decisions</h1>
      </div>

      {/* Tabs with counts from separate lists */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { key: "pending", label: `Pending Decisions (${pendingList.length})` },
          { key: "payment", label: `Payment Status (${paymentList.length})` },
          { key: "galleyProof", label: `Galley Proof (${galleyList.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: activeTab === tab.key ? "#0d6efd" : "#f3f4f6",
              color: activeTab === tab.key ? "#fff" : "#374151",
              fontWeight: 500,
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p>Loading...</p>}

      {!loading && (
        <div>
          {currentList.length === 0 && <p style={{ color: "#6b7280" }}>No manuscripts in this section.</p>}

          {currentList.map((m) => (
            <div
              key={m.id}
              style={cardStyle}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)")}
            >
              <div>
                <strong style={{ fontSize: "16px" }}>
                  {m.manuscriptId} - {m.title}
                </strong>
                <p style={{ margin: "4px 0", color: "#6b7280" }}>{m.authors}</p>

                {activeTab === "pending" && <small>Accepted: {m.acceptedDate}</small>}
                {activeTab === "payment" && (
                  <small>
                    Amount: {m.paymentAmount} | Status:{" "}
                    {m.paymentStatus === "pending"
                      ? badge("Pending", "#dc2626", "Payment not yet received")
                      : badge("Paid", "#10b981", "Payment completed")}
                  </small>
                )}
                {activeTab === "galleyProof" && (
                  <small>
                    Status:
                    {m.galleyProofStatus === "pending"
                      ? badge("Pending", "#f59e0b", "Awaiting to send to author")
                      : m.galleyProofStatus === "withAuthor"
                      ? badge("Sent to Author", "#fbbf24", "Galley proof sent to author")
                      : m.galleyProofStatus === "awaitingReview"
                      ? badge("Author Replied", "#3b82f6", "Author has submitted changes")
                      : badge("Approved", "#10b981", "Galley proof approved")}
                  </small>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {activeTab === "pending" && (
                  <>
                    <button
                      onClick={() => assignPayment(m)}
                      style={{ ...buttonStyle, background: "#0d6efd", color: "#fff" }}
                    >
                      <DollarSign size={16} /> Assign Payment
                    </button>
                    <button
                      onClick={() => handlePaymentAssign(m, true)}
                      style={{ ...buttonStyle, background: "#10b981", color: "#fff" }}
                    >
                      <CheckCircle size={16} /> Proceed Free
                    </button>
                  </>
                )}

                {activeTab === "payment" && m.paymentStatus === "pending" && (
                  <button
                    onClick={() => markPaymentPaid(m.id)}
                    style={{ ...buttonStyle, background: "#10b981", color: "#fff" }}
                  >
                    <DollarSign size={16} /> Mark Paid
                  </button>
                )}

                {activeTab === "galleyProof" && m.galleyProofStatus !== "approved" && (
                  <button
                    onClick={() => setSelectedManuscript(m)}
                    style={{ ...buttonStyle, background: "#0d6efd", color: "#fff" }}
                  >
                    <FileText size={16} /> Finalize
                  </button>
                )}

                {activeTab === "galleyProof" && m.galleyProofStatus === "approved" && (
                  <button
                    onClick={() => publishManuscript(m.id)}
                    style={{ ...buttonStyle, background: "#16a34a", color: "#fff" }}
                  >
                    <CheckCircle size={16} /> Publish
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedManuscript && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "10px",
              width: "450px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {activeTab === "pending" ? (
              <>
                <h3 style={{ marginBottom: "16px" }}>
                  Assign Payment: {selectedManuscript.manuscriptId} - {selectedManuscript.title}
                </h3>

                <label style={{ display: "block", marginBottom: "12px", fontWeight: 500 }}>
                  Amount (leave 0 for free):
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    style={{
                      width: "100%",
                      marginTop: "8px",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      outline: "none",
                    }}
                  />
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    onClick={() => setSelectedManuscript(null)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      background: "#f3f4f6",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handlePaymentAssign(selectedManuscript, false)}
                    style={{ ...buttonStyle, background: "#0d6efd", color: "#fff" }}
                  >
                    <DollarSign size={16} /> Assign
                  </button>
                  <button
                    onClick={() => handlePaymentAssign(selectedManuscript, true)}
                    style={{ ...buttonStyle, background: "#10b981", color: "#fff" }}
                  >
                    <CheckCircle size={16} /> Publish Free
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: "16px" }}>
                  Galley Proof: {selectedManuscript.manuscriptId} - {selectedManuscript.title}
                </h3>

                <label style={{ display: "block", marginBottom: "12px", fontWeight: 500 }}>
                  Comment:
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{
                      width: "100%",
                      marginTop: "8px",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      outline: "none",
                      minHeight: "80px",
                    }}
                  />
                </label>

                <label style={{ display: "block", marginBottom: "12px", fontWeight: 500, cursor: "pointer" }}>
                  <Paperclip size={16} /> Attach Document:
                  <input
                    type="file"
                    onChange={handleFileChange}
                    style={{ marginTop: "8px", display: "block" }}
                    disabled={uploading}
                  />
                </label>

                {selectedManuscript.galleyProofComment && (
                  <div style={{ marginBottom: "12px" }}>
                    <strong>EIC Comment sent to author</strong>
                    <p style={{ margin: "6px 0", color: "#374151" }}>{selectedManuscript.galleyProofComment}</p>
                    {selectedManuscript.galleyProofFile && (
                      <button
                        onClick={() => downloadFile(selectedManuscript.galleyProofFile)}
                        style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151" }}
                      >
                        <Download size={16} /> Download EIC file
                      </button>
                    )}
                  </div>
                )}

                {selectedManuscript.authorFile && (
                  <div style={{ marginBottom: "12px" }}>
                    <strong>Author reply (corrected manuscript)</strong>
                    <div style={{ marginTop: "6px" }}>
                      <button
                        onClick={() => downloadFile(selectedManuscript.authorFile)}
                        style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151" }}
                      >
                        <Download size={16} /> Download author file
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                  <button
                    onClick={() => setSelectedManuscript(null)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      background: "#f3f4f6",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    disabled={!comment || !file || uploading}
                    onClick={() => sendToAuthor(selectedManuscript)}
                    style={{
                      ...buttonStyle,
                      background: !comment || !file || uploading ? "#9ca3af" : "#0d6efd",
                      color: "#fff",
                      cursor: !comment || !file || uploading ? "not-allowed" : "pointer",
                    }}
                  >
                    {uploading ? "Uploading..." : <><CheckCircle size={16} /> Send to Author</>}
                  </button>

                  <button
                    disabled={selectedManuscript.galleyProofStatus !== "awaitingReview"}
                    onClick={() => approveGalleyProof(selectedManuscript)}
                    style={{
                      ...buttonStyle,
                      background: selectedManuscript.galleyProofStatus === "awaitingReview" ? "#10b981" : "#9ca3af",
                      color: "#fff",
                      cursor: selectedManuscript.galleyProofStatus === "awaitingReview" ? "pointer" : "not-allowed",
                    }}
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Publication;
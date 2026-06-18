import { useState, useEffect } from "react";
import type { FC, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, FileText, ArrowLeft, Paperclip, Download, Eye, Save } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../contexts/AuthContext";

const API_BASE = "https://vinosschool.com/api/EICpublicationApi.php";
const UPLOAD_URL = "https://vinosschool.com/api/upload.php";
const DOWNLOAD_API = "https://vinosschool.com/api/download.php";

// Spinner component for buttons
const Spinner = ({ dark = false }: { dark?: boolean }) => (
  <span
    style={{
      width: 14,
      height: 14,
      border: `2px solid ${dark ? "#198754" : "#fff"}`,
      borderTop: "2px solid transparent",
      borderRadius: "50%",
      display: "inline-block",
      animation: "spin 0.7s linear infinite",
    }}
  />
);

const GlobalStyles = () => (
  <style>{`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}</style>
);

interface Manuscript {
  id: number;
  manuscriptId: string;
  title: string;
  authors: string;
  acceptedDate: string;
  paymentAssigned?: boolean;
  paymentAmount?: number;
  paymentStatus?: "pending" | "paid";
  paymentProof?: string;
  galleyProofStatus?: "pending" | "withAuthor" | "awaitingReview" | "approved";
  galleyProofComment?: string;
  galleyProofFile?: string;
  authorFile?: string;
  galleyAuthorResponse?: string;
  galleyFinalFile?: string;
  abstract?: string;
  objective?: string;
  methods?: string;
  results?: string;
  conclusion?: string;
  studyType?: string;
  keywords?: string;   // NEW
}

const Publication: FC = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [pendingList, setPendingList] = useState<Manuscript[]>([]);
  const [paymentList, setPaymentList] = useState<Manuscript[]>([]);
  const [galleyList, setGalleyList] = useState<Manuscript[]>([]);
  const [awaitingList, setAwaitingList] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "payment" | "galleyProof" | "awaiting">("pending");
  const [selectedManuscript, setSelectedManuscript] = useState<Manuscript | null>(null);
  const [paymentAmountNgn, setPaymentAmountNgn] = useState<number>(0);
  const [paymentAmountUsd, setPaymentAmountUsd] = useState<number>(0);
  const [paymentInstructions, setPaymentInstructions] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publicationFile, setPublicationFile] = useState<File | null>(null);
  const [publicationUploading, setPublicationUploading] = useState(false);
  const [savingPublicationData, setSavingPublicationData] = useState(false);

  // Editable fields for the "Awaiting Publication" modal
  const [editTitle, setEditTitle] = useState("");           // NEW
  const [editAuthors, setEditAuthors] = useState("");
  const [editKeywords, setEditKeywords] = useState("");     // NEW
  const [editStudyType, setEditStudyType] = useState("");
  const [editAbstract, setEditAbstract] = useState("");
  const [editObjective, setEditObjective] = useState("");
  const [editMethods, setEditMethods] = useState("");
  const [editResults, setEditResults] = useState("");
  const [editConclusion, setEditConclusion] = useState("");

  // Loading states for various actions
  const [assigningPayment, setAssigningPayment] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [submittingForPublication, setSubmittingForPublication] = useState<number | null>(null);
  const [sendingToAuthor, setSendingToAuthor] = useState(false);
  const [publishingFromAwaiting, setPublishingFromAwaiting] = useState<number | null>(null);

  const getApiType = (tab: string) => {
    if (tab === "galleyProof") return "galley";
    if (tab === "awaiting") return "awaiting";
    return tab;
  };

  const fetchTabData = async (tab: string) => {
    const type = getApiType(tab);
    try {
      const res = await fetch(`${API_BASE}?action=list&type=${type}`);
      const data = await res.json();
      if (res.ok) {
        if (tab === "pending") setPendingList(data);
        else if (tab === "payment") setPaymentList(data);
        else if (tab === "galleyProof") setGalleyList(data);
        else if (tab === "awaiting") setAwaitingList(data);
        toast.success(`Loaded ${data.length} manuscript(s) for ${tab}`);
      } else {
        console.error(`Failed to load ${tab} manuscripts:`, data.error);
        toast.error(data.error || `Failed to load ${tab} manuscripts`);
      }
    } catch (err) {
      console.error(`Network error fetching ${tab}:`, err);
      toast.error(`Network error: ${err}`);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchTabData("pending"),
        fetchTabData("payment"),
        fetchTabData("galleyProof"),
        fetchTabData("awaiting"),
      ]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const refreshPending = () => fetchTabData("pending");
  const refreshPayment = () => fetchTabData("payment");
  const refreshGalley = () => fetchTabData("galleyProof");
  const refreshAwaiting = () => fetchTabData("awaiting");

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
    setPaymentAmountNgn(0);
    setPaymentAmountUsd(0);
    setPaymentInstructions("");
  };

  const handlePaymentAssign = async (manuscript: Manuscript) => {
    if (paymentAmountNgn <= 0) {
      toast.warn("Please enter a valid amount (₦) greater than 0");
      return;
    }
    setAssigningPayment(true);
    try {
      const payload = {
        manuscript_id: manuscript.id,
        amount: paymentAmountNgn,
        instructions: paymentInstructions,
      };
      const res = await fetch(`${API_BASE}?action=assignPayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Payment assigned and email sent to author!");
      setSelectedManuscript(null);
      await refreshPending();
      await refreshPayment();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAssigningPayment(false);
    }
  };

  const markPaymentPaid = async (id: number) => {
    setMarkingPaid(id);
    try {
      const res = await fetch(`${API_BASE}?action=markPaid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manuscript_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Payment marked as paid!");
      await refreshPayment();
      await refreshGalley();
      setActiveTab("galleyProof");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setMarkingPaid(null);
    }
  };

  const sendToAuthor = async (manuscript: Manuscript) => {
    if (!comment || !file) {
      toast.warn("Comment and file are required");
      return;
    }
    setSendingToAuthor(true);
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
      toast.success("Galley proof sent to author!");
      setComment("");
      setFile(null);
      setSelectedManuscript(null);
      await refreshGalley();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      setSendingToAuthor(false);
    }
  };

  const submitForPublication = async (manuscript: Manuscript) => {
    setSubmittingForPublication(manuscript.id);
    try {
      const res = await fetch(`${API_BASE}?action=approveGalley`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manuscript_id: manuscript.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Manuscript submitted for publication!");
      setSelectedManuscript(null);
      await refreshGalley();
      await refreshAwaiting();
      setActiveTab("awaiting");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingForPublication(null);
    }
  };

  const publishFromAwaiting = async (manuscript: Manuscript) => {
    if (!publicationFile) {
      toast.warn("Please select the final PDF file to publish");
      return;
    }
    setPublishingFromAwaiting(manuscript.id);
    setPublicationUploading(true);
    try {
      const filePath = await uploadFile(publicationFile);
      const res = await fetch(`${API_BASE}?action=publishFromAwaiting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manuscript_id: manuscript.id,
          publication_file: filePath,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Manuscript published successfully!");
      setPublicationFile(null);
      setSelectedManuscript(null);
      await refreshAwaiting();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPublicationUploading(false);
      setPublishingFromAwaiting(null);
    }
  };

  const savePublicationData = async (manuscript: Manuscript) => {
    setSavingPublicationData(true);
    try {
      const payload = {
        manuscript_id: manuscript.id,
        title: editTitle,                     // NEW
        authors: editAuthors,
        keywords: editKeywords,               // NEW
        study_type: editStudyType,
        abstract: editAbstract,
        objective: editObjective,
        methods: editMethods,
        results: editResults,
        conclusion: editConclusion,
      };
      const res = await fetch(`${API_BASE}?action=updatePublicationData`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save changes");
      toast.success("Publication data updated successfully!");
      await refreshAwaiting();
      if (selectedManuscript) {
        setSelectedManuscript({
          ...selectedManuscript,
          title: editTitle,
          authors: editAuthors,
          keywords: editKeywords,
          studyType: editStudyType,
          abstract: editAbstract,
          objective: editObjective,
          methods: editMethods,
          results: editResults,
          conclusion: editConclusion,
        });
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPublicationData(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
  };

  const handlePublicationFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf") {
        toast.error("Only PDF files are allowed for publication.");
        return;
      }
      setPublicationFile(selected);
    }
  };

  const downloadFile = async (filePath?: string, fileName?: string) => {
    if (!filePath) {
      toast.error("No file available");
      return;
    }
    const toastId = toast.loading("Downloading...");
    try {
      const downloadUrl = `${DOWNLOAD_API}?file=${encodeURIComponent(filePath)}`;
      const response = await authFetch(downloadUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const blob = await response.blob();
      let extension = "";
      const parts = filePath.split(".");
      if (parts.length > 1) {
        extension = parts.pop() || "";
        if (extension.includes("?")) extension = extension.split("?")[0];
      }
      const finalName = fileName || `file_${Date.now()}${extension ? "." + extension : ""}`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.update(toastId, { render: "Downloaded successfully", type: "success", isLoading: false, autoClose: 3000 });
    } catch (error) {
      console.error("Download failed:", error);
      toast.update(toastId, { render: "Download failed", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  const openAwaitingModal = (m: Manuscript) => {
    setSelectedManuscript(m);
    setEditTitle(m.title || "");
    setEditAuthors(m.authors || "");
    setEditKeywords(m.keywords || "");
    setEditStudyType(m.studyType || "");
    setEditAbstract(m.abstract || "");
    setEditObjective(m.objective || "");
    setEditMethods(m.methods || "");
    setEditResults(m.results || "");
    setEditConclusion(m.conclusion || "");
  };

  const currentList =
    activeTab === "pending" ? pendingList :
    activeTab === "payment" ? paymentList :
    activeTab === "galleyProof" ? galleyList :
    awaitingList;

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
      <GlobalStyles />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
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

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { key: "pending", label: `Pending Decisions (${pendingList.length})` },
          { key: "payment", label: `Payment Status (${paymentList.length})` },
          { key: "galleyProof", label: `Galley Proof (${galleyList.length})` },
          { key: "awaiting", label: `Awaiting Publication (${awaitingList.length})` },
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
                  <div>
                    <small>
                      Amount: ₦{m.paymentAmount} | Status:{" "}
                      {m.paymentStatus === "pending"
                        ? badge("Pending", "#dc2626", "Payment not yet received")
                        : badge("Paid", "#10b981", "Payment completed")}
                    </small>
                    {m.paymentProof && (
                      <div style={{ marginTop: "4px", display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => downloadFile(m.paymentProof, `payment_proof_${m.manuscriptId}`)}
                          style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151", padding: "2px 8px", fontSize: "12px" }}
                        >
                          <Download size={12} /> Download
                        </button>
                      </div>
                    )}
                  </div>
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
                {activeTab === "awaiting" && (
                  <small>Ready for publication – upload final PDF and publish.</small>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {activeTab === "pending" && (
                  <button
                    onClick={() => assignPayment(m)}
                    style={{ ...buttonStyle, background: "#0d6efd", color: "#fff" }}
                  >
                    Assign Payment
                  </button>
                )}

                {activeTab === "payment" && m.paymentStatus === "pending" && (
                  <button
                    onClick={() => markPaymentPaid(m.id)}
                    disabled={markingPaid === m.id}
                    style={{
                      ...buttonStyle,
                      background: "#10b981",
                      color: "#fff",
                      opacity: markingPaid === m.id ? 0.7 : 1,
                      cursor: markingPaid === m.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {markingPaid === m.id ? <Spinner /> : <CheckCircle size={16} />}
                    {markingPaid === m.id ? "Processing..." : "Mark Paid"}
                  </button>
                )}

                {activeTab === "galleyProof" && m.galleyProofStatus !== "approved" && (
                  <button
                    onClick={() => setSelectedManuscript(m)}
                    style={{ ...buttonStyle, background: "#0d6efd", color: "#fff" }}
                  >
                    <FileText size={16} /> Manage Galley
                  </button>
                )}

                {activeTab === "awaiting" && (
                  <button
                    onClick={() => openAwaitingModal(m)}
                    style={{ ...buttonStyle, background: "#16a34a", color: "#fff" }}
                  >
                    <Eye size={16} /> Prepare Publication
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Assign Payment – unchanged */}
      {selectedManuscript && activeTab === "pending" && (
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
            <h3 style={{ marginBottom: "16px" }}>
              Assign Payment: {selectedManuscript.manuscriptId} - {selectedManuscript.title}
            </h3>

            <label style={{ display: "block", marginBottom: "12px", fontWeight: 500 }}>
              Amount (₦):
              <input
                type="number"
                value={paymentAmountNgn}
                onChange={(e) => setPaymentAmountNgn(Number(e.target.value))}
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

            <label style={{ display: "block", marginBottom: "12px", fontWeight: 500 }}>
              Amount ($USD) – optional, for your reference only (not sent to author):
              <input
                type="number"
                step="0.01"
                value={paymentAmountUsd}
                onChange={(e) => setPaymentAmountUsd(Number(e.target.value))}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  background: "#f9fafb",
                }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "12px", fontWeight: 500 }}>
              Payment Instructions / Letter (include amount, payment link, etc.):
              <textarea
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                rows={5}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  fontFamily: "inherit",
                }}
                placeholder="Example: Please pay ₦50,000 to account 0123456789 (Bank Name) on or before 2025-05-01. Use your manuscript ID as reference."
              />
            </label>

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
                onClick={() => handlePaymentAssign(selectedManuscript)}
                disabled={assigningPayment}
                style={{
                  ...buttonStyle,
                  background: "#0d6efd",
                  color: "#fff",
                  opacity: assigningPayment ? 0.7 : 1,
                  cursor: assigningPayment ? "not-allowed" : "pointer",
                }}
              >
                {assigningPayment ? <Spinner /> : null}
                {assigningPayment ? "Assigning..." : "Assign Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Galley Proof – unchanged */}
      {selectedManuscript && activeTab === "galleyProof" && (
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
              width: "500px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ marginBottom: "16px" }}>
              Galley Proof: {selectedManuscript.manuscriptId} - {selectedManuscript.title}
            </h3>

            <label style={{ display: "block", marginBottom: "12px", fontWeight: 500 }}>
              Comment to Author:
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
              <Paperclip size={16} /> Attach Document (optional):
              <input
                type="file"
                onChange={handleFileChange}
                style={{ marginTop: "8px", display: "block" }}
                disabled={uploading}
              />
            </label>

            {selectedManuscript.galleyProofComment && (
              <div style={{ marginBottom: "12px" }}>
                <strong>EIC Comment sent to author:</strong>
                <p style={{ margin: "6px 0", color: "#374151" }}>{selectedManuscript.galleyProofComment}</p>
                {selectedManuscript.galleyProofFile && (
                  <button
                    onClick={() => downloadFile(selectedManuscript.galleyProofFile, "eic_attachment")}
                    style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151" }}
                  >
                    <Download size={16} /> Download EIC file
                  </button>
                )}
              </div>
            )}

            {selectedManuscript.authorFile && (
              <div style={{ marginBottom: "12px" }}>
                <strong>Author reply (corrected manuscript):</strong>
                <div style={{ marginTop: "6px" }}>
                  <button
                    onClick={() => downloadFile(selectedManuscript.authorFile, "author_corrected_file")}
                    style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151" }}
                  >
                    <Download size={16} /> Download author file
                  </button>
                </div>
              </div>
            )}

            {selectedManuscript.galleyAuthorResponse && (
              <div style={{ marginBottom: "12px" }}>
                <strong>Authors corrections/Comment:</strong>
                <p style={{ margin: "6px 0", color: "#374151", background: "#f1f5f9", padding: "8px", borderRadius: "6px" }}>
                  {selectedManuscript.galleyAuthorResponse}
                </p>
              </div>
            )}

            {selectedManuscript.galleyFinalFile && (
              <div style={{ marginBottom: "12px" }}>
                <strong>Author's Final File:</strong>
                <div style={{ marginTop: "6px" }}>
                  <button
                    onClick={() => downloadFile(selectedManuscript.galleyFinalFile, "author_final_file")}
                    style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151" }}
                  >
                    <Download size={16} /> Download author's final file
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
                disabled={!comment || !file || uploading || sendingToAuthor}
                onClick={() => sendToAuthor(selectedManuscript)}
                style={{
                  ...buttonStyle,
                  background: !comment || !file || uploading || sendingToAuthor ? "#9ca3af" : "#0d6efd",
                  color: "#fff",
                  cursor: !comment || !file || uploading || sendingToAuthor ? "not-allowed" : "pointer",
                }}
              >
                {uploading ? <Spinner /> : <CheckCircle size={16} />}
                {uploading ? "Uploading..." : "Send to Author"}
              </button>

              <button
                disabled={selectedManuscript.galleyProofStatus !== "awaitingReview" || submittingForPublication === selectedManuscript.id}
                onClick={() => submitForPublication(selectedManuscript)}
                style={{
                  ...buttonStyle,
                  background: selectedManuscript.galleyProofStatus === "awaitingReview" && submittingForPublication !== selectedManuscript.id ? "#10b981" : "#9ca3af",
                  color: "#fff",
                  cursor: selectedManuscript.galleyProofStatus === "awaitingReview" && submittingForPublication !== selectedManuscript.id ? "pointer" : "not-allowed",
                }}
              >
                {submittingForPublication === selectedManuscript.id ? <Spinner /> : <CheckCircle size={16} />}
                {submittingForPublication === selectedManuscript.id ? "Submitting..." : "Submit for Publication"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODIFIED Modal for Awaiting Publication – now includes Title and Keywords */}
      {selectedManuscript && activeTab === "awaiting" && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedManuscript(null);
            }
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "700px",
              maxWidth: "95vw",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: "8px" }}>
              Finalize & Edit Publication Data: {selectedManuscript.manuscriptId} - {selectedManuscript.title}
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              You can edit the manuscript metadata below before publishing. Leave blank if not needed.
            </p>

            {/* NEW: Title input */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
                placeholder="Manuscript title"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Authors</label>
              <input
                type="text"
                value={editAuthors}
                onChange={(e) => setEditAuthors(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
                placeholder="Enter author names"
              />
            </div>

            {/* NEW: Keywords input */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Keywords</label>
              <input
                type="text"
                value={editKeywords}
                onChange={(e) => setEditKeywords(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
                placeholder="e.g., malaria, genomics, drug resistance (separate with commas)"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Study Type</label>
              <input
                type="text"
                value={editStudyType}
                onChange={(e) => setEditStudyType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
                placeholder="e.g., Original Research, Case Report, Review"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Abstract</label>
              <textarea
                value={editAbstract}
                onChange={(e) => setEditAbstract(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                }}
                placeholder="Abstract text..."
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Objective</label>
              <textarea
                value={editObjective}
                onChange={(e) => setEditObjective(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                }}
                placeholder="Objective..."
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Methods</label>
              <textarea
                value={editMethods}
                onChange={(e) => setEditMethods(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                }}
                placeholder="Methods..."
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Results</label>
              <textarea
                value={editResults}
                onChange={(e) => setEditResults(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                }}
                placeholder="Results..."
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Conclusion</label>
              <textarea
                value={editConclusion}
                onChange={(e) => setEditConclusion(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                }}
                placeholder="Conclusion..."
              />
            </div>

            {/* File upload section (unchanged) */}
            <div style={{ marginBottom: "20px", marginTop: "20px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "8px" }}>
                Upload Final Publication File (PDF only):
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePublicationFileChange}
              />
              {publicationFile && (
                <div style={{ marginTop: "8px", fontSize: "0.9rem", color: "#16a34a" }}>
                  Selected: {publicationFile.name}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button
                onClick={() => setSelectedManuscript(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  background: "#f3f4f6",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => savePublicationData(selectedManuscript)}
                disabled={savingPublicationData}
                style={{
                  ...buttonStyle,
                  background: savingPublicationData ? "#9ca3af" : "#0d6efd",
                  color: "#fff",
                  cursor: savingPublicationData ? "not-allowed" : "pointer",
                }}
              >
                {savingPublicationData ? <Spinner /> : <Save size={16} />}
                {savingPublicationData ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => publishFromAwaiting(selectedManuscript)}
                disabled={!publicationFile || publicationUploading || publishingFromAwaiting === selectedManuscript.id}
                style={{
                  ...buttonStyle,
                  background: !publicationFile || publicationUploading || publishingFromAwaiting === selectedManuscript.id ? "#9ca3af" : "#16a34a",
                  color: "#fff",
                  cursor: !publicationFile || publicationUploading || publishingFromAwaiting === selectedManuscript.id ? "not-allowed" : "pointer",
                }}
              >
                {publicationUploading ? <Spinner /> : <CheckCircle size={16} />}
                {publicationUploading ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Publication;
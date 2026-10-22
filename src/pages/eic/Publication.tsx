import { useState, useEffect } from "react";
import type { FC, ChangeEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, FileText, ArrowLeft, Paperclip, Download, Eye, Save } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../../contexts/AuthContext";
import { API_ORIGIN } from "../../apiConfig"

const API_BASE = `${API_ORIGIN}/api2/EICpublicationApi.php`;
const UPLOAD_URL = `${API_ORIGIN}/api2/upload.php`;
const DOWNLOAD_API = `${API_ORIGIN}/api2/download.php`;

// Default payment instructions template (editable)
const DEFAULT_PAYMENT_INSTRUCTIONS = `Dear Author,

Congratulations once again on your accepted manuscript. You are required to pay the article processing fees with the details below in order to progress with the publication:

Account Name: MDCAN - FMCA
Account Number: 1014603854
Amount: N42,000 OR $30

After making payment, you are required to upload the evidence of payment on your portal.

Kind regards.
Editorial Team.`;

// Spinner component
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

interface UserOption {
  id: number;
  name: string;
  email?: string;
}

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
  keywords?: string;
  galleyProofCreatedAt?: string; // new field
  publishedDate?: string;
  publicationFile?: string;
  authorName?: string;
  views?: number;
  downloads?: number;
}

const Publication: FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authFetch } = useAuth();
  const [pendingList, setPendingList] = useState<Manuscript[]>([]);
  const [paymentList, setPaymentList] = useState<Manuscript[]>([]);
  const [galleyList, setGalleyList] = useState<Manuscript[]>([]);
  const [awaitingList, setAwaitingList] = useState<Manuscript[]>([]);
  const [publishedList, setPublishedList] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "payment" | "galleyProof" | "awaiting" | "published">("pending");
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

  const [editTitle, setEditTitle] = useState("");
  const [editAuthors, setEditAuthors] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editStudyType, setEditStudyType] = useState("");
  const [editAbstract, setEditAbstract] = useState("");
  const [editObjective, setEditObjective] = useState("");
  const [editMethods, setEditMethods] = useState("");
  const [editResults, setEditResults] = useState("");
  const [editConclusion, setEditConclusion] = useState("");

  const [assigningPayment, setAssigningPayment] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<number | null>(null);
  const [submittingForPublication, setSubmittingForPublication] = useState<number | null>(null);
  const [sendingToAuthor, setSendingToAuthor] = useState(false);
  const [publishingFromAwaiting, setPublishingFromAwaiting] = useState<number | null>(null);
  // Publish is only allowed after publication data has been saved for the
  // currently open awaiting-publication manuscript.
  const [savedManuscriptId, setSavedManuscriptId] = useState<number | null>(null);

  // ==================== Offline publication sync state ====================
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [offlineSaving, setOfflineSaving] = useState(false);
  const [offlineUploading, setOfflineUploading] = useState(false);
  const [offlineFile, setOfflineFile] = useState<File | null>(null);
  const [userLists, setUserLists] = useState<
    { authors: UserOption[]; editors: UserOption[]; reviewers: UserOption[] }
  >({ authors: [], editors: [], reviewers: [] });
  const [offlineForm, setOfflineForm] = useState({
    title: "",
    authors: "",
    author_id: "",
    editor_id: "",
    reviewer_id: "",
    study_type: "",
    keywords: "",
    abstract: "",
    objective: "",
    methods: "",
    results: "",
    conclusion: "",
    published_at: "",
  });

  const getApiType = (tab: string) => {
    if (tab === "galleyProof") return "galley";
    if (tab === "awaiting") return "awaiting";
    return tab;
  };

  const fetchTabData = async (tab: string) => {
    const type = getApiType(tab);
    try {
      // Published manuscripts use a dedicated endpoint that returns published
      // records (with publication_file) for editing/republishing.
      const url = tab === "published"
        ? `${API_BASE}?action=listPublished`
        : `${API_BASE}?action=list&type=${type}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        if (tab === "pending") setPendingList(data);
        else if (tab === "payment") setPaymentList(data);
        else if (tab === "galleyProof") setGalleyList(data);
        else if (tab === "awaiting") setAwaitingList(data);
        else if (tab === "published") setPublishedList(data);
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
        fetchTabData("published"),
      ]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Coming from the Published page: auto-open the edit/republish modal for
  // the requested manuscript and clean the URL afterwards.
  useEffect(() => {
    const editId = searchParams.get("editPublished");
    if (!editId || loading || publishedList.length === 0) return;
    const target = publishedList.find((m) => String(m.id) === editId);
    if (target) {
      setActiveTab("published");
      openPublishedModal(target);
    } else {
      toast.error("Published manuscript not found");
    }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading, publishedList]);

  const refreshPending = () => fetchTabData("pending");
  const refreshPayment = () => fetchTabData("payment");
  const refreshGalley = () => fetchTabData("galleyProof");
  const refreshAwaiting = () => fetchTabData("awaiting");
  const refreshPublished = () => fetchTabData("published");

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
    setPaymentInstructions(DEFAULT_PAYMENT_INSTRUCTIONS); // pre‑populate
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
        amount_usd: paymentAmountUsd,
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
        title: editTitle,
        authors: editAuthors,
        keywords: editKeywords,
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
      setSavedManuscriptId(manuscript.id);
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

  const lockSaved = (id: number) => {
    if (savedManuscriptId === id) setSavedManuscriptId(null);
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
    // Require a fresh save before Publish is available for this manuscript
    setSavedManuscriptId(null);
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

  // ==================== Edit published manuscript state ====================
  const [showPublishedModal, setShowPublishedModal] = useState(false);
  const [editingPublished, setEditingPublished] = useState<Manuscript | null>(null);
  const [publishedFile, setPublishedFile] = useState<File | null>(null);
  const [publishedPublishedAt, setPublishedPublishedAt] = useState<string>("");
  const [savingPublished, setSavingPublished] = useState(false);
  const [publishedUploading, setPublishedUploading] = useState(false);

  const openPublishedModal = (m: Manuscript) => {
    setEditingPublished(m);
    setPublishedFile(null);
    setPublishedPublishedAt(m.publishedDate ? m.publishedDate.slice(0, 10) : "");
    setEditTitle(m.title || "");
    setEditAuthors(m.authors || "");
    setEditKeywords(m.keywords || "");
    setEditStudyType(m.studyType || "");
    setEditAbstract(m.abstract || "");
    setEditObjective(m.objective || "");
    setEditMethods(m.methods || "");
    setEditResults(m.results || "");
    setEditConclusion(m.conclusion || "");
    setShowPublishedModal(true);
  };

  const handlePublishedFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf") {
        toast.error("Only PDF files are allowed.");
        return;
      }
      setPublishedFile(selected);
    }
  };

  const savePublishedChanges = async () => {
    if (!editingPublished) return;
    if (!editTitle.trim()) { toast.error("Title is required"); return; }

    setSavingPublished(true);
    try {
      let publicationFilePath: string | null = null;
      if (publishedFile) {
        setPublishedUploading(true);
        publicationFilePath = await uploadFile(publishedFile);
        setPublishedUploading(false);
      }

      const payload: Record<string, unknown> = {
        manuscript_id: editingPublished.id,
        title: editTitle,
        authors: editAuthors,
        keywords: editKeywords,
        study_type: editStudyType,
        abstract: editAbstract,
        objective: editObjective,
        methods: editMethods,
        results: editResults,
        conclusion: editConclusion,
      };
      if (publicationFilePath) payload.publication_file = publicationFilePath;
      if (publishedPublishedAt) payload.published_at = publishedPublishedAt;

      const res = await fetch(`${API_BASE}?action=updatePublished`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update published manuscript");
      toast.success("Published manuscript updated successfully!");
      setShowPublishedModal(false);
      setPublishedFile(null);
      setEditingPublished(null);
      await refreshPublished();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update published manuscript");
    } finally {
      setPublishedUploading(false);
      setSavingPublished(false);
    }
  };

  // ==================== Offline publication sync ====================
  const openOfflineModal = async () => {
    setOfflineForm({
      title: "",
      authors: "",
      author_id: "",
      editor_id: "",
      reviewer_id: "",
      study_type: "",
      keywords: "",
      abstract: "",
      objective: "",
      methods: "",
      results: "",
      conclusion: "",
      published_at: "",
    });
    setOfflineFile(null);
    setShowOfflineModal(true);

    // Load authors, editors and reviewers for the selects (once per open)
    try {
      const [authorsRes, editorsRes, reviewersRes] = await Promise.all([
        fetch(`${API_ORIGIN}/api2/EICUsersApi.php?action=listAuthors&limit=50&page=1`),
        fetch(`${API_ORIGIN}/api2/EICUsersApi.php?action=listEditors&limit=50&page=1`),
        fetch(`${API_ORIGIN}/api2/EICUsersApi.php?action=listReviewers&limit=50&page=1`),
      ]);
      const [a, e, r] = await Promise.all([authorsRes.json(), editorsRes.json(), reviewersRes.json()]);
      const mapList = (d: any): UserOption[] =>
        (Array.isArray(d) ? d : d?.data || d?.users || []).map((u: any) => ({
          id: Number(u.id),
          name: u.name,
          email: u.email,
        }));
      setUserLists({ authors: mapList(a), editors: mapList(e), reviewers: mapList(r) });
    } catch (err) {
      console.error("Failed to load users for offline publication", err);
      toast.error("Could not load author/editor/reviewer lists");
    }
  };

  const handleOfflineFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf") {
        toast.error("Only PDF files are allowed for publication.");
        return;
      }
      setOfflineFile(selected);
    }
  };

  const handleOfflinePublish = async () => {
    if (!offlineForm.title.trim()) { toast.error("Title is required"); return; }
    if (!offlineForm.author_id) { toast.error("Please select the author"); return; }
    if (!offlineFile) { toast.error("Please select the final publication PDF"); return; }

    setOfflineSaving(true);
    try {
      setOfflineUploading(true);
      const filePath = await uploadFile(offlineFile);
      setOfflineUploading(false);

      const res = await fetch(`${API_BASE}?action=offlinePublish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...offlineForm,
          publication_file: filePath,
          author_id: Number(offlineForm.author_id),
          editor_id: offlineForm.editor_id || null,
          reviewer_id: offlineForm.reviewer_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync offline publication");
      toast.success("Offline manuscript synced and published!");
      setShowOfflineModal(false);
      await refreshAwaiting();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to sync offline publication");
    } finally {
      setOfflineUploading(false);
      setOfflineSaving(false);
    }
  };

  // Helper: compute days since galley proof sent
  const getDaysSinceGalleySent = (createdAt?: string) => {
    if (!createdAt) return null;
    const sent = new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const currentList =
    activeTab === "pending" ? pendingList :
    activeTab === "payment" ? paymentList :
    activeTab === "galleyProof" ? galleyList :
    activeTab === "published" ? publishedList :
    awaitingList;

  const cardStyle = {
    border: "1px solid #e5e7eb",
    padding: "16px",
    borderRadius: "10px",
    marginBottom: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "12px",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box" as const,
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
    <div className="content" style={{ padding: "24px", overflowX: "hidden" }}>
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
        <button
          onClick={openOfflineModal}
          style={{
            ...buttonStyle,
            marginLeft: "auto",
            background: "#7c3aed",
            color: "#fff",
            padding: "8px 16px",
            fontWeight: 600,
          }}
          title="Record a manuscript that was processed and published offline"
        >
          <FileText size={16} /> Sync Offline Publication
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { key: "pending", label: `Pending Decisions (${pendingList.length})` },
          { key: "payment", label: `Payment Status (${paymentList.length})` },
          { key: "galleyProof", label: `Galley Proof (${galleyList.length})` },
          { key: "awaiting", label: `Awaiting Publication (${awaitingList.length})` },
          { key: "published", label: `Published – Edit (${publishedList.length})` },
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
              <div style={{ minWidth: 0, flex: "1 1 280px", wordBreak: "break-word" }}>
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
                {activeTab === "published" && (
                  <small style={{ color: "#6b7280" }}>
                    Published {m.publishedDate ? new Date(m.publishedDate).toLocaleDateString() : ""} · {m.views ?? 0} views · {m.downloads ?? 0} downloads
                  </small>
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

                {activeTab === "published" && (
                  <>
                    <button
                      onClick={() => downloadFile(m.publicationFile, `published_${m.manuscriptId}`)}
                      style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151" }}
                    >
                      <Download size={16} /> PDF
                    </button>
                    <button
                      onClick={() => openPublishedModal(m)}
                      style={{ ...buttonStyle, background: "#0d6efd", color: "#fff" }}
                    >
                      <Save size={16} /> Edit / Republish
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Assign Payment */}
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
              Amount ($USD) – optional, for your reference only (will be included in author email):
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
              Payment Instructions / Letter (you can edit the pre‑filled template):
              <textarea
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                rows={8}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  outline: "none",
                  fontFamily: "inherit",
                }}
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

      {/* Modal for Galley Proof */}
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
              <Paperclip size={16} /> Attach Document <span style={{ color: "#dc2626" }}>(required)</span>:
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

              {/* Approve button – enabled for withAuthor or awaitingReview */}
              {(() => {
                const canApprove = selectedManuscript.galleyProofStatus === "withAuthor" || selectedManuscript.galleyProofStatus === "awaitingReview";
                const daysSince = getDaysSinceGalleySent(selectedManuscript.galleyProofCreatedAt);
                const isProcessing = submittingForPublication === selectedManuscript.id;
                return (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {daysSince !== null && (
                      <span style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                        {daysSince === 0 ? "Sent today" : `Sent ${daysSince} day${daysSince > 1 ? "s" : ""} ago`}
                      </span>
                    )}
                    <button
                      disabled={!canApprove || isProcessing}
                      onClick={() => submitForPublication(selectedManuscript)}
                      style={{
                        ...buttonStyle,
                        background: canApprove && !isProcessing ? "#10b981" : "#9ca3af",
                        color: "#fff",
                        cursor: canApprove && !isProcessing ? "pointer" : "not-allowed",
                      }}
                    >
                      {isProcessing ? <Spinner /> : <CheckCircle size={16} />}
                      {isProcessing ? "Submitting..." : "Submit for Publication"}
                    </button>
                    {!canApprove && selectedManuscript.galleyProofStatus !== "approved" && (
                      <span style={{ fontSize: "11px", color: "#dc2626", marginTop: "2px" }}>
                        (Only for manuscripts sent to author or with author reply)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal for Awaiting Publication */}
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

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => { setEditTitle(e.target.value); lockSaved(selectedManuscript.id); }}
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
                onChange={(e) => { setEditAuthors(e.target.value); lockSaved(selectedManuscript.id); }}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
                placeholder="Enter author names"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "6px" }}>Keywords</label>
              <input
                type="text"
                value={editKeywords}
                onChange={(e) => { setEditKeywords(e.target.value); lockSaved(selectedManuscript.id); }}
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
                onChange={(e) => { setEditStudyType(e.target.value); lockSaved(selectedManuscript.id); }}
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
                onChange={(e) => { setEditAbstract(e.target.value); lockSaved(selectedManuscript.id); }}
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
                onChange={(e) => { setEditObjective(e.target.value); lockSaved(selectedManuscript.id); }}
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
                onChange={(e) => { setEditMethods(e.target.value); lockSaved(selectedManuscript.id); }}
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
                onChange={(e) => { setEditResults(e.target.value); lockSaved(selectedManuscript.id); }}
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
                onChange={(e) => { setEditConclusion(e.target.value); lockSaved(selectedManuscript.id); }}
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
            {(() => {
              const isSaved = savedManuscriptId === selectedManuscript.id;
              const canPublish = isSaved && !!publicationFile && !publicationUploading && publishingFromAwaiting !== selectedManuscript.id;
              return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <button
                    onClick={() => publishFromAwaiting(selectedManuscript)}
                    disabled={!canPublish}
                    style={{
                      ...buttonStyle,
                      background: canPublish ? "#16a34a" : "#9ca3af",
                      color: "#fff",
                      cursor: canPublish ? "pointer" : "not-allowed",
                    }}
                  >
                    {publicationUploading ? <Spinner /> : <CheckCircle size={16} />}
                    {publicationUploading ? "Publishing..." : "Publish"}
                  </button>
                  {!isSaved && (
                    <span style={{ fontSize: "11px", color: "#dc2626", marginTop: "2px", textAlign: "center" }}>
                      Save publication data before publishing
                    </span>
                  )}
                </div>
              );
            })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================== Edit / Republish Published Manuscript Modal ==================== */}
      {showPublishedModal && editingPublished && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
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
              width: "620px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ marginBottom: "4px" }}>
              Edit Published: {editingPublished.manuscriptId}
            </h3>
            <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "16px" }}>
              Update the metadata or replace the published PDF and republish. The author will be notified.
            </p>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Account Author</label>
                <input type="text" value={editingPublished.authorName || ""} disabled
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e5e7eb", background: "#f9fafb" }} />
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>All Authors (display)</label>
                <input type="text" value={editAuthors} onChange={(e) => setEditAuthors(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Study Type</label>
                <input type="text" value={editStudyType} onChange={(e) => setEditStudyType(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Keywords</label>
                <input type="text" value={editKeywords} onChange={(e) => setEditKeywords(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Abstract</label>
              <textarea value={editAbstract} onChange={(e) => setEditAbstract(e.target.value)} rows={4}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Objective</label>
                <textarea value={editObjective} onChange={(e) => setEditObjective(e.target.value)} rows={2}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Conclusion</label>
                <textarea value={editConclusion} onChange={(e) => setEditConclusion(e.target.value)} rows={2}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Methods</label>
                <textarea value={editMethods} onChange={(e) => setEditMethods(e.target.value)} rows={2}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Results</label>
                <textarea value={editResults} onChange={(e) => setEditResults(e.target.value)} rows={2}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px", cursor: "pointer" }}>
                  Replace Publication PDF (optional):
                  <input type="file" accept="application/pdf" onChange={handlePublishedFileChange} style={{ marginTop: "6px", display: "block" }} />
                </label>
                {publishedFile && <small style={{ color: "#10b981" }}>New file: {publishedFile.name}</small>}
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Republication Date (optional)</label>
                <input type="date" value={publishedPublishedAt} onChange={(e) => setPublishedPublishedAt(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                onClick={() => { setShowPublishedModal(false); setEditingPublished(null); }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  background: "#f3f4f6",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={savePublishedChanges}
                disabled={savingPublished || publishedUploading}
                style={{
                  ...buttonStyle,
                  background: savingPublished || publishedUploading ? "#9ca3af" : "#0d6efd",
                  color: "#fff",
                  cursor: savingPublished || publishedUploading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {(savingPublished || publishedUploading) ? <Spinner /> : <Save size={16} />}
                {publishedUploading ? "Uploading..." : savingPublished ? "Saving..." : "Save & Republish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Offline Publication Sync Modal ==================== */}
      {showOfflineModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
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
              width: "620px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ marginBottom: "4px" }}>Sync Offline Publication</h3>
            <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "16px" }}>
              Use this when a manuscript was reviewed, accepted and published outside the system (offline). It creates a
              fully synced published record — select the author, handling editor and reviewer so everything links up.
            </p>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Title *</label>
              <input
                type="text"
                value={offlineForm.title}
                onChange={(e) => setOfflineForm({ ...offlineForm, title: e.target.value })}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                placeholder="Manuscript title"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Author (account) *</label>
                <select
                  value={offlineForm.author_id}
                  onChange={(e) => setOfflineForm({ ...offlineForm, author_id: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                >
                  <option value="">— Select author —</option>
                  {userLists.authors.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Handling Editor (optional)</label>
                <select
                  value={offlineForm.editor_id}
                  onChange={(e) => setOfflineForm({ ...offlineForm, editor_id: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                >
                  <option value="">— None —</option>
                  {userLists.editors.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Reviewer (optional)</label>
                <select
                  value={offlineForm.reviewer_id}
                  onChange={(e) => setOfflineForm({ ...offlineForm, reviewer_id: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                >
                  <option value="">— None —</option>
                  {userLists.reviewers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Publication Date (optional)</label>
                <input
                  type="date"
                  value={offlineForm.published_at}
                  onChange={(e) => setOfflineForm({ ...offlineForm, published_at: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>All Authors (display string)</label>
              <input
                type="text"
                value={offlineForm.authors}
                onChange={(e) => setOfflineForm({ ...offlineForm, authors: e.target.value })}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                placeholder="e.g., Dr A. Bello, Prof. C. Okonkwo"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Study Type</label>
                <input
                  type="text"
                  value={offlineForm.study_type}
                  onChange={(e) => setOfflineForm({ ...offlineForm, study_type: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  placeholder="e.g., Original Research, Case Report"
                />
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Keywords</label>
                <input
                  type="text"
                  value={offlineForm.keywords}
                  onChange={(e) => setOfflineForm({ ...offlineForm, keywords: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                  placeholder="comma-separated"
                />
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Abstract</label>
              <textarea
                value={offlineForm.abstract}
                onChange={(e) => setOfflineForm({ ...offlineForm, abstract: e.target.value })}
                rows={3}
                style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Objective</label>
                <textarea
                  value={offlineForm.objective}
                  onChange={(e) => setOfflineForm({ ...offlineForm, objective: e.target.value })}
                  rows={2}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Conclusion</label>
                <textarea
                  value={offlineForm.conclusion}
                  onChange={(e) => setOfflineForm({ ...offlineForm, conclusion: e.target.value })}
                  rows={2}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Methods</label>
                <textarea
                  value={offlineForm.methods}
                  onChange={(e) => setOfflineForm({ ...offlineForm, methods: e.target.value })}
                  rows={2}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 500, display: "block", marginBottom: "4px" }}>Results</label>
                <textarea
                  value={offlineForm.results}
                  onChange={(e) => setOfflineForm({ ...offlineForm, results: e.target.value })}
                  rows={2}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontWeight: 500, display: "block", marginBottom: "4px", cursor: "pointer" }}>
                Final Publication PDF * (PDF only):
                <input type="file" accept="application/pdf" onChange={handleOfflineFileChange} style={{ marginTop: "6px", display: "block" }} />
              </label>
              {offlineFile && <small style={{ color: "#10b981" }}>Selected: {offlineFile.name}</small>}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
              <button
                onClick={() => setShowOfflineModal(false)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  background: "#f3f4f6",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleOfflinePublish}
                disabled={offlineSaving || offlineUploading}
                style={{
                  ...buttonStyle,
                  background: offlineSaving || offlineUploading ? "#9ca3af" : "#7c3aed",
                  color: "#fff",
                  cursor: offlineSaving || offlineUploading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {(offlineSaving || offlineUploading) ? <Spinner /> : <CheckCircle size={16} />}
                {offlineUploading ? "Uploading..." : offlineSaving ? "Syncing..." : "Sync & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Publication;
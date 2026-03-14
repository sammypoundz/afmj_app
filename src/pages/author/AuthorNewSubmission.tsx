import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = "https://afmjonline.com/api/authorApi.php";

// Helper to convert string to title case (capitalize first letter of each word)
const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const styles = {
  page: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "24px 16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    color: "#16a34a",
    transition: "all 0.2s",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 600,
    color: "#0f172a",
    margin: 0,
  },
  stepIndicator: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "32px",
    position: "relative" as const,
  },
  stepItem: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    flex: 1,
    textAlign: "center" as const,
    zIndex: 2,
    background: "#fff",
  },
  stepCircle: (active: boolean, completed: boolean) => ({
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: completed
      ? "#16a34a"
      : active
      ? "#fff"
      : "#f1f5f9",
    border: active ? "2px solid #16a34a" : "none",
    color: completed ? "#fff" : active ? "#16a34a" : "#64748b",
    fontWeight: 600,
    marginBottom: "8px",
  }),
  stepLabel: (active: boolean, completed: boolean) => ({
    fontSize: "0.8rem",
    fontWeight: active || completed ? 600 : 400,
    color: active ? "#16a34a" : completed ? "#0f172a" : "#64748b",
  }),
  stepLine: {
    position: "absolute" as const,
    top: 20,
    left: 0,
    right: 0,
    height: 2,
    background: "#e2e8f0",
    zIndex: 1,
  },
  form: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    marginBottom: "20px",
  },
  label: {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "#1e293b",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
    transition: "border 0.2s",
    outline: "none",
  },
  textarea: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
    resize: "vertical" as const,
    minHeight: "120px",
    fontFamily: "inherit",
  },
  select: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
    background: "#fff",
  },
  fileArea: {
    border: "2px dashed #e2e8f0",
    borderRadius: "8px",
    padding: "20px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  fileName: {
    marginTop: "8px",
    fontSize: "0.9rem",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  buttonGroup: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "24px",
  },
  nextButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "40px",
    fontSize: "1rem",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "background 0.2s",
  },
  prevButton: {
    background: "#fff",
    color: "#1e293b",
    border: "1px solid #e2e8f0",
    padding: "12px 24px",
    borderRadius: "40px",
    fontSize: "1rem",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "background 0.2s",
  },
  submitButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "40px",
    fontSize: "1rem",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "background 0.2s",
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  previewSection: {
    marginTop: 16,
    padding: 16,
    background: "#f8fafc",
    borderRadius: "8px",
  },
  previewTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginBottom: 12,
    color: "#0f172a",
  },
  previewItem: {
    marginBottom: 8,
  },
  previewLabel: {
    fontWeight: 500,
    color: "#475569",
    marginRight: 8,
  },
  previewValue: {
    color: "#0f172a",
  },
};

const steps = [
  { label: "Basic Info", key: "basic" },
  { label: "Content", key: "content" },
  { label: "Files", key: "files" },
  { label: "Review", key: "review" },
];

const AuthorNewSubmission = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    study_type: "Health Informatics",
    background: "",
    objective: "",
    methods: "",          // new
    results: "",          // new
    conclusion: "",
    co_authors: "",
  });
  const [manuscriptFile, setManuscriptFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const manuscriptInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Convert title to title case when user leaves the field
  const handleTitleBlur = () => {
    if (formData.title.trim()) {
      setFormData({ ...formData, title: toTitleCase(formData.title) });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "manuscript" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === "manuscript") setManuscriptFile(file);
      else setCoverLetter(file);
    }
  };

  const removeFile = (type: "manuscript" | "cover") => {
    if (type === "manuscript") {
      setManuscriptFile(null);
      if (manuscriptInputRef.current) manuscriptInputRef.current.value = "";
    } else {
      setCoverLetter(null);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const goToNextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 0) {
      if (!formData.title.trim()) {
        toast.error("Title is required");
        return;
      }
    }
    if (currentStep === 1) {
      if (!formData.abstract.trim()) {
        toast.error("Abstract is required");
        return;
      }
      // Methods and results are optional
    }
    if (currentStep === 2) {
      if (!manuscriptFile) {
        toast.error("Manuscript file is required");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goToPrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    // Final validation
    if (!formData.title.trim()) {
      toast.error("Title is required");
      setCurrentStep(0);
      return;
    }
    if (!formData.abstract.trim()) {
      toast.error("Abstract is required");
      setCurrentStep(1);
      return;
    }
    if (!manuscriptFile) {
      toast.error("Manuscript file is required");
      setCurrentStep(2);
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Submitting manuscript...");

    const data = new FormData();
    data.append("title", formData.title);
    data.append("abstract", formData.abstract);
    data.append("study_type", formData.study_type);
    data.append("background", formData.background);
    data.append("objective", formData.objective);
    data.append("methods", formData.methods);      // new
    data.append("results", formData.results);      // new
    data.append("conclusion", formData.conclusion);
    data.append("co_authors", formData.co_authors);
    data.append("manuscript_file", manuscriptFile);
    if (coverLetter) data.append("cover_letter", coverLetter);

    try {
      const res = await fetch(`${API_BASE}?action=submitManuscript`, {
        method: "POST",
        body: data,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Submission failed");
      }

      toast.success("Manuscript submitted successfully!", { id: toastId });
      setTimeout(() => navigate("/author/submissions"), 1500);
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
      setLoading(false);
    }
  };

  const goBack = () => navigate(-1);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                onBlur={handleTitleBlur}
                placeholder="Enter manuscript title"
                style={styles.input}
                disabled={loading}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Journal Section *</label>
              <select
                name="study_type"
                value={formData.study_type}
                onChange={handleInputChange}
                style={styles.select}
                disabled={loading}
              >
                <option>Health Informatics</option>
                <option>Public Health</option>
                <option>Clinical Research</option>
                <option>Systematic Review</option>
                <option>Original Research</option>
              </select>
            </div>
          </>
        );
      case 1:
        return (
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Abstract *</label>
              <textarea
                name="abstract"
                value={formData.abstract}
                onChange={handleInputChange}
                placeholder="Enter abstract (max 300 words)"
                style={styles.textarea}
                disabled={loading}
              />
            </div>
            <div style={styles.row}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Background (optional)</label>
                <textarea
                  name="background"
                  value={formData.background}
                  onChange={handleInputChange}
                  placeholder="Background"
                  style={styles.textarea}
                  disabled={loading}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Objective (optional)</label>
                <textarea
                  name="objective"
                  value={formData.objective}
                  onChange={handleInputChange}
                  placeholder="Objective"
                  style={styles.textarea}
                  disabled={loading}
                />
              </div>
            </div>
            <div style={styles.row}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Methods (optional)</label>
                <textarea
                  name="methods"
                  value={formData.methods}
                  onChange={handleInputChange}
                  placeholder="Methods"
                  style={styles.textarea}
                  disabled={loading}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Results (optional)</label>
                <textarea
                  name="results"
                  value={formData.results}
                  onChange={handleInputChange}
                  placeholder="Results"
                  style={styles.textarea}
                  disabled={loading}
                />
              </div>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Conclusion (optional)</label>
              <textarea
                name="conclusion"
                value={formData.conclusion}
                onChange={handleInputChange}
                placeholder="Conclusion"
                style={styles.textarea}
                disabled={loading}
              />
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Manuscript File *</label>
              <input
                type="file"
                ref={manuscriptInputRef}
                onChange={(e) => handleFileChange(e, "manuscript")}
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                disabled={loading}
              />
              {!manuscriptFile ? (
                <div
                  style={styles.fileArea}
                  onClick={() => manuscriptInputRef.current?.click()}
                >
                  <Upload size={24} color="#94a3b8" />
                  <p style={{ margin: "8px 0 0", color: "#64748b" }}>
                    Click to upload manuscript (PDF, DOC, DOCX)
                  </p>
                </div>
              ) : (
                <div style={styles.fileName}>
                  <FileText size={16} />
                  <span>{manuscriptFile.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile("manuscript")}
                    style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "8px" }}
                  >
                    <X size={16} color="#dc2626" />
                  </button>
                </div>
              )}
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Cover Letter (optional)</label>
              <input
                type="file"
                ref={coverInputRef}
                onChange={(e) => handleFileChange(e, "cover")}
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: "none" }}
                disabled={loading}
              />
              {!coverLetter ? (
                <div
                  style={styles.fileArea}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Upload size={24} color="#94a3b8" />
                  <p style={{ margin: "8px 0 0", color: "#64748b" }}>
                    Click to upload cover letter (optional)
                  </p>
                </div>
              ) : (
                <div style={styles.fileName}>
                  <FileText size={16} />
                  <span>{coverLetter.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile("cover")}
                    style={{ background: "none", border: "none", cursor: "pointer", marginLeft: "8px" }}
                  >
                    <X size={16} color="#dc2626" />
                  </button>
                </div>
              )}
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Co-Authors</label>
              <input
                type="text"
                name="co_authors"
                value={formData.co_authors}
                onChange={handleInputChange}
                placeholder="Add co-authors separated by commas (optional)"
                style={styles.input}
                disabled={loading}
              />
            </div>
            <div style={styles.previewSection}>
              <h4 style={styles.previewTitle}>Review Your Submission</h4>
              <div style={styles.previewItem}>
                <span style={styles.previewLabel}>Title:</span>
                <span style={styles.previewValue}>{formData.title}</span>
              </div>
              <div style={styles.previewItem}>
                <span style={styles.previewLabel}>Section:</span>
                <span style={styles.previewValue}>{formData.study_type}</span>
              </div>
              <div style={styles.previewItem}>
                <span style={styles.previewLabel}>Abstract:</span>
                <span style={styles.previewValue}>{formData.abstract.substring(0, 150)}...</span>
              </div>
              <div style={styles.previewItem}>
                <span style={styles.previewLabel}>Background:</span>
                <span style={styles.previewValue}>{formData.background || "—"}</span>
              </div>
              <div style={styles.previewItem}>
                <span style={styles.previewLabel}>Objective:</span>
                <span style={styles.previewValue}>{formData.objective || "—"}</span>
              </div>
              <div style={styles.previewItem}>
                <span style={styles.previewLabel}>Methods:</span>
                <span style={styles.previewValue}>{formData.methods || "—"}</span>
              </div>
              <div style={styles.previewItem}>
                <span style={styles.previewLabel}>Results:</span>
                <span style={styles.previewValue}>{formData.results || "—"}</span>
              </div>
              <div style={styles.previewItem}>
                <span style={styles.previewLabel}>Conclusion:</span>
                <span style={styles.previewValue}>{formData.conclusion || "—"}</span>
              </div>
              <div style={styles.previewItem}>
                <span style={styles.previewLabel}>Manuscript:</span>
                <span style={styles.previewValue}>{manuscriptFile?.name}</span>
              </div>
              {coverLetter && (
                <div style={styles.previewItem}>
                  <span style={styles.previewLabel}>Cover letter:</span>
                  <span style={styles.previewValue}>{coverLetter.name}</span>
                </div>
              )}
              {formData.co_authors && (
                <div style={styles.previewItem}>
                  <span style={styles.previewLabel}>Co-authors:</span>
                  <span style={styles.previewValue}>{formData.co_authors}</span>
                </div>
              )}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.page}>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <div style={styles.header}>
        <button
          onClick={goBack}
          style={styles.backButton}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={styles.title}>New Submission</h1>
      </div>

      {/* Step Indicator */}
      <div style={styles.stepIndicator}>
        <div style={styles.stepLine} />
        {steps.map((step, index) => {
          const active = index === currentStep;
          const completed = index < currentStep;
          return (
            <div key={step.key} style={styles.stepItem}>
              <div style={styles.stepCircle(active, completed)}>
                {completed ? <CheckCircle size={20} /> : index + 1}
              </div>
              <span style={styles.stepLabel(active, completed)}>{step.label}</span>
            </div>
          );
        })}
      </div>

      <form onSubmit={(e) => e.preventDefault()} style={styles.form} encType="multipart/form-data">
        {renderStep()}

        <div style={styles.buttonGroup}>
          {currentStep > 0 && (
            <button
              type="button"
              onClick={goToPrevStep}
              style={styles.prevButton}
              disabled={loading}
            >
              <ChevronLeft size={18} />
              Previous
            </button>
          )}
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={goToNextStep}
              style={styles.nextButton}
              disabled={loading}
            >
              Next
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitButtonDisabled : {}),
              }}
            >
              {loading ? "Submitting..." : "Submit Manuscript"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AuthorNewSubmission;
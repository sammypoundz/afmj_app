import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, User, Mail, Building, Fingerprint } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = "https://afmjonline.com/api/authorApi.php";

interface ProfileData {
  id: number;
  name: string;
  email: string;
  institution: string | null;
  orcid: string | null;
}

const styles = {
  page: {
    maxWidth: "600px",
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
  form: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "0.9rem",
    fontWeight: 500,
    color: "#1e293b",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "0.95rem",
    transition: "border 0.2s",
    outline: "none",
    width: "100%",
  },
  inputWrapper: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute" as const,
    left: "12px",
    color: "#94a3b8",
  },
  inputWithIcon: {
    paddingLeft: "40px",
  },
  submitButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "14px",
    borderRadius: "40px",
    fontSize: "1rem",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "background 0.2s",
    marginTop: "8px",
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  spinner: {
    width: 20,
    height: 20,
    border: "3px solid #ffffff30",
    borderTop: "3px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

const AuthorProfile = () => {
  const navigate = useNavigate();
  const [setProfile] = useState<ProfileData | null>(null); // ✅ fixed
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    institution: "",
    orcid: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}?action=getProfile`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load profile");
      }
      const data = await res.json();
      setProfile(data);                // ✅ now works
      setFormData({
        name: data.name || "",
        email: data.email || "",
        institution: data.institution || "",
        orcid: data.orcid || "",
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      toast.error("Please enter a valid email");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Updating profile...");

    try {
      const res = await fetch(`${API_BASE}?action=updateProfile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Update failed");
      }

      toast.success("Profile updated successfully!", { id: toastId });
      fetchProfile(); // refresh data
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => navigate(-1);

  if (loading) {
    return (
      <div style={styles.page}>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
        <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
          <div style={{
            width: 40,
            height: 40,
            border: "4px solid #16a34a20",
            borderTop: "4px solid #16a34a",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
        </div>
      </div>
    );
  }

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
        <h1 style={styles.title}>My Profile</h1>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Full Name */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            <User size={16} />
            Full Name *
          </label>
          <div style={styles.inputWrapper}>
            <User size={16} style={styles.inputIcon} />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              style={{ ...styles.input, ...styles.inputWithIcon }}
              disabled={saving}
              required
            />
          </div>
        </div>

        {/* Email */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            <Mail size={16} />
            Email *
          </label>
          <div style={styles.inputWrapper}>
            <Mail size={16} style={styles.inputIcon} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              style={{ ...styles.input, ...styles.inputWithIcon }}
              disabled={saving}
              required
            />
          </div>
        </div>

        {/* Institution */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            <Building size={16} />
            Institution
          </label>
          <div style={styles.inputWrapper}>
            <Building size={16} style={styles.inputIcon} />
            <input
              type="text"
              name="institution"
              value={formData.institution}
              onChange={handleInputChange}
              placeholder="e.g., University of Cape Town"
              style={{ ...styles.input, ...styles.inputWithIcon }}
              disabled={saving}
            />
          </div>
        </div>

        {/* ORCID ID */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            <Fingerprint size={16} />
            ORCID ID
          </label>
          <div style={styles.inputWrapper}>
            <Fingerprint size={16} style={styles.inputIcon} />
            <input
              type="text"
              name="orcid"
              value={formData.orcid}
              onChange={handleInputChange}
              placeholder="e.g., 0000-0002-1825-0097"
              style={{ ...styles.input, ...styles.inputWithIcon }}
              disabled={saving}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            ...styles.submitButton,
            ...(saving ? styles.submitButtonDisabled : {}),
          }}
          onMouseEnter={(e) => !saving && (e.currentTarget.style.background = "#0d9488")}
          onMouseLeave={(e) => !saving && (e.currentTarget.style.background = "#16a34a")}
        >
          {saving ? (
            <>
              <span style={styles.spinner} />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Changes
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default AuthorProfile;
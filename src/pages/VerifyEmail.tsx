import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const VERIFY_API = "https://vinosschool.com/api/register.php";
const STATUS_API = "https://vinosschool.com/api/verify_status.php";

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const { authFetch } = useAuth();  // removed 'logout'
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch the user's email from the verification status API
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await authFetch(STATUS_API);
        if (res.ok) {
          const data = await res.json();
          if (data.email_verified) {
            toast.success("Your email is already verified.");
            navigate("/eic/dashboard");
            return;
          }
          setEmail(data.email);
        } else {
          toast.error("Could not load verification status.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error loading status.");
      } finally {
        setVerificationLoading(false);
      }
    };
    fetchStatus();
  }, [authFetch, navigate]);

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }
    setError("");
    setLoading(true);
    const toastId = toast.loading("Verifying OTP...");

    try {
      const res = await authFetch(`${VERIFY_API}?action=verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid server response");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Verification failed");
      }

      toast.success("Email verified successfully!", { id: toastId });
      // Redirect to dashboard or profile
      setTimeout(() => navigate("/eic/dashboard"), 1000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message, { id: toastId });
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const toastId = toast.loading("Resending OTP...");
    try {
      const res = await authFetch(`${VERIFY_API}?action=resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Resend failed");
      }
      toast.success("A new OTP has been sent.", { id: toastId });
    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    }
  };

  if (verificationLoading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Verify Your Email</h2>
        <p style={styles.subtitle}>
          We sent a 6‑digit OTP to <strong>{email}</strong>.
          <br />
          Enter it below to complete your verification.
        </p>

        <div style={styles.inputGroup}>
          <label htmlFor="otp" style={styles.label}>OTP Code</label>
          <input
            type="text"
            id="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Enter 6-digit OTP"
            style={styles.input}
            disabled={loading}
            maxLength={6}
            autoFocus
          />
          {error && <span style={styles.error}>{error}</span>}
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
          <button
            onClick={handleVerify}
            style={{
              ...styles.button,
              flex: 1,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <button
            onClick={handleResend}
            style={{
              background: "transparent",
              border: "none",
              color: "#16a34a",
              fontWeight: 500,
              cursor: "pointer",
              fontSize: "0.9rem",
              textDecoration: "underline",
            }}
            disabled={loading}
          >
            Resend OTP
          </button>
        </div>

        <p style={{ marginTop: "20px", fontSize: "0.9rem", color: "#6b7280" }}>
          Already verified?{" "}
          <button
            onClick={() => navigate("/eic/dashboard")}
            style={{ background: "none", border: "none", color: "#0d6efd", cursor: "pointer", textDecoration: "underline" }}
          >
            Go to Dashboard
          </button>
        </p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#f9fafb",
    padding: "20px",
  },
  card: {
    background: "#ffffff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "420px",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 600,
    color: "#16a34a",
    textAlign: "center",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "0.95rem",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: "24px",
    lineHeight: 1.5,
  },
  inputGroup: {
    marginBottom: "18px",
  },
  label: {
    display: "block",
    fontWeight: 500,
    fontSize: "0.9rem",
    color: "#1e293b",
    marginBottom: "4px",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    backgroundColor: "#f8fafc",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  error: {
    display: "block",
    marginTop: "4px",
    color: "#dc2626",
    fontSize: "0.8rem",
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    border: "none",
    borderRadius: "40px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
    marginTop: "6px",
  },
};

export default VerifyEmail;
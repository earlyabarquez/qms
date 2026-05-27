import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { login } from "../utils/auth";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [firebaseError, setFirebaseError] = useState("");
  const navigate = useNavigate();

  const onSubmit = async ({ email, password }) => {
    setFirebaseError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setFirebaseError(friendlyError(err.code));
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftContent}>

          {/* Big playful logo */}
          <div style={styles.logoBounce}>
            <img
              src="/src/assets/quizbee_logo.png"
              alt="QuizBee logo"
              style={styles.logoImg}
            />
          </div>

          {/* Playful title */}
          <h2 style={styles.leftTitle}>
            Quiz<span style={styles.bee}>Bee</span>
          </h2>

          {/* Playful tagline */}
          <p style={styles.leftSub}>
            <span style={styles.tagEmoji}>✨</span>
            {" "}Bee curious.{" "}
            <span style={styles.tagHighlight}>Bee smart.</span>
            {" "}Bee unstoppable!{" "}
            <span style={styles.tagEmoji}>🚀</span>
          </p>

          <div style={styles.dots}>
            <span style={{ ...styles.dot, background: "#fbbf24" }} />
            <span style={{ ...styles.dot, background: "#a78bfa", width: 10, height: 10 }} />
            <span style={{ ...styles.dot, background: "#fbbf24" }} />
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <h1 style={styles.title}>Welcome back!</h1>
          <p style={styles.subtitle}>Sign in to continue to QuizBee</p>

          <form onSubmit={handleSubmit(onSubmit)} style={styles.form} noValidate>
            <div style={styles.field}>
              <label style={styles.label}>Email address</label>
              <div style={inputWrapStyle(!!errors.email)}>
                <Mail size={16} color="#9ca3af" strokeWidth={2} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  style={styles.input}
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email" },
                  })}
                />
              </div>
              {errors.email && <span style={styles.error}>{errors.email.message}</span>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={inputWrapStyle(!!errors.password)}>
                <Lock size={16} color="#9ca3af" strokeWidth={2} />
                <input
                  type="password"
                  placeholder="••••••••"
                  style={styles.input}
                  {...register("password", { required: "Password is required" })}
                />
              </div>
              {errors.password && <span style={styles.error}>{errors.password.message}</span>}
            </div>

            {firebaseError && <div style={styles.firebaseError}>{firebaseError}</div>}

            <button type="submit" style={styles.btn} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <>Let's go! <ArrowRight size={16} strokeWidth={2.5} /></>
              )}
            </button>
          </form>

          <p style={styles.footer}>
            Don't have an account?{" "}
            <Link to="/register" style={styles.link}>Create account</Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-14px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
}

function friendlyError(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function inputWrapStyle(hasError) {
  return {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "0 14px", borderRadius: "10px",
    border: `1.5px solid ${hasError ? "#ef4444" : "#e5e7eb"}`,
    background: "#fafafa",
    transition: "border-color 0.15s",
  };
}

const styles = {
  page: {
    minHeight: "100vh", display: "flex", background: "#fff",
  },
  left: {
    flex: "0 0 45%", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(145deg, #312e81, #4338ca, #6366f1)",
    padding: "3rem",
  },
  leftContent: {
    maxWidth: "360px", textAlign: "center",
  },
  logoBounce: {
    animation: "float 3s ease-in-out infinite",
    display: "inline-block",
    marginBottom: "24px",
    filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.3))",
  },
  logoImg: {
    width: "200px",
    height: "200px",
    objectFit: "contain",
  },
  leftTitle: {
    fontSize: "38px", fontWeight: "800", color: "#fff",
    margin: "0 0 14px", letterSpacing: "-0.02em",
  },
  bee: {
    color: "#fbbf24",
    textShadow: "0 2px 12px rgba(251,191,36,0.5)",
  },
  leftSub: {
    fontSize: "17px", color: "rgba(255,255,255,0.9)",
    lineHeight: "1.7", margin: "0 0 28px", fontWeight: "500",
  },
  tagEmoji: {
    fontSize: "20px",
  },
  tagHighlight: {
    color: "#fbbf24",
    fontWeight: "700",
  },
  dots: { display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" },
  dot: { width: "8px", height: "8px", borderRadius: "50%" },
  right: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    padding: "2rem",
  },
  card: { width: "100%", maxWidth: "400px" },
  title: {
    fontSize: "24px", fontWeight: "700", color: "#111827",
    margin: "0 0 6px", letterSpacing: "-0.02em",
  },
  subtitle: { fontSize: "14px", color: "#6b7280", margin: "0 0 2rem" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  input: {
    flex: 1, border: "none", outline: "none", background: "transparent",
    fontSize: "14px", padding: "12px 0", color: "#111827",
  },
  error: { fontSize: "12px", color: "#ef4444", fontWeight: "500" },
  firebaseError: {
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: "10px", padding: "12px 14px",
    fontSize: "13px", color: "#991b1b",
  },
  btn: {
    width: "100%", padding: "12px", fontSize: "15px", fontWeight: "700",
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff", border: "none", borderRadius: "10px",
    cursor: "pointer", marginTop: "6px",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    boxShadow: "0 2px 10px rgba(79,70,229,0.3)",
    transition: "all 0.15s",
  },
  footer: {
    textAlign: "center", fontSize: "14px", color: "#6b7280", marginTop: "2rem",
  },
  link: {
    color: "#4f46e5", textDecoration: "none", fontWeight: "600",
  },
};
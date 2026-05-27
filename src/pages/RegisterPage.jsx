import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { register as registerUser } from "../utils/auth";
import {
  ClipboardList, Mail, Lock, User, ArrowRight, Loader2,
  GraduationCap, BookOpen,
} from "lucide-react";

export default function RegisterPage() {
  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { role: "student" } });

  const [firebaseError, setFirebaseError] = useState("");
  const navigate = useNavigate();
  const selectedRole = watch("role");

  const onSubmit = async ({ name, email, password, role }) => {
    setFirebaseError("");
    try {
      await registerUser(email, password, name, role);
      navigate("/");
    } catch (err) {
      setFirebaseError(friendlyError(err.code));
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.logoMark}>
            <ClipboardList size={28} color="#fff" strokeWidth={2.5} />
          </div>
          <h2 style={styles.leftTitle}>Join QuizApp</h2>
          <p style={styles.leftSub}>
            Get started as a teacher or student — create quizzes, take assessments, and track your progress.
          </p>
          <div style={styles.dots}>
            <span style={{ ...styles.dot, background: "#818cf8" }} />
            <span style={{ ...styles.dot, background: "#a78bfa" }} />
            <span style={{ ...styles.dot, background: "#c4b5fd" }} />
          </div>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>Choose your role and get started</p>

          <form onSubmit={handleSubmit(onSubmit)} style={styles.form} noValidate>
            {/* Role selector */}
            <div style={styles.field}>
              <label style={styles.label}>I am a…</label>
              <div style={styles.roleRow}>
                {[
                  { value: "student", label: "Student", Icon: GraduationCap },
                  { value: "teacher", label: "Teacher", Icon: BookOpen },
                ].map(({ value, label, Icon }) => {
                  const active = selectedRole === value;
                  return (
                    <label key={value} style={roleCardStyle(active)}>
                      <input
                        type="radio" value={value}
                        style={{ display: "none" }}
                        {...register("role")}
                      />
                      <div style={roleIconStyle(active)}>
                        <Icon size={20} strokeWidth={2} />
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: active ? "#4338ca" : "#374151" }}>
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Full name</label>
              <div style={inputWrapStyle(!!errors.name)}>
                <User size={16} color="#9ca3af" strokeWidth={2} />
                <input
                  type="text" placeholder="Jane Smith" style={styles.input}
                  {...register("name", { required: "Name is required" })}
                />
              </div>
              {errors.name && <span style={styles.error}>{errors.name.message}</span>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email address</label>
              <div style={inputWrapStyle(!!errors.email)}>
                <Mail size={16} color="#9ca3af" strokeWidth={2} />
                <input
                  type="email" placeholder="you@example.com" style={styles.input}
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
                  type="password" placeholder="At least 6 characters" style={styles.input}
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "Minimum 6 characters" },
                  })}
                />
              </div>
              {errors.password && <span style={styles.error}>{errors.password.message}</span>}
            </div>

            {firebaseError && <div style={styles.firebaseError}>{firebaseError}</div>}

            <button type="submit" style={styles.btn} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <>Create account <ArrowRight size={16} strokeWidth={2.5} /></>
              )}
            </button>
          </form>

          <p style={styles.footer}>
            Already have an account?{" "}
            <Link to="/login" style={styles.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function friendlyError(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/weak-password":
      return "Password is too weak.";
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
  };
}

function roleCardStyle(active) {
  return {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    gap: "8px", padding: "18px 10px", borderRadius: "12px", cursor: "pointer",
    border: `2px solid ${active ? "#6366f1" : "#e5e7eb"}`,
    background: active ? "#eef2ff" : "#fff",
    transition: "all 0.15s",
  };
}

function roleIconStyle(active) {
  return {
    width: "44px", height: "44px", borderRadius: "12px",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: active ? "#4f46e5" : "#f3f4f6",
    color: active ? "#fff" : "#6b7280",
    transition: "all 0.15s",
  };
}

const styles = {
  page: { minHeight: "100vh", display: "flex", background: "#fff" },
  left: {
    flex: "0 0 45%", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(145deg, #312e81, #4338ca, #6366f1)",
    padding: "3rem",
  },
  leftContent: { maxWidth: "360px", textAlign: "center" },
  logoMark: {
    width: "56px", height: "56px", borderRadius: "16px",
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 20px", backdropFilter: "blur(8px)",
  },
  leftTitle: {
    fontSize: "28px", fontWeight: "700", color: "#fff",
    margin: "0 0 10px", letterSpacing: "-0.02em",
  },
  leftSub: {
    fontSize: "15px", color: "rgba(255,255,255,0.75)",
    lineHeight: "1.6", margin: "0 0 28px",
  },
  dots: { display: "flex", gap: "6px", justifyContent: "center" },
  dot: { width: "8px", height: "8px", borderRadius: "50%" },
  right: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    padding: "2rem", overflowY: "auto",
  },
  card: { width: "100%", maxWidth: "420px" },
  title: {
    fontSize: "24px", fontWeight: "700", color: "#111827",
    margin: "0 0 6px", letterSpacing: "-0.02em",
  },
  subtitle: { fontSize: "14px", color: "#6b7280", margin: "0 0 2rem" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  roleRow: { display: "flex", gap: "12px" },
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
    width: "100%", padding: "12px", fontSize: "15px", fontWeight: "600",
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff", border: "none", borderRadius: "10px",
    cursor: "pointer", marginTop: "6px",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    boxShadow: "0 2px 10px rgba(79,70,229,0.3)",
  },
  footer: { textAlign: "center", fontSize: "14px", color: "#6b7280", marginTop: "2rem" },
  link: { color: "#4f46e5", textDecoration: "none", fontWeight: "600" },
};
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { register as registerUser } from "../utils/auth";
import {
  Mail, Lock, User, ArrowRight, Loader2,
  GraduationCap, BookOpen, Eye, EyeOff, ShieldCheck, KeyRound,
} from "lucide-react";

const TEACHER_CODE = import.meta.env.VITE_TEACHER_CODE;

// ─── Password strength rules ──────────────────────────────────────────────
const PW_RULES = [
  { key: "len", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { key: "num", label: "One number", test: (v) => /\d/.test(v) },
  { key: "special", label: "One special character (!@#$…)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function getStrength(pw = "") {
  const passed = PW_RULES.filter((r) => r.test(pw)).length;
  if (passed <= 1) return { level: 0, label: "Weak", color: "#ef4444" };
  if (passed <= 2) return { level: 1, label: "Weak", color: "#ef4444" };
  if (passed <= 3) return { level: 2, label: "Fair", color: "#f59e0b" };
  if (passed === 4) return { level: 3, label: "Good", color: "#22c55e" };
  return { level: 4, label: "Strong", color: "#059669" };
}

export default function RegisterPage() {
  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { role: "student" } });

  const [firebaseError, setFirebaseError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const navigate = useNavigate();

  const selectedRole = watch("role");
  const passwordVal = watch("password", "");
  const strength = getStrength(passwordVal);

  const onSubmit = async ({ name, email, password, role, teacherCode }) => {
    setFirebaseError("");

    // Teacher code verification
    if (role === "teacher") {
      if (!teacherCode || teacherCode.trim() !== TEACHER_CODE) {
        setFirebaseError("Invalid teacher verification code.");
        return;
      }
    }

    try {
      await registerUser(email, password, name, role);
      navigate("/");
    } catch (err) {
      setFirebaseError(friendlyError(err.code));
    }
  };

  return (
    <div style={styles.page}>
      {/* Left panel */}
      <div style={styles.left}>
        <div style={styles.leftContent}>
          <div style={styles.logoBounce}>
            <img src="/src/assets/quizbee_logo.png" alt="QuizBee logo" style={styles.logoImg} />
          </div>
          <h2 style={styles.leftTitle}>
            Quiz<span style={styles.bee}>Bee</span>
          </h2>
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

      {/* Right panel — register form */}
      <div style={styles.right}>
        <div style={styles.card}>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>Join QuizBee as a teacher or student</p>

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

            {/* Teacher code — only for teachers */}
            {selectedRole === "teacher" && (
              <div style={styles.field}>
                <label style={styles.label}>
                  <ShieldCheck size={13} strokeWidth={2} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Teacher verification code
                </label>
                <div style={inputWrapStyle(!!errors.teacherCode)}>
                  <KeyRound size={16} color="#9ca3af" strokeWidth={2} />
                  <input
                    type="text" placeholder="Enter code provided by admin"
                    style={styles.input}
                    {...register("teacherCode", {
                      required: selectedRole === "teacher" ? "Teacher code is required" : false,
                    })}
                  />
                </div>
                {errors.teacherCode && <span style={styles.error}>{errors.teacherCode.message}</span>}
                <p style={styles.hint}>Ask your administrator for the teacher registration code.</p>
              </div>
            )}

            {/* Full name */}
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

            {/* Email */}
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

            {/* Password */}
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={inputWrapStyle(!!errors.password)}>
                <Lock size={16} color="#9ca3af" strokeWidth={2} />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Create a strong password"
                  style={styles.input}
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 8, message: "Minimum 8 characters" },
                    validate: (v) => {
                      const s = getStrength(v);
                      return s.level >= 3 || "Password must include uppercase, lowercase, number, and special character";
                    },
                  })}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                  {showPw ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
                </button>
              </div>
              {errors.password && <span style={styles.error}>{errors.password.message}</span>}

              {/* Strength meter */}
              {passwordVal.length > 0 && (
                <div style={styles.strengthWrap}>
                  <div style={styles.strengthBarBg}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1, height: "4px", borderRadius: "2px",
                          background: i <= strength.level ? strength.color : "#e5e7eb",
                          transition: "background 0.2s",
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}

              {/* Rule checklist */}
              {passwordVal.length > 0 && (
                <div style={styles.ruleList}>
                  {PW_RULES.map((r) => {
                    const ok = r.test(passwordVal);
                    return (
                      <span key={r.key} style={{ ...styles.ruleItem, color: ok ? "#059669" : "#9ca3af" }}>
                        {ok ? "✓" : "○"} {r.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div style={styles.field}>
              <label style={styles.label}>Confirm password</label>
              <div style={inputWrapStyle(!!errors.confirmPassword)}>
                <Lock size={16} color="#9ca3af" strokeWidth={2} />
                <input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Re-enter your password"
                  style={styles.input}
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (v) => v === passwordVal || "Passwords do not match",
                  })}
                />
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={styles.eyeBtn}>
                  {showConfirmPw ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
                </button>
              </div>
              {errors.confirmPassword && <span style={styles.error}>{errors.confirmPassword.message}</span>}
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
            Already have an account?{" "}
            <Link to="/login" style={styles.link}>Sign in</Link>
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
    transition: "border-color 0.15s",
  };
}

function roleCardStyle(active) {
  return {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    gap: "8px", padding: "16px 10px", borderRadius: "12px", cursor: "pointer",
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
  logoBounce: {
    animation: "float 3s ease-in-out infinite", display: "inline-block",
    marginBottom: "24px", filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.3))",
  },
  logoImg: { width: "200px", height: "200px", objectFit: "contain" },
  leftTitle: {
    fontSize: "38px", fontWeight: "800", color: "#fff",
    margin: "0 0 14px", letterSpacing: "-0.02em",
  },
  bee: { color: "#fbbf24", textShadow: "0 2px 12px rgba(251,191,36,0.5)" },
  leftSub: {
    fontSize: "17px", color: "rgba(255,255,255,0.9)",
    lineHeight: "1.7", margin: "0 0 28px", fontWeight: "500",
  },
  tagEmoji: { fontSize: "20px" },
  tagHighlight: { color: "#fbbf24", fontWeight: "700" },
  dots: { display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" },
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
  eyeBtn: {
    background: "none", border: "none", cursor: "pointer", padding: "4px",
    display: "flex", alignItems: "center",
  },
  error: { fontSize: "12px", color: "#ef4444", fontWeight: "500" },
  hint: { fontSize: "11px", color: "#9ca3af", margin: 0, fontStyle: "italic" },
  firebaseError: {
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: "10px", padding: "12px 14px",
    fontSize: "13px", color: "#991b1b",
  },
  strengthWrap: {
    display: "flex", alignItems: "center", gap: "10px", marginTop: "2px",
  },
  strengthBarBg: {
    flex: 1, display: "flex", gap: "4px",
  },
  ruleList: {
    display: "flex", flexWrap: "wrap", gap: "4px 14px",
    marginTop: "2px",
  },
  ruleItem: {
    fontSize: "11px", fontWeight: "500", whiteSpace: "nowrap",
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
  link: { color: "#4f46e5", textDecoration: "none", fontWeight: "600" },
};
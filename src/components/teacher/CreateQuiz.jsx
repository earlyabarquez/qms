import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { createQuiz } from "../../utils/firestore";
import { ArrowLeft, ArrowRight, Loader2, FileText } from "lucide-react";

export default function CreateQuiz() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ title }) => {
    const quizId = await createQuiz(user.uid, title.trim());
    navigate(`/teacher/quiz/${quizId}`);
  };

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate("/teacher")}>
        <ArrowLeft size={15} strokeWidth={2} />
        Back to quizzes
      </button>

      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <FileText size={24} color="#6366f1" strokeWidth={2} />
        </div>
        <h1 style={styles.title}>Create a new quiz</h1>
        <p style={styles.sub}>
          Give your quiz a title, then add questions on the next screen.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} style={styles.form} noValidate>
          <div style={styles.field}>
            <label style={styles.label}>Quiz title</label>
            <input
              type="text"
              placeholder="e.g. Chapter 4 — Algebra Review"
              style={inputStyle(!!errors.title)}
              autoFocus
              {...register("title", {
                required: "Title is required",
                minLength: { value: 3, message: "Title must be at least 3 characters" },
              })}
            />
            {errors.title && <span style={styles.error}>{errors.title.message}</span>}
          </div>

          <div style={styles.actions}>
            <button
              type="button" style={styles.cancelBtn}
              onClick={() => navigate("/teacher")}
            >
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <>Create & add questions <ArrowRight size={15} strokeWidth={2.5} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputStyle(hasError) {
  return {
    width: "100%", padding: "12px 14px", fontSize: "15px",
    border: `1.5px solid ${hasError ? "#ef4444" : "#e5e7eb"}`,
    borderRadius: "10px", outline: "none", boxSizing: "border-box",
    background: "#fafafa", transition: "border-color 0.15s",
  };
}

const styles = {
  page: { width: "100%", maxWidth: "640px", margin: "0 auto", padding: "2rem 2.5rem" },
  backBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", fontSize: "13px", fontWeight: "500",
    padding: "0 0 1.5rem",
  },
  card: {
    background: "#fff", border: "1px solid #e8eaef",
    borderRadius: "18px", padding: "2rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  iconWrap: {
    width: "48px", height: "48px", borderRadius: "14px",
    background: "#eef2ff", display: "flex", alignItems: "center",
    justifyContent: "center", marginBottom: "16px",
  },
  title: {
    fontSize: "20px", fontWeight: "700", color: "#1e1b4b",
    margin: "0 0 6px", letterSpacing: "-0.01em",
  },
  sub: { fontSize: "14px", color: "#6b7280", margin: "0 0 1.5rem", lineHeight: "1.5" },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  field: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  error: { fontSize: "12px", color: "#ef4444", fontWeight: "500" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" },
  cancelBtn: {
    padding: "10px 18px", fontSize: "14px", background: "#fff",
    border: "1px solid #e5e7eb", borderRadius: "10px",
    cursor: "pointer", color: "#6b7280", fontWeight: "500",
  },
  submitBtn: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "10px 22px", fontSize: "14px", fontWeight: "600",
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff", border: "none", borderRadius: "10px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
  },
};
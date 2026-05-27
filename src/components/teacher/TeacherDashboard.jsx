import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getTeacherQuizzes, setQuizPublished } from "../../utils/firestore";
import NavBar from "../shared/NavBar";
import CreateQuiz from "./CreateQuiz";
import QuizDetail from "./QuizDetail";
import {
  Plus, FileText, Pencil, Eye, EyeOff, Inbox, Loader2,
} from "lucide-react";

export default function TeacherDashboard() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc" }}>
      <NavBar />
      <Routes>
        <Route index element={<QuizList />} />
        <Route path="create" element={<CreateQuiz />} />
        <Route path="quiz/:quizId" element={<QuizDetail />} />
      </Routes>
    </div>
  );
}

function QuizList() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getTeacherQuizzes(user.uid).then((data) => {
      setQuizzes(data);
      setLoading(false);
    });
  }, [user.uid]);

  const handleTogglePublish = async (quiz) => {
    await setQuizPublished(quiz.id, !quiz.isPublished);
    setQuizzes((prev) =>
      prev.map((q) => q.id === quiz.id ? { ...q, isPublished: !q.isPublished } : q)
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Quizzes</h1>
          <p style={styles.sub}>Create and manage your assessments</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => navigate("/teacher/create")}>
          <Plus size={16} strokeWidth={2.5} />
          New Quiz
        </button>
      </div>

      {loading ? (
        <div style={styles.center}>
          <Loader2 size={28} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : quizzes.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}>
            <Inbox size={32} color="#a5b4fc" strokeWidth={1.5} />
          </div>
          <p style={styles.emptyTitle}>No quizzes yet</p>
          <p style={styles.emptySub}>Create your first quiz to get started</p>
          <button style={styles.primaryBtn} onClick={() => navigate("/teacher/create")}>
            <Plus size={16} strokeWidth={2.5} />
            Create a Quiz
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {quizzes.map((quiz) => (
            <div key={quiz.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.cardIcon}>
                  <FileText size={20} color="#6366f1" strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={styles.quizTitle}>{quiz.title}</h2>
                  <span style={statusBadge(quiz.isPublished)}>
                    {quiz.isPublished ? (
                      <><Eye size={11} strokeWidth={2.5} /> Published</>
                    ) : (
                      <><EyeOff size={11} strokeWidth={2.5} /> Draft</>
                    )}
                  </span>
                </div>
              </div>
              <div style={styles.cardActions}>
                <button
                  style={styles.secondaryBtn}
                  onClick={() => navigate(`/teacher/quiz/${quiz.id}`)}
                >
                  <Pencil size={13} strokeWidth={2} />
                  Edit / Questions
                </button>
                <button
                  style={publishToggleStyle(quiz.isPublished)}
                  onClick={() => handleTogglePublish(quiz)}
                >
                  {quiz.isPublished ? (
                    <><EyeOff size={13} strokeWidth={2} /> Unpublish</>
                  ) : (
                    <><Eye size={13} strokeWidth={2} /> Publish</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function statusBadge(published) {
  return {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "12px", fontWeight: "600",
    padding: "3px 10px", borderRadius: "20px", marginTop: "6px",
    background: published ? "#ecfdf5" : "#f9fafb",
    color: published ? "#059669" : "#6b7280",
    border: `1px solid ${published ? "#a7f3d0" : "#e5e7eb"}`,
  };
}

function publishToggleStyle(isPublished) {
  return {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "8px 14px", fontSize: "13px", fontWeight: "500",
    borderRadius: "8px", cursor: "pointer",
    background: isPublished ? "#fef2f2" : "#eef2ff",
    color: isPublished ? "#dc2626" : "#4f46e5",
    border: `1px solid ${isPublished ? "#fecaca" : "#c7d2fe"}`,
    transition: "all 0.15s",
  };
}

const styles = {
  page: { width: "100%", maxWidth: "1440px", margin: "0 auto", padding: "2rem 2.5rem" },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: "2rem",
  },
  title: {
    fontSize: "24px", fontWeight: "700", color: "#1e1b4b",
    margin: 0, letterSpacing: "-0.02em",
  },
  sub: { fontSize: "14px", color: "#6b7280", marginTop: "4px" },
  primaryBtn: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "10px 20px", fontSize: "14px", fontWeight: "600",
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff", border: "none", borderRadius: "10px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
    transition: "all 0.15s",
  },
  center: {
    display: "flex", justifyContent: "center", padding: "4rem 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "18px",
  },
  card: {
    background: "#fff", border: "1px solid #e8eaef",
    borderRadius: "14px", padding: "1.25rem",
    display: "flex", flexDirection: "column", gap: "14px",
    transition: "box-shadow 0.15s, border-color 0.15s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cardTop: { display: "flex", gap: "12px", alignItems: "flex-start" },
  cardIcon: {
    width: "42px", height: "42px", borderRadius: "11px",
    background: "#eef2ff", display: "flex", alignItems: "center",
    justifyContent: "center", flexShrink: 0,
  },
  quizTitle: {
    fontSize: "15px", fontWeight: "600", color: "#1e1b4b", margin: 0,
  },
  cardActions: { display: "flex", gap: "8px" },
  secondaryBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
    padding: "8px 14px", fontSize: "13px", fontWeight: "500",
    borderRadius: "8px", cursor: "pointer", background: "#f9fafb",
    color: "#374151", border: "1px solid #e5e7eb",
    transition: "all 0.15s",
  },
  emptyCard: {
    textAlign: "center", padding: "4rem 2rem", background: "#fff",
    borderRadius: "18px", border: "1px solid #e8eaef",
    display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  emptyIcon: {
    width: "64px", height: "64px", borderRadius: "18px",
    background: "#eef2ff", display: "flex", alignItems: "center",
    justifyContent: "center", marginBottom: "4px",
  },
  emptyTitle: { fontSize: "18px", fontWeight: "600", color: "#1e1b4b", margin: 0 },
  emptySub: { fontSize: "14px", color: "#6b7280", margin: "0 0 8px" },
};
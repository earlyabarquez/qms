import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getPublishedQuizzes, getSubmission } from "../../utils/firestore";
import NavBar from "../shared/NavBar";
import StudentQuiz from "./StudentQuiz";
import Results from "./Results";
import {
  FileText, ArrowRight, Eye, CheckCircle, Clock,
  Inbox, Loader2, Trophy,
} from "lucide-react";

export default function StudentDashboard() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fc" }}>
      <NavBar />
      <Routes>
        <Route index element={<QuizList />} />
        <Route path="quiz/:quizId" element={<StudentQuiz />} />
        <Route path="results/:quizId" element={<Results />} />
      </Routes>
    </div>
  );
}

function QuizList() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const qs = await getPublishedQuizzes();
      setQuizzes(qs);

      const subs = {};
      await Promise.all(
        qs.map(async (q) => {
          const sub = await getSubmission(user.uid, q.id);
          if (sub) subs[q.id] = sub;
        })
      );
      setSubmissions(subs);
      setLoading(false);
    }
    load();
  }, [user.uid]);

  const handleStart = (quizId) => navigate(`/student/quiz/${quizId}`);
  const handleReview = (quizId) => navigate(`/student/results/${quizId}`);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Available Quizzes</h1>
          <p style={styles.sub}>Take a quiz and see your score instantly</p>
        </div>
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
          <p style={styles.emptyTitle}>No quizzes available yet</p>
          <p style={styles.emptySub}>Check back when your teacher publishes a quiz</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {quizzes.map((quiz) => {
            const sub = submissions[quiz.id];
            const pct = sub ? Math.round((sub.score / sub.total) * 100) : null;
            return (
              <div key={quiz.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={cardIconStyle(!!sub)}>
                    {sub ? (
                      <Trophy size={20} color="#059669" strokeWidth={2} />
                    ) : (
                      <FileText size={20} color="#6366f1" strokeWidth={2} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={styles.quizTitle}>{quiz.title}</h2>
                    {sub ? (
                      <div style={styles.scoreRow}>
                        <span style={scoreBadgeStyle(pct)}>
                          <Trophy size={11} strokeWidth={2.5} />
                          {sub.score}/{sub.total} — {pct}%
                        </span>
                        <span style={styles.doneBadge}>
                          <CheckCircle size={11} strokeWidth={2.5} />
                          Completed
                        </span>
                      </div>
                    ) : (
                      <span style={styles.pendingBadge}>
                        <Clock size={11} strokeWidth={2.5} />
                        Not attempted
                      </span>
                    )}
                  </div>
                </div>

                {sub ? (
                  <button style={styles.reviewBtn} onClick={() => handleReview(quiz.id)}>
                    <Eye size={14} strokeWidth={2} />
                    Review answers
                  </button>
                ) : (
                  <button style={styles.startBtn} onClick={() => handleStart(quiz.id)}>
                    Start quiz
                    <ArrowRight size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function cardIconStyle(completed) {
  return {
    width: "42px", height: "42px", borderRadius: "11px",
    background: completed ? "#ecfdf5" : "#eef2ff",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };
}

function scoreBadgeStyle(pct) {
  const color = pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : "#dc2626";
  const bg = pct >= 80 ? "#ecfdf5" : pct >= 60 ? "#fffbeb" : "#fef2f2";
  const border = pct >= 80 ? "#a7f3d0" : pct >= 60 ? "#fde68a" : "#fecaca";
  return {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "13px", fontWeight: "600", color,
    background: bg, padding: "3px 10px", borderRadius: "20px",
    border: `1px solid ${border}`,
  };
}

const styles = {
  page: { width: "100%", maxWidth: "1440px", margin: "0 auto", padding: "2rem 2.5rem" },
  header: { marginBottom: "2rem" },
  title: {
    fontSize: "24px", fontWeight: "700", color: "#1e1b4b",
    margin: 0, letterSpacing: "-0.02em",
  },
  sub: { fontSize: "14px", color: "#6b7280", marginTop: "4px" },
  center: { display: "flex", justifyContent: "center", padding: "4rem 0" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "18px",
  },
  card: {
    background: "#fff", border: "1px solid #e8eaef",
    borderRadius: "14px", padding: "1.25rem",
    display: "flex", flexDirection: "column", gap: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    transition: "box-shadow 0.15s",
  },
  cardTop: { display: "flex", gap: "12px", alignItems: "flex-start" },
  quizTitle: {
    fontSize: "15px", fontWeight: "600", color: "#1e1b4b", margin: "0 0 6px",
  },
  scoreRow: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" },
  doneBadge: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "12px", fontWeight: "500", color: "#6b7280",
    background: "#f9fafb", padding: "3px 8px", borderRadius: "20px",
    border: "1px solid #e5e7eb",
  },
  pendingBadge: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "12px", fontWeight: "500", color: "#9ca3af",
    background: "#f9fafb", padding: "3px 8px", borderRadius: "20px",
    border: "1px solid #e5e7eb",
  },
  startBtn: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    padding: "10px", fontSize: "14px", fontWeight: "600",
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff", border: "none", borderRadius: "10px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
  },
  reviewBtn: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    padding: "10px", fontSize: "14px", fontWeight: "500",
    background: "#f9fafb", color: "#374151",
    border: "1px solid #e5e7eb", borderRadius: "10px",
    cursor: "pointer", transition: "all 0.15s",
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
  emptySub: { fontSize: "14px", color: "#6b7280", margin: 0 },
};
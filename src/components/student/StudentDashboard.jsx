import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getPublishedQuizzes, getSubmission, getQuizByCode } from "../../utils/firestore";
import NavBar from "../shared/NavBar";
import StudentQuiz from "./StudentQuiz";
import Results from "./Results";
import {
  FileText, ArrowRight, Eye, CheckCircle, Clock, Inbox, Loader2,
  Trophy, KeyRound, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  // Join by code state
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function load() {
      const qs = await getPublishedQuizzes();
      setQuizzes(qs);
      const subs = {};
      await Promise.all(qs.map(async (q) => {
        const sub = await getSubmission(user.uid, q.id);
        if (sub) subs[q.id] = sub;
      }));
      setSubmissions(subs);
      setLoading(false);
    }
    load();
  }, [user.uid]);

  const handleStart = (quizId) => navigate(`/student/quiz/${quizId}`);
  const handleReview = (quizId) => navigate(`/student/results/${quizId}`);

  // Join quiz by code
  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoinError("");
    setJoining(true);

    try {
      const quiz = await getQuizByCode(code);
      if (!quiz) {
        setJoinError("No quiz found with that code.");
        setJoining(false);
        return;
      }
      if (!quiz.isPublished) {
        setJoinError("This quiz is not published yet.");
        setJoining(false);
        return;
      }
      // Check if already submitted
      const sub = await getSubmission(user.uid, quiz.id);
      if (sub) {
        navigate(`/student/results/${quiz.id}`);
      } else {
        navigate(`/student/quiz/${quiz.id}`);
      }
    } catch (err) {
      setJoinError("Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <motion.div
      style={styles.page}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Available Quizzes</h1>
          <p style={styles.sub}>Take a quiz and see your score instantly</p>
        </div>
      </div>

      {/* Join by code */}
      <div style={styles.joinCard}>
        <div style={styles.joinLeft}>
          <KeyRound size={18} color="#6366f1" strokeWidth={2} />
          <div>
            <p style={styles.joinTitle}>Have a quiz code?</p>
            <p style={styles.joinSub}>Enter the code your teacher shared</p>
          </div>
        </div>
        <div style={styles.joinRight}>
          <div style={styles.joinInputWrap}>
            <input
              type="text"
              placeholder="e.g. ABC123"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
              style={styles.joinInput}
              maxLength={6}
            />
            <button onClick={handleJoinByCode} style={styles.joinBtn} disabled={joining || !joinCode.trim()}>
              {joining
                ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                : <><Search size={14} strokeWidth={2.5} /> Join</>
              }
            </button>
          </div>
          {joinError && <p style={styles.joinError}>{joinError}</p>}
        </div>
      </div>

      {loading ? (
        <div style={styles.center}>
          <Loader2 size={28} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : quizzes.length === 0 ? (
        <motion.div style={styles.emptyCard} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div style={styles.emptyIcon}><Inbox size={32} color="#a5b4fc" strokeWidth={1.5} /></div>
          <p style={styles.emptyTitle}>No quizzes available yet</p>
          <p style={styles.emptySub}>Check back when your teacher publishes a quiz, or join one using a code above</p>
        </motion.div>
      ) : (
        <div style={styles.grid}>
          <AnimatePresence>
            {quizzes.map((quiz, i) => {
              const sub = submissions[quiz.id];
              const isPending = sub && (sub.gradedAnswers || []).some(
                (g) => g.type === "situational" && g.correct === null
              );
              const pct = sub ? Math.round((sub.score / sub.total) * 100) : null;

              return (
                <motion.div
                  key={quiz.id}
                  style={styles.card}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.07, duration: 0.35 }}
                  whileHover={{ y: -3, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }}
                >
                  <div style={styles.cardTop}>
                    <div style={cardIconStyle(!!sub, isPending)}>
                      {isPending
                        ? <Clock size={20} color="#d97706" strokeWidth={2} />
                        : sub
                        ? <Trophy size={20} color="#059669" strokeWidth={2} />
                        : <FileText size={20} color="#6366f1" strokeWidth={2} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2 style={styles.quizTitle}>{quiz.title}</h2>

                      {isPending ? (
                        <div style={styles.scoreRow}>
                          <span style={styles.pendingBadge}>
                            <Clock size={11} strokeWidth={2.5} /> Pending teacher review
                          </span>
                          <span style={styles.doneBadge}>
                            <CheckCircle size={11} strokeWidth={2.5} /> Submitted
                          </span>
                        </div>
                      ) : sub ? (
                        <div style={styles.scoreRow}>
                          <span style={scoreBadgeStyle(pct)}>
                            <Trophy size={11} strokeWidth={2.5} /> {sub.score}/{sub.total} — {pct}%
                          </span>
                          <span style={styles.doneBadge}>
                            <CheckCircle size={11} strokeWidth={2.5} /> Completed
                          </span>
                        </div>
                      ) : (
                        <span style={styles.notAttemptedBadge}>
                          <Clock size={11} strokeWidth={2.5} /> Not attempted
                        </span>
                      )}
                    </div>
                  </div>

                  {sub ? (
                    <motion.button
                      style={isPending ? styles.pendingBtn : styles.reviewBtn}
                      onClick={() => handleReview(quiz.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Eye size={14} strokeWidth={2} />
                      {isPending ? "View submission" : "Review answers"}
                    </motion.button>
                  ) : (
                    <motion.button
                      style={styles.startBtn}
                      onClick={() => handleStart(quiz.id)}
                      whileHover={{ scale: 1.02, boxShadow: "0 4px 14px rgba(79,70,229,0.35)" }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Start quiz <ArrowRight size={14} strokeWidth={2.5} />
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function cardIconStyle(submitted, isPending) {
  if (isPending) return { width: "42px", height: "42px", borderRadius: "11px", background: "#fffbeb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  if (submitted) return { width: "42px", height: "42px", borderRadius: "11px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  return { width: "42px", height: "42px", borderRadius: "11px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
}

function scoreBadgeStyle(pct) {
  const color = pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : "#dc2626";
  const bg = pct >= 80 ? "#ecfdf5" : pct >= 60 ? "#fffbeb" : "#fef2f2";
  const border = pct >= 80 ? "#a7f3d0" : pct >= 60 ? "#fde68a" : "#fecaca";
  return { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: "600", color, background: bg, padding: "3px 10px", borderRadius: "20px", border: `1px solid ${border}` };
}

const styles = {
  page: { width: "100%", maxWidth: "1440px", margin: "0 auto", padding: "2rem 2.5rem" },
  header: { marginBottom: "1.5rem" },
  title: { fontSize: "24px", fontWeight: "700", color: "#1e1b4b", margin: 0, letterSpacing: "-0.02em" },
  sub: { fontSize: "14px", color: "#6b7280", marginTop: "4px" },
  center: { display: "flex", justifyContent: "center", padding: "4rem 0" },

  // Join card
  joinCard: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: "14px",
    background: "#fff", border: "1px solid #e8eaef",
    borderRadius: "14px", padding: "1rem 1.25rem",
    marginBottom: "1.5rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  joinLeft: { display: "flex", alignItems: "center", gap: "12px" },
  joinTitle: { fontSize: "14px", fontWeight: "600", color: "#1e1b4b", margin: 0 },
  joinSub: { fontSize: "12px", color: "#6b7280", margin: "2px 0 0" },
  joinRight: { display: "flex", flexDirection: "column", gap: "4px" },
  joinInputWrap: { display: "flex", gap: "8px", alignItems: "center" },
  joinInput: {
    width: "120px", padding: "8px 12px", fontSize: "14px",
    fontWeight: "700", letterSpacing: "0.08em", fontFamily: "monospace",
    border: "1.5px solid #e5e7eb", borderRadius: "8px",
    outline: "none", background: "#fafafa", textTransform: "uppercase",
  },
  joinBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "8px 16px", fontSize: "13px", fontWeight: "600",
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff", border: "none", borderRadius: "8px",
    cursor: "pointer", boxShadow: "0 2px 6px rgba(79,70,229,0.25)",
  },
  joinError: { fontSize: "12px", color: "#ef4444", fontWeight: "500", margin: 0 },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "18px" },
  card: { background: "#fff", border: "1px solid #e8eaef", borderRadius: "14px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  cardTop: { display: "flex", gap: "12px", alignItems: "flex-start" },
  quizTitle: { fontSize: "15px", fontWeight: "600", color: "#1e1b4b", margin: "0 0 6px" },
  scoreRow: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" },
  doneBadge: { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "500", color: "#6b7280", background: "#f9fafb", padding: "3px 8px", borderRadius: "20px", border: "1px solid #e5e7eb" },
  pendingBadge: { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#d97706", background: "#fffbeb", padding: "3px 10px", borderRadius: "20px", border: "1px solid #fde68a" },
  notAttemptedBadge: { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "500", color: "#9ca3af", background: "#f9fafb", padding: "3px 8px", borderRadius: "20px", border: "1px solid #e5e7eb" },
  startBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", fontSize: "14px", fontWeight: "600", background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.25)" },
  reviewBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", fontSize: "14px", fontWeight: "500", background: "#f9fafb", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "10px", cursor: "pointer" },
  pendingBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", fontSize: "14px", fontWeight: "500", background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a", borderRadius: "10px", cursor: "pointer" },
  emptyCard: { textAlign: "center", padding: "4rem 2rem", background: "#fff", borderRadius: "18px", border: "1px solid #e8eaef", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  emptyIcon: { width: "64px", height: "64px", borderRadius: "18px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" },
  emptyTitle: { fontSize: "18px", fontWeight: "600", color: "#1e1b4b", margin: 0 },
  emptySub: { fontSize: "14px", color: "#6b7280", margin: 0 },
};
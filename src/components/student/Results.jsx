import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { getSubmission, getQuestions } from "../../utils/firestore";
import {
  ArrowLeft, Home, Check, X, Trophy, Target, TrendingUp,
  Loader2, Award,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D"];

export default function Results() {
  const { quizId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [quizSnap, sub, qs] = await Promise.all([
        getDoc(doc(db, "quizzes", quizId)),
        getSubmission(user.uid, quizId),
        getQuestions(quizId),
      ]);
      if (quizSnap.exists()) setQuiz({ id: quizSnap.id, ...quizSnap.data() });
      setSubmission(sub);
      setQuestions(qs);
      setLoading(false);
    }
    load();
  }, [quizId, user.uid]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.center}>
          <Loader2 size={28} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div style={styles.page}>
        <p style={styles.muted}>No submission found.</p>
      </div>
    );
  }

  const pct = Math.round((submission.score / submission.total) * 100);
  const { grade, color, bg, border, Icon } = getGrade(pct);

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate("/student")}>
        <ArrowLeft size={15} strokeWidth={2} />
        Back to quizzes
      </button>

      {/* Score card */}
      <div style={{ ...styles.scoreCard, background: bg, borderColor: border }}>
        <div style={{ ...styles.gradeIcon, background: color }}>
          <Icon size={28} color="#fff" strokeWidth={2} />
        </div>
        <div style={styles.scoreFraction}>
          <span style={{ ...styles.scoreNum, color }}>{submission.score}</span>
          <span style={styles.scoreSlash}>/</span>
          <span style={styles.scoreTotal}>{submission.total}</span>
        </div>
        <div style={{ ...styles.gradePill, color, borderColor: color }}>{grade}</div>
        <p style={styles.scoreLabel}>{pct}% — {quiz?.title}</p>
        <p style={styles.feedbackText}>{feedbackText(pct)}</p>
      </div>

      {/* Per-question review */}
      <h2 style={styles.reviewTitle}>
        <Target size={18} strokeWidth={2} color="#6366f1" />
        Answer Review
      </h2>
      <div style={styles.questionList}>
        {questions.map((q, idx) => {
          const studentAnswer = submission.answers[idx];
          const correct = studentAnswer === q.correctAnswer;
          return (
            <div key={q.id} style={questionCardStyle(correct)}>
              <div style={styles.qHeader}>
                <span style={qIconStyle(correct)}>
                  {correct ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                </span>
                <p style={styles.qText}>{q.questionText}</p>
              </div>
              <div style={styles.options}>
                {q.options.map((opt, optIdx) => {
                  const isStudentChoice = optIdx === studentAnswer;
                  const isCorrectAnswer = optIdx === q.correctAnswer;
                  return (
                    <div key={optIdx} style={reviewOptStyle(isStudentChoice, isCorrectAnswer)}>
                      <span style={reviewLetterStyle(isStudentChoice, isCorrectAnswer)}>
                        {isCorrectAnswer ? (
                          <Check size={11} strokeWidth={3} />
                        ) : isStudentChoice && !isCorrectAnswer ? (
                          <X size={11} strokeWidth={3} />
                        ) : (
                          LETTERS[optIdx]
                        )}
                      </span>
                      <span style={styles.optText}>{opt}</span>
                      {isCorrectAnswer && !isStudentChoice && (
                        <span style={styles.correctLabel}>
                          <Check size={10} strokeWidth={3} /> Correct
                        </span>
                      )}
                      {isStudentChoice && !correct && (
                        <span style={styles.wrongLabel}>
                          <X size={10} strokeWidth={3} /> Your answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.footer}>
        <button style={styles.homeBtn} onClick={() => navigate("/student")}>
          <Home size={15} strokeWidth={2} />
          Back to quizzes
        </button>
      </div>
    </div>
  );
}

function getGrade(pct) {
  if (pct >= 90) return { grade: "A", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", Icon: Trophy };
  if (pct >= 80) return { grade: "B", color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe", Icon: Award };
  if (pct >= 70) return { grade: "C", color: "#d97706", bg: "#fffbeb", border: "#fde68a", Icon: TrendingUp };
  if (pct >= 60) return { grade: "D", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", Icon: Target };
  return { grade: "F", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", Icon: Target };
}

function feedbackText(pct) {
  if (pct === 100) return "Perfect score! Outstanding work.";
  if (pct >= 80) return "Great job! You have a strong understanding of this material.";
  if (pct >= 60) return "Good effort. Review the questions you missed to strengthen your knowledge.";
  return "Keep practicing! Review the material and try again.";
}

function questionCardStyle(correct) {
  return {
    background: "#fff",
    border: `1.5px solid ${correct ? "#a7f3d0" : "#fecaca"}`,
    borderRadius: "14px", padding: "1.25rem",
    display: "flex", flexDirection: "column", gap: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };
}

function qIconStyle(correct) {
  return {
    width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: correct ? "#dcfce7" : "#fee2e2",
    color: correct ? "#059669" : "#dc2626",
  };
}

function reviewOptStyle(isStudentChoice, isCorrectAnswer) {
  let border = "1px solid #e5e7eb";
  let bg = "#fafafa";
  if (isCorrectAnswer) { border = "1.5px solid #a7f3d0"; bg = "#ecfdf5"; }
  if (isStudentChoice && !isCorrectAnswer) { border = "1.5px solid #fecaca"; bg = "#fef2f2"; }
  return {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 12px", borderRadius: "10px", border, background: bg,
  };
}

function reviewLetterStyle(isStudentChoice, isCorrectAnswer) {
  let bg = "#f3f4f6", color = "#6b7280";
  if (isCorrectAnswer) { bg = "#059669"; color = "#fff"; }
  if (isStudentChoice && !isCorrectAnswer) { bg = "#dc2626"; color = "#fff"; }
  return {
    width: "26px", height: "26px", borderRadius: "7px", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: "700", background: bg, color,
  };
}

const styles = {
  page: { width: "100%", maxWidth: "800px", margin: "0 auto", padding: "2rem 2.5rem" },
  center: { display: "flex", justifyContent: "center", padding: "4rem 0" },
  backBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", fontSize: "13px", fontWeight: "500",
    padding: "0 0 1.5rem",
  },
  scoreCard: {
    borderRadius: "18px", padding: "2.5rem", textAlign: "center",
    marginBottom: "2.5rem", border: "1.5px solid",
  },
  gradeIcon: {
    width: "60px", height: "60px", borderRadius: "16px",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  scoreFraction: {
    display: "flex", alignItems: "baseline", justifyContent: "center",
    gap: "4px", marginBottom: "12px",
  },
  scoreNum: { fontSize: "52px", fontWeight: "700", lineHeight: 1 },
  scoreSlash: { fontSize: "30px", color: "#9ca3af" },
  scoreTotal: { fontSize: "30px", color: "#9ca3af" },
  gradePill: {
    display: "inline-block", fontSize: "18px", fontWeight: "700",
    padding: "4px 22px", borderRadius: "99px", border: "2px solid",
    marginBottom: "12px",
  },
  scoreLabel: { fontSize: "15px", color: "#6b7280", margin: "0 0 6px" },
  feedbackText: {
    fontSize: "15px", color: "#374151", margin: 0, lineHeight: "1.5",
  },
  reviewTitle: {
    display: "flex", alignItems: "center", gap: "8px",
    fontSize: "18px", fontWeight: "700", color: "#1e1b4b",
    margin: "0 0 16px",
  },
  questionList: { display: "flex", flexDirection: "column", gap: "16px" },
  qHeader: { display: "flex", gap: "10px", alignItems: "flex-start" },
  qText: { fontSize: "15px", fontWeight: "500", color: "#1e1b4b", margin: 0 },
  options: { display: "flex", flexDirection: "column", gap: "6px" },
  optText: { fontSize: "14px", color: "#374151", flex: 1 },
  correctLabel: {
    display: "flex", alignItems: "center", gap: "3px",
    fontSize: "12px", fontWeight: "600", color: "#059669",
  },
  wrongLabel: {
    display: "flex", alignItems: "center", gap: "3px",
    fontSize: "12px", fontWeight: "600", color: "#dc2626",
  },
  footer: { display: "flex", justifyContent: "center", padding: "2rem 0" },
  homeBtn: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "11px 28px", fontSize: "14px", fontWeight: "600",
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff", border: "none",
    borderRadius: "10px", cursor: "pointer",
    boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
  },
  muted: { color: "#6b7280" },
};
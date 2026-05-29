import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { getSubmission, getQuestions } from "../../utils/firestore";
import {
  ArrowLeft, Home, Check, X, Trophy, Target, TrendingUp,
  Loader2, Award, Clock, AlignLeft,
} from "lucide-react";
import { motion } from "framer-motion";

const LETTERS = ["A", "B", "C", "D"];

const TYPE_PILL = {
  situational:    { label: "Situational",    color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  true_false:     { label: "True or False",  color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  identification: { label: "Identification", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
};

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
      setQuestions(qs ?? []);
      setLoading(false);
    }
    load();
  }, [quizId, user.uid]);

  if (loading) return (
    <div style={styles.page}><div style={styles.center}>
      <Loader2 size={28} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
    </div></div>
  );

  if (!submission) return (
    <div style={styles.page}><p style={styles.muted}>No submission found.</p></div>
  );

  const hasPendingGrading = (submission.gradedAnswers || []).some(
    (g) => g.type === "situational" && g.correct === null
  );

  const pct = Math.round((submission.score / submission.total) * 100);
  const { grade, color, bg, border, Icon } = hasPendingGrading
    ? { grade: "—", color: "#d97706", bg: "#fffbeb", border: "#fde68a", Icon: Clock }
    : getGrade(pct);

  return (
    <motion.div style={styles.page} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <button style={styles.backBtn} onClick={() => navigate("/student")}>
        <ArrowLeft size={15} strokeWidth={2} /> Back to quizzes
      </button>

      {/* Score card */}
      <motion.div
        style={{ ...styles.scoreCard, background: bg, borderColor: border }}
        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.45, type: "spring", stiffness: 180 }}
      >
        <motion.div
          style={{ ...styles.gradeIcon, background: color }}
          initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 220 }}
        >
          <Icon size={28} color="#fff" strokeWidth={2} />
        </motion.div>
        <motion.div style={styles.scoreFraction} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <span style={{ ...styles.scoreNum, color }}>{submission.score}</span>
          <span style={styles.scoreSlash}>/</span>
          <span style={styles.scoreTotal}>{submission.total}</span>
        </motion.div>
        <motion.div style={{ ...styles.gradePill, color, borderColor: color }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
          {grade}
        </motion.div>
        <p style={styles.scoreLabel}>
          {hasPendingGrading ? "Awaiting teacher grading" : `${pct}% — ${quiz?.title}`}
        </p>
        <p style={styles.feedbackText}>
          {hasPendingGrading
            ? "Your teacher still needs to grade your written answers. Check back later for your final score."
            : feedbackText(pct)}
        </p>
      </motion.div>

      {/* Review */}
      <motion.h2 style={styles.reviewTitle} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
        <Target size={18} strokeWidth={2} color="#6366f1" /> Answer Review
      </motion.h2>

      <div style={styles.questionList}>
        {questions.filter((_, idx) => idx < (submission.answers?.length ?? 0)).map((q, idx) => {
          const gradedAnswer = submission.gradedAnswers?.[idx];
          const studentAnswer = submission.answers?.[idx];
          const isSituational = q.type === "situational";
          const isIdentification = q.type === "identification";
          const isTrueFalse = q.type === "true_false";
          const isMC = q.type === "mc";

          const isPending = isSituational && gradedAnswer?.correct === null;
          const correct = gradedAnswer?.correct === true;
          const pill = TYPE_PILL[q.type];

          return (
            <motion.div
              key={q.id}
              style={questionCardStyle(correct, isPending)}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + idx * 0.07, duration: 0.35 }}
            >
              <div style={styles.qHeader}>
                <span style={qIconStyle(correct, isPending)}>
                  {isPending
                    ? <Clock size={14} strokeWidth={2.5} />
                    : correct ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={styles.qText}>{q.questionText}</p>
                  {pill && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: pill.color, background: pill.bg, border: `1px solid ${pill.border}`, borderRadius: "20px", padding: "2px 8px" }}>
                      {isSituational && <AlignLeft size={10} strokeWidth={2} />}
                      {pill.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Question image */}
              {q.imageURL && (
                <div style={styles.qImageWrap}>
                  <img src={q.imageURL} alt="Question" style={styles.qImage} />
                </div>
              )}

              {/* MC review */}
              {isMC && q.options && (
                <div style={styles.options}>
                  {q.options.map((opt, optIdx) => {
                    const isStudentChoice = optIdx === studentAnswer;
                    const isCorrectAnswer = optIdx === q.correctAnswer;
                    return (
                      <div key={optIdx} style={reviewOptStyle(isStudentChoice, isCorrectAnswer)}>
                        <span style={reviewLetterStyle(isStudentChoice, isCorrectAnswer)}>
                          {isCorrectAnswer ? <Check size={11} strokeWidth={3} />
                            : isStudentChoice && !isCorrectAnswer ? <X size={11} strokeWidth={3} />
                            : LETTERS[optIdx]}
                        </span>
                        <span style={styles.optText}>{opt}</span>
                        {isCorrectAnswer && !isStudentChoice && (
                          <span style={styles.correctLabel}><Check size={10} strokeWidth={3} /> Correct</span>
                        )}
                        {isStudentChoice && !correct && (
                          <span style={styles.wrongLabel}><X size={10} strokeWidth={3} /> Your answer</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* True/False review */}
              {isTrueFalse && (
                <div style={{ display: "flex", gap: "10px" }}>
                  {["True", "False"].map((label, optIdx) => {
                    const isStudentChoice = optIdx === studentAnswer;
                    const isCorrectAnswer = optIdx === q.correctAnswer;
                    return (
                      <div key={label} style={tfReviewStyle(isStudentChoice, isCorrectAnswer)}>
                        <span style={reviewLetterStyle(isStudentChoice, isCorrectAnswer)}>
                          {isCorrectAnswer ? <Check size={11} strokeWidth={3} />
                            : isStudentChoice ? <X size={11} strokeWidth={3} /> : ""}
                        </span>
                        <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>{label}</span>
                        {isCorrectAnswer && !isStudentChoice && (
                          <span style={styles.correctLabel}><Check size={10} strokeWidth={3} /> Correct</span>
                        )}
                        {isStudentChoice && !correct && (
                          <span style={styles.wrongLabel}><X size={10} strokeWidth={3} /> Your answer</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Identification review */}
              {isIdentification && (
                <div style={styles.identBlock}>
                  <div style={styles.identRow}>
                    <span style={styles.identLabel}>Your answer</span>
                    <span style={{ ...styles.identValue, color: correct ? "#059669" : "#dc2626" }}>
                      {studentAnswer || <em style={{ color: "#9ca3af" }}>No answer</em>}
                    </span>
                  </div>
                  {!correct && (
                    <div style={styles.identRow}>
                      <span style={styles.identLabel}>Correct answer</span>
                      <span style={{ ...styles.identValue, color: "#059669" }}>{q.answerKey}</span>
                    </div>
                  )}
                  <div style={resultBadgeStyle(correct)}>
                    {correct ? <><Check size={12} strokeWidth={3} /> Correct</> : <><X size={12} strokeWidth={3} /> Incorrect</>}
                  </div>
                </div>
              )}

              {/* Situational review */}
              {isSituational && (
                <div style={styles.situationalBlock}>
                  <p style={styles.responseLabel}>Your answer</p>
                  <p style={styles.responseText}>
                    {studentAnswer || <em style={{ color: "#9ca3af" }}>No answer provided</em>}
                  </p>
                  {isPending ? (
                    <div style={styles.pendingNote}>
                      <Clock size={12} strokeWidth={2} /> Pending teacher review
                    </div>
                  ) : (
                    <div style={resultNote(correct)}>
                      {correct
                        ? <><Check size={12} strokeWidth={3} /> Marked correct by teacher</>
                        : <><X size={12} strokeWidth={3} /> Marked incorrect by teacher</>}
                      {gradedAnswer?.note && (
                        <p style={styles.teacherNote}>💬 {gradedAnswer.note}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.div style={styles.footer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + questions.length * 0.07 }}>
        <motion.button style={styles.homeBtn} onClick={() => navigate("/student")}
          whileHover={{ scale: 1.04, boxShadow: "0 4px 16px rgba(79,70,229,0.35)" }} whileTap={{ scale: 0.97 }}>
          <Home size={15} strokeWidth={2} /> Back to quizzes
        </motion.button>
      </motion.div>
    </motion.div>
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

function questionCardStyle(correct, isPending) {
  const border = isPending ? "#fde68a" : correct ? "#a7f3d0" : "#fecaca";
  return {
    background: "#fff", border: `1.5px solid ${border}`, borderRadius: "14px",
    padding: "1.25rem", display: "flex", flexDirection: "column", gap: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };
}

function qIconStyle(correct, isPending) {
  const bg = isPending ? "#fef9c3" : correct ? "#dcfce7" : "#fee2e2";
  const color = isPending ? "#d97706" : correct ? "#059669" : "#dc2626";
  return { width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: bg, color };
}

function reviewOptStyle(isStudentChoice, isCorrectAnswer) {
  let border = "1px solid #e5e7eb", bg = "#fafafa";
  if (isCorrectAnswer) { border = "1.5px solid #a7f3d0"; bg = "#ecfdf5"; }
  if (isStudentChoice && !isCorrectAnswer) { border = "1.5px solid #fecaca"; bg = "#fef2f2"; }
  return { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", border, background: bg };
}

function tfReviewStyle(isStudentChoice, isCorrectAnswer) {
  let border = "1px solid #e5e7eb", bg = "#fafafa";
  if (isCorrectAnswer) { border = "1.5px solid #a7f3d0"; bg = "#ecfdf5"; }
  if (isStudentChoice && !isCorrectAnswer) { border = "1.5px solid #fecaca"; bg = "#fef2f2"; }
  return { flex: 1, display: "flex", alignItems: "center", gap: "8px", padding: "12px", borderRadius: "10px", border, background: bg };
}

function reviewLetterStyle(isStudentChoice, isCorrectAnswer) {
  let bg = "#f3f4f6", color = "#6b7280";
  if (isCorrectAnswer) { bg = "#059669"; color = "#fff"; }
  if (isStudentChoice && !isCorrectAnswer) { bg = "#dc2626"; color = "#fff"; }
  return { width: "26px", height: "26px", borderRadius: "7px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", background: bg, color };
}

function resultNote(correct) {
  return {
    display: "flex", alignItems: "flex-start", flexDirection: "column", gap: "6px",
    fontSize: "12px", fontWeight: "600",
    color: correct ? "#059669" : "#dc2626",
    background: correct ? "#ecfdf5" : "#fef2f2",
    border: `1px solid ${correct ? "#a7f3d0" : "#fecaca"}`,
    borderRadius: "8px", padding: "8px 12px",
  };
}

function resultBadgeStyle(correct) {
  return {
    display: "inline-flex", alignItems: "center", gap: "5px",
    fontSize: "12px", fontWeight: "600",
    color: correct ? "#059669" : "#dc2626",
    background: correct ? "#ecfdf5" : "#fef2f2",
    border: `1px solid ${correct ? "#a7f3d0" : "#fecaca"}`,
    borderRadius: "8px", padding: "6px 12px",
  };
}

const styles = {
  page: { width: "100%", maxWidth: "800px", margin: "0 auto", padding: "2rem 2.5rem" },
  center: { display: "flex", justifyContent: "center", padding: "4rem 0" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "13px", fontWeight: "500", padding: "0 0 1.5rem" },
  scoreCard: { borderRadius: "18px", padding: "2.5rem", textAlign: "center", marginBottom: "2.5rem", border: "1.5px solid" },
  gradeIcon: { width: "60px", height: "60px", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  scoreFraction: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: "4px", marginBottom: "12px" },
  scoreNum: { fontSize: "52px", fontWeight: "700", lineHeight: 1 },
  scoreSlash: { fontSize: "30px", color: "#9ca3af" },
  scoreTotal: { fontSize: "30px", color: "#9ca3af" },
  gradePill: { display: "inline-block", fontSize: "18px", fontWeight: "700", padding: "4px 22px", borderRadius: "99px", border: "2px solid", marginBottom: "12px" },
  scoreLabel: { fontSize: "15px", color: "#6b7280", margin: "0 0 6px" },
  feedbackText: { fontSize: "15px", color: "#374151", margin: 0, lineHeight: "1.5" },
  reviewTitle: { display: "flex", alignItems: "center", gap: "8px", fontSize: "18px", fontWeight: "700", color: "#1e1b4b", margin: "0 0 16px" },
  questionList: { display: "flex", flexDirection: "column", gap: "16px" },
  qHeader: { display: "flex", gap: "10px", alignItems: "flex-start" },
  qText: { fontSize: "15px", fontWeight: "500", color: "#1e1b4b", margin: "0 0 4px" },
  qImageWrap: { borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb", maxWidth: "100%" },
  qImage: { width: "100%", maxHeight: "240px", objectFit: "contain", display: "block", background: "#fafafa" },
  options: { display: "flex", flexDirection: "column", gap: "6px" },
  optText: { fontSize: "14px", color: "#374151", flex: 1 },
  correctLabel: { display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", fontWeight: "600", color: "#059669" },
  wrongLabel: { display: "flex", alignItems: "center", gap: "3px", fontSize: "12px", fontWeight: "600", color: "#dc2626" },
  identBlock: { display: "flex", flexDirection: "column", gap: "8px", padding: "12px 14px", borderRadius: "10px", background: "#f9fafb", border: "1px solid #e5e7eb" },
  identRow: { display: "flex", alignItems: "center", gap: "10px" },
  identLabel: { fontSize: "12px", fontWeight: "600", color: "#9ca3af", minWidth: "110px", textTransform: "uppercase", letterSpacing: "0.04em" },
  identValue: { fontSize: "14px", fontWeight: "600" },
  situationalBlock: { display: "flex", flexDirection: "column", gap: "8px" },
  responseLabel: { fontSize: "11px", fontWeight: "600", color: "#9ca3af", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" },
  responseText: { fontSize: "14px", color: "#374151", margin: 0, lineHeight: "1.6", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 12px" },
  pendingNote: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "8px 12px" },
  teacherNote: { fontSize: "13px", fontWeight: "400", margin: "4px 0 0", color: "inherit", lineHeight: "1.5" },
  footer: { display: "flex", justifyContent: "center", padding: "2rem 0" },
  homeBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "11px 28px", fontSize: "14px", fontWeight: "600", background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.25)" },
  muted: { color: "#6b7280" },
};
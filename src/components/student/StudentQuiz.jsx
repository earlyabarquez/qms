import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { getQuestions, submitQuiz, getSubmission } from "../../utils/firestore";
import {
  ArrowLeft, Send, Check, Loader2, AlertCircle, AlignLeft,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D"];

const TYPE_PILL = {
  situational:    { label: "Situational",   color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  true_false:     { label: "True or False", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  identification: { label: "Identification",color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
};

export default function StudentQuiz() {
  const { quizId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const [quizSnap, qs, existing] = await Promise.all([
        getDoc(doc(db, "quizzes", quizId)),
        getQuestions(quizId),
        getSubmission(user.uid, quizId),
      ]);
      if (existing) { navigate(`/student/results/${quizId}`, { replace: true }); return; }
      if (quizSnap.exists()) setQuiz({ id: quizSnap.id, ...quizSnap.data() });
      setQuestions(qs);
      setLoading(false);
    }
    load();
  }, [quizId, user.uid, navigate]);

  const handleSelect = (qIndex, optIndex) =>
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));

  const handleTextAnswer = (qIndex, text) =>
    setAnswers((prev) => ({ ...prev, [qIndex]: text }));

  const isAnswered = (q, i) => {
    const a = answers[i];
    if (q.type === "situational" || q.type === "identification")
      return typeof a === "string" && a.trim().length > 0;
    return a !== undefined;
  };

  const answeredCount = questions.filter((q, i) => isAnswered(q, i)).length;
  const allAnswered = answeredCount === questions.length;
  const progressPct = questions.length ? (answeredCount / questions.length) * 100 : 0;

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    const answerArray = questions.map((_, i) => answers[i]);
    await submitQuiz(user.uid, quizId, answerArray, questions);
    navigate(`/student/results/${quizId}`);
  };

  if (loading) return (
    <div style={styles.page}><div style={styles.center}>
      <Loader2 size={28} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
    </div></div>
  );
  if (!quiz) return <div style={styles.page}><p style={styles.muted}>Quiz not found.</p></div>;

  return (
    <div style={styles.page}>
      <div style={styles.quizHeader}>
        <div>
          <button style={styles.backBtn} onClick={() => navigate("/student")}>
            <ArrowLeft size={15} strokeWidth={2} /> Back
          </button>
          <h1 style={styles.title}>{quiz.title}</h1>
          <p style={styles.sub}>{questions.length} questions</p>
        </div>
        <div style={styles.progress}>
          <span style={styles.progressText}>{answeredCount}/{questions.length} answered</span>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div style={styles.questionList}>
        {questions.map((q, qIdx) => {
          const answered = isAnswered(q, qIdx);
          const pill = TYPE_PILL[q.type];

          return (
            <div key={q.id} style={questionCardStyle(answered)}>
              <div style={styles.qHeader}>
                <span style={qNumStyle(answered)}>
                  {answered ? <Check size={13} strokeWidth={3} /> : `Q${qIdx + 1}`}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={styles.qText}>{q.questionText}</p>
                  {pill && (
                    <span style={typePillStyle(pill)}>
                      {q.type === "situational" && <AlignLeft size={10} strokeWidth={2} />}
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

              {/* MC */}
              {q.type === "mc" && (
                <div style={styles.options}>
                  {q.options.map((opt, optIdx) => {
                    const selected = answers[qIdx] === optIdx;
                    return (
                      <button key={optIdx} style={optionBtnStyle(selected)} onClick={() => handleSelect(qIdx, optIdx)}>
                        <span style={letterStyle(selected)}>
                          {selected ? <Check size={13} strokeWidth={3} /> : LETTERS[optIdx]}
                        </span>
                        <span style={styles.optText}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* True / False */}
              {q.type === "true_false" && (
                <div style={{ display: "flex", gap: "10px" }}>
                  {["True", "False"].map((label, optIdx) => {
                    const selected = answers[qIdx] === optIdx;
                    return (
                      <button key={label} style={tfBtnStyle(selected)} onClick={() => handleSelect(qIdx, optIdx)}>
                        {selected && <Check size={14} strokeWidth={3} />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Identification */}
              {q.type === "identification" && (
                <input
                  type="text"
                  placeholder="Type your answer here…"
                  value={answers[qIdx] || ""}
                  onChange={(e) => handleTextAnswer(qIdx, e.target.value)}
                  style={identificationInput}
                />
              )}

              {/* Situational */}
              {q.type === "situational" && (
                <textarea
                  rows={4}
                  placeholder="Type your response here…"
                  value={answers[qIdx] || ""}
                  onChange={(e) => handleTextAnswer(qIdx, e.target.value)}
                  style={situationalTextarea}
                />
              )}
            </div>
          );
        })}
      </div>

      <div style={styles.submitBar}>
        {!allAnswered && (
          <p style={styles.submitHint}>
            <AlertCircle size={14} strokeWidth={2} />
            {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? "s" : ""} remaining
          </p>
        )}
        <button style={submitBtnStyle(allAnswered)} disabled={!allAnswered || submitting} onClick={handleSubmit}>
          {submitting
            ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            : <>Submit quiz <Send size={14} strokeWidth={2.5} /></>}
        </button>
      </div>
    </div>
  );
}

// ─── Style helpers ─────────────────────────────────────────────────────────

const situationalTextarea = {
  width: "100%", padding: "12px 14px", fontSize: "14px",
  border: "1.5px solid #e5e7eb", borderRadius: "10px",
  outline: "none", resize: "vertical", fontFamily: "inherit",
  boxSizing: "border-box", background: "#fafafa", lineHeight: "1.6",
};

const identificationInput = {
  width: "100%", padding: "12px 14px", fontSize: "14px",
  border: "1.5px solid #e5e7eb", borderRadius: "10px",
  outline: "none", fontFamily: "inherit",
  boxSizing: "border-box", background: "#fafafa",
};

function typePillStyle(pill) {
  return {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "11px", fontWeight: "600", color: pill.color,
    background: pill.bg, border: `1px solid ${pill.border}`,
    borderRadius: "20px", padding: "2px 8px",
  };
}

function questionCardStyle(answered) {
  return {
    background: "#fff", border: `1.5px solid ${answered ? "#c7d2fe" : "#e8eaef"}`,
    borderRadius: "14px", padding: "1.25rem",
    display: "flex", flexDirection: "column", gap: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)", transition: "border-color 0.2s",
  };
}

function qNumStyle(answered) {
  return {
    minWidth: "32px", height: "28px", borderRadius: "7px", flexShrink: 0,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "700", padding: "0 8px",
    background: answered ? "#eef2ff" : "#f3f4f6",
    color: answered ? "#4f46e5" : "#6b7280", transition: "all 0.15s",
  };
}

function optionBtnStyle(selected) {
  return {
    width: "100%", display: "flex", alignItems: "center", gap: "12px",
    padding: "12px 14px", borderRadius: "10px", cursor: "pointer", textAlign: "left",
    border: `2px solid ${selected ? "#6366f1" : "#e5e7eb"}`,
    background: selected ? "#eef2ff" : "#fff", transition: "all 0.12s",
  };
}

function letterStyle(selected) {
  return {
    width: "30px", height: "30px", borderRadius: "8px", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "13px", fontWeight: "700",
    background: selected ? "#4f46e5" : "#f3f4f6",
    color: selected ? "#fff" : "#6b7280", transition: "all 0.12s",
  };
}

function tfBtnStyle(selected) {
  return {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    padding: "14px", fontSize: "15px", fontWeight: "600", borderRadius: "10px",
    border: `2px solid ${selected ? "#0891b2" : "#e5e7eb"}`,
    background: selected ? "#ecfeff" : "#fff",
    color: selected ? "#0891b2" : "#374151",
    cursor: "pointer", transition: "all 0.12s",
  };
}

function submitBtnStyle(enabled) {
  return {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "12px 28px", fontSize: "15px", fontWeight: "600",
    borderRadius: "10px", border: "none",
    cursor: enabled ? "pointer" : "not-allowed",
    background: enabled ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "#e5e7eb",
    color: enabled ? "#fff" : "#9ca3af",
    boxShadow: enabled ? "0 2px 10px rgba(79,70,229,0.3)" : "none",
    transition: "all 0.15s",
  };
}

const styles = {
  page: { width: "100%", maxWidth: "800px", margin: "0 auto", padding: "2rem 2.5rem" },
  center: { display: "flex", justifyContent: "center", padding: "4rem 0" },
  quizHeader: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: "2rem", gap: "1rem",
  },
  backBtn: {
    display: "flex", alignItems: "center", gap: "6px",
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", fontSize: "13px", fontWeight: "500", padding: "0 0 8px",
  },
  title: { fontSize: "22px", fontWeight: "700", color: "#1e1b4b", margin: 0, letterSpacing: "-0.02em" },
  sub: { fontSize: "14px", color: "#6b7280", marginTop: "4px" },
  progress: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", minWidth: "180px" },
  progressText: { fontSize: "13px", color: "#6b7280", fontWeight: "500" },
  progressBar: { width: "100%", height: "6px", background: "#e5e7eb", borderRadius: "99px", overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #6366f1, #818cf8)", borderRadius: "99px", transition: "width 0.25s ease" },
  questionList: { display: "flex", flexDirection: "column", gap: "18px", marginBottom: "2rem" },
  qHeader: { display: "flex", gap: "10px", alignItems: "flex-start" },
  qText: { fontSize: "16px", fontWeight: "500", color: "#1e1b4b", margin: "0 0 6px" },
  qImageWrap: { borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb", maxWidth: "100%" },
  qImage: { width: "100%", maxHeight: "300px", objectFit: "contain", display: "block", background: "#fafafa" },
  options: { display: "flex", flexDirection: "column", gap: "8px" },
  optText: { fontSize: "15px", color: "#374151", flex: 1 },
  submitBar: {
    display: "flex", justifyContent: "flex-end", alignItems: "center",
    gap: "16px", padding: "1.5rem 0", borderTop: "1px solid #e8eaef",
  },
  submitHint: { display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#6b7280", margin: 0 },
  muted: { color: "#6b7280" },
};
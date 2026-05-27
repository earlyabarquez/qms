import { useEffect, useState } from "react";
import {
  Check, X, ChevronDown, ChevronUp, AlignLeft,
  List, MessageSquare, Loader2, Save,
} from "lucide-react";
import { getQuestions, getQuizSubmissions, gradeSubmission } from "../../utils/firestore";

/**
 * GradeSubmission
 * Props:
 *   quizId      — the quiz being reviewed
 *   onClose     — called when teacher dismisses the panel
 *
 * Shows every student submission that has at least one situational question.
 * Teacher can mark each situational answer correct/incorrect and optionally leave a note.
 * On save, calls gradeSubmission(submissionId, gradedAnswers) in Firestore.
 */
export default function GradeSubmission({ quizId, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSub, setExpandedSub] = useState(null);
  const [grades, setGrades] = useState({}); // { [subId]: { [qIdx]: { correct: bool|null, note: string } } }
  const [saving, setSaving] = useState(null); // subId being saved

  useEffect(() => {
    Promise.all([getQuestions(quizId), getQuizSubmissions(quizId)]).then(
      ([qs, subs]) => {
        setQuestions(qs);
        // Only show submissions that have at least one situational question
        const hasSituational = qs.some((q) => q.type === "situational");
        setSubmissions(hasSituational ? subs : []);

        // Pre-fill grades from existing gradedAnswers on submission
        const initial = {};
        subs.forEach((sub) => {
          initial[sub.id] = {};
          qs.forEach((q, idx) => {
            if (q.type === "situational") {
              const existing = sub.gradedAnswers?.[idx];
              initial[sub.id][idx] = {
                correct: existing?.correct ?? null,
                note: existing?.note ?? "",
              };
            }
          });
        });
        setGrades(initial);
        setLoading(false);
      }
    );
  }, [quizId]);

  const situationalQuestions = questions.filter((q) => q.type === "situational");

  const setGrade = (subId, qIdx, field, value) => {
    setGrades((prev) => ({
      ...prev,
      [subId]: {
        ...prev[subId],
        [qIdx]: {
          ...prev[subId]?.[qIdx],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async (subId) => {
    setSaving(subId);
    await gradeSubmission(subId, grades[subId], questions);
    setSaving(null);
  };

  const gradeComplete = (subId) => {
    if (!grades[subId]) return false;
    return situationalQuestions.every((_, i) => {
      const qIdx = questions.indexOf(situationalQuestions[i]);
      return grades[subId][qIdx]?.correct !== null &&
        grades[subId][qIdx]?.correct !== undefined;
    });
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.panel}>
          <div style={styles.center}>
            <Loader2 size={24} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.panelTitle}>Grade situational answers</h2>
            <p style={styles.panelSub}>
              {submissions.length} submission{submissions.length !== 1 ? "s" : ""} ·{" "}
              {situationalQuestions.length} situational question
              {situationalQuestions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {submissions.length === 0 ? (
          <div style={styles.emptyState}>
            <AlignLeft size={24} color="#a5b4fc" strokeWidth={1.5} />
            <p style={styles.emptyTitle}>No submissions to grade yet</p>
            <p style={styles.emptySub}>Once students submit, their answers will appear here</p>
          </div>
        ) : (
          <div style={styles.list}>
            {submissions.map((sub) => {
              const isExpanded = expandedSub === sub.id;
              const done = gradeComplete(sub.id);

              return (
                <div key={sub.id} style={styles.subCard}>
                  {/* Student row */}
                  <button
                    style={styles.subHeader}
                    onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
                  >
                    <div style={avatarStyle(done)}>
                      {initials(sub.studentName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={styles.studentName}>
                        {sub.studentName || "Unknown student"}
                      </p>
                      <p style={styles.studentEmail}>{sub.studentEmail || ""}</p>
                    </div>
                    <span style={statusPill(done)}>
                      {done ? (
                        <><Check size={11} strokeWidth={3} /> Graded</>
                      ) : (
                        "Pending"
                      )}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={16} color="#6b7280" />
                    ) : (
                      <ChevronDown size={16} color="#6b7280" />
                    )}
                  </button>

                  {/* Expanded: situational answers */}
                  {isExpanded && (
                    <div style={styles.answersWrap}>
                      {questions.map((q, qIdx) => {
                        if (q.type !== "situational") return null;
                        const studentAnswer = sub.answers?.[qIdx];
                        const grade = grades[sub.id]?.[qIdx] || { correct: null, note: "" };

                        return (
                          <div key={qIdx} style={styles.answerBlock}>
                            <div style={styles.questionRow}>
                              <AlignLeft size={13} color="#6366f1" />
                              <p style={styles.qText}>{q.questionText}</p>
                            </div>

                            <div style={styles.studentResponseBox}>
                              <p style={styles.responseLabel}>Student's answer</p>
                              <p style={styles.responseText}>
                                {studentAnswer || (
                                  <em style={{ color: "#9ca3af" }}>No answer provided</em>
                                )}
                              </p>
                            </div>

                            {/* Correct / Incorrect toggle */}
                            <div style={styles.gradeRow}>
                              <button
                                style={gradeBtn(grade.correct === true)}
                                onClick={() => setGrade(sub.id, qIdx, "correct", true)}
                              >
                                <Check size={14} strokeWidth={3} />
                                Correct
                              </button>
                              <button
                                style={gradeBtn(grade.correct === false, true)}
                                onClick={() => setGrade(sub.id, qIdx, "correct", false)}
                              >
                                <X size={14} strokeWidth={3} />
                                Incorrect
                              </button>
                            </div>

                            {/* Note */}
                            <div style={styles.noteWrap}>
                              <label style={styles.noteLabel}>
                                <MessageSquare size={12} strokeWidth={2} />
                                Feedback note (optional)
                              </label>
                              <textarea
                                rows={2}
                                placeholder="e.g. Great critical thinking! You addressed the root cause…"
                                value={grade.note}
                                onChange={(e) =>
                                  setGrade(sub.id, qIdx, "note", e.target.value)
                                }
                                style={styles.noteTextarea}
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* Save button */}
                      <div style={styles.saveRow}>
                        <button
                          style={saveBtn(gradeComplete(sub.id))}
                          onClick={() => handleSave(sub.id)}
                          disabled={saving === sub.id}
                        >
                          {saving === sub.id ? (
                            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                          ) : (
                            <><Save size={14} strokeWidth={2.5} /> Save grades</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function avatarStyle(done) {
  return {
    width: "36px", height: "36px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "700", flexShrink: 0,
    background: done ? "#ecfdf5" : "#f3f4f6",
    color: done ? "#059669" : "#6b7280",
  };
}

function statusPill(done) {
  return {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "12px", fontWeight: "600", padding: "3px 10px",
    borderRadius: "20px",
    background: done ? "#ecfdf5" : "#f9fafb",
    color: done ? "#059669" : "#d97706",
    border: `1px solid ${done ? "#a7f3d0" : "#fde68a"}`,
  };
}

function gradeBtn(active, isWrong = false) {
  const activeColor = isWrong ? "#dc2626" : "#059669";
  const activeBg = isWrong ? "#fef2f2" : "#ecfdf5";
  const activeBorder = isWrong ? "#fecaca" : "#a7f3d0";
  return {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "8px 16px", fontSize: "13px", fontWeight: "600",
    borderRadius: "8px", cursor: "pointer",
    border: `1.5px solid ${active ? activeBorder : "#e5e7eb"}`,
    background: active ? activeBg : "#fafafa",
    color: active ? activeColor : "#6b7280",
    transition: "all 0.15s",
  };
}

function saveBtn(complete) {
  return {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "9px 20px", fontSize: "13px", fontWeight: "600",
    borderRadius: "8px", cursor: "pointer", border: "none",
    background: complete
      ? "linear-gradient(135deg, #4f46e5, #6366f1)"
      : "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff",
    boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
    opacity: 1,
  };
}

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
    zIndex: 100,
    padding: "72px 24px 24px 0",
  },
  panel: {
    background: "#fff", border: "1px solid #e8eaef",
    borderRadius: "18px",
    width: "100%", maxWidth: "560px",
    maxHeight: "calc(100vh - 96px)",
    overflowY: "auto",
    boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "1.5rem 1.5rem 1rem",
    borderBottom: "1px solid #f0f0f4",
  },
  panelTitle: {
    fontSize: "16px", fontWeight: "700", color: "#1e1b4b", margin: "0 0 4px",
  },
  panelSub: { fontSize: "13px", color: "#9ca3af", margin: 0 },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#6b7280", padding: "4px",
    borderRadius: "6px",
  },
  center: { display: "flex", justifyContent: "center", padding: "3rem" },
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "8px", padding: "3rem 2rem", textAlign: "center",
  },
  emptyTitle: { fontSize: "14px", fontWeight: "600", color: "#1e1b4b", margin: 0 },
  emptySub: { fontSize: "13px", color: "#9ca3af", margin: 0 },
  list: {
    display: "flex", flexDirection: "column", gap: "1px",
    padding: "12px",
  },
  subCard: {
    border: "1px solid #e8eaef", borderRadius: "12px",
    overflow: "hidden", marginBottom: "8px",
  },
  subHeader: {
    width: "100%", display: "flex", alignItems: "center", gap: "12px",
    padding: "14px 16px", background: "#fafafa",
    border: "none", cursor: "pointer", textAlign: "left",
  },
  studentName: {
    fontSize: "14px", fontWeight: "600", color: "#1e1b4b", margin: 0,
  },
  studentEmail: {
    fontSize: "12px", color: "#9ca3af", margin: 0,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  answersWrap: {
    padding: "16px",
    display: "flex", flexDirection: "column", gap: "20px",
    background: "#fff",
    borderTop: "1px solid #f0f0f4",
  },
  answerBlock: {
    display: "flex", flexDirection: "column", gap: "10px",
    padding: "14px",
    background: "#fafafa",
    borderRadius: "10px",
    border: "1px solid #e8eaef",
  },
  questionRow: {
    display: "flex", gap: "8px", alignItems: "flex-start",
  },
  qText: {
    fontSize: "14px", fontWeight: "600", color: "#1e1b4b",
    margin: 0, lineHeight: "1.4",
  },
  studentResponseBox: {
    background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: "8px", padding: "10px 12px",
  },
  responseLabel: {
    fontSize: "11px", fontWeight: "600", color: "#9ca3af",
    margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em",
  },
  responseText: {
    fontSize: "14px", color: "#374151", margin: 0, lineHeight: "1.6",
  },
  gradeRow: { display: "flex", gap: "8px" },
  noteWrap: { display: "flex", flexDirection: "column", gap: "6px" },
  noteLabel: {
    display: "flex", alignItems: "center", gap: "5px",
    fontSize: "12px", fontWeight: "600", color: "#6b7280",
  },
  noteTextarea: {
    width: "100%", padding: "10px 12px", fontSize: "13px",
    border: "1.5px solid #e5e7eb", borderRadius: "8px",
    outline: "none", resize: "vertical", fontFamily: "inherit",
    boxSizing: "border-box", background: "#fff", lineHeight: "1.5",
  },
  saveRow: {
    display: "flex", justifyContent: "flex-end",
    paddingTop: "4px",
  },
};
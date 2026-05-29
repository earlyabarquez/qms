import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { getQuestions, getQuizSubmissions, setQuizPublished, deleteQuestion } from "../../utils/firestore";
import QuestionForm from "./QuestionForm";
import {
  ArrowLeft, Eye, EyeOff, Check, Loader2, FileText, HelpCircle,
  Trash2, Copy, AlignLeft, Pencil, Lock, AlertTriangle,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D"];

const TYPE_PILL = {
  situational:    { label: "Situational",    color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  true_false:     { label: "True or False",  color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  identification: { label: "Identification", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
};

export default function QuizDetail() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [deletingQId, setDeletingQId] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [hasSubmissions, setHasSubmissions] = useState(false);

  useEffect(() => {
    async function load() {
      const [quizSnap, qs, subs] = await Promise.all([
        getDoc(doc(db, "quizzes", quizId)),
        getQuestions(quizId),
        getQuizSubmissions(quizId),
      ]);
      if (quizSnap.exists()) setQuiz({ id: quizSnap.id, ...quizSnap.data() });
      setQuestions(qs);
      setHasSubmissions(subs.length > 0);
      setLoading(false);
    }
    load();
  }, [quizId]);

  // locked = published OR (unpublished but has submissions)
  const isLocked = quiz?.isPublished || hasSubmissions;

  const lockReason = quiz?.isPublished
    ? "published"
    : hasSubmissions
    ? "submissions"
    : null;

  const handleQuestionAdded = (newQuestion) => setQuestions((prev) => [...prev, newQuestion]);

  const handleQuestionUpdated = (updated) => {
    setQuestions((prev) => prev.map((q) => q.id === updated.id ? updated : q));
    setEditingQuestion(null);
  };

  const handleTogglePublish = async () => {
    await setQuizPublished(quizId, !quiz.isPublished);
    setQuiz((prev) => ({ ...prev, isPublished: !prev.isPublished }));
    // clear editing state when toggling
    setEditingQuestion(null);
  };

  const handleCopyCode = async () => {
    if (!quiz?.quizCode) return;
    await navigator.clipboard.writeText(quiz.quizCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleDeleteQuestion = async (qId) => {
    if (isLocked) return;
    setDeletingQId(qId);
    try {
      await deleteQuestion(qId);
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      if (editingQuestion?.id === qId) setEditingQuestion(null);
    } catch (err) {
      console.error("Delete question failed:", err);
    } finally {
      setDeletingQId(null);
    }
  };

  if (loading) return (
    <div style={styles.page}><div style={styles.center}>
      <Loader2 size={28} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
    </div></div>
  );

  if (!quiz) return <div style={styles.page}><p style={styles.muted}>Quiz not found.</p></div>;

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate("/teacher")}>
        <ArrowLeft size={15} strokeWidth={2} /> Back to quizzes
      </button>

      {/* Quiz header */}
      <div style={styles.quizHeader}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <FileText size={22} color="#6366f1" strokeWidth={2} />
          </div>
          <div>
            <h1 style={styles.title}>{quiz.title}</h1>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px", flexWrap: "wrap" }}>
              <span style={statusBadge(quiz.isPublished)}>
                {quiz.isPublished
                  ? <><Eye size={11} strokeWidth={2.5} /> Published</>
                  : <><EyeOff size={11} strokeWidth={2.5} /> Draft</>}
              </span>
              {quiz.quizCode && (
                <button onClick={handleCopyCode} style={styles.codeBadge} title="Click to copy quiz code">
                  {codeCopied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
                  {" "}Code: {quiz.quizCode}
                </button>
              )}
            </div>
          </div>
        </div>
        <button style={publishBtnStyle(quiz.isPublished)} onClick={handleTogglePublish}>
          {quiz.isPublished
            ? <><EyeOff size={14} strokeWidth={2} /> Unpublish</>
            : <><Eye size={14} strokeWidth={2} /> Publish quiz</>}
        </button>
      </div>

      {/* Lock warning banner */}
      {lockReason && (
        <div style={lockBannerStyle(lockReason)}>
          {lockReason === "published"
            ? <><Lock size={14} strokeWidth={2} /> Questions are locked while the quiz is published. <strong>Unpublish</strong> the quiz to make changes.</>
            : <><AlertTriangle size={14} strokeWidth={2} /> Questions are locked because students have already submitted answers.</>}
        </div>
      )}

      <div style={styles.layout}>
        {/* Left — question list */}
        <div style={styles.left}>
          <h2 style={styles.sectionTitle}>
            <HelpCircle size={16} strokeWidth={2} color="#6366f1" />
            Questions
            <span style={styles.count}>{questions.length}</span>
          </h2>

          {questions.length === 0 ? (
            <div style={styles.emptyCard}>
              <HelpCircle size={24} color="#a5b4fc" strokeWidth={1.5} />
              <p style={styles.emptyText}>No questions yet. Add your first question using the form.</p>
            </div>
          ) : (
            <div style={styles.questionList}>
              {questions.map((q, i) => {
                const pill = TYPE_PILL[q.type];
                const isEditing = editingQuestion?.id === q.id;
                return (
                  <div key={q.id} style={questionCardStyle(isEditing, isLocked)}>
                    <div style={styles.qHeader}>
                      <span style={styles.qNum}>Q{i + 1}</span>
                      <p style={styles.qText}>{q.questionText}</p>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center", flexShrink: 0 }}>
                        {pill && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: pill.color, background: pill.bg, border: `1px solid ${pill.border}`, borderRadius: "20px", padding: "2px 8px" }}>
                            {q.type === "situational" && <AlignLeft size={10} strokeWidth={2} />}
                            {pill.label}
                          </span>
                        )}
                        {/* Edit button — hidden when locked */}
                        {!isLocked && (
                          <button
                            onClick={() => setEditingQuestion(isEditing ? null : q)}
                            style={editBtnStyle(isEditing)}
                            title={isEditing ? "Cancel edit" : "Edit question"}
                          >
                            {isEditing
                              ? <Check size={12} strokeWidth={2.5} />
                              : <Pencil size={12} strokeWidth={2} />}
                          </button>
                        )}
                        {/* Delete button — hidden when locked */}
                        {!isLocked && (
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            disabled={deletingQId === q.id}
                            style={styles.qDeleteBtn}
                            title="Delete question"
                          >
                            {deletingQId === q.id
                              ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                              : <Trash2 size={12} strokeWidth={2} />}
                          </button>
                        )}
                        {/* Lock icon when locked */}
                        {isLocked && (
                          <span style={styles.qLockIcon} title="Locked">
                            <Lock size={12} strokeWidth={2} />
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

                    {/* MC options */}
                    {q.type === "mc" && q.options && (
                      <div style={styles.options}>
                        {q.options.map((opt, idx) => {
                          const isCorrect = idx === q.correctAnswer;
                          return (
                            <div key={idx} style={optionStyle(isCorrect)}>
                              <span style={optLetterStyle(isCorrect)}>
                                {isCorrect ? <Check size={11} strokeWidth={3} /> : LETTERS[idx]}
                              </span>
                              <span style={styles.optText}>{opt}</span>
                              {isCorrect && <span style={styles.correct}><Check size={11} strokeWidth={2.5} /> Correct</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* True/False */}
                    {q.type === "true_false" && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        {["True", "False"].map((label, idx) => {
                          const isCorrect = idx === q.correctAnswer;
                          return (
                            <div key={label} style={optionStyle(isCorrect)}>
                              <span style={optLetterStyle(isCorrect)}>
                                {isCorrect ? <Check size={11} strokeWidth={3} /> : label[0]}
                              </span>
                              <span style={styles.optText}>{label}</span>
                              {isCorrect && <span style={styles.correct}><Check size={11} strokeWidth={2.5} /> Correct</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Identification */}
                    {q.type === "identification" && (
                      <div style={styles.identPlaceholder}>
                        <span style={styles.identAnswerLabel}>Answer key:</span>
                        <span style={styles.identAnswerValue}>{q.answerKey}</span>
                      </div>
                    )}

                    {/* Situational */}
                    {q.type === "situational" && (
                      <div style={styles.situationalPlaceholder}>
                        <AlignLeft size={13} color="#6366f1" strokeWidth={2} />
                        Students will type a free-text response — graded manually by you
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — QuestionForm or locked state */}
        <div style={styles.right}>
          {isLocked ? (
            <div style={styles.lockedFormCard}>
              <div style={styles.lockedFormIcon}>
                <Lock size={22} color="#9ca3af" strokeWidth={1.5} />
              </div>
              <p style={styles.lockedFormTitle}>Form locked</p>
              <p style={styles.lockedFormSub}>
                {lockReason === "published"
                  ? "Unpublish the quiz to add or edit questions."
                  : "Questions cannot be changed after students have submitted answers."}
              </p>
            </div>
          ) : (
            <QuestionForm
              quizId={quizId}
              onAdded={handleQuestionAdded}
              onUpdated={handleQuestionUpdated}
              editingQuestion={editingQuestion}
              onCancelEdit={() => setEditingQuestion(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Style helpers ──────────────────────────────────────────────────────────

function lockBannerStyle(reason) {
  const isPublished = reason === "published";
  return {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "12px 16px", borderRadius: "12px", marginBottom: "1.5rem",
    fontSize: "13px", fontWeight: "500", lineHeight: 1.5,
    background: isPublished ? "#fffbeb" : "#fef2f2",
    border: `1px solid ${isPublished ? "#fde68a" : "#fecaca"}`,
    color: isPublished ? "#92400e" : "#991b1b",
  };
}

function questionCardStyle(isEditing, isLocked) {
  return {
    background: isLocked ? "#fafafa" : "#fff",
    border: `1.5px solid ${isEditing ? "#a5b4fc" : isLocked ? "#f0f0f0" : "#e8eaef"}`,
    borderRadius: "14px", padding: "1.25rem",
    display: "flex", flexDirection: "column", gap: "12px",
    boxShadow: isEditing ? "0 0 0 3px #eef2ff" : "0 1px 3px rgba(0,0,0,0.04)",
    transition: "all 0.15s",
    opacity: isLocked ? 0.85 : 1,
  };
}

function editBtnStyle(isEditing) {
  return {
    width: "28px", height: "28px", borderRadius: "6px",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: isEditing ? "#eef2ff" : "none",
    border: `1px solid ${isEditing ? "#a5b4fc" : "#e5e7eb"}`,
    color: isEditing ? "#4f46e5" : "#6b7280",
    cursor: "pointer", flexShrink: 0,
  };
}

function statusBadge(published) {
  return {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "12px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px",
    background: published ? "#ecfdf5" : "#f9fafb",
    color: published ? "#059669" : "#6b7280",
    border: `1px solid ${published ? "#a7f3d0" : "#e5e7eb"}`,
  };
}

function publishBtnStyle(isPublished) {
  return {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "10px 18px", fontSize: "14px", fontWeight: "600",
    borderRadius: "10px", cursor: "pointer",
    background: isPublished ? "#fef2f2" : "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: isPublished ? "#dc2626" : "#fff",
    border: isPublished ? "1px solid #fecaca" : "none",
    boxShadow: isPublished ? "none" : "0 2px 8px rgba(79,70,229,0.25)",
    transition: "all 0.15s",
  };
}

function optionStyle(correct) {
  return {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "8px 12px", borderRadius: "8px",
    background: correct ? "#ecfdf5" : "#f9fafb",
    border: `1px solid ${correct ? "#a7f3d0" : "#e5e7eb"}`,
    flex: 1,
  };
}

function optLetterStyle(correct) {
  return {
    width: "24px", height: "24px", borderRadius: "6px", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: "700",
    background: correct ? "#059669" : "#f3f4f6",
    color: correct ? "#fff" : "#9ca3af",
  };
}

const styles = {
  page: { width: "100%", maxWidth: "1440px", margin: "0 auto", padding: "2rem 2.5rem" },
  center: { display: "flex", justifyContent: "center", padding: "4rem 0" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "13px", fontWeight: "500", padding: "0 0 1.5rem" },
  quizHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  headerLeft: { display: "flex", gap: "14px", alignItems: "flex-start" },
  headerIcon: { width: "48px", height: "48px", borderRadius: "14px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: "22px", fontWeight: "700", color: "#1e1b4b", margin: 0, letterSpacing: "-0.02em" },
  codeBadge: { display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", padding: "3px 10px", borderRadius: "6px", background: "#f5f3ff", color: "#6366f1", border: "1px solid #c7d2fe", cursor: "pointer", fontFamily: "monospace" },
  layout: { display: "grid", gridTemplateColumns: "1fr 420px", gap: "28px", alignItems: "flex-start" },
  left: {},
  right: { position: "sticky", top: "76px" },
  sectionTitle: { display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: "700", color: "#1e1b4b", marginBottom: "14px" },
  count: { background: "#eef2ff", color: "#4f46e5", fontSize: "12px", fontWeight: "700", padding: "2px 10px", borderRadius: "20px" },
  questionList: { display: "flex", flexDirection: "column", gap: "14px" },
  qHeader: { display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" },
  qNum: { background: "#eef2ff", color: "#4f46e5", fontSize: "12px", fontWeight: "700", padding: "3px 10px", borderRadius: "6px", flexShrink: 0 },
  qText: { fontSize: "15px", fontWeight: "500", color: "#1e1b4b", margin: 0, flex: 1 },
  qDeleteBtn: { width: "28px", height: "28px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #fecaca", color: "#dc2626", cursor: "pointer", flexShrink: 0 },
  qLockIcon: { width: "28px", height: "28px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#d1d5db", flexShrink: 0 },
  qImageWrap: { borderRadius: "10px", overflow: "hidden", border: "1px solid #e5e7eb", maxWidth: "100%" },
  qImage: { width: "100%", maxHeight: "240px", objectFit: "contain", display: "block", background: "#fafafa" },
  options: { display: "flex", flexDirection: "column", gap: "6px" },
  optText: { fontSize: "14px", color: "#374151", flex: 1 },
  correct: { display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "600", color: "#059669" },
  identPlaceholder: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "8px", background: "#f5f3ff", border: "1px solid #ddd6fe" },
  identAnswerLabel: { fontSize: "12px", fontWeight: "600", color: "#7c3aed" },
  identAnswerValue: { fontSize: "14px", fontWeight: "600", color: "#1e1b4b" },
  situationalPlaceholder: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "8px", background: "#eef2ff", border: "1px solid #c7d2fe", fontSize: "13px", color: "#4f46e5", fontWeight: "500" },
  emptyCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", background: "#fafafa", border: "2px dashed #e5e7eb", borderRadius: "14px", padding: "2.5rem", textAlign: "center" },
  emptyText: { fontSize: "14px", color: "#6b7280", margin: 0 },
  muted: { color: "#6b7280" },
  lockedFormCard: { background: "#fafafa", border: "2px dashed #e5e7eb", borderRadius: "16px", padding: "2.5rem 1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", textAlign: "center" },
  lockedFormIcon: { width: "52px", height: "52px", borderRadius: "14px", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" },
  lockedFormTitle: { fontSize: "15px", fontWeight: "700", color: "#6b7280", margin: 0 },
  lockedFormSub: { fontSize: "13px", color: "#9ca3af", margin: 0, lineHeight: 1.5 },
};
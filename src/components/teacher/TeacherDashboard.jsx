import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getTeacherQuizzes, setQuizPublished, deleteQuiz } from "../../utils/firestore";
import NavBar from "../shared/NavBar";
import CreateQuiz from "./CreateQuiz";
import QuizDetail from "./QuizDetail";
import {
  Plus, FileText, Pencil, Eye, EyeOff, Inbox, Loader2,
  Trash2, Copy, Check,
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
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteQuiz(deleteTarget.id);
      setQuizzes((prev) => prev.filter((q) => q.id !== deleteTarget.id));
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Quizzes</h1>
          <p style={styles.sub}>Create and manage your assessments</p>
        </div>
        <button style={styles.primaryBtn} onClick={() => navigate("/teacher/create")}>
          <Plus size={16} strokeWidth={2.5} /> New Quiz
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
            <Plus size={16} strokeWidth={2.5} /> Create a Quiz
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onEdit={() => navigate(`/teacher/quiz/${quiz.id}`)}
              onTogglePublish={() => handleTogglePublish(quiz)}
              onDelete={() => setDeleteTarget(quiz)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={styles.overlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p style={styles.modalEmoji}>🗑️</p>
            <h2 style={styles.modalTitle}>Delete quiz?</h2>
            <p style={styles.modalSub}>
              "<strong>{deleteTarget.title}</strong>" and all its questions
              and submissions will be permanently deleted. This can't be undone.
            </p>
            <div style={styles.modalBtns}>
              <button onClick={() => setDeleteTarget(null)} style={styles.cancelBtn} disabled={deleting}>
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} style={styles.deleteConfirmBtn} disabled={deleting}>
                {deleting
                  ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  : <><Trash2 size={14} /> Delete</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quiz card with code badge ────────────────────────────────────────────

function QuizCard({ quiz, onEdit, onTogglePublish, onDelete }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!quiz.quizCode) return;
    await navigator.clipboard.writeText(quiz.quizCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div style={styles.cardIcon}>
          <FileText size={20} color="#6366f1" strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={styles.quizTitle}>{quiz.title}</h2>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "6px" }}>
            <span style={statusBadge(quiz.isPublished)}>
              {quiz.isPublished ? (
                <><Eye size={11} strokeWidth={2.5} /> Published</>
              ) : (
                <><EyeOff size={11} strokeWidth={2.5} /> Draft</>
              )}
            </span>
            {quiz.quizCode && (
              <button onClick={handleCopyCode} style={styles.codeBadge} title="Click to copy code">
                {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
                {" "}{quiz.quizCode}
              </button>
            )}
          </div>
        </div>

        {/* Delete button */}
        <button onClick={onDelete} style={styles.deleteBtn} title="Delete quiz">
          <Trash2 size={15} strokeWidth={2} />
        </button>
      </div>

      <div style={styles.cardActions}>
        <button style={styles.secondaryBtn} onClick={onEdit}>
          <Pencil size={13} strokeWidth={2} /> Edit / Questions
        </button>
        <button style={publishToggleStyle(quiz.isPublished)} onClick={onTogglePublish}>
          {quiz.isPublished ? (
            <><EyeOff size={13} strokeWidth={2} /> Unpublish</>
          ) : (
            <><Eye size={13} strokeWidth={2} /> Publish</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────

function statusBadge(published) {
  return {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "12px", fontWeight: "600",
    padding: "3px 10px", borderRadius: "20px",
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
    cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
    transition: "all 0.15s",
  },
  center: { display: "flex", justifyContent: "center", padding: "4rem 0" },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
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
  quizTitle: { fontSize: "15px", fontWeight: "600", color: "#1e1b4b", margin: 0 },
  codeBadge: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    fontSize: "11px", fontWeight: "700", letterSpacing: "0.06em",
    padding: "3px 8px", borderRadius: "6px",
    background: "#f5f3ff", color: "#6366f1",
    border: "1px solid #c7d2fe", cursor: "pointer",
    fontFamily: "monospace",
  },
  deleteBtn: {
    width: "32px", height: "32px", borderRadius: "8px",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "none", border: "1px solid #fecaca",
    color: "#dc2626", cursor: "pointer", flexShrink: 0,
    transition: "all 0.15s",
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

  // Modal
  overlay: {
    position: "fixed", inset: 0, zIndex: 100,
    background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    background: "#fff", borderRadius: "20px",
    padding: "2rem", width: "100%", maxWidth: "380px",
    textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  modalEmoji: { fontSize: "40px", margin: "0 0 10px" },
  modalTitle: {
    fontSize: "20px", fontWeight: "800", color: "#111827",
    margin: "0 0 8px", letterSpacing: "-0.02em",
  },
  modalSub: { fontSize: "14px", color: "#6b7280", margin: "0 0 20px", lineHeight: "1.5" },
  modalBtns: { display: "flex", gap: "10px" },
  cancelBtn: {
    flex: 1, padding: "10px", fontSize: "14px", fontWeight: "600",
    border: "1.5px solid #e5e7eb", borderRadius: "10px",
    background: "#f9fafb", color: "#374151", cursor: "pointer",
  },
  deleteConfirmBtn: {
    flex: 1, padding: "10px", fontSize: "14px", fontWeight: "600",
    border: "none", borderRadius: "10px",
    background: "#dc2626", color: "#fff", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
    boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
  },
};
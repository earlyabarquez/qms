import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getTeacherQuizzes, setQuizPublished, deleteQuiz, getQuizSubmissions, getQuestions } from "../../utils/firestore";
import NavBar from "../shared/NavBar";
import CreateQuiz from "./CreateQuiz";
import QuizDetail from "./QuizDetail";
import GradeSubmission from "./GradeSubmission";
import {
  Plus, FileText, Pencil, Eye, EyeOff, Inbox, Loader2,
  Trash2, Copy, Check, BarChart2, X,
  CheckCircle, XCircle, Clock, Crown, UserX,
} from "lucide-react";

const PASS_THRESHOLD = 60;

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
  const [analyticsQuiz, setAnalyticsQuiz] = useState(null);
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
              onViewAnalytics={() => setAnalyticsQuiz(quiz)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={styles.overlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIconWrap}>
              <Trash2 size={22} color="#dc2626" strokeWidth={2} />
            </div>
            <h2 style={styles.modalTitle}>Delete quiz?</h2>
            <p style={styles.modalSub}>
              <strong>"{deleteTarget.title}"</strong> and all its questions and submissions
              will be permanently deleted. This can't be undone.
            </p>
            <div style={styles.modalBtns}>
              <button onClick={() => setDeleteTarget(null)} style={styles.cancelBtn} disabled={deleting}>
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} style={styles.deleteConfirmBtn} disabled={deleting}>
                {deleting
                  ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  : <><Trash2 size={14} /> Delete forever</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics modal */}
      {analyticsQuiz && (
        <AnalyticsModal
          quiz={analyticsQuiz}
          onClose={() => setAnalyticsQuiz(null)}
        />
      )}
    </div>
  );
}

// ─── Quiz Card ─────────────────────────────────────────────────────────────

function QuizCard({ quiz, onEdit, onTogglePublish, onDelete, onViewAnalytics }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async (e) => {
    e.stopPropagation();
    if (!quiz.quizCode) return;
    await navigator.clipboard.writeText(quiz.quizCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={card.wrap}>
      {/* ── Top: status strip ── */}
      <div style={card.statusStrip(quiz.isPublished)}>
        <span style={card.statusDot(quiz.isPublished)} />
        <span style={card.statusText(quiz.isPublished)}>
          {quiz.isPublished ? "Published" : "Draft"}
        </span>
        {/* delete sits in top-right */}
        <button onClick={onDelete} style={card.deleteBtn} title="Delete quiz">
          <Trash2 size={13} strokeWidth={2} />
        </button>
      </div>

      {/* ── Middle: title + code ── */}
      <div style={card.body}>
        <div style={card.iconWrap}>
          <FileText size={20} color="#6366f1" strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={card.title}>{quiz.title}</h2>
          {quiz.quizCode && (
            <button onClick={handleCopyCode} style={card.codePill} title="Copy code">
              {copied
                ? <><Check size={11} strokeWidth={3} /> Copied!</>
                : <><Copy size={11} strokeWidth={2} /> {quiz.quizCode}</>}
            </button>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={card.divider} />

      {/* ── Bottom: actions ── */}
      <div style={card.actions}>
        {/* Primary: Edit */}
        <button style={card.editBtn} onClick={onEdit}>
          <Pencil size={13} strokeWidth={2.5} />
          Edit Questions
        </button>

        {/* Secondary group: Submissions + Publish toggle */}
        <div style={card.secondaryRow}>
          <button style={card.submissionsBtn} onClick={onViewAnalytics}>
            <BarChart2 size={13} strokeWidth={2} />
            Submissions
          </button>
          <button style={card.publishBtn(quiz.isPublished)} onClick={onTogglePublish}>
            {quiz.isPublished
              ? <><EyeOff size={13} strokeWidth={2} /> Unpublish</>
              : <><Eye size={13} strokeWidth={2} /> Publish</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card style object ─────────────────────────────────────────────────────

const card = {
  wrap: {
    background: "#fff",
    border: "1px solid #e8eaef",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    transition: "box-shadow 0.15s, transform 0.15s",
  },
  statusStrip: (pub) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    background: pub ? "#f0fdf4" : "#fafafa",
    borderBottom: `1px solid ${pub ? "#bbf7d0" : "#f0f0f0"}`,
  }),
  statusDot: (pub) => ({
    width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0,
    background: pub ? "#22c55e" : "#d1d5db",
    boxShadow: pub ? "0 0 0 2px #bbf7d0" : "none",
  }),
  statusText: (pub) => ({
    fontSize: "11px", fontWeight: "700",
    color: pub ? "#15803d" : "#9ca3af",
    textTransform: "uppercase", letterSpacing: "0.06em",
    flex: 1,
  }),
  deleteBtn: {
    width: "26px", height: "26px", borderRadius: "6px", marginLeft: "auto",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "none", border: "1px solid #fecaca",
    color: "#dc2626", cursor: "pointer", flexShrink: 0,
    transition: "background 0.15s",
  },
  body: {
    display: "flex", alignItems: "flex-start", gap: "12px",
    padding: "1rem 1.25rem 0.75rem",
  },
  iconWrap: {
    width: "40px", height: "40px", borderRadius: "11px",
    background: "#eef2ff", display: "flex", alignItems: "center",
    justifyContent: "center", flexShrink: 0, marginTop: "2px",
  },
  title: {
    fontSize: "15px", fontWeight: "700", color: "#1e1b4b",
    margin: "0 0 6px", lineHeight: 1.3,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  codePill: {
    display: "inline-flex", alignItems: "center", gap: "5px",
    fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em",
    padding: "3px 9px", borderRadius: "6px",
    background: "#f5f3ff", color: "#6366f1",
    border: "1px solid #c7d2fe", cursor: "pointer",
    fontFamily: "monospace", transition: "background 0.15s",
  },
  divider: {
    height: "1px", background: "#f3f4f6", margin: "0 1.25rem",
  },
  actions: {
    display: "flex", flexDirection: "column", gap: "8px",
    padding: "0.75rem 1.25rem 1.25rem",
  },
  editBtn: {
    width: "100%",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
    padding: "10px", fontSize: "13px", fontWeight: "600",
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff", border: "none", borderRadius: "10px",
    cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.22)",
    transition: "opacity 0.15s",
  },
  secondaryRow: {
    display: "flex", gap: "8px",
  },
  submissionsBtn: {
    flex: 1,
    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
    padding: "8px 10px", fontSize: "12px", fontWeight: "600",
    background: "#f5f3ff", color: "#6366f1",
    border: "1px solid #c7d2fe", borderRadius: "8px",
    cursor: "pointer", transition: "background 0.15s",
  },
  publishBtn: (pub) => ({
    flex: 1,
    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
    padding: "8px 10px", fontSize: "12px", fontWeight: "600",
    background: pub ? "#fef2f2" : "#f0fdf4",
    color: pub ? "#dc2626" : "#15803d",
    border: `1px solid ${pub ? "#fecaca" : "#bbf7d0"}`,
    borderRadius: "8px", cursor: "pointer", transition: "background 0.15s",
  }),
};

// ─── Analytics Modal ───────────────────────────────────────────────────────

function AnalyticsModal({ quiz, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGrader, setShowGrader] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    Promise.all([getQuizSubmissions(quiz.id), getQuestions(quiz.id)]).then(
      ([subs, qs]) => { setSubmissions(subs); setQuestions(qs); setLoading(false); }
    );
  }, [quiz.id]);

  const reload = () => {
    setLoading(true);
    Promise.all([getQuizSubmissions(quiz.id), getQuestions(quiz.id)]).then(
      ([subs, qs]) => { setSubmissions(subs); setQuestions(qs); setLoading(false); }
    );
  };

  const hasSituational = questions.some((q) => q.type === "situational");
  const isPending = (s) => (s.gradedAnswers || []).some((g) => g.type === "situational" && g.correct === null);
  const getStatus = (s) => {
    if (isPending(s)) return "pending";
    return Math.round((s.score / s.total) * 100) >= PASS_THRESHOLD ? "passed" : "failed";
  };

  const totalStudents = submissions.length;
  const passCount = submissions.filter((s) => getStatus(s) === "passed").length;
  const failCount = submissions.filter((s) => getStatus(s) === "failed").length;
  const pendingCount = submissions.filter((s) => getStatus(s) === "pending").length;
  const avgScore = totalStudents > 0
    ? Math.round(submissions.reduce((sum, s) => sum + (s.score / s.total) * 100, 0) / totalStudents)
    : 0;

  const FILTERS = [
    { key: "all",     label: "All",     count: totalStudents },
    { key: "passed",  label: "Passed",  count: passCount },
    { key: "failed",  label: "Failed",  count: failCount },
    ...(pendingCount > 0 ? [{ key: "pending", label: "Pending", count: pendingCount }] : []),
  ];

  const filtered = [...submissions]
    .filter((s) => filter === "all" ? true : getStatus(s) === filter)
    .sort((a, b) => b.score / b.total - a.score / a.total);

  function initials(name) {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <>
      <div style={modal.overlay} onClick={onClose}>
        <div style={modal.panel} onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div style={modal.header}>
            <div style={modal.headerLeft}>
              <div style={modal.headerIcon}>
                <BarChart2 size={18} color="#6366f1" strokeWidth={2} />
              </div>
              <div>
                <h2 style={modal.title}>{quiz.title}</h2>
                <p style={modal.subtitle}>Submissions & Analytics</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {hasSituational && pendingCount > 0 && (
                <button style={modal.gradeBtn} onClick={() => setShowGrader(true)}>
                  <Pencil size={12} strokeWidth={2} />
                  Grade
                  <span style={modal.pendingBadge}>{pendingCount}</span>
                </button>
              )}
              <button style={modal.closeBtn} onClick={onClose}>
                <X size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={modal.body}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                <Loader2 size={28} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : totalStudents === 0 ? (
              <div style={modal.emptyState}>
                <div style={modal.emptyIcon}><UserX size={28} color="#a5b4fc" strokeWidth={1.5} /></div>
                <p style={modal.emptyTitle}>No submissions yet</p>
                <p style={modal.emptySub}>Scores will appear once students take this quiz</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div style={modal.statsRow}>
                  {[
                    { label: "Taken",   value: totalStudents,    color: "#1e1b4b" },
                    { label: "Passed",  value: passCount,        color: "#059669" },
                    { label: "Failed",  value: failCount,        color: "#dc2626" },
                    ...(pendingCount > 0 ? [{ label: "Pending", value: pendingCount, color: "#d97706" }] : []),
                    { label: "Average", value: `${avgScore}%`,   color: "#4f46e5" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={modal.statBox}>
                      <span style={{ ...modal.statNum, color }}>{value}</span>
                      <span style={modal.statLabel}>{label}</span>
                    </div>
                  ))}
                </div>

                {/* Pass rate bar */}
                <div style={modal.passRateWrap}>
                  <div style={modal.passRateHeader}>
                    <span style={modal.passRateLabel}>Pass rate</span>
                    <span style={modal.passRatePct}>{Math.round((passCount / totalStudents) * 100)}%</span>
                  </div>
                  <div style={modal.passRateBar}>
                    <div style={{ ...modal.passRateFill, width: `${(passCount / totalStudents) * 100}%` }} />
                  </div>
                </div>

                {/* Filters */}
                <div style={modal.filterRow}>
                  {FILTERS.map(({ key, label, count }) => (
                    <button key={key} style={filterTabStyle(filter === key, key)} onClick={() => setFilter(key)}>
                      {label}
                      <span style={filterCountStyle(filter === key, key)}>{count}</span>
                    </button>
                  ))}
                </div>

                {/* List header */}
                <div style={modal.listHeader}>
                  <span style={modal.listHeaderText}>Student</span>
                  <span style={modal.listHeaderText}>Score</span>
                </div>

                {/* Student rows */}
                <div style={modal.list}>
                  {filtered.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "13px", padding: "1.5rem 0" }}>
                      No students in this category.
                    </p>
                  ) : filtered.map((sub, idx) => {
                    const pct = Math.round((sub.score / sub.total) * 100);
                    const passed = pct >= PASS_THRESHOLD;
                    const pending = isPending(sub);
                    const isTop = idx === 0 && pct > 0 && !pending && filter !== "failed";
                    return (
                      <div key={sub.id || idx} style={studentRowStyle(passed, pending)}>
                        <div style={modal.studentLeft}>
                          <div style={avatarWrapStyle(passed, pending, isTop)}>
                            {isTop && !sub.studentPhoto ? (
                              <Crown size={12} strokeWidth={2.5} />
                            ) : sub.studentPhoto ? (
                              <img src={sub.studentPhoto} alt="" style={modal.avatarImg} />
                            ) : (
                              initials(sub.studentName)
                            )}
                            {isTop && sub.studentPhoto && (
                              <div style={modal.crownBadge}>
                                <Crown size={8} strokeWidth={2.5} />
                              </div>
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span style={modal.studentName}>{sub.studentName || "Unknown"}</span>
                            <span style={modal.studentEmail}>{sub.studentEmail || ""}</span>
                          </div>
                        </div>
                        <div style={modal.studentRight}>
                          {pending && (
                            <span style={modal.pendingTag}>
                              <Clock size={10} strokeWidth={2} /> Pending
                            </span>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                            <span style={scoreTextStyle(pct, pending)}>{sub.score}/{sub.total}</span>
                            <span style={pctBadgeStyle(pct, pending)}>{pending ? "—" : `${pct}%`}</span>
                          </div>
                          <span style={statusIconStyle(passed, pending)}>
                            {pending
                              ? <Clock size={14} strokeWidth={2.5} />
                              : passed
                              ? <CheckCircle size={14} strokeWidth={2.5} />
                              : <XCircle size={14} strokeWidth={2.5} />}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showGrader && (
        <GradeSubmission
          quizId={quiz.id}
          onClose={() => { setShowGrader(false); reload(); }}
        />
      )}
    </>
  );
}

// ─── Style helpers ─────────────────────────────────────────────────────────

function filterTabStyle(active, key) {
  const colors = {
    passed:  { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
    failed:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
    pending: { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
    all:     { bg: "#eef2ff", color: "#4f46e5", border: "#c7d2fe" },
  };
  const c = colors[key];
  return {
    display: "flex", alignItems: "center", gap: 5,
    padding: "5px 12px", fontSize: 12, fontWeight: 600,
    borderRadius: 20, cursor: "pointer",
    border: `1px solid ${active ? c.border : "#e5e7eb"}`,
    background: active ? c.bg : "#f9fafb",
    color: active ? c.color : "#6b7280",
    transition: "all 0.15s",
  };
}

function filterCountStyle(active, key) {
  const colors = { passed: "#059669", failed: "#dc2626", pending: "#d97706", all: "#4f46e5" };
  return {
    fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: "center",
    padding: "0 5px", borderRadius: 99,
    background: active ? "rgba(0,0,0,0.08)" : "#e5e7eb",
    color: active ? colors[key] : "#9ca3af",
  };
}

function studentRowStyle(passed, pending) {
  return {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 12px", borderRadius: "10px", background: "#fafafa",
    border: `1px solid ${pending ? "#fde68a" : passed ? "#e8eaef" : "#fee2e2"}`,
  };
}

function avatarWrapStyle(passed, pending, isTop) {
  return {
    width: "34px", height: "34px", borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: "700", flexShrink: 0,
    overflow: "hidden", position: "relative",
    background: pending ? "#fffbeb" : isTop ? "#fef3c7" : passed ? "#eef2ff" : "#fef2f2",
    color: pending ? "#d97706" : isTop ? "#d97706" : passed ? "#4f46e5" : "#dc2626",
    border: isTop ? "2px solid #fbbf24" : "2px solid transparent",
  };
}

function scoreTextStyle(pct, pending) {
  if (pending) return { fontSize: "13px", fontWeight: "600", color: "#d97706" };
  return { fontSize: "13px", fontWeight: "600", color: pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : "#dc2626" };
}

function pctBadgeStyle(pct, pending) {
  if (pending) return { fontSize: "11px", fontWeight: "700", color: "#d97706", background: "#fffbeb", padding: "1px 6px", borderRadius: "4px" };
  const color = pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : "#dc2626";
  const bg    = pct >= 80 ? "#ecfdf5" : pct >= 60 ? "#fffbeb" : "#fef2f2";
  return { fontSize: "11px", fontWeight: "700", color, background: bg, padding: "1px 6px", borderRadius: "4px" };
}

function statusIconStyle(passed, pending) {
  return { color: pending ? "#d97706" : passed ? "#059669" : "#dc2626", display: "flex", alignItems: "center" };
}

// ─── Modal styles ──────────────────────────────────────────────────────────

const modal = {
  overlay: { position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" },
  panel: { background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "560px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderBottom: "1px solid #eef0f4", flexShrink: 0 },
  headerLeft: { display: "flex", gap: "12px", alignItems: "center" },
  headerIcon: { width: "38px", height: "38px", borderRadius: "10px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontSize: "15px", fontWeight: "700", color: "#1e1b4b", margin: 0 },
  subtitle: { fontSize: "12px", color: "#9ca3af", margin: "2px 0 0" },
  closeBtn: { width: "30px", height: "30px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", flexShrink: 0 },
  gradeBtn: { display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", fontSize: "12px", fontWeight: "600", borderRadius: "8px", cursor: "pointer", border: "1px solid #fde68a", background: "#fffbeb", color: "#d97706" },
  pendingBadge: { background: "#d97706", color: "#fff", fontSize: "11px", fontWeight: "700", borderRadius: "99px", padding: "1px 6px", marginLeft: "2px" },
  pendingTag: { display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", fontWeight: "600", color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "20px", padding: "2px 7px" },
  body: { overflowY: "auto", padding: "1.25rem 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "14px" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(52px, 1fr))", gap: "8px" },
  statBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 4px", borderRadius: "10px", background: "#f8f9fc", border: "1px solid #eef0f4" },
  statNum: { fontSize: "20px", fontWeight: "700", lineHeight: 1.2 },
  statLabel: { fontSize: "11px", fontWeight: "500", color: "#9ca3af", marginTop: "2px" },
  passRateWrap: {},
  passRateHeader: { display: "flex", justifyContent: "space-between", marginBottom: "6px" },
  passRateLabel: { fontSize: "12px", fontWeight: "600", color: "#6b7280" },
  passRatePct: { fontSize: "12px", fontWeight: "700", color: "#4f46e5" },
  passRateBar: { width: "100%", height: "6px", background: "#e5e7eb", borderRadius: "99px", overflow: "hidden" },
  passRateFill: { height: "100%", borderRadius: "99px", background: "linear-gradient(90deg, #6366f1, #818cf8)", transition: "width 0.3s ease" },
  filterRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
  listHeader: { display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid #eef0f4" },
  listHeaderText: { fontSize: "11px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" },
  list: { display: "flex", flexDirection: "column", gap: "6px" },
  studentLeft: { display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 },
  studentName: { display: "block", fontSize: "13px", fontWeight: "600", color: "#1e1b4b", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  studentEmail: { display: "block", fontSize: "11px", color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  studentRight: { display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: "2.5rem 1rem", textAlign: "center", gap: "8px" },
  emptyIcon: { width: "52px", height: "52px", borderRadius: "14px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" },
  emptyTitle: { fontSize: "14px", fontWeight: "600", color: "#1e1b4b", margin: 0 },
  emptySub: { fontSize: "13px", color: "#9ca3af", margin: 0 },
  avatarImg: { width: "34px", height: "34px", objectFit: "cover", borderRadius: "50%" },
  crownBadge: { position: "absolute", bottom: "-1px", right: "-1px", width: "14px", height: "14px", borderRadius: "50%", background: "#fbbf24", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #fff" },
};

// ─── Page styles ───────────────────────────────────────────────────────────

const styles = {
  page: { width: "100%", maxWidth: "1440px", margin: "0 auto", padding: "2rem 2.5rem" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  title: { fontSize: "24px", fontWeight: "700", color: "#1e1b4b", margin: 0, letterSpacing: "-0.02em" },
  sub: { fontSize: "14px", color: "#6b7280", marginTop: "4px" },
  primaryBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "600", background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", boxShadow: "0 2px 8px rgba(79,70,229,0.25)", transition: "all 0.15s" },
  center: { display: "flex", justifyContent: "center", padding: "4rem 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "18px" },
  emptyCard: { textAlign: "center", padding: "4rem 2rem", background: "#fff", borderRadius: "18px", border: "1px solid #e8eaef", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  emptyIcon: { width: "64px", height: "64px", borderRadius: "18px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" },
  emptyTitle: { fontSize: "18px", fontWeight: "600", color: "#1e1b4b", margin: 0 },
  emptySub: { fontSize: "14px", color: "#6b7280", margin: "0 0 8px" },
  overlay: { position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#fff", borderRadius: "20px", padding: "2rem", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
  modalIconWrap: { width: "52px", height: "52px", borderRadius: "14px", background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" },
  modalTitle: { fontSize: "18px", fontWeight: "800", color: "#111827", margin: "0 0 8px", letterSpacing: "-0.02em" },
  modalSub: { fontSize: "14px", color: "#6b7280", margin: "0 0 20px", lineHeight: "1.5" },
  modalBtns: { display: "flex", gap: "10px" },
  cancelBtn: { flex: 1, padding: "10px", fontSize: "14px", fontWeight: "600", border: "1.5px solid #e5e7eb", borderRadius: "10px", background: "#f9fafb", color: "#374151", cursor: "pointer" },
  deleteConfirmBtn: { flex: 1, padding: "10px", fontSize: "14px", fontWeight: "600", border: "none", borderRadius: "10px", background: "#dc2626", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 2px 8px rgba(220,38,38,0.3)" },
};
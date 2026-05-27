import { useEffect, useState } from "react";
import { getQuizSubmissions, getQuestions } from "../../utils/firestore";
import {
  Users, Trophy, CheckCircle, XCircle, Loader2, UserX,
  Crown, Pencil, Clock,
} from "lucide-react";
import GradeSubmission from "./GradeSubmission";

const PASS_THRESHOLD = 60;

export default function StudentScoresPanel({ quizId }) {
  const [submissions, setSubmissions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGrader, setShowGrader] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getQuizSubmissions(quizId), getQuestions(quizId)]).then(
      ([subs, qs]) => {
        if (!cancelled) {
          setSubmissions(subs);
          setQuestions(qs);
          setLoading(false);
        }
      }
    );
    return () => { cancelled = true; };
  }, [quizId]);

  const hasSituational = questions.some((q) => q.type === "situational");

  const pendingGrade = submissions.filter((s) =>
    (s.gradedAnswers || []).some(
      (g) => g.type === "situational" && g.correct === null
    )
  ).length;

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.center}>
          <Loader2
            size={22}
            color="#6366f1"
            style={{ animation: "spin 1s linear infinite" }}
          />
        </div>
      </div>
    );
  }

  const totalStudents = submissions.length;
  const passCount = submissions.filter(
    (s) => Math.round((s.score / s.total) * 100) >= PASS_THRESHOLD
  ).length;
  const failCount = totalStudents - passCount;
  const avgScore =
    totalStudents > 0
      ? Math.round(
          submissions.reduce(
            (sum, s) => sum + (s.score / s.total) * 100,
            0
          ) / totalStudents
        )
      : 0;

  const sorted = [...submissions].sort(
    (a, b) => b.score / b.total - a.score / a.total
  );

  return (
    <>
      <div style={styles.card}>
        <div style={styles.titleRow}>
          <h2 style={styles.title}>
            <Users size={16} strokeWidth={2.5} color="#6366f1" />
            Student Scores
          </h2>
          {hasSituational && (
            <button
              style={gradeBtn(pendingGrade > 0)}
              onClick={() => setShowGrader(true)}
            >
              <Pencil size={13} strokeWidth={2} />
              Grade answers
              {pendingGrade > 0 && (
                <span style={styles.pendingBadge}>{pendingGrade}</span>
              )}
            </button>
          )}
        </div>

        {totalStudents === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <UserX size={24} color="#a5b4fc" strokeWidth={1.5} />
            </div>
            <p style={styles.emptyTitle}>No submissions yet</p>
            <p style={styles.emptySub}>
              Scores will appear here once students take this quiz
            </p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div style={styles.statsRow}>
              <div style={styles.statBox}>
                <span style={styles.statNum}>{totalStudents}</span>
                <span style={styles.statLabel}>Taken</span>
              </div>
              <div style={styles.statBox}>
                <span style={{ ...styles.statNum, color: "#059669" }}>
                  {passCount}
                </span>
                <span style={styles.statLabel}>Passed</span>
              </div>
              <div style={styles.statBox}>
                <span style={{ ...styles.statNum, color: "#dc2626" }}>
                  {failCount}
                </span>
                <span style={styles.statLabel}>Failed</span>
              </div>
              <div style={styles.statBox}>
                <span style={{ ...styles.statNum, color: "#4f46e5" }}>
                  {avgScore}%
                </span>
                <span style={styles.statLabel}>Average</span>
              </div>
            </div>

            {/* Pass rate bar */}
            <div style={styles.passRateWrap}>
              <div style={styles.passRateHeader}>
                <span style={styles.passRateLabel}>Pass rate</span>
                <span style={styles.passRatePct}>
                  {Math.round((passCount / totalStudents) * 100)}%
                </span>
              </div>
              <div style={styles.passRateBar}>
                <div
                  style={{
                    ...styles.passRateFill,
                    width: `${(passCount / totalStudents) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Student list */}
            <div style={styles.listHeader}>
              <span style={styles.listHeaderText}>Student</span>
              <span style={styles.listHeaderText}>Score</span>
            </div>
            <div style={styles.list}>
              {sorted.map((sub, idx) => {
                const pct = Math.round((sub.score / sub.total) * 100);
                const passed = pct >= PASS_THRESHOLD;
                const isTop = idx === 0 && pct > 0;
                const hasPending = (sub.gradedAnswers || []).some(
                  (g) => g.type === "situational" && g.correct === null
                );

                return (
                  <div key={sub.id || idx} style={studentRowStyle(passed)}>
                    <div style={styles.studentLeft}>
                      <div style={avatarStyle(passed)}>
                        {isTop ? (
                          <Crown size={12} strokeWidth={2.5} />
                        ) : (
                          initials(sub.studentName)
                        )}
                      </div>
                      <div>
                        <span style={styles.studentName}>
                          {sub.studentName || "Unknown Student"}
                        </span>
                        <span style={styles.studentEmail}>
                          {sub.studentEmail || ""}
                        </span>
                      </div>
                    </div>
                    <div style={styles.studentRight}>
                      {hasPending && (
                        <span style={styles.pendingTag}>
                          <Clock size={10} strokeWidth={2} />
                          Pending
                        </span>
                      )}
                      <div style={styles.scoreCol}>
                        <span style={scoreTextStyle(pct)}>
                          {sub.score}/{sub.total}
                        </span>
                        <span style={pctBadgeStyle(pct)}>{pct}%</span>
                      </div>
                      <span style={statusStyle(passed)}>
                        {passed ? (
                          <CheckCircle size={14} strokeWidth={2.5} />
                        ) : (
                          <XCircle size={14} strokeWidth={2.5} />
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showGrader && (
        <GradeSubmission
          quizId={quizId}
          onClose={() => {
            setShowGrader(false);
            // Refresh submissions after grading
            Promise.all([getQuizSubmissions(quizId), getQuestions(quizId)]).then(
              ([subs, qs]) => {
                setSubmissions(subs);
                setQuestions(qs);
              }
            );
          }}
        />
      )}
    </>
  );
}

function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function studentRowStyle(passed) {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "#fafafa",
    border: `1px solid ${passed ? "#e8eaef" : "#fee2e2"}`,
    transition: "all 0.1s",
  };
}

function avatarStyle(passed) {
  return {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "700",
    background: passed ? "#eef2ff" : "#fef2f2",
    color: passed ? "#4f46e5" : "#dc2626",
    flexShrink: 0,
  };
}

function scoreTextStyle(pct) {
  return {
    fontSize: "13px",
    fontWeight: "600",
    color: pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : "#dc2626",
  };
}

function pctBadgeStyle(pct) {
  const color = pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : "#dc2626";
  const bg = pct >= 80 ? "#ecfdf5" : pct >= 60 ? "#fffbeb" : "#fef2f2";
  return {
    fontSize: "11px",
    fontWeight: "700",
    color,
    background: bg,
    padding: "1px 6px",
    borderRadius: "4px",
  };
}

function statusStyle(passed) {
  return {
    color: passed ? "#059669" : "#dc2626",
    display: "flex",
    alignItems: "center",
  };
}

function gradeBtn(hasPending) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "600",
    borderRadius: "8px",
    cursor: "pointer",
    border: `1px solid ${hasPending ? "#fde68a" : "#e5e7eb"}`,
    background: hasPending ? "#fffbeb" : "#f9fafb",
    color: hasPending ? "#d97706" : "#374151",
    transition: "all 0.15s",
  };
}

const styles = {
  card: {
    background: "#fff",
    border: "1px solid #e8eaef",
    borderRadius: "16px",
    padding: "1.5rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "16px",
    fontWeight: "700",
    color: "#1e1b4b",
    margin: 0,
  },
  pendingBadge: {
    background: "#d97706",
    color: "#fff",
    fontSize: "11px",
    fontWeight: "700",
    borderRadius: "99px",
    padding: "1px 7px",
    marginLeft: "2px",
  },
  pendingTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#d97706",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "20px",
    padding: "2px 7px",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
    marginBottom: "14px",
  },
  statBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "10px 4px",
    borderRadius: "10px",
    background: "#f8f9fc",
    border: "1px solid #eef0f4",
  },
  statNum: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e1b4b",
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: "11px",
    fontWeight: "500",
    color: "#9ca3af",
    marginTop: "2px",
  },
  passRateWrap: { marginBottom: "16px" },
  passRateHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  passRateLabel: { fontSize: "12px", fontWeight: "600", color: "#6b7280" },
  passRatePct: { fontSize: "12px", fontWeight: "700", color: "#4f46e5" },
  passRateBar: {
    width: "100%",
    height: "6px",
    background: "#e5e7eb",
    borderRadius: "99px",
    overflow: "hidden",
  },
  passRateFill: {
    height: "100%",
    borderRadius: "99px",
    background: "linear-gradient(90deg, #6366f1, #818cf8)",
    transition: "width 0.3s ease",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0 12px 8px",
    borderBottom: "1px solid #eef0f4",
    marginBottom: "8px",
  },
  listHeaderText: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxHeight: "360px",
    overflowY: "auto",
  },
  studentLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    color: "#1e1b4b",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  studentEmail: {
    display: "block",
    fontSize: "11px",
    color: "#9ca3af",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  studentRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  scoreCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "2px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem 1rem",
    textAlign: "center",
    gap: "8px",
  },
  emptyIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    background: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  emptyTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1e1b4b",
    margin: 0,
  },
  emptySub: { fontSize: "13px", color: "#9ca3af", margin: 0, lineHeight: 1.4 },
};
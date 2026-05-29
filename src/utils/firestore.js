import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Helpers ───────────────────────────────────────────────────────────────

function generateQuizCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── Quizzes ───────────────────────────────────────────────────────────────

export async function createQuiz(teacherId, title) {
  const quizCode = generateQuizCode();
  const ref = await addDoc(collection(db, "quizzes"), {
    title, teacherId, quizCode, isPublished: false, createdAt: serverTimestamp(),
  });
  return { id: ref.id, quizCode };
}

export async function setQuizPublished(quizId, isPublished) {
  await updateDoc(doc(db, "quizzes", quizId), { isPublished });
}

export async function getTeacherQuizzes(teacherId) {
  const q = query(collection(db, "quizzes"), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getPublishedQuizzes() {
  const q = query(collection(db, "quizzes"), where("isPublished", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getQuizByCode(code) {
  const q = query(collection(db, "quizzes"), where("quizCode", "==", code.toUpperCase().trim()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function deleteQuiz(quizId) {
  const qSnap = await getDocs(query(collection(db, "questions"), where("quizId", "==", quizId)));
  for (const d of qSnap.docs) await deleteDoc(d.ref);
  const sSnap = await getDocs(query(collection(db, "submissions"), where("quizId", "==", quizId)));
  for (const d of sSnap.docs) await deleteDoc(d.ref);
  await deleteDoc(doc(db, "quizzes", quizId));
}

// ─── Questions ────────────────────────────────────────────────────────────

export async function addQuestion(quizId, {
  questionText, options, correctAnswer, type = "mc", imageURL = "", answerKey = "",
}) {
  const payload = { quizId, questionText, type, imageURL };

  if (type === "mc" || type === "true_false") {
    payload.options = options;
    payload.correctAnswer = correctAnswer;
  }

  if (type === "identification") {
    payload.answerKey = answerKey;
  }

  const ref = await addDoc(collection(db, "questions"), payload);
  return ref.id;
}

export async function getQuestions(quizId) {
  const q = query(collection(db, "questions"), where("quizId", "==", quizId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteQuestion(questionId) {
  await deleteDoc(doc(db, "questions", questionId));
}

// ─── Submissions ──────────────────────────────────────────────────────────

export async function submitQuiz(studentId, quizId, answers, questions) {
  let autoScore = 0;

  const gradedAnswers = questions.map((q, i) => {
    if (q.type === "situational") {
      return { type: "situational", correct: null, note: "" };
    }
    if (q.type === "identification") {
      const studentAns = (answers[i] ?? "").toString().trim().toLowerCase();
      const key = (q.answerKey ?? "").trim().toLowerCase();
      const isCorrect = studentAns === key && studentAns.length > 0;
      if (isCorrect) autoScore += 1;
      return { type: "identification", correct: isCorrect };
    }
    // mc and true_false
    const isCorrect = answers[i] === q.correctAnswer;
    if (isCorrect) autoScore += 1;
    return { type: q.type, correct: isCorrect };
  });

  const ref = await addDoc(collection(db, "submissions"), {
    studentId, quizId, answers, gradedAnswers,
    score: autoScore, total: questions.length,
    submittedAt: serverTimestamp(),
  });

  return { submissionId: ref.id, score: autoScore, total: questions.length };
}

export async function getSubmission(studentId, quizId) {
  const q = query(
    collection(db, "submissions"),
    where("studentId", "==", studentId),
    where("quizId", "==", quizId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function getQuizSubmissions(quizId) {
  const q = query(collection(db, "submissions"), where("quizId", "==", quizId));
  const snap = await getDocs(q);
  const submissions = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    let studentName = "Unknown Student";
    let studentEmail = "";
    try {
      const userSnap = await getDoc(doc(db, "users", data.studentId));
      if (userSnap.exists()) {
        const u = userSnap.data();
        studentName = u.name || studentName;
        studentEmail = u.email || "";
      }
    } catch { /* keep defaults */ }

    submissions.push({
      id: docSnap.id,
      studentId: data.studentId,
      studentName, studentEmail,
      score: data.score,
      total: data.total,
      answers: data.answers || [],
      gradedAnswers: data.gradedAnswers || [],
      submittedAt: data.submittedAt?.toDate?.() ?? null,
    });
  }
  return submissions;
}

// ─── Grading (situational only — others are auto-graded) ──────────────────

export async function gradeSubmission(submissionId, teacherGrades, questions) {
  const subRef = doc(db, "submissions", submissionId);
  const snap = await getDoc(subRef);
  if (!snap.exists()) return;

  const existing = snap.data();
  const updatedGradedAnswers = (existing.gradedAnswers || []).map((g, idx) => {
    if (questions[idx]?.type === "situational" && teacherGrades[idx] !== undefined) {
      return { ...g, correct: teacherGrades[idx].correct, note: teacherGrades[idx].note || "" };
    }
    return g;
  });

  const newScore = updatedGradedAnswers.filter((g) => g.correct === true).length;
  await updateDoc(subRef, { gradedAnswers: updatedGradedAnswers, score: newScore, gradedAt: serverTimestamp() });
}
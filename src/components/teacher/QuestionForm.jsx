import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { addQuestion } from "../../utils/firestore";
import { uploadImage, canUpload, getRemainingUploads } from "../../utils/cloudinary";
import {
  Plus, Check, Loader2, AlignLeft, List, Image as ImageIcon,
  X,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D"];

export default function QuestionForm({ quizId, onAdded }) {
  const [questionType, setQuestionType] = useState("mc");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef(null);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { correctAnswer: 0 } });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const correctAnswer = watch("correctAnswer");

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg("");

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image must be under 5 MB.");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async (data) => {
    setErrorMsg("");
    let imageURL = "";

    // Upload image if selected
    if (imageFile) {
      if (!canUpload()) {
        setErrorMsg("Daily upload limit reached. Try again tomorrow.");
        return;
      }
      setUploadingImage(true);
      try {
        imageURL = await uploadImage(imageFile, "quizbee/questions");
      } catch (err) {
        setErrorMsg(err.message || "Image upload failed.");
        setUploadingImage(false);
        return;
      }
      setUploadingImage(false);
    }

    const payload =
      questionType === "mc"
        ? {
            type: "mc",
            questionText: data.questionText.trim(),
            options: [data.optA, data.optB, data.optC, data.optD],
            correctAnswer: data.correctAnswer,
            imageURL,
          }
        : {
            type: "situational",
            questionText: data.questionText.trim(),
            imageURL,
          };

    const id = await addQuestion(quizId, payload);
    onAdded({ id, quizId, ...payload });
    reset({ correctAnswer: 0, questionText: "", optA: "", optB: "", optC: "", optD: "" });
    clearImage();
    setSuccessMsg("Question added!");
    setTimeout(() => setSuccessMsg(""), 2500);
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>
        <Plus size={16} strokeWidth={2.5} color="#6366f1" />
        Add a Question
      </h2>

      {/* Type toggle */}
      <div style={styles.typeToggle}>
        <button type="button" style={typeBtn(questionType === "mc")} onClick={() => setQuestionType("mc")}>
          <List size={13} strokeWidth={2} /> Multiple choice
        </button>
        <button type="button" style={typeBtn(questionType === "situational")} onClick={() => setQuestionType("situational")}>
          <AlignLeft size={13} strokeWidth={2} /> Situational
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={styles.form} noValidate>
        {/* Question text */}
        <div style={styles.field}>
          <label style={styles.label}>
            {questionType === "mc" ? "Question" : "Scenario / Question"}
          </label>
          <textarea
            rows={3}
            placeholder={
              questionType === "mc"
                ? "e.g. What is the capital of France?"
                : "e.g. A customer is upset about a delayed order. How would you handle this?"
            }
            style={textareaStyle(!!errors.questionText)}
            {...register("questionText", { required: "Question text is required" })}
          />
          {errors.questionText && <span style={styles.error}>{errors.questionText.message}</span>}
        </div>

        {/* Image upload */}
        <div style={styles.field}>
          <label style={styles.label}>
            <ImageIcon size={12} strokeWidth={2} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Question image (optional)
          </label>
          {imagePreview ? (
            <div style={styles.imagePreviewWrap}>
              <img src={imagePreview} alt="Preview" style={styles.imagePreview} />
              <button type="button" onClick={clearImage} style={styles.imageRemoveBtn}>
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={styles.imageUploadBtn}
            >
              <ImageIcon size={16} color="#6366f1" strokeWidth={2} />
              <span>Upload image</span>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                ({getRemainingUploads()} left today)
              </span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
        </div>

        {/* MC-only: options */}
        {questionType === "mc" && (
          <div style={styles.field}>
            <label style={styles.label}>Options — click a letter to mark the correct answer</label>
            <div style={styles.optionsGrid}>
              {["optA", "optB", "optC", "optD"].map((key, idx) => {
                const isCorrect = correctAnswer === idx;
                return (
                  <div key={key} style={optionWrapStyle(isCorrect)}>
                    <button
                      type="button"
                      style={letterBtnStyle(isCorrect)}
                      onClick={() => setValue("correctAnswer", idx)}
                      title={`Mark option ${LETTERS[idx]} as correct`}
                    >
                      {isCorrect ? <Check size={14} strokeWidth={3} /> : LETTERS[idx]}
                    </button>
                    <input
                      type="text"
                      placeholder={`Option ${LETTERS[idx]}`}
                      style={optInputStyle(!!errors[key])}
                      {...register(key, {
                        required: questionType === "mc" ? `Option ${LETTERS[idx]} is required` : false,
                      })}
                    />
                  </div>
                );
              })}
            </div>
            <input type="hidden" {...register("correctAnswer", { valueAsNumber: true })} />
            <p style={styles.hint}>
              <Check size={12} strokeWidth={3} color="#059669" />
              Correct answer: <strong>Option {LETTERS[correctAnswer]}</strong>
            </p>
          </div>
        )}

        {/* Situational-only: info banner */}
        {questionType === "situational" && (
          <div style={styles.infoBanner}>
            <AlignLeft size={14} strokeWidth={2} color="#4f46e5" />
            Students will type a free-text response. You'll grade each answer manually from the scores panel.
          </div>
        )}

        {errorMsg && (
          <div style={styles.errorBanner}>{errorMsg}</div>
        )}

        {successMsg && (
          <div style={styles.success}>
            <Check size={14} strokeWidth={2.5} color="#059669" /> {successMsg}
          </div>
        )}

        <button type="submit" style={styles.submitBtn} disabled={isSubmitting || uploadingImage}>
          {isSubmitting || uploadingImage ? (
            <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <><Plus size={15} strokeWidth={2.5} /> Add question</>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────

function typeBtn(active) {
  return {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    gap: "6px", padding: "8px 12px", fontSize: "13px", fontWeight: "600",
    borderRadius: "8px", cursor: "pointer",
    border: `1.5px solid ${active ? "#6366f1" : "#e5e7eb"}`,
    background: active ? "#eef2ff" : "#fafafa",
    color: active ? "#4f46e5" : "#6b7280",
    transition: "all 0.15s",
  };
}

function textareaStyle(hasError) {
  return {
    width: "100%", padding: "12px 14px", fontSize: "14px",
    border: `1.5px solid ${hasError ? "#ef4444" : "#e5e7eb"}`,
    borderRadius: "10px", outline: "none", resize: "vertical",
    fontFamily: "inherit", boxSizing: "border-box", background: "#fafafa",
  };
}

function optionWrapStyle(isCorrect) {
  return {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "8px 10px", borderRadius: "10px",
    border: `1.5px solid ${isCorrect ? "#a5b4fc" : "#e5e7eb"}`,
    background: isCorrect ? "#eef2ff" : "#fafafa",
    transition: "all 0.15s",
  };
}

function letterBtnStyle(isCorrect) {
  return {
    width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
    border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: isCorrect ? "#4f46e5" : "#f3f4f6",
    color: isCorrect ? "#fff" : "#6b7280",
    transition: "all 0.15s",
  };
}

function optInputStyle(hasError) {
  return {
    flex: 1, border: "none", outline: "none", fontSize: "14px",
    background: "transparent", color: hasError ? "#ef4444" : "#111827",
    padding: "4px 0",
  };
}

const styles = {
  card: {
    background: "#fff", border: "1px solid #e8eaef",
    borderRadius: "16px", padding: "1.5rem",
    position: "sticky", top: "76px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  title: {
    display: "flex", alignItems: "center", gap: "8px",
    fontSize: "16px", fontWeight: "700", color: "#1e1b4b",
    margin: "0 0 1rem",
  },
  typeToggle: { display: "flex", gap: "8px", marginBottom: "1.25rem" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  optionsGrid: { display: "flex", flexDirection: "column", gap: "8px" },
  hint: {
    display: "flex", alignItems: "center", gap: "6px",
    fontSize: "13px", color: "#059669", fontWeight: "500", margin: 0,
  },
  infoBanner: {
    display: "flex", alignItems: "flex-start", gap: "8px",
    background: "#eef2ff", border: "1px solid #c7d2fe",
    borderRadius: "10px", padding: "10px 14px",
    fontSize: "13px", color: "#4f46e5", fontWeight: "500", lineHeight: "1.5",
  },
  error: { fontSize: "12px", color: "#ef4444", fontWeight: "500" },
  errorBanner: {
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: "8px", padding: "8px 12px",
    fontSize: "12px", color: "#991b1b",
  },
  success: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "#ecfdf5", border: "1px solid #a7f3d0",
    borderRadius: "10px", padding: "10px 14px",
    fontSize: "13px", fontWeight: "500", color: "#059669",
  },
  imageUploadBtn: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "10px 14px", borderRadius: "10px",
    border: "2px dashed #c7d2fe", background: "#fafafe",
    cursor: "pointer", fontSize: "13px", fontWeight: "500",
    color: "#4f46e5",
  },
  imagePreviewWrap: {
    position: "relative", borderRadius: "10px", overflow: "hidden",
    border: "1px solid #e5e7eb", display: "inline-block",
  },
  imagePreview: {
    maxWidth: "100%", maxHeight: "160px", objectFit: "contain",
    display: "block", background: "#fafafa",
  },
  imageRemoveBtn: {
    position: "absolute", top: "6px", right: "6px",
    width: "24px", height: "24px", borderRadius: "50%",
    background: "rgba(0,0,0,0.5)", color: "#fff",
    border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  submitBtn: {
    width: "100%", padding: "11px", fontSize: "14px", fontWeight: "600",
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff", border: "none", borderRadius: "10px",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
  },
};
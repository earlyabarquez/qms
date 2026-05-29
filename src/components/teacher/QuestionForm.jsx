import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { addQuestion } from "../../utils/firestore";
import { uploadImage, canUpload, getRemainingUploads } from "../../utils/cloudinary";
import {
  Plus, Check, Loader2, AlignLeft, List, Image as ImageIcon,
  X, ChevronDown, ToggleLeft, Type,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D"];

const QUESTION_TYPES = [
  { value: "mc",            label: "Multiple choice",  icon: "▤" },
  { value: "true_false",    label: "True or False",    icon: "⊙" },
  { value: "identification",label: "Identification",   icon: "T" },
  { value: "situational",   label: "Situational",      icon: "¶" },
];

export default function QuestionForm({ quizId, onAdded }) {
  const [questionType, setQuestionType] = useState("mc");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef(null);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { correctAnswer: 0, tfAnswer: 0 } });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const correctAnswer = watch("correctAnswer");
  const tfAnswer = watch("tfAnswer");

  const selectedType = QUESTION_TYPES.find((t) => t.value === questionType);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg("");
    if (file.size > 5 * 1024 * 1024) { setErrorMsg("Image must be under 5 MB."); return; }
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

    if (imageFile) {
      if (!canUpload()) { setErrorMsg("Daily upload limit reached. Try again tomorrow."); return; }
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

    let payload;
    if (questionType === "mc") {
      payload = {
        type: "mc",
        questionText: data.questionText.trim(),
        options: [data.optA, data.optB, data.optC, data.optD],
        correctAnswer: data.correctAnswer,
        imageURL,
      };
    } else if (questionType === "true_false") {
      payload = {
        type: "true_false",
        questionText: data.questionText.trim(),
        options: ["True", "False"],
        correctAnswer: Number(data.tfAnswer), // 0 = True, 1 = False
        imageURL,
      };
    } else if (questionType === "identification") {
      payload = {
        type: "identification",
        questionText: data.questionText.trim(),
        answerKey: data.answerKey.trim(),
        imageURL,
      };
    } else {
      payload = {
        type: "situational",
        questionText: data.questionText.trim(),
        imageURL,
      };
    }

    const id = await addQuestion(quizId, payload);
    onAdded({ id, quizId, ...payload });
    reset({ correctAnswer: 0, tfAnswer: 0, questionText: "", optA: "", optB: "", optC: "", optD: "", answerKey: "" });
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

      {/* Type dropdown */}
      <div style={{ position: "relative", marginBottom: "1.25rem" }}>
        <button
          type="button"
          style={styles.dropdownTrigger}
          onClick={() => setDropdownOpen((o) => !o)}
        >
          <span style={styles.dropdownIcon}>{selectedType.icon}</span>
          {selectedType.label}
          <ChevronDown
            size={14}
            strokeWidth={2}
            style={{ marginLeft: "auto", transform: dropdownOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          />
        </button>
        {dropdownOpen && (
          <div style={styles.dropdownMenu}>
            {QUESTION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                style={dropdownItem(t.value === questionType)}
                onClick={() => { setQuestionType(t.value); setDropdownOpen(false); }}
              >
                <span style={styles.dropdownIcon}>{t.icon}</span>
                {t.label}
                {t.value === questionType && <Check size={13} strokeWidth={3} style={{ marginLeft: "auto", color: "#4f46e5" }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={styles.form} noValidate>

        {/* Question text */}
        <div style={styles.field}>
          <label style={styles.label}>
            {questionType === "situational" ? "Scenario / Question" : "Question"}
          </label>
          <textarea
            rows={3}
            placeholder={
              questionType === "mc" ? "e.g. What is the capital of France?" :
              questionType === "true_false" ? "e.g. The Earth revolves around the Sun." :
              questionType === "identification" ? "e.g. What do you call the process by which plants make food?" :
              "e.g. A customer is upset about a delayed order. How would you handle this?"
            }
            style={textareaStyle(!!errors.questionText)}
            {...register("questionText", { required: "Question text is required" })}
          />
          {errors.questionText && <span style={styles.error}>{errors.questionText.message}</span>}
        </div>

        {/* Image upload — unchanged */}
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
            <button type="button" onClick={() => fileRef.current?.click()} style={styles.imageUploadBtn}>
              <ImageIcon size={16} color="#6366f1" strokeWidth={2} />
              <span>Upload image</span>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>({getRemainingUploads()} left today)</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
        </div>

        {/* MC options */}
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
                    >
                      {isCorrect ? <Check size={14} strokeWidth={3} /> : LETTERS[idx]}
                    </button>
                    <input
                      type="text"
                      placeholder={`Option ${LETTERS[idx]}`}
                      style={optInputStyle(!!errors[key])}
                      {...register(key, { required: `Option ${LETTERS[idx]} is required` })}
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

        {/* True / False */}
        {questionType === "true_false" && (
          <div style={styles.field}>
            <label style={styles.label}>Correct answer</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {["True", "False"].map((label, idx) => {
                const isSelected = Number(tfAnswer) === idx;
                return (
                  <button
                    key={label}
                    type="button"
                    style={tfBtnStyle(isSelected)}
                    onClick={() => setValue("tfAnswer", idx)}
                  >
                    {isSelected && <Check size={13} strokeWidth={3} />}
                    {label}
                  </button>
                );
              })}
            </div>
            <input type="hidden" {...register("tfAnswer", { valueAsNumber: true })} />
          </div>
        )}

        {/* Identification answer key */}
        {questionType === "identification" && (
          <div style={styles.field}>
            <label style={styles.label}>Answer key <span style={{ color: "#9ca3af", fontWeight: 400 }}>(exact match, case-insensitive)</span></label>
            <input
              type="text"
              placeholder="e.g. Photosynthesis"
              style={textInputStyle(!!errors.answerKey)}
              {...register("answerKey", { required: "Answer key is required" })}
            />
            {errors.answerKey && <span style={styles.error}>{errors.answerKey.message}</span>}
            <p style={styles.hint}>
              <Check size={12} strokeWidth={3} color="#059669" />
              Student's answer will be checked against this (case-insensitive)
            </p>
          </div>
        )}

        {/* Situational info */}
        {questionType === "situational" && (
          <div style={styles.infoBanner}>
            <AlignLeft size={14} strokeWidth={2} color="#4f46e5" />
            Students will type a free-text response. You'll grade each answer manually from the scores panel.
          </div>
        )}

        {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}
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

// ─── Style helpers ─────────────────────────────────────────────────────────

function textareaStyle(hasError) {
  return {
    width: "100%", padding: "12px 14px", fontSize: "14px",
    border: `1.5px solid ${hasError ? "#ef4444" : "#e5e7eb"}`,
    borderRadius: "10px", outline: "none", resize: "vertical",
    fontFamily: "inherit", boxSizing: "border-box", background: "#fafafa",
  };
}

function textInputStyle(hasError) {
  return {
    width: "100%", padding: "11px 14px", fontSize: "14px",
    border: `1.5px solid ${hasError ? "#ef4444" : "#e5e7eb"}`,
    borderRadius: "10px", outline: "none",
    fontFamily: "inherit", boxSizing: "border-box", background: "#fafafa",
  };
}

function optionWrapStyle(isCorrect) {
  return {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "8px 10px", borderRadius: "10px",
    border: `1.5px solid ${isCorrect ? "#a5b4fc" : "#e5e7eb"}`,
    background: isCorrect ? "#eef2ff" : "#fafafa", transition: "all 0.15s",
  };
}

function letterBtnStyle(isCorrect) {
  return {
    width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
    border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: isCorrect ? "#4f46e5" : "#f3f4f6",
    color: isCorrect ? "#fff" : "#6b7280", transition: "all 0.15s",
  };
}

function optInputStyle(hasError) {
  return {
    flex: 1, border: "none", outline: "none", fontSize: "14px",
    background: "transparent", color: hasError ? "#ef4444" : "#111827", padding: "4px 0",
  };
}

function tfBtnStyle(active) {
  return {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
    padding: "10px", fontSize: "14px", fontWeight: "600", borderRadius: "10px",
    border: `1.5px solid ${active ? "#6366f1" : "#e5e7eb"}`,
    background: active ? "#eef2ff" : "#fafafa",
    color: active ? "#4f46e5" : "#6b7280",
    cursor: "pointer", transition: "all 0.15s",
  };
}

function dropdownItem(active) {
  return {
    width: "100%", display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 14px", fontSize: "13px", fontWeight: "500",
    background: active ? "#eef2ff" : "#fff",
    color: active ? "#4f46e5" : "#374151",
    border: "none", cursor: "pointer", textAlign: "left",
    borderRadius: "8px", transition: "background 0.1s",
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
    fontSize: "16px", fontWeight: "700", color: "#1e1b4b", margin: "0 0 1rem",
  },
  dropdownTrigger: {
    width: "100%", display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 14px", fontSize: "13px", fontWeight: "600",
    borderRadius: "10px", cursor: "pointer",
    border: "1.5px solid #e5e7eb", background: "#fafafa",
    color: "#374151", transition: "border-color 0.15s",
  },
  dropdownIcon: {
    width: "22px", height: "22px", borderRadius: "6px",
    background: "#eef2ff", color: "#4f46e5",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "700", flexShrink: 0,
  },
  dropdownMenu: {
    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
    background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: "12px", padding: "6px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 50,
    display: "flex", flexDirection: "column", gap: "2px",
  },
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
    cursor: "pointer", fontSize: "13px", fontWeight: "500", color: "#4f46e5",
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
    color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
  },
};
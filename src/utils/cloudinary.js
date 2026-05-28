// ─── Cloudinary Upload Utility with Rate Limiting ──────────────────────────
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Free-tier safety limits
const MAX_UPLOADS_PER_DAY = 40;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const TRACKER_KEY = "qb_cloudinary_tracker";

// ─── Rate-limit helpers ────────────────────────────────────────────────────

function getTracker() {
  try {
    const raw = localStorage.getItem(TRACKER_KEY);
    if (!raw) return { date: new Date().toDateString(), count: 0 };
    const t = JSON.parse(raw);
    if (t.date !== new Date().toDateString()) return { date: new Date().toDateString(), count: 0 };
    return t;
  } catch {
    return { date: new Date().toDateString(), count: 0 };
  }
}

function bumpTracker() {
  const t = getTracker();
  t.count += 1;
  localStorage.setItem(TRACKER_KEY, JSON.stringify(t));
}

export function canUpload() {
  return getTracker().count < MAX_UPLOADS_PER_DAY;
}

export function getRemainingUploads() {
  return Math.max(0, MAX_UPLOADS_PER_DAY - getTracker().count);
}

// ─── Upload function ───────────────────────────────────────────────────────

/**
 * Upload an image to Cloudinary (unsigned preset).
 * @param {File} file
 * @param {string} folder — subfolder inside your Cloudinary account
 * @returns {Promise<string>} secure_url of the uploaded image
 */
export async function uploadImage(file, folder = "quizbee") {
  // Config check
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file."
    );
  }

  // File-type check
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPEG, PNG, GIF, and WebP images are allowed.");
  }

  // Size check
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
  }

  // Rate-limit check
  if (!canUpload()) {
    throw new Error(
      `Daily upload limit (${MAX_UPLOADS_PER_DAY}) reached. Please try again tomorrow.`
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Image upload failed. Please try again.");
  }

  const data = await res.json();
  bumpTracker();
  return data.secure_url;
}
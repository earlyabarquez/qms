import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout, changePassword, updateUserProfile } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";
import { uploadImage, getRemainingUploads } from "../../utils/cloudinary";
import {
  Lock, Camera, LogOut, ChevronDown, Loader2, Check, X,
  Eye, EyeOff, AlertCircle, Image as ImageIcon,
} from "lucide-react";
import logo from "../../assets/quizbee_logo.png";

export default function NavBar() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <>
      <nav style={styles.nav}>
        <div style={styles.inner}>
          <div style={styles.brand}>
            <img src={logo} alt="QuizBee" style={styles.logoImg} />
            <span style={styles.brandName}>Quiz<span style={styles.bee}>Bee</span></span>
            {profile?.role && (
              <span style={badgeStyle(profile.role)}>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
            )}
          </div>

          <div style={styles.right} ref={dropdownRef}>
            <button
              style={styles.avatarBtn}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="" style={styles.avatarImg} />
              ) : (
                <div style={styles.avatar}>{initials}</div>
              )}
              <span style={styles.name}>{profile?.name ?? ""}</span>
              <ChevronDown size={14} color="#6b7280" strokeWidth={2} />
            </button>

            {showDropdown && (
              <div style={styles.dropdown}>
                <ProfilePhotoUploader
                  uid={user?.uid}
                  currentPhoto={profile?.photoURL}
                  initials={initials}
                  onUploaded={refreshProfile}
                />
                <div style={styles.dropdownDivider} />
                <button
                  style={styles.dropdownItem}
                  onClick={() => { setShowDropdown(false); setShowPasswordModal(true); }}
                >
                  <Lock size={14} strokeWidth={2} /> Change password
                </button>
                <button
                  style={{ ...styles.dropdownItem, color: "#dc2626" }}
                  onClick={() => { setShowDropdown(false); setShowConfirm(true); }}
                >
                  <LogOut size={14} strokeWidth={2} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showConfirm && (
        <Modal onClose={() => setShowConfirm(false)}>
          <p style={styles.modalEmoji}>🐝</p>
          <h2 style={styles.modalTitle}>Leaving the hive?</h2>
          <p style={styles.modalSub}>Are you sure you want to sign out?</p>
          <div style={styles.modalBtns}>
            <button onClick={() => setShowConfirm(false)} style={styles.cancelBtn}>Stay</button>
            <button onClick={handleLogout} style={styles.confirmBtn}>Sign out</button>
          </div>
        </Modal>
      )}

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  );
}

function ProfilePhotoUploader({ uid, currentPhoto, initials, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadImage(file, "quizbee/profiles");
      await updateUserProfile(uid, { photoURL: url });
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div style={styles.photoSection}>
      <div style={styles.photoPreview}>
        {currentPhoto ? (
          <img src={currentPhoto} alt="" style={styles.photoImg} />
        ) : (
          <div style={styles.photoBigAvatar}>{initials}</div>
        )}
        <button
          style={styles.photoCameraBtn}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Camera size={12} />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>
      <div style={{ fontSize: "11px", color: "#9ca3af" }}>
        <ImageIcon size={10} strokeWidth={2} style={{ verticalAlign: "middle" }} />
        {" "}{getRemainingUploads()} uploads left today
      </div>
      {error && <p style={{ fontSize: "11px", color: "#ef4444", margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const strongEnough =
    newPw.length >= 8 &&
    /[A-Z]/.test(newPw) && /[a-z]/.test(newPw) &&
    /\d/.test(newPw) && /[^A-Za-z0-9]/.test(newPw);

  const handleSave = async () => {
    setError("");
    if (!currentPw) return setError("Enter your current password.");
    if (!strongEnough) return setError("New password is not strong enough.");
    if (newPw !== confirmPw) return setError("New passwords do not match.");

    setSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Current password is incorrect.");
      } else {
        setError(err.message || "Something went wrong.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 style={styles.modalTitle}>Change password</h2>
      <p style={{ ...styles.modalSub, marginBottom: "16px" }}>
        Enter your current password and choose a new one.
      </p>

      {success ? (
        <div style={styles.successBox}>
          <Check size={16} strokeWidth={2.5} /> Password updated!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={pwInputWrap}>
            <Lock size={14} color="#9ca3af" />
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="Current password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              style={styles.pwInput}
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
              {showCurrent ? <EyeOff size={14} color="#9ca3af" /> : <Eye size={14} color="#9ca3af" />}
            </button>
          </div>

          <div style={pwInputWrap}>
            <Lock size={14} color="#9ca3af" />
            <input
              type={showNew ? "text" : "password"}
              placeholder="New password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              style={styles.pwInput}
            />
            <button type="button" onClick={() => setShowNew(!showNew)} style={styles.eyeBtn}>
              {showNew ? <EyeOff size={14} color="#9ca3af" /> : <Eye size={14} color="#9ca3af" />}
            </button>
          </div>

          <div style={pwInputWrap}>
            <Lock size={14} color="#9ca3af" />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              style={styles.pwInput}
            />
            {confirmPw && (
              confirmPw === newPw
                ? <Check size={14} color="#059669" />
                : <X size={14} color="#ef4444" />
            )}
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <div style={styles.modalBtns}>
            <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button onClick={handleSave} style={styles.confirmBtn} disabled={saving}>
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Update password"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

const pwInputWrap = {
  display: "flex", alignItems: "center", gap: "8px",
  padding: "0 12px", borderRadius: "10px",
  border: "1.5px solid #e5e7eb", background: "#fafafa",
};

function badgeStyle(role) {
  const isTeacher = role === "teacher";
  return {
    fontSize: "11px", fontWeight: "600", padding: "2px 8px",
    borderRadius: "20px", letterSpacing: "0.04em",
    background: isTeacher ? "#eff6ff" : "#f0fdf4",
    color: isTeacher ? "#1d4ed8" : "#15803d",
    border: `1px solid ${isTeacher ? "#bfdbfe" : "#bbf7d0"}`,
  };
}

const styles = {
  nav: {
    background: "#fff", borderBottom: "1px solid #e5e7eb",
    position: "sticky", top: 0, zIndex: 50,
  },
  inner: {
    maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem",
    height: "56px", display: "flex", alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { display: "flex", alignItems: "center", gap: "8px" },
  logoImg: { width: "32px", height: "32px", objectFit: "contain" },
  brandName: { fontSize: "17px", fontWeight: "800", color: "#111827", letterSpacing: "-0.01em" },
  bee: { color: "#f59e0b" },
  right: { position: "relative", display: "flex", alignItems: "center" },
  avatarBtn: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "none", border: "1px solid #e5e7eb", borderRadius: "10px",
    padding: "4px 10px 4px 4px", cursor: "pointer",
  },
  avatar: {
    width: "32px", height: "32px", borderRadius: "50%",
    background: "#dbeafe", color: "#1d4ed8",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "600",
  },
  avatarImg: {
    width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover",
  },
  name: { fontSize: "14px", color: "#374151", fontWeight: "500" },
  dropdown: {
    position: "absolute", top: "calc(100% + 8px)", right: 0,
    background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: "14px", padding: "8px",
    minWidth: "220px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
    zIndex: 60,
  },
  dropdownDivider: {
    height: "1px", background: "#f3f4f6", margin: "6px 0",
  },
  dropdownItem: {
    width: "100%", display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 12px", fontSize: "13px", fontWeight: "500",
    color: "#374151", background: "none", border: "none",
    borderRadius: "8px", cursor: "pointer", textAlign: "left",
  },
  photoSection: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "6px", padding: "10px 8px",
  },
  photoPreview: {
    position: "relative", width: "56px", height: "56px",
  },
  photoImg: {
    width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover",
    border: "2px solid #e5e7eb",
  },
  photoBigAvatar: {
    width: "56px", height: "56px", borderRadius: "50%",
    background: "#dbeafe", color: "#1d4ed8",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "18px", fontWeight: "700",
    border: "2px solid #e5e7eb",
  },
  photoCameraBtn: {
    position: "absolute", bottom: "-2px", right: "-2px",
    width: "24px", height: "24px", borderRadius: "50%",
    background: "#4f46e5", color: "#fff", border: "2px solid #fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
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
  modalEmoji: { fontSize: "48px", margin: "0 0 12px" },
  modalTitle: {
    fontSize: "20px", fontWeight: "800", color: "#111827",
    margin: "0 0 8px", letterSpacing: "-0.02em",
  },
  modalSub: { fontSize: "14px", color: "#6b7280", margin: "0 0 24px" },
  modalBtns: { display: "flex", gap: "10px", marginTop: "4px" },
  cancelBtn: {
    flex: 1, padding: "10px", fontSize: "14px", fontWeight: "600",
    border: "1.5px solid #e5e7eb", borderRadius: "10px",
    background: "#f9fafb", color: "#374151", cursor: "pointer",
  },
  confirmBtn: {
    flex: 1, padding: "10px", fontSize: "14px", fontWeight: "600",
    border: "none", borderRadius: "10px",
    background: "linear-gradient(135deg, #4f46e5, #6366f1)",
    color: "#fff", cursor: "pointer",
    boxShadow: "0 2px 8px rgba(79,70,229,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
  },
  pwInput: {
    flex: 1, border: "none", outline: "none", background: "transparent",
    fontSize: "13px", padding: "10px 0", color: "#111827",
  },
  eyeBtn: {
    background: "none", border: "none", cursor: "pointer",
    padding: "4px", display: "flex", alignItems: "center",
  },
  successBox: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    background: "#ecfdf5", border: "1px solid #a7f3d0",
    borderRadius: "10px", padding: "14px",
    fontSize: "14px", fontWeight: "600", color: "#059669",
  },
  errorBox: {
    display: "flex", alignItems: "center", gap: "6px",
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: "8px", padding: "8px 12px",
    fontSize: "12px", color: "#991b1b",
  },
};
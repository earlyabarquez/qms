import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../utils/auth";
import { useAuth } from "../../context/AuthContext";

export default function NavBar() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

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
            <img src="/src/assets/quizbee_logo.png" alt="QuizBee" style={styles.logoImg} />
            <span style={styles.brandName}>Quiz<span style={styles.bee}>Bee</span></span>
            {profile?.role && (
              <span style={badgeStyle(profile.role)}>
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
            )}
          </div>

          <div style={styles.right}>
            <div style={styles.avatar}>{initials}</div>
            <span style={styles.name}>{profile?.name ?? ""}</span>
            <button onClick={() => setShowConfirm(true)} style={styles.logoutBtn}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Confirmation modal */}
      {showConfirm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <p style={styles.modalEmoji}>🐝</p>
            <h2 style={styles.modalTitle}>Leaving the hive?</h2>
            <p style={styles.modalSub}>Are you sure you want to sign out?</p>
            <div style={styles.modalBtns}>
              <button onClick={() => setShowConfirm(false)} style={styles.cancelBtn}>
                Stay
              </button>
              <button onClick={handleLogout} style={styles.confirmBtn}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

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
  right: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: {
    width: "32px", height: "32px", borderRadius: "50%",
    background: "#dbeafe", color: "#1d4ed8",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "600",
  },
  name: { fontSize: "14px", color: "#374151", fontWeight: "500" },
  logoutBtn: {
    fontSize: "13px", padding: "6px 12px",
    border: "1px solid #e5e7eb", borderRadius: "7px",
    background: "none", cursor: "pointer", color: "#6b7280",
  },

  // Modal
  overlay: {
    position: "fixed", inset: 0, zIndex: 100,
    background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modal: {
    background: "#fff", borderRadius: "20px",
    padding: "2.5rem 2rem", width: "100%", maxWidth: "340px",
    textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
  },
  modalEmoji: { fontSize: "48px", margin: "0 0 12px" },
  modalTitle: {
    fontSize: "20px", fontWeight: "800", color: "#111827",
    margin: "0 0 8px", letterSpacing: "-0.02em",
  },
  modalSub: { fontSize: "14px", color: "#6b7280", margin: "0 0 24px" },
  modalBtns: { display: "flex", gap: "10px" },
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
  },
};
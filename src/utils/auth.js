import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

/**
 * Register a new user and create their Firestore profile.
 */
export async function register(email, password, name, role) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, "users", user.uid), {
    name,
    email,
    role,
    photoURL: "",
    createdAt: serverTimestamp(),
  });

  return user;
}

/**
 * Sign in an existing user.
 */
export async function login(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

/**
 * Sign out the current user.
 */
export async function logout() {
  await signOut(auth);
}

/**
 * Change password (requires re-authentication first).
 */
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Not authenticated");

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

/**
 * Update the Firestore user profile (photoURL, name, etc.).
 */
export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}
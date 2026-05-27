import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

/**
 * Register a new user and create their Firestore profile.
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @param {"teacher"|"student"} role
 */
export async function register(email, password, name, role) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, "users", user.uid), {
    name,
    email,
    role,
    createdAt: serverTimestamp(),
  });

  return user;
}

/**
 * Sign in an existing user.
 * @param {string} email
 * @param {string} password
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
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";

// Create a new user account
export async function signupUser(
  email: string,
  password: string
) {
  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  return userCredential.user;
}

// Sign in an existing user
export async function loginUser(
  email: string,
  password: string
) {
  const userCredential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  return userCredential.user;
}

// Sign out the current user
export async function logoutUser() {
  await signOut(auth);
}
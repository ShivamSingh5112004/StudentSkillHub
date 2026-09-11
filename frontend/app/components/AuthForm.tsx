"use client";

import { useState } from "react";
import { loginUser, signupUser } from "../lib/auth";

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      if (isLogin) {
        await loginUser(email.trim(), password);
      } else {
        await signupUser(email.trim(), password);
      }

      setEmail("");
      setPassword("");

      alert(
        isLogin
          ? "Login successful!"
          : "Account created successfully!"
      );
    } catch (error: any) {
      console.error("Authentication error:", error);

      if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (error.code === "auth/email-already-in-use") {
        setError("An account already exists with this email.");
      } else if (error.code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-md rounded-xl border border-gray-300 bg-white p-6 text-gray-900">
      <h2 className="text-2xl font-bold text-gray-900">
        {isLogin ? "Login to StudentSkillHub" : "Create an Account"}
      </h2>

      <p className="mt-2 text-sm text-gray-600">
        {isLogin
          ? "Sign in to access your StudentSkillHub dashboard."
          : "Create your StudentSkillHub account using email and password."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-800">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 outline-none focus:border-black"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-800">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 outline-none focus:border-black"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : isLogin
              ? "Login"
              : "Create Account"}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-gray-900">
        <span className="text-gray-600">
          {isLogin
            ? "Don't have an account? "
            : "Already have an account? "}
        </span>

        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
          }}
          className="font-medium text-gray-900 underline"
        >
          {isLogin ? "Create Account" : "Login"}
        </button>
      </div>
    </div>
  );
}
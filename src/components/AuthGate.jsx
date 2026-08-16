import React, { useState } from "react";
import { signUp, signIn } from "../lib/auth.js";

export default function AuthGate({ onAuthed }) {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const result = mode === "signup" ? await signUp(username, password) : await signIn(username, password);
      onAuthed(result.user);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <p className="eyebrow" style={{ marginBottom: 4 }}>Listening Timeline</p>
        <h1 style={{ fontSize: 32, marginBottom: 6 }}>
          {mode === "signup" ? "Create a " : "Welcome "}<span>{mode === "signup" ? "profile" : "back"}</span>
        </h1>
        <p className="subhead" style={{ marginBottom: 22 }}>
          {mode === "signup"
            ? "Pick a username and password — that's it, no email needed."
            : "Sign in to see your profile and compare with others."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label htmlFor="authUsername">Username</label>
            <input
              id="authUsername"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="authPassword">Password</label>
            <input
              id="authPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          {error && <p className="insight-error">{error}</p>}
          <button className="btn primary" type="submit" disabled={loading} style={{ width: "100%", padding: "10px 12px" }}>
            {loading ? "…" : mode === "signup" ? "Create profile" : "Sign in"}
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); }}
        >
          {mode === "signup" ? "Already have a username? Sign in" : "New here? Create a username"}
        </button>
      </div>
    </div>
  );
}

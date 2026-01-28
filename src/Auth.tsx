// src/Auth.tsx
import React, { useState } from "react";
import api from "./api";
import "./App.css";

interface Props {
  onLoggedIn: (role: "student" | "admin") => void;
}

const Auth: React.FC<Props> = ({ onLoggedIn }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [caLevel, setCaLevel] = useState("");
  const [caAttempt, setCaAttempt] = useState("");

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setEmail("");
    setPassword("");
    setError("");
    setName("");
    setPhone("");
    setCaLevel("");
    setCaAttempt("");
    setLoading(false);
    };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      // const payload: any = { email, password };
      const payload: any =
        mode === "login"
          ? { email, password }
          : {
              email,
              password,
              name,
              phone,
              ca_level: caLevel,
              ca_attempt: Number(caAttempt),
            };

      const res = await api.post(endpoint, payload);
      localStorage.setItem("token", res.data.access_token);

      const me = await api.get("/auth/me");
      onLoggedIn(me.data.role);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-card-header">
          <h1 className="auth-title">
            {mode === "login" ? "Welcome back 👋" : "Create your account"}
          </h1>
          <p className="auth-subtitle">
            {mode === "login"
              ? "Login to access the CA chatbot."
              : "Sign up to get started."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          
          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="field-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
            />
          </label>
          {mode === "signup" && (
          <>
            <label className="field">
              <span className="field-label">Full Name</span>
              <input
                className="field-input"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Phone Number</span>
              <input
                className="field-input"
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">CA Level</span>
              <select
                className="field-input"
                value={caLevel}
                onChange={(e) => setCaLevel(e.target.value)}
                required
              >
                <option value="">Select level</option>
                <option value="Foundation">Foundation</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Final">Final</option>
              </select>
            </label>

            <label className="field">
              <span className="field-label">CA Attempt</span>
              <input
                className="field-input"
                type="number"
                min={1}
                placeholder="Attempt number (e.g. 1)"
                value={caAttempt}
                onChange={(e) => setCaAttempt(e.target.value)}
                required
              />
            </label>
          </>
        )}

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="field-input"
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
            />
          </label>

          {/* role selection removed */}

          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait…"
              : mode === "login"
              ? "Login"
              : "Create account"}
          </button>
        </form>

        <div className="auth-footer">
          <span>
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>
          <button type="button" className="link" onClick={toggleMode}>
            {mode === "login" ? "Sign up" : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;

import React, { useState } from "react";
import api from "./api";
import "./App.css";

interface Props {
  onLoggedIn: (role: "student" | "admin") => void;
}

const CA_LEVELS = ["Foundation", "Intermediate", "Final"] as const;

const Auth: React.FC<Props> = ({ onLoggedIn }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [caLevel, setCaLevel] = useState("");
  const [caAttempt, setCaAttempt] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const reset = () => {
    setEmail(""); setPassword(""); setError(""); setSuccessMessage("");
    setName(""); setPhone(""); setCaLevel(""); setCaAttempt("");
  };

  const toggleMode = () => { reset(); setMode((m) => m === "login" ? "signup" : "login"); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccessMessage(""); setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";
      const payload = mode === "login"
        ? { email, password }
        : { email, password, name, phone, ca_level: caLevel, ca_attempt: Number(caAttempt) };

      const res = await api.post(endpoint, payload);

      if (mode === "signup") {
        setSuccessMessage("Account created! Awaiting admin approval. You'll be notified once approved.");
        setMode("login");
        reset();
        return;
      }

      localStorage.setItem("token", res.data.access_token);
      const me = await api.get("/auth/me");
      onLoggedIn(me.data.role);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* Decorative background blobs */}
      <div className="auth-bg-blob auth-bg-blob-1" />
      <div className="auth-bg-blob auth-bg-blob-2" />

      <div className="auth-card-premium">

        {/* Brand mark */}
        <div className="auth-brand">
          <div className="auth-logo">
            <span className="auth-logo-text">CA</span>
          </div>
          <div className="auth-brand-info">
            <span className="auth-brand-name">CA Tutor</span>
            <span className="auth-brand-tag">AI-Powered Learning</span>
          </div>
        </div>

        {/* Heading */}
        <div className="auth-top">
          <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
          <p>
            {mode === "login"
              ? "Sign in to continue your CA exam preparation."
              : "Join thousands of CA students learning smarter."}
          </p>
        </div>

        {/* Level badges for signup */}
        {mode === "signup" && (
          <div className="auth-level-pills">
            {CA_LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`auth-level-pill${caLevel === lvl ? " auth-level-pill-active" : ""}`}
                onClick={() => setCaLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>

          {mode === "signup" && (
            <div className="auth-form-row">
              <div className="auth-field">
                <label className="auth-label">Full Name</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Riya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">Phone</label>
                <input
                  className="auth-input"
                  type="tel"
                  placeholder="10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {mode === "signup" && (
            <div className="auth-field">
              <label className="auth-label">
                CA Attempt <span className="auth-label-hint">(e.g. 1, 2, 3…)</span>
              </label>
              <input
                className="auth-input"
                type="number"
                min={1}
                max={20}
                placeholder="Which attempt?"
                value={caAttempt}
                onChange={(e) => setCaAttempt(e.target.value)}
                required
              />
              {!caLevel && caAttempt && (
                <span className="auth-field-hint">Please select a CA level above</span>
              )}
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <input
                className="auth-input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                className="auth-pass-toggle"
                onClick={() => setShowPass((p) => !p)}
                tabIndex={-1}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <span className="auth-alert-icon">⚠</span> {error}
            </div>
          )}
          {successMessage && (
            <div className="auth-success" role="status">
              <span className="auth-alert-icon">✅</span> {successMessage}
            </div>
          )}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? (
              <span className="auth-btn-loading">
                <span className="auth-spinner" />
                Please wait…
              </span>
            ) : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>

        </form>

        <div className="auth-divider"><span>or</span></div>

        <div className="auth-switch">
          {mode === "login" ? (
            <>Don't have an account? <button type="button" onClick={toggleMode}>Sign up free</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={toggleMode}>Sign in</button></>
          )}
        </div>

        {/* Trust badges */}
        <div className="auth-trust">
          <span>🔒 Secure</span>
          <span>📚 ICAI Aligned</span>
          <span>🤖 AI-Powered</span>
        </div>

      </div>
    </div>
  );
};

export default Auth;

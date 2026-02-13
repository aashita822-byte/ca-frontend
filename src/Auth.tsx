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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [caLevel, setCaLevel] = useState("");
  const [caAttempt, setCaAttempt] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setEmail("");
    setPassword("");
    setError("");
    setSuccessMessage("");
    setName("");
    setPhone("");
    setCaLevel("");
    setCaAttempt("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/signup";

      const payload =
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

      // ✅ Signup flow (no token)
      if (mode === "signup") {
        setSuccessMessage(
          "Signup successful ✅ Sent for admin approval. Please login after approval."
        );
        setMode("login");
        return;
      }

      // ✅ Login flow
      localStorage.setItem("token", res.data.access_token);
      const me = await api.get("/auth/me");
      onLoggedIn(me.data.role);

    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card-premium">
        <div className="auth-top">
          <div className="logo-circle">CA</div>
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p>
            {mode === "login"
              ? "Login to continue your CA preparation."
              : "Sign up to start using your CA AI tutor."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {mode === "signup" && (
            <>
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <label>CA Level</label>
              <select
                value={caLevel}
                onChange={(e) => setCaLevel(e.target.value)}
                required
              >
                <option value="">Select level</option>
                <option value="Foundation">Foundation</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Final">Final</option>
              </select>

              <label>CA Attempt</label>
              <input
                type="number"
                min={1}
                value={caAttempt}
                onChange={(e) => setCaAttempt(e.target.value)}
                required
              />
            </>
          )}

          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="auth-error">{error}</div>}
          {successMessage && (
            <div className="auth-success">{successMessage}</div>
          )}

          <button className="auth-btn" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Create Account"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Don’t have an account?
              <button type="button" onClick={toggleMode}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?
              <button type="button" onClick={toggleMode}>
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;

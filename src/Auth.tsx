import React, { useState, useEffect } from "react";
import api from "./api";
import "./App.css";

interface Props {
  onLoggedIn: (role: "student" | "admin") => void;
}

const CA_LEVELS = ["Foundation", "Intermediate", "Final"] as const;
type CALevel = typeof CA_LEVELS[number];

/* ── Razorpay types ── */
declare global {
  interface Window {
    Razorpay: any;
  }
}

/* ── Pricing config ── */
const PLAN_PRICES: Record<CALevel, number> = {
  Foundation: 499,
  Intermediate: 599,
  Final: 699,
};

const PLAN_FEATURES: Record<CALevel, string[]> = {
  Foundation: [
    "All Foundation study materials",
    "AI Tutor – unlimited questions",
    "ICAI syllabus PDFs",
    "Video lectures included",
    "Priority support",
  ],
  Intermediate: [
    "All Intermediate modules",
    "AI Tutor – unlimited questions",
    "Advanced case study PDFs",
    "Mock test papers",
    "Video lectures included",
    "Priority support",
  ],
  Final: [
    "Complete Final level content",
    "AI Tutor – unlimited questions",
    "Strategic financial analysis PDFs",
    "Full mock test series",
    "Video lectures included",
    "1-on-1 doubt resolution",
    "Priority support",
  ],
};

const FREE_FEATURES = [
  "3 AI questions per day",
  "Limited study material access",
  "Basic ICAI PDFs only",
  "Community support",
];

type Step = "details" | "plan" | "payment";

const Auth: React.FC<Props> = ({ onLoggedIn }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");

  /* signup multi-step */
  const [step, setStep] = useState<Step>("details");

  /* form fields */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [caLevel, setCaLevel] = useState<CALevel | "">("");
  const [caAttempt, setCaAttempt] = useState("");

  /* plan */
  const [selectedPlan, setSelectedPlan] = useState<"free" | "paid" | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);

  /* ui state */
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [rzpLoaded, setRzpLoaded] = useState(false);

  /* Load Razorpay SDK */
  useEffect(() => {
    if (document.getElementById("razorpay-sdk")) { setRzpLoaded(true); return; }
    const script = document.createElement("script");
    script.id = "razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => setRzpLoaded(true);
    document.body.appendChild(script);
  }, []);

  const reset = () => {
    setEmail(""); setPassword(""); setError(""); setSuccessMessage("");
    setName(""); setPhone(""); setCaLevel(""); setCaAttempt("");
    setStep("details"); setSelectedPlan(null); setPaymentDone(false);
    setRazorpayOrderId(null);
  };

  const toggleMode = () => { reset(); setMode((m) => m === "login" ? "signup" : "login"); };

  /* ── Step 1 → Step 2 ── */
  const proceedToPlan = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!caLevel) { setError("Please select your CA level."); return; }
    if (!caAttempt) { setError("Please enter your attempt number."); return; }
    setStep("plan");
  };

  /* ── Choose plan ── */
  const choosePlan = async (plan: "free" | "paid") => {
    setSelectedPlan(plan);
    setError("");
    if (plan === "free") {
      setStep("payment"); // "payment" step doubles as confirmation for free
      return;
    }
    // Create Razorpay order via backend
    setLoading(true);
    try {
      const amount = PLAN_PRICES[caLevel as CALevel] * 100; // paise
      const res = await api.post("/payments/create-order", {
        amount,
        currency: "INR",
        plan: caLevel,
      });
      setRazorpayOrderId(res.data.order_id);
      setStep("payment");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not initiate payment. Please try again.");
      setSelectedPlan(null);
    } finally {
      setLoading(false);
    }
  };

  /* ── Launch Razorpay ── */
  const launchRazorpay = () => {
    if (!rzpLoaded || !window.Razorpay) {
      setError("Payment SDK not loaded. Please refresh.");
      return;
    }
    const amount = PLAN_PRICES[caLevel as CALevel];
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_XXXXXXXXXXXXXXX",
      amount: amount * 100,
      currency: "INR",
      name: "CA Tutor",
      description: `${caLevel} Plan – ₹${amount}/month`,
      order_id: razorpayOrderId,
      prefill: { name, email, contact: phone },
      theme: { color: "#c9a84c" },
      handler: async (response: any) => {
        // Verify payment on backend
        setLoading(true);
        try {
          await api.post("/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          setPaymentDone(true);
          // Now register user
          await submitSignup("paid", response.razorpay_payment_id);
        } catch {
          setError("Payment verification failed. Please contact support.");
        } finally {
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => setError("Payment cancelled. You can try again."),
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  /* ── Final signup submit ── */
  const submitSignup = async (plan: "free" | "paid", paymentId?: string) => {
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/signup", {
        email,
        password,
        name,
        phone,
        ca_level: caLevel,
        ca_attempt: Number(caAttempt),
        plan,
        payment_id: paymentId || null,
      });
      setSuccessMessage(
        plan === "paid"
          ? "Payment successful! Your account has been created and is awaiting admin approval."
          : "Free account created! Awaiting admin approval."
      );
      setMode("login");
      reset();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Login submit ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccessMessage(""); setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      const me = await api.get("/auth/me");
      onLoggedIn(me.data.role);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Step indicator ── */
  const STEPS = ["Details", "Choose Plan", "Confirm"];
  const stepIdx = step === "details" ? 0 : step === "plan" ? 1 : 2;

  /* ── Render ── */
  return (
    <div className="auth-page">
      <div className="auth-bg-blob auth-bg-blob-1" />
      <div className="auth-bg-blob auth-bg-blob-2" />

      <div className={`auth-card-premium${mode === "signup" && step !== "details" ? " auth-card-wide" : ""}`}>

        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo"><span className="auth-logo-text">CA</span></div>
          <div className="auth-brand-info">
            <span className="auth-brand-name">CA Tutor</span>
            <span className="auth-brand-tag">AI-Powered Learning</span>
          </div>
        </div>

        {/* ───────────────── LOGIN ───────────────── */}
        {mode === "login" && (
          <>
            <div className="auth-top">
              <h1>Welcome back</h1>
              <p>Sign in to continue your CA exam preparation.</p>
            </div>
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="auth-field">
                <label className="auth-label">Email address</label>
                <input className="auth-input" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <input className="auth-input" type={showPass ? "text" : "password"}
                    placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                  <button type="button" className="auth-pass-toggle"
                    onClick={() => setShowPass((p) => !p)} tabIndex={-1}
                    aria-label={showPass ? "Hide" : "Show"}>
                    {showPass ? "🙈" : "👁"}
                  </button>
                </div>
              </div>
              {error && <div className="auth-error" role="alert"><span className="auth-alert-icon">⚠</span> {error}</div>}
              {successMessage && <div className="auth-success" role="status"><span className="auth-alert-icon">✅</span> {successMessage}</div>}
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? <span className="auth-btn-loading"><span className="auth-spinner" />Please wait…</span> : "Sign In →"}
              </button>
            </form>
            <div className="auth-divider"><span>or</span></div>
            <div className="auth-switch">
              Don't have an account? <button type="button" onClick={toggleMode}>Sign up free</button>
            </div>
            <div className="auth-trust">
              <span>🔒 Secure</span><span>📚 ICAI Aligned</span><span>🤖 AI-Powered</span>
            </div>
          </>
        )}

        {/* ───────────────── SIGNUP ───────────────── */}
        {mode === "signup" && (
          <>
            {/* Step bar */}
            <div className="signup-steps">
              {STEPS.map((label, i) => (
                <React.Fragment key={label}>
                  <div className={`signup-step${i <= stepIdx ? " signup-step-done" : ""}${i === stepIdx ? " signup-step-active" : ""}`}>
                    <div className="signup-step-dot">
                      {i < stepIdx ? "✓" : i + 1}
                    </div>
                    <span className="signup-step-label">{label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`signup-step-line${i < stepIdx ? " signup-step-line-done" : ""}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* ── STEP 1: Personal Details ── */}
            {step === "details" && (
              <>
                <div className="auth-top">
                  <h1>Create account</h1>
                  <p>Join thousands of CA students learning smarter.</p>
                </div>

                {/* Level pills */}
                <div className="auth-level-pills">
                  {CA_LEVELS.map((lvl) => (
                    <button key={lvl} type="button"
                      className={`auth-level-pill${caLevel === lvl ? " auth-level-pill-active" : ""}`}
                      onClick={() => setCaLevel(lvl)}>{lvl}</button>
                  ))}
                </div>

                <form className="auth-form" onSubmit={proceedToPlan}>
                  <div className="auth-form-row">
                    <div className="auth-field">
                      <label className="auth-label">Full Name</label>
                      <input className="auth-input" type="text" placeholder="Riya Sharma"
                        value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Phone</label>
                      <input className="auth-input" type="tel" placeholder="10-digit number"
                        value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Email address</label>
                    <input className="auth-input" type="email" placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">CA Attempt <span className="auth-label-hint">(e.g. 1, 2, 3…)</span></label>
                    <input className="auth-input" type="number" min={1} max={20}
                      placeholder="Which attempt?" value={caAttempt}
                      onChange={(e) => setCaAttempt(e.target.value)} required />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Password</label>
                    <div className="auth-input-wrap">
                      <input className="auth-input" type={showPass ? "text" : "password"}
                        placeholder="••••••••" value={password}
                        onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
                      <button type="button" className="auth-pass-toggle"
                        onClick={() => setShowPass((p) => !p)} tabIndex={-1}>
                        {showPass ? "🙈" : "👁"}
                      </button>
                    </div>
                  </div>
                  {error && <div className="auth-error" role="alert"><span className="auth-alert-icon">⚠</span> {error}</div>}
                  <button className="auth-btn" type="submit">
                    Choose Plan →
                  </button>
                </form>
              </>
            )}

            {/* ── STEP 2: Plan Selection ── */}
            {step === "plan" && (
              <div className="plan-step">
                <div className="auth-top">
                  <h1>Choose your plan</h1>
                  <p>Selected level: <strong>{caLevel}</strong></p>
                </div>

                <div className="plan-cards">

                  {/* Free plan */}
                  <div className="plan-card plan-card-free">
                    <div className="plan-card-top">
                      <div className="plan-badge plan-badge-free">Free</div>
                      <div className="plan-price">
                        <span className="plan-price-amount">₹0</span>
                        <span className="plan-price-period">/month</span>
                      </div>
                      <p className="plan-card-desc">Get started with limited access</p>
                    </div>
                    <ul className="plan-features">
                      {FREE_FEATURES.map((f) => (
                        <li key={f}><span className="plan-feat-icon plan-feat-icon-free">✓</span>{f}</li>
                      ))}
                    </ul>
                    <button className="plan-cta plan-cta-free"
                      onClick={() => choosePlan("free")} disabled={loading}>
                      Continue Free
                    </button>
                  </div>

                  {/* Paid plan */}
                  <div className="plan-card plan-card-paid">
                    <div className="plan-card-glow" />
                    <div className="plan-card-top">
                      <div className="plan-badge plan-badge-paid">✨ Premium</div>
                      <div className="plan-price">
                        <span className="plan-price-amount">₹{PLAN_PRICES[caLevel as CALevel]}</span>
                        <span className="plan-price-period">/month</span>
                      </div>
                      <p className="plan-card-desc">{caLevel} — full access</p>
                    </div>
                    <ul className="plan-features">
                      {PLAN_FEATURES[caLevel as CALevel].map((f) => (
                        <li key={f}><span className="plan-feat-icon plan-feat-icon-paid">★</span>{f}</li>
                      ))}
                    </ul>
                    <button className="plan-cta plan-cta-paid"
                      onClick={() => choosePlan("paid")} disabled={loading}>
                      {loading ? <><span className="auth-spinner" /> Loading…</> : "Pay with Razorpay →"}
                    </button>
                    <p className="plan-secure-note">🔒 Secured by Razorpay · UPI · Cards · NetBanking</p>
                  </div>

                </div>

                {error && <div className="auth-error" role="alert"><span className="auth-alert-icon">⚠</span> {error}</div>}

                <button className="plan-back-btn" onClick={() => { setStep("details"); setError(""); }}>
                  ← Back
                </button>
              </div>
            )}

            {/* ── STEP 3: Payment / Confirm ── */}
            {step === "payment" && (
              <div className="payment-step">
                {selectedPlan === "free" ? (
                  /* Free confirmation */
                  <div className="payment-confirm">
                    <div className="payment-confirm-icon">🎓</div>
                    <h2>Free Plan Selected</h2>
                    <p>You're signing up for the <strong>free tier</strong>. You'll get limited access to CA Tutor.</p>
                    <div className="payment-summary-box payment-summary-free">
                      <div className="psb-row"><span>Plan</span><strong>Free</strong></div>
                      <div className="psb-row"><span>Level</span><strong>{caLevel}</strong></div>
                      <div className="psb-row"><span>Billing</span><strong>₹0 / month</strong></div>
                    </div>
                    {error && <div className="auth-error" role="alert"><span className="auth-alert-icon">⚠</span> {error}</div>}
                    <button className="auth-btn" onClick={() => submitSignup("free")} disabled={loading}>
                      {loading ? <><span className="auth-spinner" /> Creating account…</> : "Create Free Account →"}
                    </button>
                  </div>
                ) : paymentDone ? (
                  /* Payment success */
                  <div className="payment-confirm payment-success-screen">
                    <div className="payment-confirm-icon payment-success-icon">✅</div>
                    <h2>Payment Successful!</h2>
                    <p>Your <strong>{caLevel} Premium</strong> account is being set up.</p>
                  </div>
                ) : (
                  /* Paid checkout */
                  <div className="payment-confirm">
                    <div className="payment-confirm-icon">💳</div>
                    <h2>Complete Payment</h2>
                    <p>You're one step away from full <strong>{caLevel}</strong> access.</p>
                    <div className="payment-summary-box payment-summary-paid">
                      <div className="psb-row"><span>Plan</span><strong>{caLevel} Premium</strong></div>
                      <div className="psb-row"><span>Billing</span><strong>Monthly</strong></div>
                      <div className="psb-row psb-total">
                        <span>Total</span>
                        <strong>₹{PLAN_PRICES[caLevel as CALevel]} / month</strong>
                      </div>
                    </div>
                    <div className="rzp-methods">
                      <span>UPI</span><span>Cards</span><span>Net Banking</span><span>Wallets</span>
                    </div>
                    {error && <div className="auth-error" role="alert"><span className="auth-alert-icon">⚠</span> {error}</div>}
                    <button className="auth-btn plan-cta-paid-btn" onClick={launchRazorpay} disabled={loading || !rzpLoaded}>
                      {loading ? <><span className="auth-spinner" /> Please wait…</> : `Pay ₹${PLAN_PRICES[caLevel as CALevel]} →`}
                    </button>
                    <p className="plan-secure-note">🔒 100% secure · Powered by Razorpay</p>
                  </div>
                )}
                <button className="plan-back-btn" onClick={() => { setStep("plan"); setError(""); }}>
                  ← Change Plan
                </button>
              </div>
            )}

            <div className="auth-divider"><span>or</span></div>
            <div className="auth-switch">
              Already have an account? <button type="button" onClick={toggleMode}>Sign in</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default Auth;

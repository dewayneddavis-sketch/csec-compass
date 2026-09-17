import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Pricing.css";

const plans = [
  {
    id: "subject",
    name: "Per Subject",
    price: "$9.99",
    description: "Full access to one CSEC subject",
    features: ["All lessons and modules", "Interactive experiments", "Knowledge check quizzes", "Progress tracking"],
  },
  {
    id: "bundle",
    name: "All Subjects Bundle",
    price: "$49.99",
    description: "Full access to every CSEC subject on the platform",
    features: ["Everything in Per Subject", "Every CSEC subject we publish", "Bundle pricing (save 50% vs buying subjects separately)"],
    popular: true,
  },
];

// School License ladder (owner decision 2026-09-13). Prices are the live
// Stripe products — priceType is the tier id and must stay in sync with
// api/checkout/create-session.js (SCHOOL_LICENSES), which owns the Stripe
// price ids. Seats × per-student rate: 50×$25, 100×$20, 150×$15.
const SCHOOL_LICENSES = [
  { priceType: "school-license-50", seats: 50, price: 1250, perStudent: 25 },
  { priceType: "school-license-100", seats: 100, price: 2000, perStudent: 20 },
  { priceType: "school-license-150", seats: 150, price: 2250, perStudent: 15 },
];

// The subjects that can be bought on their own (ids must match
// api/checkout/create-session + api/stripe/webhook.js expectations; names
// are display labels). Subjects not listed here are still included in the
// bundle and in a school license.
const SUBJECT_OPTIONS = [
  { id: "biology", name: "Biology" },
  { id: "chemistry", name: "Chemistry" },
  { id: "english-a", name: "English A" },
  { id: "human-social-biology", name: "Human & Social Biology" },
  { id: "information-technology", name: "Information Technology" },
  { id: "mathematics", name: "Mathematics" },
  { id: "physics", name: "Physics" },
  { id: "principles-of-accounts", name: "Principles of Accounts" },
  { id: "social-studies", name: "Social Studies" },
  { id: "spanish", name: "Spanish" },
];

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState("");
  const [subjectId, setSubjectId] = useState("");

  async function handleBuy(planId, selectedSubjectId) {
    if (!user) { navigate("/login"); return; }
    if (planId === "subject" && !selectedSubjectId) {
      setMessage("Please select a subject first.");
      return;
    }
    setBusy(planId);
    setMessage("");
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceType: planId,
          subjectId: planId === "subject" ? selectedSubjectId : null,
          userId: user.id,
          successUrl: window.location.origin + "/account",
          cancelUrl: window.location.origin + "/pricing",
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setMessage("Error creating checkout: " + (data.error || "Unknown"));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p>Unlock full access to CSEC exam prep materials.</p>
      </div>
      <div className="pricing-grid">
        {plans.map((plan) => (
          <div key={plan.id} className={`pricing-card ${plan.popular ? "popular" : ""}`}>
            {plan.popular && <span className="pricing-badge">Best Value</span>}
            <h2 className="pricing-name">{plan.name}</h2>
            <p className="pricing-price">{plan.price}</p>
            <p className="pricing-desc">{plan.description}</p>
            <ul className="pricing-features">
              {plan.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            {plan.id === "subject" && (
              <label className="pricing-subject-label">
                Which subject?
                <select
                  className="pricing-select"
                  value={subjectId || ""}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  <option value="" disabled>Select a subject…</option>
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
            )}
            <button
              className="pricing-btn"
              onClick={() => handleBuy(plan.id, plan.id === "subject" ? subjectId : null)}
              disabled={busy === plan.id || (plan.id === "subject" && !subjectId)}
            >
              {busy === plan.id ? "Redirecting..." : "Buy Now"}
            </button>
          </div>
        ))}
      </div>

      <section className="pricing-school">
        <div className="pricing-school-header">
          <h2>School Licenses</h2>
          <p>
            One-year licence for a whole class or year group. Every seat gets its own student
            account with all subjects, lessons, interactive labs, practice questions, timed mock
            exams and end-of-course knowledge checks.
          </p>
        </div>
        <div className="pricing-school-grid">
          {SCHOOL_LICENSES.map((tier) => (
            <div key={tier.priceType} className="pricing-card tier">
              <h3 className="pricing-name">Up to {tier.seats} students</h3>
              <p className="pricing-price">
                ${tier.price.toLocaleString("en-US")}
                <span className="pricing-per-year"> / year</span>
              </p>
              <p className="pricing-desc">${tier.perStudent} per student, per year</p>
              <ul className="pricing-features">
                <li>Every CSEC subject on the platform</li>
                <li>Up to {tier.seats} student accounts</li>
                <li>One year of access</li>
                <li>One payment — no recurring subscription</li>
              </ul>
              <button
                className="pricing-btn"
                onClick={() => handleBuy(tier.priceType, null)}
                disabled={busy === tier.priceType}
              >
                {busy === tier.priceType ? "Redirecting..." : "Buy License"}
              </button>
            </div>
          ))}
        </div>
        <p className="pricing-school-note">
          Larger cohort? Add a second licence to the same account, or contact us for a custom
          quote — the school pays per seat used.
        </p>
      </section>

      {message && <div className="pricing-message">{message}</div>}
      <p className="pricing-note">
        All purchases are one-time payments. No recurring subscriptions.
      </p>
    </div>
  );
}

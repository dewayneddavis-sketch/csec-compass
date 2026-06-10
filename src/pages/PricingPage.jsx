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
    description: "Full access to ALL CSEC subjects",
    features: ["Everything in Per Subject", "All 14+ subjects", "Bundle pricing (save 60%+)", "New subjects added free"],
    popular: true,
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState("");

  async function handleBuy(planId, subjectId) {
    if (!user) { navigate("/login"); return; }
    setBusy(planId);
    setMessage("");
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceType: planId,
          subjectId: subjectId || null,
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
            <button className="pricing-btn" onClick={() => handleBuy(plan.id)} disabled={busy === plan.id}>
              {busy === plan.id ? "Redirecting..." : "Buy Now"}
            </button>
          </div>
        ))}
      </div>
      {message && <div className="pricing-message">{message}</div>}
      <p className="pricing-note">All purchases are one-time payments. No recurring subscriptions.</p>
    </div>
  );
}
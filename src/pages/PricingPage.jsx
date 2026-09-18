import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FALLBACK_SUBJECT_OPTIONS,
  buildSubjectOptions,
  bundleSavingsLabel,
  resolvePreselectedSubject,
} from "../data/pricingSubjects";
import "./Pricing.css";

// The per-subject plan and the bundle. Every subject on the platform is
// purchasable on its own at the same $9.99 (owner decision 2026-09-18) — the
// dropdown below the "Per Subject" card lists all of them, and it is populated
// from content/subjects.json (see src/data/pricingSubjects.js) so it cannot fall
// behind the catalog again. The bundle's saving is computed from the number of
// subjects rather than written down, so the copy stays true as subjects ship.
function plansFor(subjectCount) {
  return [
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
      features: [
        "Everything in Per Subject",
        "Every CSEC subject we publish",
        `Bundle pricing — ${bundleSavingsLabel(subjectCount)}`,
      ],
      popular: true,
    },
  ];
}

// School License ladder (owner decision 2026-09-13). Prices are the live
// Stripe products — priceType is the tier id and must stay in sync with
// api/checkout/create-session.js (SCHOOL_LICENSES), which owns the Stripe
// price ids. Seats × per-student rate: 50×$25, 100×$20, 150×$15.
const SCHOOL_LICENSES = [
  { priceType: "school-license-50", seats: 50, price: 1250, perStudent: 25 },
  { priceType: "school-license-100", seats: 100, price: 2000, perStudent: 20 },
  { priceType: "school-license-150", seats: 150, price: 2250, perStudent: 15 },
];

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Every paywall link in the app is /pricing?subject=<id>.
  const [searchParams] = useSearchParams();
  const requestedSubject = searchParams.get("subject") || "";
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState("");
  // null = the buyer has not chosen yet, so the link's subject (if any) applies.
  const [chosenSubject, setChosenSubject] = useState(null);
  // Start from the full static list so the dropdown is never empty or partial,
  // then replace it with the catalog (the same 23 subjects) when it arrives.
  const [subjectOptions, setSubjectOptions] = useState(FALLBACK_SUBJECT_OPTIONS);

  useEffect(() => {
    let cancelled = false;
    fetch("/content/subjects.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((catalog) => {
        if (!cancelled && catalog) setSubjectOptions(buildSubjectOptions(catalog));
      })
      .catch(() => {
        // Keep the static list — a failed fetch must never shrink the dropdown.
      });
    return () => { cancelled = true; };
  }, []);

  // The paywall link's subject preselects the dropdown — derived rather than
  // written into state, so it is right on the first paint and an explicit choice
  // by the buyer always wins over the link.
  const requestedSubjectId = resolvePreselectedSubject(requestedSubject, subjectOptions);
  const subjectId = chosenSubject === null ? requestedSubjectId : chosenSubject;

  // A link naming a subject we do not know is a stale link, not a forgotten
  // choice: say so plainly instead of "Please select a subject first".
  const unmatchedSubjectLink = Boolean(requestedSubject) && !subjectId;
  const plans = plansFor(subjectOptions.length);

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
                  onChange={(e) => setChosenSubject(e.target.value)}
                >
                  <option value="" disabled>Select a subject…</option>
                  {subjectOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
            )}
            {plan.id === "subject" && unmatchedSubjectLink && (
              <p className="pricing-subject-note">
                That link didn&rsquo;t match a subject on the platform — choose the subject you
                want above. Any of the {subjectOptions.length} subjects can be bought on its own.
              </p>
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

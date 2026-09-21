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

// A school licence is bought by the school, which names itself and the person
// who will run its console (owner direction 2026-09-20). Both travel with the
// checkout so the school is set up the moment the payment lands — nobody has to
// create it by hand. The server re-validates both (this is only a courtesy
// check so the buyer is not bounced to Stripe with a field missing).
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
const MAX_SCHOOL_NAME = 120;

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
  // Who the licence belongs to and who runs its console — asked once, above the
  // three tiers, because every tier needs the same two answers.
  const [schoolName, setSchoolName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

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
    // A school licence needs the school and its admin before we send the buyer
    // to Stripe — that is what lets the school set itself up with no one in the
    // middle. The server refuses a school tier without them, so this check keeps
    // the buyer from losing their place to a round trip.
    let school = null;
    if (SCHOOL_LICENSES.some((tier) => tier.priceType === planId)) {
      const name = schoolName.trim().replace(/\s+/g, " ");
      const admin = adminEmail.trim().toLowerCase();
      if (!name) {
        setMessage("Enter your school's name above — the licence is registered to that school.");
        return;
      }
      if (name.length > MAX_SCHOOL_NAME) {
        setMessage(`School name is too long (max ${MAX_SCHOOL_NAME} characters).`);
        return;
      }
      if (!EMAIL_RE.test(admin)) {
        setMessage(
          "Enter the email of the person who will run your school's account (for example principal@school.edu.jm)."
        );
        return;
      }
      school = { name, adminEmail: admin };
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
          schoolName: school ? school.name : null,
          adminEmail: school ? school.adminEmail : null,
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

        {/* Asked once, for whichever tier is bought. These two answers are what
            set the school up: the payment creates the school and hands its
            console to this person, so nothing waits on us. */}
        <div className="pricing-school-form">
          <h3 className="pricing-school-form-title">Your school</h3>
          <p className="pricing-school-form-hint">
            Tell us whose licence this is and who will run it. The account is ready as soon as the
            payment goes through — classes, teachers and students are yours to arrange from there.
          </p>
          <div className="pricing-school-form-fields">
            <label className="pricing-field">
              <span>School name</span>
              <input
                className="pricing-input"
                type="text"
                value={schoolName}
                maxLength={MAX_SCHOOL_NAME}
                placeholder="e.g. Wolmer's Boys' School"
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </label>
            <label className="pricing-field">
              <span>Who should run this school&rsquo;s account?</span>
              <input
                className="pricing-input"
                type="email"
                value={adminEmail}
                placeholder="principal@school.edu.jm"
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </label>
          </div>
          <p className="pricing-school-form-hint">
            That person signs in at <code>/school</code> with their own account to add teachers,
            students and classes — and sees only this school, never another.
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

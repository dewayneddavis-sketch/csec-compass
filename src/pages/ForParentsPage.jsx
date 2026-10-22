import { Link } from "react-router-dom";
import { TRADEMARK_DISCLAIMER, CG_TRADEMARK_DISCLAIMER } from "../data/legal";
import "./ForParentsPage.css";

// A plain-language page for parents (owner direction 2026-10-19: a real page on
// the site, not a document).
//
// Every statement here is checked against the code that actually runs:
//   * 25 subjects — src/data/contentLoader.js builds the catalogue from
//     content/<subject>/metadata.json (23 CSEC subjects plus City & Guilds
//     Mathematics and English), and the home page counts them from the same
//     source. The page does not type the number: it is asserted by
//     tools/check-for-parents-page.mjs against the catalogue on disk.
//   * the per-subject shape — 100-question Extra Practice, timed mock exam
//     (~1.5 minutes per question, 60% to pass, review + retake), 25-question
//     knowledge check, Paper 2 typed-answer practice where the subject has one,
//     and the exam-support section (src/components/*.jsx, src/data/mockPaper.js,
//     src/data/sbaTabs.js).
//   * the Mathematics show-your-work loop — src/data/showYourWork.js and
//     src/components/ShowYourWork.jsx (a box on every Mathematics answer) plus
//     src/components/HowToSolveIt.jsx for the step-by-step method.
//   * the prices — the same numbers the Pricing page and Stripe carry
//     ($9.99 / $49.99, and the $1,250 / $2,000 / $2,250 school ladder in
//     src/data/pricingSubjects.js), one year of access from purchase.
//
// Deliberately NOT on this page: testimonials, student numbers, exam results,
// pass-rate or grade claims, and any urgency. There is no live cohort yet, so
// there is nothing of that kind to state.
export default function ForParentsPage() {
  return (
    <div className="fp-page">
      <div className="fp-hero">
        <h1>For parents</h1>
        <p className="fp-lead">
          CSEC Compass is online exam preparation your child works through at their own pace. They
          pick a subject, work through its lessons and practice activities, and finish with a
          knowledge check that shows what they have understood — without waiting for a teacher to be
          free.
        </p>
        <div className="fp-cta-row">
          <Link to="/" className="fp-btn">Browse the subjects</Link>
          <Link to="/pricing" className="fp-btn fp-btn-ghost">See prices and buy</Link>
        </div>
      </div>

      <section className="fp-card fp-callout">
        <h2>What your child gets</h2>
        <ul className="fp-list">
          <li>
            <strong>25 subjects</strong> — 23 CSEC subjects plus City &amp; Guilds Mathematics and
            English.
          </li>
          <li>
            <strong>Lessons with an interactive activity for each one.</strong> Every lesson has a
            short activity your child works through rather than just reading.
          </li>
          <li>
            <strong>100 extra practice questions</strong> per subject for drilling the topics they
            are weakest on.
          </li>
          <li>
            <strong>A timed mock exam</strong> — about 1½ minutes per question, 60% to pass, and both
            review and retake afterwards.
          </li>
          <li>
            <strong>A 25-question knowledge check</strong> at the end, so you and your child can see
            what is secure and what needs another look.
          </li>
          <li>
            <strong>Paper 2 typed-answer practice</strong> where the subject has a written paper.
          </li>
          <li>
            <strong>An exam-support section</strong> — command words and exam technique, plus the
            SBA or oral-exam guidance that applies to that subject.
          </li>
        </ul>
      </section>

      <section className="fp-card">
        <h2>What makes it different</h2>
        <ul className="fp-list">
          <li>
            <strong>Your child shows their working on every Mathematics answer.</strong> There is a
            box on every Mathematics question, so the answer has to come from solving the problem
            rather than from guessing or copying.
          </li>
          <li>
            <strong>A wrong answer explains itself.</strong> On Mathematics the correct answer is
            shown with the step-by-step method, so the learning continues at the exact moment your
            child gets something wrong — which is the moment a teacher would normally step in.
          </li>
        </ul>
      </section>

      <section className="fp-card">
        <h2>What it costs</h2>
        <ul className="fp-list">
          <li>
            <strong>One subject — $9.99</strong> for one year.
          </li>
          <li>
            <strong>All 25 subjects — $49.99</strong> for one year.
          </li>
          <li>
            <strong>School licences — $1,250 / $2,000 / $2,250 per year</strong> for up to 50 / 100 /
            150 students.
          </li>
        </ul>
        <p className="fp-note">
          That is the whole price list. Payment is a one-time yearly payment: one year of access from
          the date of purchase, with no automatic renewal. Nothing here is a trial, a discount or a
          limited-time offer.
        </p>
      </section>

      <section className="fp-card">
        <h2>How it works for you</h2>
        <ul className="fp-list">
          <li>
            <strong>You buy, and you can name your child.</strong> When you buy a subject or the
            bundle you can enter your child&rsquo;s email, which links their progress to you.
          </li>
          <li>
            <strong>You can then open the parent view</strong> and see that child&rsquo;s progress
            summaries — their lessons, their results and the topics they are weakest on. It shows
            progress only; it does not give you their password or let you sign in as them.
          </li>
          <li>
            <strong>Your child still works at their own pace.</strong> Nothing on the platform sets
            deadlines or rushes them.
          </li>
        </ul>
      </section>

      <section className="fp-card fp-callout">
        <h2>How to start</h2>
        <ol className="fp-list fp-steps">
          <li>Browse the subject list and open a subject to see what is inside.</li>
          <li>Choose one subject, or all 25, and pay on the checkout page.</li>
          <li>Your child signs in with their own account and starts at the first lesson.</li>
        </ol>
        <div className="fp-cta-row">
          <Link to="/" className="fp-btn">Browse all subjects</Link>
          <Link to="/pricing" className="fp-btn fp-btn-ghost">Prices and checkout</Link>
          <Link to="/contact" className="fp-btn fp-btn-ghost">Ask us a question</Link>
        </div>
      </section>

      <section className="fp-card">
        <h2>About our content</h2>
        <p>
          Every lesson, question and worked answer on CSEC Compass is original material written for
          CSEC preparation. Nothing is copied from past papers.
        </p>
        {/* The same shared sentences the footer, the Terms page and the Privacy
            page show, so no surface can make a different claim. */}
        <p className="fp-disclaimer">{TRADEMARK_DISCLAIMER}</p>
        <p className="fp-disclaimer">{CG_TRADEMARK_DISCLAIMER}</p>
        <p className="fp-small">
          You can also read our{" "}
          <Link to="/terms" className="fp-inline-link">Terms of Service</Link> and our{" "}
          <Link to="/privacy" className="fp-inline-link">Privacy Policy</Link>.
        </p>
      </section>

      <div className="fp-foot">
        <Link to="/pricing" className="fp-btn">See prices and buy</Link>
        <Link to="/" className="fp-btn fp-btn-ghost">Back to all subjects</Link>
      </div>
    </div>
  );
}

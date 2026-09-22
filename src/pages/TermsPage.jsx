import { Link } from "react-router-dom";
import { TERMS_LAST_UPDATED, TRADEMARK_DISCLAIMER } from "../data/legal";
import "./TermsPage.css";

// Terms of Service.
//
// Written for the owner's legal review of 2026-09-22 (Jamaica Copyright Act /
// Consumer Protection Act): the site needed a plain-language terms page and a
// trademark disclaimer. The wording is deliberately plain, and the three claims
// the platform must never make are stated as limits on us, not as promises:
// we are not CXC, our questions are our own, and results vary.
export default function TermsPage() {
  return (
    <div className="terms-page">
      <div className="terms-header">
        <h1>Terms of Service</h1>
        <p className="terms-updated">Last updated {TERMS_LAST_UPDATED}</p>
        <p className="terms-lead">
          These are the terms you agree to when you use CSEC Compass. They are written to be read,
          not to be clicked past — if anything here is unclear, don’t buy until you have asked.
        </p>
      </div>

      <section className="terms-card terms-callout">
        <h2>We are not CXC</h2>
        {/* The exact sentence the owner's review asked for — never reworded. */}
        <p className="terms-disclaimer">{TRADEMARK_DISCLAIMER}</p>
        <p>
          “CSEC” on this site always means the exam we help you prepare for. It never means that
          anything here comes from, or has been checked by, the Caribbean Examinations Council.
        </p>
      </section>

      <section className="terms-card">
        <h2>Our content is our own</h2>
        <p>
          All practice questions, explanations, lessons, labs and other materials on CSEC Compass are
          original creations of CSEC Compass. They are written to match the style and structure of
          CSEC examination topics. They are not official CXC past papers and are not reproduced from
          any past paper.
        </p>
        <p>
          Where the platform links out to the Caribbean Examinations Council’s own website for
          syllabus or past-paper information, that is an external link: the material on the other
          side of it belongs to its owner, not to us.
        </p>
        <p>
          The lessons, questions, answers, worked solutions and lab activities are protected by
          copyright. Your purchase gives you the right to study with them — not to copy them
          elsewhere, resell them or share them.
        </p>
      </section>

      <section className="terms-card">
        <h2>Results vary, and no grade is promised</h2>
        <p>
          How much a student improves depends on the individual student’s effort, the time they put
          in, and their own starting point. Results vary by individual student effort, and no grade
          outcome is guaranteed.
        </p>
        <p>
          We do not promise a pass, a particular grade, or a particular score on the knowledge
          checks, the mock exams or the real examination. What the platform gives you is the practice,
          the worked solutions and the feedback to see where a student stands.
        </p>
      </section>

      <section className="terms-card">
        <h2>Purchases, access and refunds</h2>
        <ul className="terms-list">
          <li>
            A single subject costs $9.99 and the All Subjects bundle costs $49.99 (US dollars). Both
            give <strong>one year of access from the date of purchase</strong>. A school licence is
            priced <strong>per seat, per year</strong>, for the number of seats bought.
          </li>
          <li>
            Payments are processed by Stripe. The charge on your statement and the receipt Stripe
            emails you identify the payment; refunds are handled per Stripe’s policy through that same
            purchase record.
          </li>
          <li>
            Buying a subject once does not quietly renew anything: access simply runs for its year and
            then ends unless you buy again.
          </li>
          <li>
            A school licence covers the seats bought for one year. Seats can be reassigned within your
            school’s account; they cannot be sold or transferred to another school.
          </li>
        </ul>
      </section>

      <section className="terms-card">
        <h2>Accounts and how you may use the platform</h2>
        <ul className="terms-list">
          <li>
            <strong>One account, one person.</strong> Accounts are single-user. Do not share your
            login, and do not let several students work from one account.
          </li>
          <li>
            Do not copy, record, republish, resell or redistribute the lessons, questions,
            explanations or lab activities, or use them to build another product or course.
          </li>
          <li>
            Do not use automated tools to scrape the platform, and do not attempt to reach parts of
            it, or other people’s data, that your account is not entitled to.
          </li>
          <li>
            A school or teacher account may only link the students that school or teacher actually
            teaches.
          </li>
          <li>
            An account that breaks these rules may be suspended or closed. If that happens, tell us
            what went wrong through the same purchase record and we will look at it.
          </li>
        </ul>
      </section>

      <section className="terms-card">
        <h2>Changes to these terms</h2>
        <p>
          If these terms change in a way that affects a purchase you have already made, we will say
          so here and update the date at the top of this page. Continuing to use CSEC Compass after a
          change means you accept the updated terms.
        </p>
      </section>

      <div className="terms-foot">
        <Link to="/pricing" className="terms-btn">See the plans</Link>
        <Link to="/" className="terms-btn terms-btn-ghost">Back to all subjects</Link>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { PRIVACY_CONTACT_EMAIL, PRIVACY_LAST_UPDATED } from "../data/legal";
import "./PrivacyPage.css";

// Privacy Policy.
//
// Companion to the Terms page, from the same legal review (2026-09-22): the
// review asked for the privacy half the site did not have. Every statement here
// is checked against the code that actually runs — the tables in
// supabase/schema.sql (user_progress, lab_activity, quiz_results,
// revision_plans, purchases, teacher_students, parent_students, schools), the
// signup forms (email + password only, no name), the linking features (an adult
// makes the link, never the child) and index.html (no ad or analytics scripts).
//
// Two things are deliberately NOT claimed: a self-service data-export feature
// (there isn't one — rights are exercised by email) and anything about selling
// or sharing data beyond the processors that actually run the platform.
export default function PrivacyPage() {
  return (
    <div className="privacy-page">
      <div className="privacy-header">
        <h1>Privacy Policy</h1>
        <p className="privacy-updated">Last updated {PRIVACY_LAST_UPDATED}</p>
        <p className="privacy-lead">
          This page explains, in plain language, what information CSEC Compass holds about you, why
          we hold it, who can see it, and how to get it changed or deleted. It is written for
          students, parents and schools — under Jamaica’s Data Protection Act 2020.
        </p>
      </div>

      <section className="privacy-card privacy-callout">
        <h2>The short version</h2>
        <ul className="privacy-list">
          <li>We ask for your <strong>email address</strong> to create your account. That is all.</li>
          <li>
            We keep your <strong>study activity</strong> — lessons ticked off, lab activities, quiz
            and mock exam results — because that is what progress tracking and weak-topic revision
            are made of.
          </li>
          <li>
            <strong>Payments go through Stripe.</strong> Card numbers never reach us, and we never
            see or store them.
          </li>
          <li>
            <strong>An adult makes every link</strong> — a parent names their child at checkout, a
            teacher or school admin links students from their own account. A student never creates
            one, and a link only ever shows progress summaries.
          </li>
          <li>
            <strong>We do not sell or rent personal data</strong>, and we do not share it for
            advertising.
          </li>
          <li>
            Want it seen, fixed or deleted? Email us — the address is at the bottom of this page.
          </li>
        </ul>
      </section>

      <section className="privacy-card">
        <h2>What we collect</h2>
        <ul className="privacy-list">
          <li>
            <strong>Your email address</strong> — the one you sign up with. It is your account name
            and how we reach you about your account. Signup asks for an email and a password and
            nothing else: no name, no address, no phone number, no date of birth.
          </li>
          <li>
            <strong>Your password</strong> is used only to sign you in. Authentication is handled by
            Supabase, our authentication provider, which stores passwords in hashed form — CSEC
            Compass never keeps your password in readable form.
          </li>
          <li>
            <strong>Your study activity.</strong> Which lessons you have ticked off, which lab
            activities you have run, your quiz, knowledge-check and mock exam results (the score and
            the answers you gave, with the topic of each question), and any revision plan you build
            in the Planner. This is what makes progress tracking, the weak-topic revision view and
            the Planner work — for you, and for a teacher or parent you are linked to.
          </li>
          <li>
            <strong>Work in progress, in your own browser.</strong> Unfinished written answers
            (Paper 2 drafts) and answers you have not yet submitted are kept in your browser’s local
            storage so you do not lose your place. They are on your device; clearing your browser
            data clears them.
          </li>
          <li>
            <strong>Your purchase record.</strong> What you bought (a single subject, the All
            Subjects bundle, or a school licence), when, how much, and the Stripe reference for the
            payment. A school licence also records the school’s name and the email of the person who
            runs that school’s account, because that is who the licence belongs to.
          </li>
          <li>
            <strong>Emails used for linking.</strong> If a parent types their child’s email at
            checkout, or a teacher or school admin links student emails, we store that email and the
            link between the two accounts. That is the whole purpose of those emails: connecting a
            student’s progress to the adult responsible for them.
          </li>
          <li>
            <strong>Payment details.</strong> Card payments are made on Stripe’s own checkout page.
            The card number, expiry date and security code are entered there, are used by Stripe to
            take the payment, and never reach CSEC Compass.
          </li>
        </ul>
      </section>

      <section className="privacy-card">
        <h2>What we do not collect</h2>
        <ul className="privacy-list">
          <li>No card or bank details — Stripe handles payment and we never see them.</li>
          <li>No sensitive personal data. The Act treats things like health, religion and political
            opinion as special categories: we do not ask for any of it and we do not want it.</li>
          <li>
            No advertising or tracking profiles. There are no ad networks and no third-party
            analytics or advertising scripts on the site.
          </li>
        </ul>
      </section>

      <section className="privacy-card">
        <h2>Why we hold it</h2>
        <ul className="privacy-list">
          <li>
            To give you the access you bought — lessons, labs, practice questions, mock exams and
            knowledge checks.
          </li>
          <li>
            To show progress: your own view of it, and the shared per-student progress view for the
            teacher or parent who is linked to that student.
          </li>
          <li>
            To point a student at the topics they are weakest on, and to power the revision Planner.
          </li>
          <li>To keep an honest record of what was bought and paid for.</li>
          <li>To reply to you when you email us, and to send account notices you need.</li>
        </ul>
        <p>
          That is the whole list. We do not use your data for anything else — no profiling, no
          advertising, no selling.
        </p>
      </section>

      <section className="privacy-card">
        <h2>Our legal basis (Jamaica Data Protection Act 2020)</h2>
        <ul className="privacy-list">
          <li>
            <strong>Your consent</strong> — you create an account and agree to our Terms of Service
            and this policy when you sign up. You can withdraw that consent by asking us to close
            your account, and we will act on it.
          </li>
          <li>
            <strong>The contract with you</strong> — providing the access you paid for, and handling
            the payment, needs the purchase record and your account.
          </li>
          <li>
            <strong>The adult who makes a link</strong> — the linking features are created only by
            the adult responsible for the student (a parent at checkout, or a teacher or school
            admin from their own account). The student does not create them, and a link exposes
            progress summaries only.
          </li>
        </ul>
      </section>

      <section className="privacy-card">
        <h2>Who can see your progress</h2>
        <ul className="privacy-list">
          <li>
            <strong>You</strong> — your own account sees your own lessons, labs and results.
          </li>
          <li>
            <strong>A linked teacher</strong> — the teacher’s dashboard shows the per-student
            progress summaries for the students that teacher has linked, and nothing else.
          </li>
          <li>
            <strong>A linked parent</strong> — the parent dashboard shows the same progress
            summaries, only for the child linked to that parent.
          </li>
          <li>
            <strong>A school admin</strong> — the school console shows that school’s own roster and
            members. It is scoped to one school and cannot see another school’s.
          </li>
          <li>
            <strong>Nobody else.</strong> Those dashboards refuse to return any data at all to an
            account that is not linked to the student it asks about.
          </li>
          <li>
            <strong>The services that run the platform.</strong> Supabase (accounts, sign-in and
            database), Stripe (payments) and Vercel (hosting) process this data on our behalf in
            order to provide those services to us.
          </li>
        </ul>
        <p className="privacy-strong">
          We do not sell or rent personal data to anyone, and we do not hand it out for advertising.
        </p>
      </section>

      <section className="privacy-card">
        <h2>Students, and the adult who links them</h2>
        <p>
          Most people using CSEC Compass are secondary-school students, many of them under 18. That
          is exactly why the linking features work the way they do: a link is made by an adult who
          is responsible for the student — a parent buying a subject or the bundle and naming their
          child, or a teacher or school admin linking students from their own account.
        </p>
        <p>
          A link shows progress summaries. It does not give the linked adult the student’s password
          or the ability to sign in as them, and it does not give them a way to submit work as that
          student.
        </p>
        <p>
          If you are a parent or guardian and you want a link removed, or you want to know what a
          linked account can see, email us at the address below and we will deal with it.
        </p>
        <p>
          A school that buys a licence is responsible for telling its students — and their parents —
          that the school’s account will see their progress.
        </p>
      </section>

      <section className="privacy-card">
        <h2>How long we keep it, and how it ends</h2>
        <ul className="privacy-list">
          <li>
            <strong>While your account is active</strong>, we keep your account, your study activity
            and your purchase record — that is what the platform runs on.
          </li>
          <li>
            <strong>If you ask us to delete it, we delete it.</strong> Email us and we will remove
            your account and its data.
          </li>
          <li>
            <strong>Purchase records are kept longer</strong> where we need them to keep our
            accounts in order and to show that a payment was made and access given.
          </li>
          <li>
            <strong>When the year of access ends</strong>, your account is not deleted and your
            progress is not thrown away — it is kept so you can pick up where you left off if you
            buy again. Ask us to delete it and we will.
          </li>
        </ul>
      </section>

      <section className="privacy-card privacy-callout">
        <h2>Your rights, and how to use them</h2>
        <p>
          Under Jamaica’s Data Protection Act 2020 you can ask to see the personal data we hold
          about you, ask us to correct it if it is wrong, ask us to delete it, and withdraw your
          consent to us holding it. You can also object to how we are using it.
        </p>
        <p>
          There is no button for this in the app yet — we would rather say so than promise a feature
          that does not exist. Email us and we will do it for you:
        </p>
        {/* The business inbox, spelled exactly as the owner gave it. Kept in
            src/data/legal.js so no surface can invent a different address. */}
        <p className="privacy-contact">{PRIVACY_CONTACT_EMAIL}</p>
        <p>
          Tell us what you want done — see it, fix it, delete it — and which email your account uses
          so we can find you. If you are not satisfied with how we have handled your data you can
          raise it with the Office of the Information Commissioner in Jamaica; we would rather sort
          it out with you first.
        </p>
      </section>

      <section className="privacy-card">
        <h2>Cookies and your browser’s storage</h2>
        <ul className="privacy-list">
          <li>
            CSEC Compass sets no advertising or third-party tracking cookies, and there are no ad
            networks or third-party analytics on the site.
          </li>
          <li>
            Your sign-in session and your unfinished work are kept in your own browser’s local
            storage so you stay signed in and do not lose your place. Clearing your browser data
            clears them; the study activity saved to your account stays.
          </li>
          <li>
            The checkout page is Stripe’s own page, and Stripe’s privacy policy covers what happens
            there.
          </li>
        </ul>
      </section>

      <section className="privacy-card">
        <h2>Changes to this policy</h2>
        <p>
          If this policy changes in a way that affects you, we will say so here and update the date
          at the top of this page. Continuing to use CSEC Compass after a change means you accept
          the updated policy.
        </p>
        <p>
          This policy covers the CSEC Compass platform and the csec-compass.com website. It sits
          alongside our{" "}
          <Link to="/terms" className="privacy-inline-link">Terms of Service</Link>, which cover
          purchases, access and how the platform may be used.
        </p>
      </section>

      <div className="privacy-foot">
        <Link to="/terms" className="privacy-btn">Read the Terms of Service</Link>
        <Link to="/" className="privacy-btn privacy-btn-ghost">Back to all subjects</Link>
      </div>
    </div>
  );
}

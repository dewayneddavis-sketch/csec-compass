// The ACCOUNT-IDENTITY declaration, taken when an account is created (owner
// instruction 2026-11-05):
//
//   "When you create an account, the person must identify I am a student, I am a
//    Teacher, I am a Parent just as when you purchase a subject or bundle, you
//    must identify."
//
// ---------------------------------------------------------------------------
// THE ONE RULE THIS FILE EXISTS TO PROTECT: A DECLARATION IS NOT AN
// AUTHORISATION.
//
// Choosing "Teacher" at signup does NOT open the Teacher Dashboard. It only
// tells us which dashboard to OFFER that person. Admission is decided by the
// SERVER, from something a person cannot type into their own profile:
//
//   Teacher Dashboard  — the owner (OWNER_EMAILS), the TEACHER_EMAIL(S)
//                        allowlist, a `school_members` roster row with
//                        role='teacher' written by that school's own admin, an
//                        existing `teacher_students` link, or a VERIFIED
//                        purchase that chose "Teacher" at checkout.
//   Parent Dashboard   — a `parent_students` row, which only the Stripe webhook
//                        writes after a verified purchase, or the account's own
//                        progress (a student's session viewing ITSELF).
//
// The owner's own wording says exactly this: a teacher's email gets into the
// Teacher Dashboard "because the school admin entered it".
//
// NOTHING IN THIS FILE IS READ BY ANY api/*.js HANDLER, and nothing may start
// reading it. If a server ever granted access from this value, any student
// could pick "Teacher" at signup and read the whole class.
// tools/check-account-identity.mjs asserts that separation with a red control.
// ---------------------------------------------------------------------------
//
// Where the answer is stored: Supabase `auth.users.user_metadata.account_role`
// (the same place `buyer_role` already mirrors on a purchase row). That is a
// field Supabase already keeps, so this needs NO schema migration and NO new
// table — an account created before this shipped simply has no key, and reads
// as "" below. See accountRoleFromUser().
// The explicit ".js" is required: tools/check-account-identity.mjs drives this
// module from Node, which will not resolve an extensionless specifier.
import { BUYER_ROLE_IDS, BUYER_ROLE_LABELS, BUYER_ROLE_QUESTION, cleanBuyerRole } from "./buyerRoles.js";

// The order the owner asked for at signup: student, Teacher, Parent.
const SIGNUP_ORDER = ["student", "teacher", "parent"];

// Derived from the ONE role list in src/data/buyerRoles.js, so a fourth role
// cannot be added in one place only (tools/check-account-identity.mjs asserts
// the two lists cover the same roles).
export const ACCOUNT_ROLE_IDS = SIGNUP_ORDER.filter((id) => BUYER_ROLE_IDS.includes(id));

// Shown on the radio buttons / select, in signup order.
export const ACCOUNT_ROLE_LABELS = ACCOUNT_ROLE_IDS.reduce((acc, id) => {
  acc[id] = BUYER_ROLE_LABELS[id];
  return acc;
}, {});

// The key the answer rides under in the account's user_metadata.
export const ACCOUNT_ROLE_METADATA_KEY = "account_role";

// The question, the honest hint under it, and what an unanswered form is told.
// The question is the checkout one, IMPORTED rather than retyped: signup asks the
// same "I am a…" that checkout asks, and two copies of a shared string drift.
export const ACCOUNT_ROLE_QUESTION = BUYER_ROLE_QUESTION;
export const ACCOUNT_ROLE_HINT =
  "This decides which dashboard we open for you. It does not give you access on its own: a Teacher is added to the school's roster by the school's admin, and a Parent is linked to their child by the purchase that names them.";
export const ACCOUNT_ROLE_REQUIRED_MESSAGE =
  "Tell us who you are — Student, Teacher or Parent — before creating your account.";

// The wire value for a UI selection, or "" when it is not one of the three.
// Reuses the checkout cleaner so signup and checkout cannot disagree about
// what " Teacher " means.
export function cleanAccountRole(value) {
  return cleanBuyerRole(value);
}

// The label for a stored id ("" when there is none).
export function accountRoleLabel(value) {
  return ACCOUNT_ROLE_LABELS[cleanAccountRole(value)] || "";
}

// The declaration an account carries, read off its Supabase user record.
// An account created before this shipped has no key and reads as "" — which is
// deliberately NOT "student": we do not know, and the UI must not pretend we
// do. See dashboardsForRole().
export function accountRoleFromUser(user) {
  const raw = user?.user_metadata?.[ACCOUNT_ROLE_METADATA_KEY];
  return cleanAccountRole(raw);
}

// Which dashboard entry points this account should be OFFERED. Being offered
// one is not the same as being admitted to it — the server decides that.
//
//   teacher -> the Teacher Dashboard
//   parent  -> the Parent Dashboard
//   student -> the Parent Dashboard too: the owner's rule is that a parent may
//              sign in with the student's own account and see the student's
//              progress there. The student only ever sees their OWN records.
//   ""      -> both, because we do not know who they are. An existing account
//              (or a visitor) is not told it is a student when nobody said so.
export function dashboardsForRole(value) {
  const role = cleanAccountRole(value);
  if (role === "teacher") return ["teacher"];
  if (role === "parent") return ["parent"];
  if (role === "student") return ["parent"];
  return ["teacher", "parent"];
}

// True when an account may be OFFERED the given dashboard entry point.
export function offersDashboard(value, dashboard) {
  return dashboardsForRole(value).includes(dashboard);
}

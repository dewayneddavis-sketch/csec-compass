// Who a buyer says they are at checkout (owner addition 2026-09-26) — the ONE
// place the three roles, their labels and their copy are written down.
//
// api/checkout/create-session.js and api/stripe/webhook.js MIRROR the id list
// (every api/*.js file is self-contained by design and cannot import from src/),
// and tools/check-buyer-role.mjs asserts the mirrors equal this list, so a
// fourth role cannot be added in one place only.
//
// What the answer unlocks, after a verified payment:
//   teacher — the account may link its own students (the teacher gate).
//   parent  — pairs with the parent↔child link that a checkout already makes.
//   student — plain single-account access; nothing to link.
export const BUYER_ROLE_IDS = ["teacher", "student", "parent"];

// Shown in the dropdown, in this order (the ids above are the wire values).
export const BUYER_ROLE_LABELS = {
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

// The dropdown's own copy: the question, the hint under it, and what a buyer who
// tries to pay without answering is told.
export const BUYER_ROLE_QUESTION = "I am a…";
export const BUYER_ROLE_HINT =
  "Teachers can link their students after buying; parents can link their child. Students get their own account and nothing to link.";
export const BUYER_ROLE_REQUIRED_MESSAGE =
  "Tell us who this purchase is for — it decides what your account can do (Teacher and Parent can link students).";

// The wire value for a UI selection, or "" when it is not one of the three.
export function cleanBuyerRole(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return BUYER_ROLE_IDS.includes(v) ? v : "";
}

// The dropdown's label for a stored id ("" when there is none).
export function buyerRoleLabel(value) {
  return BUYER_ROLE_LABELS[cleanBuyerRole(value)] || "";
}
